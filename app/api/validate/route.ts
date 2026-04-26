import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { ticketId } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ success: false, message: "ID no proporcionado" }, { status: 400 });
    }

    // 1. Buscar el boleto
    const { data: ticket, error } = await supabaseAdmin
      .from('boletos')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ success: false, message: "Boleto no encontrado" }, { status: 404 });
    }

    // 2. Revisar si ya se usó
    if (ticket.estado === 'usado') {
      return NextResponse.json({ success: false, message: "¡ALERTA! Ya fue validado" }, { status: 400 });
    }

    // 3. Marcar como usado
    const { error: updateError } = await supabaseAdmin
      .from('boletos')
      .update({ estado: 'usado' })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: "Acceso Permitido", 
      email: ticket.email_comprador 
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: "Error en el servidor" }, { status: 500 });
  }
}