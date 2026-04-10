# Testing y CI/CD

## Status

🔄 **En Desarrollo** — Requerimiento: "agregar skills y test cases"

## Qué testear

| Componente | Tipo | Estado |
|------------|------|--------|
| **Booking flow** | E2E | Pendiente |
| **OTP auth** | Unit + Integration | Pendiente |
| **Admin login** | Integration | Pendiente |
| **API endpoints** | Unit | Pendiente |
| **RLS policies** | Integration | Pendiente |

---

## Estructura de tests

```
frontend/
  __tests__/
    components/
      booking-form.test.tsx
      otp-form.test.tsx
    e2e/
      booking-flow.test.ts
      admin-workflow.test.ts

backend/
  tests/
    test_auth.py
    test_turnos.py
    test_admin.py
    conftest.py  ← fixtures compartidas
```

---

## Backend: Python + pytest

### Setup

```bash
cd backend
pip install pytest pytest-asyncio pytest-cov python-dotenv
```

### Ejemplo: test_auth.py

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.client import get_supabase_client
from unittest.mock import patch, MagicMock

client = TestClient(app)

@pytest.fixture
def mock_db():
    """Mock de Supabase client"""
    with patch('app.routers.auth.get_db') as mock:
        db = MagicMock()
        mock.return_value = db
        yield db

class TestLogin:
    """Tests para POST /auth/login"""
    
    def test_login_success(self, mock_db):
        """Debe retornar token y usuario válido"""
        # Setup
        mock_db.auth.sign_in_with_password.return_value.user.id = "user-123"
        mock_db.auth.sign_in_with_password.return_value.session.access_token = "token-xyz"
        
        mock_db.table("usuarios").select("*").eq("id", "user-123").single().execute.return_value = MagicMock(
            data={"id": "user-123", "email": "admin@clinic.com", "rol": "admin", "activo": True}
        )
        
        # Test
        response = client.post("/auth/login", json={
            "email": "admin@clinic.com",
            "password": "password123"
        })
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["rol"] == "admin"
    
    def test_login_invalid_credentials(self, mock_db):
        """Debe retornar 401 con credenciales inválidas"""
        mock_db.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")
        
        response = client.post("/auth/login", json={
            "email": "wrong@clinic.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Credenciales incorrectas"
    
    def test_login_user_not_staff(self, mock_db):
        """Debe retornar 403 si usuario no es staff"""
        mock_db.auth.sign_in_with_password.return_value.user.id = "user-456"
        mock_db.auth.sign_in_with_password.return_value.session.access_token = "token-456"
        
        mock_db.table("usuarios").select("*").eq("id", "user-456").single().execute.return_value = MagicMock(
            data={"id": "user-456", "email": "patient@email.com", "rol": "paciente"}
        )
        
        response = client.post("/auth/login", json={
            "email": "patient@email.com",
            "password": "password123"
        })
        
        assert response.status_code == 403
        assert "staff" in response.json()["detail"]

class TestOTPAuth:
    """Tests para OTP flow"""
    
    def test_otp_enviar(self, mock_db):
        """Debe generar OTP y guardarlo"""
        response = client.post("/auth/otp/enviar", json={
            "telefono": "+5491112345678"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "codigo_dev" in data or "link_whatsapp" in data
    
    def test_otp_verificar_valid(self, mock_db):
        """Debe retornar JWT con OTP válido"""
        response = client.post("/auth/otp/verificar", json={
            "telefono": "+5491112345678",
            "codigo": "1234",
            "nombre": "Juan"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["paciente"]["nombre"] == "Juan"
    
    def test_otp_verificar_expired(self, mock_db):
        """Debe retornar 401 con OTP expirado"""
        response = client.post("/auth/otp/verificar", json={
            "telefono": "+5491112345678",
            "codigo": "9999",  # OTP no existe
            "nombre": "Juan"
        })
        
        assert response.status_code == 401
```

### Ejecutar tests

```bash
# Todos
pytest backend/tests/

# Con cobertura
pytest backend/tests/ --cov=app --cov-report=html

# Solo un archivo
pytest backend/tests/test_auth.py -v

# Solo una función
pytest backend/tests/test_auth.py::TestLogin::test_login_success -v
```

### conftest.py (fixtures)

```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session")
def client():
    """Cliente HTTP para tests"""
    return TestClient(app)

@pytest.fixture
def mock_supabase():
    """Mock de cliente Supabase"""
    with patch('app.db.client.get_supabase_client') as mock:
        db = MagicMock()
        mock.return_value = db
        yield db

@pytest.fixture
def admin_user():
    """Datos de usuario admin para tests"""
    return {
        "id": "admin-123",
        "email": "admin@clinic.com",
        "rol": "admin",
        "activo": True
    }

@pytest.fixture
def doctor_user():
    """Datos de usuario doctor para tests"""
    return {
        "id": "doctor-456",
        "email": "doctor@clinic.com",
        "rol": "odontologo",
        "activo": True,
        "especialidades": ["Limpieza", "Blanqueamiento"]
    }
```

---

## Frontend: Jest + React Testing Library

### Setup

```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-mock-extended
```

### jest.config.js

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}
```

### Ejemplo: booking-form.test.tsx

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BookingForm } from '@/app/turnos/page'

describe('Booking Form', () => {
  it('should render treatment selector', () => {
    render(<BookingForm />)
    
    expect(screen.getByText(/¿Qué tratamiento/i)).toBeInTheDocument()
  })
  
  it('should fetch doctors when treatment is selected', async () => {
    render(<BookingForm />)
    
    const cleaningOption = screen.getByRole('button', { name: /Limpieza/i })
    fireEvent.click(cleaningOption)
    
    await waitFor(() => {
      expect(screen.getByText(/Dr. García/i)).toBeInTheDocument()
    })
  })
  
  it('should submit form with valid data', async () => {
    const mockSubmit = jest.fn()
    render(<BookingForm onSubmit={mockSubmit} />)
    
    fireEvent.change(screen.getByPlaceholderText(/Nombre/i), {
      target: { value: 'Juan' }
    })
    fireEvent.change(screen.getByPlaceholderText(/Teléfono/i), {
      target: { value: '+5491112345678' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }))
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Juan',
        telefono: '+5491112345678'
      }))
    })
  })
})
```

### Ejecutar tests

```bash
# Todos
npm test

