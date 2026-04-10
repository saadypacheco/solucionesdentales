# OTP Authentication para Pacientes

## Qué es

Sistema de autenticación sin contraseña para pacientes que permite:
1. Enviar código OTP (4 dígitos) vía WhatsApp
2. Verificar código y obtener JWT de 30 días
3. Acceder a `/mis-turnos` para ver y cancelar reservas propias

**Ventaja:** Pacientes nunca necesitan crear cuenta ni recordar contraseña. Un código por WhatsApp es suficiente.

---

## Diagrama de flujo

```
Paciente visita /mis-turnos
            ↓
      [Paso 1: Teléfono]
      Ingresa +54911234567
            ↓
      POST /auth/otp/enviar
            ↓
   Backend:
   - Genera OTP 4 dígitos
   - Crea registro en paciente_otps
   - Envía vía WhatsApp
            ↓
      [Paso 2: Código OTP]
      Ingresa código (ej: 5847)
            ↓
      POST /auth/otp/verificar
            ↓
   Backend:
   - Verifica código + expiry (10 min)
   - Crea/obtiene paciente en tabla pacientes
   - Genera JWT paciente (30 días)
            ↓
    [Paso 3: Turno conseguido]
    Redirect a mis-turnos/[turno_id]
            ↓
      GET /auth/mis-turnos
      (header: Authorization: Bearer [JWT])
            ↓
   Backend retorna turnos del paciente
```

---

## Archivos involucrados

### Backend
- `backend/app/routers/auth.py` — endpoints OTP
  - `POST /auth/otp/enviar` (línea ~162)
  - `POST /auth/otp/verificar` (línea ~210)
  - `GET /auth/mis-turnos` (línea ~248)
  - `PATCH /auth/mis-turnos/{id}/cancelar` (línea ~265)

### Frontend
- `frontend/app/mis-turnos/page.tsx` — UI con 3 pasos
- `frontend/lib/stores/pacienteStore.ts` — Zustand store con JWT
- `frontend/lib/api/turnos.ts` — cliente OTP

### Database
- `supabase/migrations/008_paciente_otps.sql` — tabla paciente_otps
- RLS policies en 009_fix_rls_insert_definitivo.sql

---

## Implementación paso a paso

### Paso 1: Enviar OTP

**Frontend** (`frontend/app/mis-turnos/page.tsx`):
```tsx
const [telefono, setTelefono] = useState('')

async function solicitarOTP() {
  const res = await fetch('/api/proxy/auth/otp/enviar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefono }),
  })
  const data = await res.json()
  // data.link_whatsapp — Link para clickear (test)
  // data.codigo_dev — En ENVIRONMENT != production
}
```

**Backend** (`backend/app/routers/auth.py` línea ~162):
```python
@router.post("/otp/enviar")
async def enviar_otp(req: EnviarOTPRequest, db: Client = Depends(get_db)):
    telefono = normalizar_telefono(req.telefono)
    
    # 1. Generar código 4 dígitos
    codigo = str(random.randint(1000, 9999))
    
    # 2. Guardar en BD (expiry 10 min)
    db.table("paciente_otps").insert({
        "telefono": telefono,
        "codigo": codigo,
        "creado_at": datetime.now(timezone.utc),
        "valido_hasta": datetime.now(timezone.utc) + timedelta(minutes=10)
    }).execute()
    
    # 3. Enviar vía WhatsApp (si está configurado)
    # Aquí iría integración con Twilio / WhatsApp API
    
    # En desarrollo, devolver código
    return {
        "link_whatsapp": f"https://wa.me/{WA_NUMBER}?text=Mi%20código:%20{codigo}",
        "codigo_dev": codigo if ENVIRONMENT != "production" else None,
    }
```

### Paso 2: Verificar OTP

**Frontend**:
```tsx
async function verificarOTP() {
  const res = await fetch('/api/proxy/auth/otp/verificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefono, codigo }),
  })
  const data = await res.json()
  
  // Guardar token en Zustand store
  pacienteStore.setToken(data.access_token)
  pacienteStore.setPaciente(data.paciente)
  
  // Redirect a mis-turnos
  router.push('/mis-turnos')
}
```

