"""Tests de la lógica de generación de slots en app.routers.turnos.

Sin DB — probamos solo la función pura `generar_slots()` con distintas franjas.
`obtener_franja_horario` requiere DB y se deja fuera (lo cubre un test de integración más adelante)."""
from datetime import date

from app.routers.turnos import generar_slots, DEFAULT_HORARIOS, DURACION_POR_TRATAMIENTO


UN_LUNES = date(2026, 4, 20)  # es lunes
UN_DOMINGO = date(2026, 4, 19)


def test_franja_none_devuelve_sin_slots():
    assert generar_slots(UN_LUNES, 30, franja=None) == []


def test_franja_9_a_19_con_duracion_30():
    """9:00 a 19:00 con turnos de 30 min debería dar 20 slots (el último a las 18:30)."""
    slots = generar_slots(UN_LUNES, 30, franja=(9, 0, 19, 0))
    assert slots[0] == "09:00"
    assert slots[-1] == "18:30"
    # Cada 30 min: 9:00, 9:30, 10:00... 18:30 → 20 slots
    assert len(slots) == 20


def test_franja_9_a_13_con_duracion_30():
    """Sábado típico 9-13 debería dar 8 slots (el último a las 12:30)."""
    slots = generar_slots(UN_LUNES, 30, franja=(9, 0, 13, 0))
    assert slots[-1] == "12:30"
    assert len(slots) == 8


def test_duracion_larga_limita_ultimo_slot():
    """Un turno de 90 min (implante) en franja 9-19 debe terminar antes — el
    último slot posible es 17:30 para terminar a las 19:00."""
    slots = generar_slots(UN_LUNES, 90, franja=(9, 0, 19, 0))
    assert slots[0] == "09:00"
    assert slots[-1] == "17:30"


def test_franja_con_minutos_no_cero():
    """El grid del cursor avanza de 30 en 30 min independiente del inicio.
    Si la franja arranca 8:30, los slots deben alinearse con eso."""
    slots = generar_slots(UN_LUNES, 30, franja=(8, 30, 11, 0))
    assert slots == ["08:30", "09:00", "09:30", "10:00", "10:30"]


def test_default_horarios_cubren_toda_la_semana():
    """Sanity: DEFAULT_HORARIOS debe tener entradas para los 7 días (lun=0, dom=6)."""
    assert set(DEFAULT_HORARIOS.keys()) == {0, 1, 2, 3, 4, 5, 6}


def test_default_domingo_cerrado():
    """Domingo debe ser None en defaults (consultorio cerrado)."""
    assert DEFAULT_HORARIOS[6] is None


def test_default_sabado_hasta_13():
    """Sábado por default cierra al mediodía."""
    assert DEFAULT_HORARIOS[5] == (9, 13)


def test_duraciones_por_tratamiento_tienen_valores_sensatos():
    """Sanity check de las duraciones conocidas — si alguien las rompe, los
    turnos dejan de reservar tiempo real."""
    assert DURACION_POR_TRATAMIENTO["implante"] == 90
    assert DURACION_POR_TRATAMIENTO["limpieza"] == 30
    # Todas entre 15 y 180 min
    for t, d in DURACION_POR_TRATAMIENTO.items():
        assert 15 <= d <= 180, f"{t} tiene duración sospechosa: {d}"
