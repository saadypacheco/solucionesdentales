# Admin Authentication — Login para Staff

## Qué es

Sistema de autenticación para doctores, recepcionistas y admins que permite:
1. Login con email y contraseña (via Supabase Auth)
2. Obtener JWT con rol (admin/odontologo/recepcionista)
3. Acceder a `/admin/*` pages protegidas
4. Realizar operaciones según rol

---

## Diagrama de flujo

```
Staff visita /admin/login
         ↓
   [Formulario]
   Email: doctor@clinica.com
   Password: ••••••••
         ↓
   POST /auth/login
         ↓
Backend:
  1. Supabase Auth sign_in_with_password
  2. Buscar en tabla usuarios
  3. Verificar que rol es staff (admin/odontologo/recepcionista)
  4. Verificar que usuario está activo
  5. Retornar JWT + datos usuario
         ↓
Frontend:
  1. Guardar JWT en authStore (Zustand + persist)
  2. Redirect a /admin/agenda (o página anterior)
         ↓
[Protección de rutas]
middleware.ts:
  - Si visita /admin/* sin token → redirect a /admin/login
  - Si token inválido/expirado → redirect a /admin/login
         ↓
[Páginas admin]
GET /admin/agenda, /admin/pacientes, /admin/crm, etc.
(Con header Authorization: Bearer [JWT])
```

---

## Archivos involucrados

### Backend
- `backend/app/routers/auth.py`
  - `POST /auth/login` (line ~71)
  - `require_admin` dependency (line ~27)
- `backend/app/routers/admin.py` — endpoints admin protegidos

### Frontend
- `frontend/app/admin/login/page.tsx` — UI login
- `frontend/app/admin/layout.tsx` — Protección de rutas
- `frontend/lib/stores/authStore.ts` — Zustand store con JWT
- `frontend/middleware.ts` — Validación de ruta
- `frontend/app/admin/agenda/page.tsx` — Página protegida ejemplo

### Database
- Tabla `usuarios` (id, email, rol, especialidades, activo)
- Supabase Auth integrado

---

## Implementación paso a paso

### Paso 1: Crear usuario en Supabase Auth + tabla usuarios

**Script:** `backend/setup_admin.py`

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# 1. Crear usuario en Auth
auth_user = supabase.auth.admin.create_user({
    "email": "doctor@clinica.com",
    "password": "SecurePassword123!",
    "user_metadata": {
        "nombre": "Dr. García"
    }
})

