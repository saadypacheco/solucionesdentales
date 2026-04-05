export interface Turno {
  id: number;
  paciente_id: number;
  fecha_hora: string;
  duracion_minutos: number;
  tipo_tratamiento: string;
  estado: 'solicitado' | 'confirmado' | 'realizado' | 'cancelado' | 'ausente';
  notas: string | null;
  created_at: string;
}
