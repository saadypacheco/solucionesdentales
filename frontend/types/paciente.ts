export interface Paciente {
  id: number;
  telefono: string;
  nombre: string | null;
  email: string | null;
  score: number;
  estado: 'nuevo' | 'contactado' | 'interesado' | 'turno_agendado' | 'paciente_activo' | 'inactivo' | 'perdido';
  proxima_accion: string | null;
  verificado: boolean;
  created_at: string;
}