# 2. Insertar en tabla usuarios
supabase.table("usuarios").insert({
    "id": auth_user.user.id,  # ← Mismo UUID que en Auth
    "email": "doctor@clinica.com",
    "nombre": "Dr. García",
    "rol": "odontologo",
    "especialidades": ["Limpieza", "Blanqueamiento"],
    "activo": True,
}).execute()
```

**Ejecutar una sola vez:**
```bash
cd backend
python setup_admin.py
```

### Paso 2: Login endpoint

**Frontend** (`frontend/app/admin/login/page.tsx`):
```tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authStore } from '@/lib/stores/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    try {
      const res = await fetch('/api/proxy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Error al iniciar sesión')
      }
      
      const data = await res.json()
      
      // Guardar en store
      authStore.setToken(data.access_token)
      authStore.setUser(data.user)
      
      // Redirect
      router.push('/admin/agenda')
    } catch (err) {
      setError(err.message)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="doctor@clinica.com"
            required
            className="w-full px-4 py-2 border rounded"
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            className="w-full px-4 py-2 border rounded"
          />
          
          {error && <p className="text-red-600 text-sm">{error}</p>}
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Backend** (`backend/app/routers/auth.py` line ~71):
```python
@router.post("/login")
async def login(req: LoginRequest, db: Client = Depends(get_db)):
    try:
        # 1. Autenticar con Supabase Auth
        res = db.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        
        user_id = res.user.id
        
        # 2. Obtener perfil del usuario
        profile = db.table("usuarios")\
            .select("*")\
            .eq("id", user_id)\
            .single()\
            .execute()
        
        if not profile.data:
            raise HTTPException(status_code=403, detail="Usuario no encontrado en staff")
        
        # 3. Verificar que es staff (no paciente)
        if profile.data.get("rol") not in ("admin", "odontologo", "recepcionista"):
            raise HTTPException(status_code=403, detail="No tienes acceso al panel")
        
        # 4. Verificar que está activo
        if not profile.data.get("activo", True):
            raise HTTPException(status_code=403, detail="Usuario desactivado")
        
        # 5. Retornar token + datos
        return {
            "access_token": res.session.access_token,
            "user": profile.data,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
```

### Paso 3: Zustand store

**Frontend** (`frontend/lib/stores/authStore.ts`):
```ts
import create from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  token: string | null
  user: any | null
  setToken: (token: string) => void
  setUser: (user: any) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const authStore = create<AuthStore>(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "auth-store",
      getStorage: () => localStorage,
    }
  )
)
```

### Paso 4: Protección de rutas

**Frontend** (`frontend/middleware.ts`):
```ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  
  // Si intenta acceder a /admin/* sin token
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

**Frontend** (`frontend/app/admin/layout.tsx`):
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { authStore } from '@/lib/stores/authStore'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { token, logout } = authStore()
  
  useEffect(() => {
    if (!token) {
      router.push('/admin/login')
    }
  }, [token, router])
  
  if (!token) return null
  
  return (
    <div>
      {/* Navbar con botón logout */}
      <nav className="bg-gray-900 text-white p-4 flex justify-between">
        <h1>Panel Admin</h1>
        <button
          onClick={() => {
            logout()
            router.push('/admin/login')
          }}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </nav>
      
      {children}
    </div>
  )
}
```

### Paso 5: Usar JWT en requests

En cualquier componente admin:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { authStore } from '@/lib/stores/authStore'

export default function AdminAgenda() {
  const { token } = authStore()
  const [turnos, setTurnos] = useState([])
  
  useEffect(() => {
    fetch('/api/proxy/admin/turnos?fecha=2026-04-10', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(r => r.json())
      .then(setTurnos)
  }, [token])
  
  return <div>{/* Mostrar turnos */}</div>
}
```

---

## Require_admin dependency

**Backend** (en cualquier endpoint protegido):
```python
from app.routers.auth import require_admin

@router.get("/admin/mi-perfil")
async def get_admin_profile(
    current_user = Depends(require_admin),
    db: Client = Depends(get_supabase_client)
):
    # Si llega aquí, el usuario está autenticado y es staff
    return {"message": f"Hola {current_user['nombre']}"}
```

---

## Roles y permisos

| Rol | Puede | No puede |
|-----|-------|----------|
| **admin** | Ver todos, editar config, crear usuarios | — |
| **odontologo** | Ver solo sus turnos, editar estado | Ver otros doctores |
| **recepcionista** | Ver todos, crear/editar turnos, confirmar | Cambiar config IA |

Implementar en endpoints:
```python
if current_user['rol'] == 'recepcionista':
    # Solo puede ver su clínica
    pass
elif current_user['rol'] == 'admin':
    # Acceso a todo
    pass
```

---

## Tabla usuarios

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,  -- ← Mismo que auth.users.id
  email TEXT UNIQUE,
  nombre TEXT,
  rol TEXT CHECK (rol IN ('admin', 'odontologo', 'recepcionista')),
  especialidades TEXT[],  -- ej: ["Limpieza", "Implante"]
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Troubleshooting

**Error: "Credenciales incorrectas"**
→ Verificar email y contraseña en dashboard Supabase Auth. Nota: Email debe estar confirmado (si el proyecto requiere).

**Error: "Usuario no encontrado en staff"**
→ Usuario existe en Auth pero no está en tabla usuarios. Ejecutar `setup_admin.py` o INSERT manualmente.

**Token no persiste después de refresh**
→ Verificar que authStore está usando `persist` middleware y localStorage.

**Logout no funciona**
→ Verificar que `logout()` limpia el store y redirige a /admin/login.

**Middleware rechaza válido token**
→ Middleware está leyendo de cookies pero store usa localStorage. Sincronizar o cambiar a cookies.

---

## Seguridad

✅ Contraseña hasheada en Supabase Auth
✅ JWT con expiry (default: 3600 segundos = 1 hora)
✅ RLS en base de datos para asegurar que cada doctor solo ve sus turnos
✅ Verificación de rol en backend (no confiar en JWT del cliente)
⚠️ JWT se almacena en localStorage (considerar httpOnly cookies en futuro)
⚠️ No hay refresh token (login expira en 1 hora)

---

## Ver también

- [`otp-auth.md`](./otp-auth.md) — Autenticación de pacientes
- [AGENTS.md](../AGENTS.md) § Roles — Permisos por rol

