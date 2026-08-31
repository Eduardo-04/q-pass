// ─── Roles ───────────────────────────────────────────────
export type UserRole = 'master' | 'organizador' | 'checador' | 'staff';

// ─── Perfiles ────────────────────────────────────────────
export interface Perfil {
  id: string;
  nombre: string | null;
  rol: UserRole;
  creado_el: string;
}

export interface PerfilCliente {
  user_id: string;
  nombre_empresa: string;
  comision_porcentaje: number;
  comision_fija: number;
  actualizado_el?: string;
}

// ─── Zonas / Fases de Preventa ───────────────────────────
export interface ZonaEvento {
  id: string;
  evento_id?: string;
  nombre: string;
  precio: number;
  capacidad: number;
  vendidos?: number;
  descripcion?: string;
  activo?: boolean;
}

// ─── Eventos ─────────────────────────────────────────────
export interface Evento {
  id: string;
  nombre: string;
  capacidad: number;
  precio: number;
  fecha_evento: string;
  visible_desde: string;
  visible_hasta: string;
  activo: boolean;
  comision_porcentaje: number;
  comision_fija: number;
  organizador_id?: string;
  banner_url?: string;
  mapa_zonas_url?: string;
  zonas?: ZonaEvento[];
}

export type EventoFormData = Omit<Evento, 'id'>;

// ─── Boletos ─────────────────────────────────────────────
export type EstadoBoleto = 'pending' | 'paid' | 'activo' | 'usado' | 'cancelado';

export interface Boleto {
  id: string;
  email_comprador: string;
  estado: EstadoBoleto;
  fecha_compra: string;
  evento_id: string;
  order_id?: string;
  nombre_comprador?: string;
  precio_unitario?: number;
  qr_code?: string;
  zona_id?: string;
  nombre_zona?: string;
}

// ─── Orders ──────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  email_comprador: string;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// ─── Cart Items ──────────────────────────────────────────
export interface CartItem {
  id: string;
  session_id: string;
  evento_id: string;
  cantidad: number;
  created_at?: string;
  updated_at?: string;
}

// ─── Asistente (formulario de compra) ────────────────────
export interface Asistente {
  id: string;
  nombreCompleto: string;
  email: string;
}

// ─── Mensajes UI ─────────────────────────────────────────
export type MensajeTipo = 'success' | 'error' | 'info';

export interface Mensaje {
  text: string;
  type: MensajeTipo;
}