# Con cobertura
npm test -- --coverage

# Solo un archivo
npm test booking-form.test.tsx

# Watch mode (re-run on change)
npm test -- --watch
```

---

## E2E: Cypress o Playwright

### Setup Cypress

```bash
cd frontend
npm install --save-dev cypress
npx cypress open
```

### Ejemplo: cypress/e2e/booking-flow.cy.ts

```typescript
describe('Booking Flow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/turnos')
  })
  
  it('should complete booking flow end-to-end', () => {
    // Step 1: Select treatment
    cy.contains('Limpieza').click()
    cy.contains('Dr. García').should('be.visible')
    
    // Step 2: Select doctor
    cy.contains('Dr. García').click()
    
    // Step 3: Select date/time
    cy.get('input[type="date"]').type('2026-04-15')
    cy.contains('10:00 AM').click()
    
    // Step 4: Fill patient info
    cy.get('input[placeholder="Nombre"]').type('Juan')
    cy.get('input[placeholder="Teléfono"]').type('5491112345678')
    
    // Step 5: Submit
    cy.contains('Confirmar turno').click()
    
    // Verify success
    cy.contains('¡Turno agendado!').should('be.visible')
    cy.contains('María G. · Blanqueamiento').should('exist')
  })
})
```

---

## GitHub Actions CI/CD

### `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: ./backend
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      
      - name: Run tests
        working-directory: ./backend
        run: pytest tests/ --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      
      - name: Run tests
        working-directory: ./frontend
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./frontend/coverage/coverage-final.json
```

---

## Checklist de QA Manual

Antes de cada deploy:

- [ ] Agendar turno en `/turnos` completo
- [ ] Ver turno en `/mis-turnos` (OTP flow)
- [ ] Admin login en `/admin/login`
- [ ] Ver agenda del día en `/admin/agenda`
- [ ] Cambiar estado de turno a "Confirmado"
- [ ] Ver pacientes en `/admin/pacientes`
- [ ] Crear alarma desde `/admin/configuracion`

---

## Coverage targets

Objetivo:
- **Backend**: 80% de cobertura
- **Frontend**: 70% de cobertura (UI es complejo)
- **Critical paths**: 100% (auth, booking, admin)

---

## Ver también

- [docs/progreso.md](../docs/progreso.md) — Pending tasks
- [`admin-auth.md`](./admin-auth.md) — Auth tests ejemplo
- [`booking-flow.md`](./booking-flow.md) — Booking tests ejemplo

