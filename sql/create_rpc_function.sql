-- ============================================================
-- Q-PASS: Función Atómica para Compra de Boletos
-- ============================================================
-- Esta función garantiza que no haya sobreventa mediante el uso de:
-- 1. SELECT ... FOR UPDATE: Bloquea la fila del evento.
-- 2. Conteo de boletos 'pending' recientes (15 min) como ocupados.
-- 3. Transacción única para Order + Boletos.
-- ============================================================

CREATE OR REPLACE FUNCTION process_ticket_purchase(
  p_evento_id UUID,
  p_asistentes JSONB, -- Array de {nombreCompleto, email}
  p_total_amount NUMERIC,
  p_payment_status TEXT DEFAULT 'pending'
) RETURNS JSONB AS $$
DECLARE
  v_capacidad INTEGER;
  v_vendidos INTEGER;
  v_order_id UUID;
  v_asistente JSONB;
  v_precio_unitario NUMERIC;
BEGIN
  -- 1. Bloquear la fila del evento para evitar race conditions
  SELECT capacidad, precio INTO v_capacidad, v_precio_unitario
  FROM public.eventos
  WHERE id = p_evento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evento no encontrado');
  END IF;

  -- 2. Contar boletos activos, usados Y PENDING recientes (últimos 15 min)
  -- Nota: Asumimos que la tabla boletos tiene 'created_at' (estándar Supabase)
  SELECT COUNT(*) INTO v_vendidos
  FROM public.boletos
  WHERE evento_id = p_evento_id
  AND (
    estado IN ('activo', 'usado', 'paid')
    OR (estado = 'pending' AND created_at > NOW() - INTERVAL '15 minutes')
  );

  -- 3. Verificar si hay espacio suficiente
  IF (v_capacidad - v_vendidos) < jsonb_array_length(p_asistentes) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'No hay suficientes boletos disponibles. Quedan ' || GREATEST(0, v_capacidad - v_vendidos) || '.'
    );
  END IF;

  -- 4. Crear la orden principal
  INSERT INTO public.orders (
    email_comprador, 
    total_amount, 
    payment_status, 
    created_at
  )
  VALUES (
    (p_asistentes->0->>'email'),
    p_total_amount,
    p_payment_status,
    NOW()
  ) RETURNING id INTO v_order_id;

  -- 5. Insertar los boletos para cada asistente
  FOR v_asistente IN SELECT * FROM jsonb_array_elements(p_asistentes)
  LOOP
    INSERT INTO public.boletos (
      order_id, 
      evento_id, 
      email_comprador, 
      nombre_comprador, 
      estado, 
      precio_unitario
    )
    VALUES (
      v_order_id,
      p_evento_id,
      (v_asistente->>'email'),
      (v_asistente->>'nombreCompleto'),
      p_payment_status,
      v_precio_unitario
    );
  END LOOP;

  -- 6. Retornar éxito y el ID de la orden
  RETURN jsonb_build_object(
    'success', true, 
    'order_id', v_order_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Error interno en la base de datos: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql;
