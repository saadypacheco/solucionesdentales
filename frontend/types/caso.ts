export interface Caso {
  id: number;
  tipo_tratamiento: string;
  descripcion: string | null;
  imagen_antes_url: string | null;
  imagen_despues_url: string | null;
  duracion_tratamiento: string | null;
  aprobado: boolean;
  created_at: string;
}
