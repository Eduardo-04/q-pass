-- ============================================================
-- Q-PASS: Migración de Seguridad — RLS + Roles
-- ============================================================
-- Ejecutar este SQL en: Supabase Dashboard → SQL Editor
-- IMPORTANTE: Ejecutar en orden, sección por sección.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 2. POLÍTICAS PARA `perfiles`
-- ────────────────────────────────────────────────────────────

-- Los usuarios pueden leer su propio perfil (necesario para el hook useAuth)
CREATE POLICY "Users can read own profile"
  ON public.perfiles FOR SELECT
  USING (auth.uid() = id);

-- Solo el service_role (API routes) puede modificar perfiles
-- (No se necesitan políticas INSERT/UPDATE/DELETE para usuarios normales)

-- ────────────────────────────────────────────────────────────
-- 3. POLÍTICAS PARA `perfiles_cliente`
-- ────────────────────────────────────────────────────────────

-- Los organizadores pueden ver su propio perfil de comisiones
CREATE POLICY "Organizers can read own client profile"
  ON public.perfiles_cliente FOR SELECT
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. POLÍTICAS PARA `eventos`
-- ────────────────────────────────────────────────────────────

-- Cualquier persona puede ver eventos activos y dentro del periodo visible (público)
CREATE POLICY "Public can read visible active events"
  ON public.eventos FOR SELECT
  USING (
    activo = true
    AND visible_desde <= CURRENT_DATE
    AND visible_hasta >= CURRENT_DATE
  );

-- Los organizadores pueden ver TODOS sus propios eventos (admin panel)
CREATE POLICY "Organizers can read own events"
  ON public.eventos FOR SELECT
  USING (auth.uid() = organizador_id);

-- Los organizadores pueden crear eventos
CREATE POLICY "Organizers can create events"
  ON public.eventos FOR INSERT
  WITH CHECK (auth.uid() = organizador_id);

-- Los organizadores pueden actualizar sus propios eventos
CREATE POLICY "Organizers can update own events"
  ON public.eventos FOR UPDATE
  USING (auth.uid() = organizador_id);

-- ────────────────────────────────────────────────────────────
-- 5. POLÍTICAS PARA `boletos`
-- ────────────────────────────────────────────────────────────

-- Los organizadores pueden ver los boletos de sus eventos
CREATE POLICY "Organizers can read tickets for own events"
  ON public.boletos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.eventos
      WHERE eventos.id = boletos.evento_id
      AND eventos.organizador_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. POLÍTICAS PARA `orders`
-- ────────────────────────────────────────────────────────────

-- (Las orders se manejan solo via service_role en API routes,
--  no necesitan políticas RLS para usuarios normales)

-- ────────────────────────────────────────────────────────────
-- 7. CONFIGURAR ROLES PARA USUARIOS EXISTENTES
-- ────────────────────────────────────────────────────────────
-- INSTRUCCIONES:
-- 1. Primero verifica los usuarios que tienes:
--    SELECT id, email FROM auth.users;
--
-- 2. Asegúrate de que cada usuario tenga un perfil en la tabla `perfiles`.
--    Si no existe, créalo:
--
--    INSERT INTO public.perfiles (id, nombre, rol) VALUES
--      ('<TU_USER_ID>', 'Tu Nombre', 'master');
--
-- 3. Para cuentas de checadores:
--    INSERT INTO public.perfiles (id, nombre, rol) VALUES
--      ('<CHECKER_USER_ID>', 'Puerta 1', 'checador');
--
-- 4. Para cuentas de organizadores/socios:
--    INSERT INTO public.perfiles (id, nombre, rol) VALUES
--      ('<PARTNER_USER_ID>', 'Nombre del Socio', 'organizador');
--
-- ROLES DISPONIBLES:
--   'master'       → Superadmin (tú). Ve todo, gestiona socios y comisiones.
--   'organizador'  → Dueño de bolera/evento. Ve sus propios eventos y dashboard.
--   'checador'     → Personal de puerta. Solo accede al escáner QR.
--   'staff'        → Sin acceso (default). Para futuro uso.
-- ────────────────────────────────────────────────────────────

-- EJEMPLO (reemplaza los IDs reales):
-- INSERT INTO public.perfiles (id, nombre, rol) VALUES
--   ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Eduardo', 'master')
-- ON CONFLICT (id) DO UPDATE SET rol = 'master';
