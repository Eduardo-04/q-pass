import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { generateSignedQRToken } from '@/lib/qr';
import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseAdmin = createAdminClient();

    // MODO SIMULACIÓN O BÚSQUEDA DIRECTA POR ORDER_ID
    if (id.startsWith('sim_') || !id.startsWith('cs_')) {
      let orderId = id;
      let eventoIdFromSim: string | null = null;

      if (id.startsWith('sim_')) {
        const parts = id.split('_');
        orderId = parts[1];
        eventoIdFromSim = parts[2] || null;
      }

      if (!orderId) {
        return NextResponse.json(
          { success: false, error: 'Identificador de orden inválido' },
          { status: 400 }
        );
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { success: false, error: 'Orden no encontrada' },
          { status: 404 }
        );
      }

      const { data: tickets } = await supabaseAdmin
        .from('boletos')
        .select('id, nombre_comprador, email_comprador, estado, evento_id')
        .eq('order_id', orderId);

      const targetEventoId = eventoIdFromSim || (tickets && tickets[0]?.evento_id);

      let eventoData = null;
      if (targetEventoId) {
        const { data: ev } = await supabaseAdmin
          .from('eventos')
          .select('id, nombre, fecha_evento, precio, banner_url')
          .eq('id', targetEventoId)
          .single();
        eventoData = ev;
      }

      const ticketsWithQr = (tickets || []).map(t => ({
        ...t,
        qr_token: generateSignedQRToken(t.id)
      }));

      return NextResponse.json({
        success: true,
        order,
        tickets: ticketsWithQr,
        evento: eventoData,
        payment_status: 'paid'
      });
    }

    // FLUJO REAL CON STRIPE
    if (!stripeKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey);

    const session = await stripe.checkout.sessions.retrieve(id);
    
    if (!session || !session.metadata?.order_id) {
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    const orderId = session.metadata.order_id;
    const eventoId = session.metadata.evento_id;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from('boletos')
      .select('id, nombre_comprador, email_comprador, estado')
      .eq('order_id', orderId);

    if (ticketsError) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener boletos' },
        { status: 500 }
      );
    }

    const { data: evento } = await supabaseAdmin
      .from('eventos')
      .select('id, nombre, fecha_evento, precio, banner_url')
      .eq('id', eventoId)
      .single();

    const ticketsWithQr = (tickets || []).map(t => ({
      ...t,
      qr_token: generateSignedQRToken(t.id)
    }));

    return NextResponse.json({
      success: true,
      order,
      tickets: ticketsWithQr,
      evento,
      payment_status: session.payment_status
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error fetching order:', message);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