**Backend**:
```python
@router.post("/otp/verificar")
async def verificar_otp(req: VerificarOTPRequest, db: Client = Depends(get_db)):
    telefono = normalizar_telefono(req.telefono)
    
    # 1. Buscar OTP válido
    otp_record = db.table("paciente_otps")\
        .select("*")\
        .eq("telefono", telefono)\
        .eq("codigo", req.codigo)\
        .gt("valido_hasta", datetime.now(timezone.utc))\
        .single()\
        .execute()
    
    if not otp_record.data:
        raise HTTPException(status_code=401, detail="Código inválido o expirado")
    
    # 2. Crear o actualizar paciente
    paciente_data = {
        "nombre": req.nombre or "Paciente",
        "telefono": telefono,
        "activo": True,
    }
    paciente = db.table("pacientes").upsert(paciente_data).execute()
    
    # 3. Generar JWT
    payload = {
        "sub": paciente.data[0]["id"],
        "rol": "paciente",
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # 4. Limpiar OTP usado
    db.table("paciente_otps").delete().eq("id", otp_record.data["id"]).execute()
    
    return {
        "access_token": token,
        "paciente": paciente.data[0],
    }
```

### Paso 3: Usar el token

**Frontend** (Zustand store):
```ts
import create from 'zustand'
import { persist } from 'zustand/middleware'

interface PacienteStore {
  token: string | null
  paciente: any | null
  setToken: (token: string) => void
  setPaciente: (paciente: any) => void
  logout: () => void
}

export const pacienteStore = create<PacienteStore>(
  persist(
    (set) => ({
      token: null,
      paciente: null,
      setToken: (token) => set({ token }),
      setPaciente: (paciente) => set({ paciente }),
      logout: () => set({ token: null, paciente: null }),
    }),
    { name: "paciente-store" }
  )
)
```

**Frontend** (API cliente):
```ts
export async function getMisTurnos(token: string) {
  const res = await fetch('/api/proxy/auth/mis-turnos', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  return res.json()
}
```

---

## Tabla paciente_otps

Migración 008:
```sql
CREATE TABLE IF NOT EXISTS paciente_otps (
  id BIGSERIAL PRIMARY KEY,
  telefono TEXT NOT NULL,
  codigo TEXT NOT NULL,
  creado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valido_hasta TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(telefono, codigo)
);
```

---

## Troubleshooting

**Error: "Código inválido o expirado"**
→ Verificar que el código se ingresó sin espacios. OTP expira en 10 minutos desde envío.

**Error: "Teléfono no tiene format correcto"**
→ Formato esperado: `+549XXXXXXXXXX` (país + área + número). El backend normaliza automáticamente pero debe incluir `+`.

**Paciente no ve sus turnos**
→ Verificar que el JWT está siendo enviado en el header `Authorization: Bearer <token>` en la request GET /auth/mis-turnos.

**WhatsApp link no funciona**
→ Es solo para testing. En producción, usar API de WhatsApp Business o Twilio.

**JWT expirado después de 30 días**
→ Por diseño. Paciente debe hacer OTP nuevamente. Permite auditar acceso y refrescar datos.

---

## Seguridad

✅ Código OTP generado aleatoriamente (4 dígitos)
✅ Expiry de 10 minutos
✅ JWT sin almacenar contraseñas
✅ JWT con expiry de 30 días
✅ RLS en tabla pacientes para que pacientes solo vean sus turnos
✅ Números de teléfono no se guardan en logs (solo telemetría)
⚠️ WhatsApp API no integrada (solo link para testing)

---

## Ver también

- [`booking-flow.md`](./booking-flow.md) — Cómo un turno se crea y se ve en /mis-turnos
- [`admin-auth.md`](./admin-auth.md) — Autenticación para staff
- [docs/decisiones.md](../docs/decisiones.md) — Por qué OTP sin contraseña

