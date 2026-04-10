# Flujo de Agendar Turno

## Qué es

Sistema completo para que pacientes agendan turnos online en 3-4 pasos:
1. Elegir tratamiento
2. Elegir doctor (si hay múltiples)
3. Elegir fecha y horario
4. Confirmar datos personales

El sistema crea automáticamente el paciente, turno, y alarma de confirmación.

---

## Diagrama de flujo

```
Paciente visita /turnos
         ↓
[Paso 1: Tratamiento]
GET /turnos/doctores?tratamiento=Limpieza
         ↓
¿Un doctor o múltiples?
         ├─ 1 doctor → Paso 3 (auto-asigna)
         └─ N doctores → Paso 2 (selector)
         ↓
[Paso 2: Doctor]
GET /turnos/disponibles?fecha=2026-04-10&tratamiento=Limpieza&usuario_id=UUID
         ↓
[Paso 3: Fecha y Horario]
SELECT 2026-04-10 10:00 AM
         ↓
[Paso 4: Datos personales]
Nombre, teléfono, email, notas
         ↓
POST /turnos
{
  nombre, telefono, email, fecha_hora, tipo_tratamiento, 
  usuario_id, duracion_minutos, notas
}
         ↓
Backend:
  1. Crear paciente (si no existe)
  2. Crear turno
  3. Crear alarma de confirmación (+1 día)
  4. Retornar turno_id
         ↓
[Confirmar]: ¡Turno agendado!
Código: #12345
Recordatorio vía WhatsApp
```

---

## Archivos involucrados

### Backend
- `backend/app/routers/turnos.py`
  - `GET /turnos/doctores` (line ~30)
  - `GET /turnos/disponibles` (line ~80)
  - `POST /turnos/` (line ~150)
  - `PATCH /turnos/{id}` (line ~200)

- `backend/app/services/disponibilidad.py` — Lógica de slots

- Migraciones:
  - `004_doctor_especialidades.sql` — especialidades TEXT[] en usuarios
  - `009_fix_rls_insert_definitivo.sql` — RLS para INSERT anónimo

### Frontend
- `frontend/app/turnos/page.tsx` — UI con 3-4 pasos
- `frontend/lib/api/turnos.ts` — Cliente API
- `frontend/lib/stores/identidadStore.ts` — Almacena datos de paciente

### Database
- Tabla `pacientes` (nombre, telefono, email)
- Tabla `turnos` (paciente_id, usuario_id, fecha_hora, estado, duracion_minutos)
- Tabla `alarmas` (turno_id, tipo, fecha_resolucion)
- Tabla `usuarios` (id, especialidades TEXT[])

---

## Implementación paso a paso

### Paso 1: Obtener doctores por tratamiento

**Frontend** (`frontend/app/turnos/page.tsx`):
```tsx
const [tratamiento, setTratamiento] = useState('Limpieza')

useEffect(() => {
  getDoctores(tratamiento).then(setDoctores)
}, [tratamiento])

function getDoctores(tratamiento: string) {
  return fetch(`/api/proxy/turnos/doctores?tratamiento=${tratamiento}`)
    .then(r => r.json())
}
```

**Backend** (`backend/app/routers/turnos.py` ~30):
```python
@router.get("/doctores")
async def get_doctores(
    tratamiento: str,
    db: Client = Depends(get_supabase_client)
):
    # Buscar usuarios (doctores) que tengan este tratamiento en especialidades
    doctores = db.table("usuarios")\
        .select("id, nombre, especialidades")\
        .filter("especialidades", "cs", f'["{tratamiento}"]')\
        .execute()
    
    return {
        "tratamiento": tratamiento,
        "total": len(doctores.data),
        "doctores": doctores.data
    }
```

### Paso 2: Lógica adaptativa (1 vs N doctores)

**Frontend**:
```tsx
if (doctores.length === 1) {
  // Auto-asignar y saltar a paso 3
  setUsuarioId(doctores[0].id)
  setPaso(3)
} else {
  // Mostrar selector de doctores (paso 2)
  setPaso(2)
}
```

### Paso 3: Obtener slots disponibles

**Frontend**:
```tsx
const [fecha, setFecha] = useState('2026-04-10')
const [slots, setSlots] = useState<string[]>([])

useEffect(() => {
  getSlots(fecha, tratamiento, usuarioId)
    .then(setSlots)
}, [fecha, tratamiento, usuarioId])

async function getSlots(fecha: string, tratamiento: string, usuarioId?: string) {
  const params = new URLSearchParams({ fecha, tratamiento })
  if (usuarioId) params.append('usuario_id', usuarioId)
  
  const res = await fetch(`/api/proxy/turnos/disponibles?${params}`)
  return res.json()
}
```

