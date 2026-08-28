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

    // MODO SIMULACIÓN
    if (id.startsWith('sim_')) {
      const parts = id.split('_');
      const orderId = parts[1];
      const eventoId = parts[2];

      if (!orderId || !eventoId) {
        return NextResponse.json(
          { success: false, error: 'Session ID inválido' },
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
        .select('id, nombre_comprador, email_comprador, estado')
        .eq('order_id', orderId);

      const { data: evento } = await supabaseAdmin
        .from('eventos')
        .select('id, nombre, fecha_evento, precio')
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
      .select('id, nombre, fecha_evento, precio')
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
