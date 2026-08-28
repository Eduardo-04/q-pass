-- ============================================================
-- Q-PASS: Tabla para Solicitudes de Alta de Organizadores B2B
-- ============================================================

CREATE TABLE IF NOT EXISTS public.solicitudes_organizador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa TEXT NOT NULL,
  nombre_contacto TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  aforo_estimado TEXT DEFAULT '100-500',
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.solicitudes_organizador ENABLE ROW LEVEL SECURITY;

-- Permitir inserción pública desde la Landing Page
CREATE POLICY "Permitir insercion publica de solicitudes" 
  ON public.solicitudes_organizador 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

-- Permitir lectura y gestión solo al rol de servicio / admin
CREATE POLICY "Permitir lectura completa a servicio" 
  ON public.solicitudes_organizador 
  FOR ALL 
  TO service_role 
  USING (true);