**Backend**:
```python
@router.get("/disponibles")
async def get_slots(
    fecha: str,  # "2026-04-10"
    tratamiento: str,
    usuario_id: str = None,
    db: Client = Depends(get_supabase_client)
):
    # 1. Obtener duración del tratamiento
    duracion = DURACIONES_TRATAMIENTO.get(tratamiento, 30)  # minutos
    
    # 2. Obtener turnos del doctor ese día
    turnos_ese_dia = db.table("turnos")\
        .select("fecha_hora")\
        .eq("usuario_id", usuario_id)\
        .gte("fecha_hora", f"{fecha}T00:00")\
        .lt("fecha_hora", f"{fecha}T23:59")\
        .execute()
    
    # 3. Calcular slots bloqueados
    bloqueados = set()
    for turno in turnos_ese_dia.data:
        # Crear "ventana" alrededor del turno
        inicio = turno['fecha_hora']
        for i in range(duracion):
            bloqueados.add(inicio + timedelta(minutes=i))
    
    # 4. Generar slots disponibles (ej: 09:00, 09:30, 10:00, ...)
    slots = []
    for hora in range(9, 18):  # 9 AM a 6 PM
        for minuto in [0, 30]:
            slot_time = f"{fecha}T{hora:02d}:{minuto:02d}:00"
            if slot_time not in bloqueados:
                slots.append(slot_time)
    
    return {
        "fecha": fecha,
        "tratamiento": tratamiento,
        "duracion_minutos": duracion,
        "usuario_id": usuario_id,
        "slots": slots
    }
```

### Paso 4: Crear turno

**Frontend**:
```tsx
const [nombre, setNombre] = useState('')
const [telefono, setTelefono] = useState('')
const [email, setEmail] = useState('')
const [horario, setHorario] = useState<string>('')

async function crearTurno() {
  const res = await fetch('/api/proxy/turnos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre,
      telefono,
      email,
      fecha_hora: horario,
      tipo_tratamiento: tratamiento,
      usuario_id: usuarioId,
      duracion_minutos: DURACIONES_TRATAMIENTO[tratamiento],
      notas: notasAdicionales,
    }),
  })
  
  const turno = await res.json()
  // Guardar en identidadStore
  identidadStore.setPaciente({ nombre, telefono, email })
  
  // Mostrar confirmación
  setTurnoConfirmado(turno)
}
```

**Backend**:
```python
@router.post("/")
async def crear_turno(
    payload: SolicitarTurnoPayload,
    db: Client = Depends(get_supabase_client)
):
    # 1. Crear paciente (si no existe)
    paciente_existente = db.table("pacientes")\
        .select("id")\
        .eq("telefono", payload.telefono)\
        .single()\
        .execute()
    
    if paciente_existente.data:
        paciente_id = paciente_existente.data['id']
    else:
        nuevo_paciente = db.table("pacientes").insert({
            "nombre": payload.nombre,
            "telefono": payload.telefono,
            "email": payload.email,
            "activo": True,
        }).execute()
        paciente_id = nuevo_paciente.data[0]['id']
    
    # 2. Crear turno
    turno = db.table("turnos").insert({
        "paciente_id": paciente_id,
        "usuario_id": payload.usuario_id,
        "fecha_hora": payload.fecha_hora,
        "tipo_tratamiento": payload.tipo_tratamiento,
        "duracion_minutos": payload.duracion_minutos,
        "estado": "pendiente",
        "notas": payload.notas,
    }).execute()
    
    turno_id = turno.data[0]['id']
    
    # 3. Crear alarma de confirmación (+24 horas)
    fecha_confirmacion = datetime.fromisoformat(payload.fecha_hora) + timedelta(days=1)
    db.table("alarmas").insert({
        "turno_id": turno_id,
        "tipo": "confirmar_asistencia",
        "fecha_resolucion": fecha_confirmacion,
        "activa": True,
    }).execute()
    
    return {
        "turno_id": turno_id,
        "estado": "pendiente",
        "mensaje": f"Turno confirmado para {payload.fecha_hora}. Recordatorio por WhatsApp."
    }
```

---

## Tratamientos y duraciones

Definir en `backend/app/routers/turnos.py`:
```python
DURACIONES_TRATAMIENTO = {
    "Limpieza": 30,
    "Blanqueamiento": 60,
    "Ortodoncia consulta": 45,
    "Implante": 120,
}

TRATAMIENTOS_DISPONIBLES = list(DURACIONES_TRATAMIENTO.keys())
```

---

## Estados de turno

```
PENDIENTE → CONFIRMADO → REALIZADO
     ↓
  CANCELADO
```

- **PENDIENTE**: Recién creado. Espera confirmación vía WhatsApp.
- **CONFIRMADO**: Paciente confirmó asistencia. Doctor lo vio.
- **REALIZADO**: Turno se completó. Puede tener próximo registro de historial.
- **CANCELADO**: Paciente o doctor cancela. Se crea alarma para contactar.

---

## Validaciones

✅ Horario no puede estar en el pasado
✅ Horario debe estar en horario de atención (9 AM - 6 PM)
✅ No puede haber dos turnos del mismo doctor en el mismo slot
✅ Nombre y teléfono son obligatorios
✅ Email es opcional pero recomendado
⚠️ No hay validación de double-booking aún (TODO)

---

## Troubleshooting

**Error: "Slots no cargan"**
→ Verificar que usuario_id está siendo pasado correctamente en GET /turnos/disponibles.

**Error: "Turno se crea pero no aparece en /admin"**
→ Verificar que el JWT del doctor está en la request (para ver solo sus turnos).

**Error: "Horario muestra slot que ya tiene turno"**
→ Bug en lógica de bloqueados. Verificar que se calcula con duración correcta.

**Paciente no recibe WhatsApp**
→ WhatsApp API no está integrada. Actualmente solo envía link para testing en ENVIRONMENT != production.

---

## Ver también

- [`admin-auth.md`](./admin-auth.md) — Cómo admin ve los turnos
- [`otp-auth.md`](./otp-auth.md) — Cómo paciente ve sus turnos en /mis-turnos
- [docs/decisiones.md](../docs/decisiones.md) — Por qué slots de 30 min

