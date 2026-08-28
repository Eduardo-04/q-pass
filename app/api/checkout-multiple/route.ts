import { createAdminClient } from '@/utils/supabase/admin';
import { sendTicketConfirmationEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;

export async function POST(req: Request) {
  try {
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { success: false, error: 'Pasarela de pago no configurada. Contacta al administrador.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const rawEventoId = body.eventoId || body.evento_id;
    const rawAsistentes = body.asistentes;
    const rawTotal = body.total;
    const emailComprador = body.email_comprador || (Array.isArray(rawAsistentes) && rawAsistentes[0]?.email);

    // ── Validaciones de entrada ──
    if (!rawEventoId || typeof rawEventoId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    if (!Array.isArray(rawAsistentes) || rawAsistentes.length === 0 || rawAsistentes.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Cantidad de asistentes inválida (1–10)' },
        { status: 400 }
      );
    }

    // Validar cada asistente
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const asistente of rawAsistentes) {
      if (!asistente.nombreCompleto || typeof asistente.nombreCompleto !== 'string' || asistente.nombreCompleto.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: 'Nombre de asistente inválido' },
          { status: 400 }
        );
      }
      if (!asistente.email || !emailRegex.test(asistente.email)) {
        return NextResponse.json(
          { success: false, error: 'Email de asistente inválido' },
          { status: 400 }
        );
      }
    }

    const supabaseAdmin = createAdminClient();

    // ── Verificar evento (Info básica) ──
    const { data: evento, error: eventoError } = await supabaseAdmin
      .from('eventos')
      .select('id, nombre, capacidad, precio, activo, fecha_evento')
      .eq('id', rawEventoId)
      .eq('activo', true)
      .single();

    if (eventoError || !evento) {
      return NextResponse.json(
        { success: false, error: 'Evento no disponible' },
        { status: 400 }
      );
    }

    // Validar total si fue proporcionado
    const totalEsperado = rawAsistentes.length * evento.precio;
    if (typeof rawTotal === 'number' && Math.abs(rawTotal - totalEsperado) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'El total no coincide con el precio del evento' },
        { status: 400 }
      );
    }

    // ── LLAMADA ATÓMICA AL RPC CON FALLBACK DIRECTO ──
    const esGratuito = totalEsperado === 0;
    const statusInicial = (esGratuito || stripeKey === 'simulated') ? 'paid' : 'pending';
    
    let orderId: string;

    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('process_ticket_purchase', {
      p_evento_id: rawEventoId,
      p_asistentes: rawAsistentes,
      p_total_amount: totalEsperado,
      p_payment_status: statusInicial
    });

    if (!rpcError && rpcResult?.success && rpcResult?.order_id) {
      orderId = rpcResult.order_id;
    } else {
      // Si la función RPC no ha sido creada aún en el SQL Editor de Supabase, usar inserción directa
      if (rpcError?.message?.includes("Could not find the function") || rpcError?.code === "PGRST202") {
        console.warn("RPC process_ticket_purchase no encontrada en Supabase. Usando inserción directa de respaldo.");
        
        // 1. Crear Orden
        const { data: nuevaOrden, error: errOrden } = await supabaseAdmin
          .from('orders')
          .insert([{
            email_comprador: emailComprador || rawAsistentes[0].email,
            total_amount: totalEsperado,
            payment_status: statusInicial,
          }])
          .select('id')
          .single();

        if (errOrden || !nuevaOrden) {
          throw new Error(errOrden?.message || 'Error al crear la orden');
        }

        orderId = nuevaOrden.id;

        // 2. Crear Boletos (Usando columna fecha_compra oficial)
        const boletosPayload = rawAsistentes.map((ast: { nombreCompleto: string; email: string }) => ({
          evento_id: rawEventoId,
          order_id: orderId,
          email_comprador: ast.email,
          nombre_comprador: ast.nombreCompleto,
          precio_unitario: evento.precio,
          estado: statusInicial,
          fecha_compra: new Date().toISOString()
        }));

        const { error: errBoletos } = await supabaseAdmin
          .from('boletos')
          .insert(boletosPayload);

        if (errBoletos) {
          throw new Error(errBoletos.message || 'Error al crear boletos');
        }
      } else {
        return NextResponse.json(
          { success: false, error: rpcResult?.error || rpcError?.message || 'Error al procesar la reserva' },
          { status: 400 }
        );
      }
    }

    // ── BOLETOS GRATUITOS O MODO SIMULACIÓN ──
    if (esGratuito || stripeKey === 'simulated') {
      console.log(esGratuito ? '--- REGISTRO GRATUITO PROCESADO ---' : '--- MODO SIMULACIÓN ACTIVADO ---');
      
      // Disparar envío de correo en segundo plano
      sendTicketConfirmationEmail({
        orderId,
        emailComprador: emailComprador || rawAsistentes[0].email,
        nombreEvento: evento.nombre,
        fechaEvento: evento.fecha_evento,
        cantidadBoletos: rawAsistentes.length,
        totalAmount: totalEsperado,
        tickets: []
      }).catch(e => console.error("Async email dispatch error:", e));

      const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      return NextResponse.json({
        success: true,
        directIssued: true,
        orderId,
        url: `${origin}/checkout/success?order_id=${orderId}`
      });
    }

    // ── FLUJO REAL CON STRIPE ──
    const stripe = new Stripe(stripeKey);

    // Crear Stripe Checkout Session
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Boletos para ${evento.nombre}`,
              description: `${rawAsistentes.length} boleto(s) de acceso general`,
            },
            unit_amount: Math.round(evento.precio * 100),
          },
          quantity: rawAsistentes.length,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/boletos`,
      client_reference_id: orderId,
      metadata: {
        order_id: orderId,
        evento_id: rawEventoId,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Checkout error:', message);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}