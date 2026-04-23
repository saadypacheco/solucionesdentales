"""
M11 Fase B — generación de PDF de recetas digitales.

Estrategia (decisión 2026-04-21): PDF simple sin firma electrónica certificada.
Suficiente para uso interno y consulta del paciente. No tiene validez legal
para presentar en farmacia (eso requeriría firma digital ADSIB/ARCA).

Layout: encabezado consultorio + datos paciente + contenido + pie con datos
del odontólogo y fecha.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Frame


def generar_receta_pdf(
    contenido: str,
    paciente_nombre: str,
    odontologo_nombre: str,
    consultorio_nombre: str,
    consultorio_direccion: Optional[str] = None,
    matricula: Optional[str] = None,
    fecha: Optional[datetime] = None,
) -> bytes:
    """
    Genera un PDF de receta y lo devuelve como bytes.

    Args:
        contenido: texto libre con la prescripción/indicaciones
        paciente_nombre: nombre del paciente
        odontologo_nombre: nombre del odontólogo
        consultorio_nombre: nombre del consultorio
        consultorio_direccion: opcional
        matricula: opcional, matrícula del odontólogo
        fecha: si None usa now()

    Returns:
        PDF en bytes (listo para subir a Storage)
    """
    if fecha is None:
        fecha = datetime.now(timezone.utc)

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        'body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
    )

    # ── Header ──
    c.setFont('Helvetica-Bold', 16)
    c.setFillColorRGB(0.05, 0.4, 0.4)  # teal oscuro
    c.drawString(2 * cm, height - 2.5 * cm, consultorio_nombre)

    if consultorio_direccion:
        c.setFont('Helvetica', 9)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(2 * cm, height - 3 * cm, consultorio_direccion)

    # Línea decorativa
    c.setStrokeColorRGB(0.05, 0.6, 0.55)
    c.setLineWidth(2)
    c.line(2 * cm, height - 3.5 * cm, width - 2 * cm, height - 3.5 * cm)

    # Título
    c.setFont('Helvetica-Bold', 14)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.drawString(2 * cm, height - 4.5 * cm, 'RECETA / INDICACIÓN')

    # Datos paciente + fecha
    c.setFont('Helvetica', 11)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawString(2 * cm, height - 5.5 * cm, f'Paciente: {paciente_nombre}')
    c.drawRightString(width - 2 * cm, height - 5.5 * cm, f"Fecha: {fecha.strftime('%d/%m/%Y')}")

    # ── Contenido (con paragraph para wrap) ──
    frame = Frame(
        2 * cm,
        4 * cm,
        width - 4 * cm,
        height - 11 * cm,
        leftPadding=0,
        rightPadding=0,
        topPadding=0.5 * cm,
        bottomPadding=0,
        showBoundary=0,
    )

    # Convertir contenido a párrafos (escapar HTML básico)
    safe = contenido.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    paragraphs = [Paragraph(line or '<br/>', body_style) for line in safe.split('\n')]
    frame.addFromList(paragraphs, c)

    # ── Footer ──
    c.setStrokeColorRGB(0.7, 0.7, 0.7)
    c.setLineWidth(0.5)
    c.line(2 * cm, 3 * cm, width - 2 * cm, 3 * cm)

    c.setFont('Helvetica-Bold', 11)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.drawCentredString(width / 2, 2.3 * cm, odontologo_nombre)

    if matricula:
        c.setFont('Helvetica', 9)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawCentredString(width / 2, 1.8 * cm, f'Matrícula: {matricula}')

    c.setFont('Helvetica-Oblique', 7)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.drawCentredString(
        width / 2,
        1.2 * cm,
        'Documento generado digitalmente. No tiene validez legal para presentar en farmacia.',
    )

    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer.read()
