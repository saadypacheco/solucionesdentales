# Encriptación de Datos Sensibles

## Status

🔄 **En Desarrollo** — Requerimiento agregado por usuario en fase 2

## Qué necesita ser encriptado

Según requisitos:
- [ ] Números de teléfono (pacientes)
- [ ] Emails (pacientes)
- [ ] Datos personales en historial clínico
- [ ] Notas de turnos (si contienen info sensible)
- [ ] OTPs (tabla paciente_otps)

## Enfoques considerados

| Enfoque | Ventajas | Desventajas |
|---------|----------|-------------|
| **Supabase PTE** (Transparent) | Automático, sin cambios en app | Cloud key, vendor lock-in |
| **AES-256 en app** | Control total, portable | Complejo, key management |
| **Supabase Vault** | Manage keys en Supabase | Más costo |
| **pgcrypto** (SQL) | Simple, en BD | Performance |

## Implementación recomendada

### Opción A: pgcrypto en Supabase

Encriptar a nivel SQL, automático:

```sql
-- Usar extensión pgcrypto de PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Modificar tabla pacientes
ALTER TABLE pacientes
  ADD COLUMN telefono_encrypted BYTEA,
  ADD COLUMN email_encrypted BYTEA;

-- Crear función para encriptar
CREATE OR REPLACE FUNCTION encrypt_text(text_input TEXT, secret TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(text_input, secret);
END;
$$ LANGUAGE plpgsql;

-- Trigger para encriptar al insertar
CREATE TRIGGER encrypt_paciente
BEFORE INSERT ON pacientes
FOR EACH ROW
BEGIN
  NEW.telefono_encrypted := encrypt_text(NEW.telefono, current_setting('app.encryption_key'));
END;
```

**Ejecutar:**
```sql
-- En SQL Editor de Supabase
SET app.encryption_key = 'tu-secret-key-aqui';

INSERT INTO pacientes (nombre, telefono, email)
VALUES ('Juan', '5491112345678', 'juan@example.com');

-- Para descifrar
SELECT pgp_sym_decrypt(telefono_encrypted::BYTEA, 'tu-secret-key') as telefono
FROM pacientes;
```

**Ventajas:** Automático, todo en BD
**Desventajas:** Key está en Supabase, más lento

### Opción B: Encripción en Python (FastAPI)

Antes de guardar en BD:

```python
from cryptography.fernet import Fernet
import os

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")  # Generar: Fernet.generate_key()
cipher = Fernet(ENCRYPTION_KEY)

def encrypt_phone(phone: str) -> str:
    return cipher.encrypt(phone.encode()).decode()

def decrypt_phone(encrypted: str) -> str:
    return cipher.decrypt(encrypted.encode()).decode()

# Antes de insertar en BD
paciente_data = {
    "nombre": "Juan",
    "telefono": encrypt_phone("+5491112345678"),
    "email": encrypt_email(payload.email),
}
db.table("pacientes").insert(paciente_data).execute()

# Al recuperar
pacientes = db.table("pacientes").select("*").execute()
for p in pacientes.data:
    print(f"Nombre: {p['nombre']}")
    print(f"Teléfono: {decrypt_phone(p['telefono'])}")
```

**Ventajas:** Flexible, key en backend (más seguro)
**Desventajas:** Hay que encriptar/desencriptar en app

### Opción C: Supabase Pydantic + Encryption

Combinar modelo Pydantic con encripción automática:

```python
from pydantic import Field, validator
from cryptography.fernet import Fernet

class PacienteCreate(BaseModel):
    nombre: str
    telefono: str
    email: str
    
    @validator('telefono')
    def encrypt_telefono(cls, v):
        return cipher.encrypt(v.encode()).decode()
    
    @validator('email')
    def encrypt_email(cls, v):
        return cipher.encrypt(v.encode()).decode()
```

---

## Próximos pasos

1. **Generar encryption key:**
   ```python
   from cryptography.fernet import Fernet
   print(Fernet.generate_key().decode())
   ```
   Guardar en `backend/.env`:
   ```
   ENCRYPTION_KEY=tu_clave_aqui
   ```

2. **Identificar todos los campos sensibles:**
   - [ ] Tabla pacientes: telefono, email
   - [ ] Tabla turnos: notas
   - [ ] Tabla paciente_otps: telefono, codigo
   - [ ] Tabla usuarios: email

3. **Agregar encripción:**
   - Opción A: Migración SQL con pgcrypto
   - Opción B: Modificar routers FastAPI
   - Opción C: Middleware Pydantic

4. **Manejar búsquedas:**
   - Encriptar input de búsqueda también
   - O mantener campo `telefono_plain` (salted hash) solo para búsquedas

5. **Testear:**
   - Verificar que datos encriptados no son legibles en BD
   - Verificar que desencriptación funciona
   - Verificar performance (especialmente búsquedas)

---

## Regulación

Argentina (donde se ejecuta):
- **PDPA**: Ley de Protección de Datos Personales
- Requiere: Consentimiento, derecho a acceso, derecho a olvido
- Recomienda: Encripción de datos sensibles

RECOMENDACIÓN: Implementar antes de salir a producción.

---

## Ver también

- [CLAUDE.md](../CLAUDE.md) § Lo que NO hacer — "No commitear .env"
- [docs/progreso.md](../docs/progreso.md) — Pending tasks

