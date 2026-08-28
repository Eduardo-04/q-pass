import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/utils/supabase/admin';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripeKey || !endpointSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const supabaseAdmin = createAdminClient();

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      console.log(`Payment successful for order: ${orderId}`);
      
      // Update order status
      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);

      if (orderError) {
        console.error('Error updating order status:', orderError);
      }

      // Update tickets status
      const { error: ticketsError } = await supabaseAdmin
        .from('boletos')
        .update({ estado: 'activo' })
        .eq('order_id', orderId);

      if (ticketsError) {
        console.error('Error updating tickets status:', ticketsError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
