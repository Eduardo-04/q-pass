import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/lib/auth';
import { verifyAndExtractTicketId } from '@/lib/qr';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // ── 1. Verificar autenticación y rol de usuario ──
    const { user, role, error: authError } = await requireAuth(['master', 'organizador', 'checador']);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError || 'No autorizado' },
        { status: 401 }
      );
    }

    const { ticketId: rawToken } = await req.json();

    if (!rawToken || typeof rawToken !== 'string') {
      return NextResponse.json(
        { success: false, message: "Código QR no proporcionado o de formato inválido" },
        { status: 400 }
      );
    }

    // ── 2. Validar token firmado de QR ──
    const qrValidation = verifyAndExtractTicketId(rawToken);
    if (!qrValidation.valid || !qrValidation.ticketId) {
      return NextResponse.json(
        { success: false, message: qrValidation.reason || "Código QR no válido o alterado" },
        { status: 400 }
      );
    }

    const realTicketId = qrValidation.ticketId;
    const supabaseAdmin = createAdminClient();

    // ── 3. Buscar el boleto con información del evento ──
    const { data: ticket, error } = await supabaseAdmin
      .from('boletos')
      .select('*, eventos(id, nombre, organizador_id)')
      .eq('id', realTicketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json(
        { success: false, message: "Boleto no encontrado en la base de datos" },
        { status: 404 }
      );
    }

    // ── 4. Verificar autorización sobre el evento (Aislamiento entre organizadores) ──
    const evento = ticket.eventos as { id?: string; nombre?: string; organizador_id?: string } | null;
    if (role === 'organizador' && evento?.organizador_id && evento.organizador_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Sin permiso: Este boleto pertenece a un evento de otro organizador" },
        { status: 403 }
      );
    }

    // ── 5. Revisar si ya fue usado ──
    if (ticket.estado === 'usado') {
      return NextResponse.json(
        { success: false, message: "¡ALERTA! Este boleto ya fue validado anteriormente." },
        { status: 400 }
      );
    }

    // ── 6. Verificar estado activo o pagado ──
    if (ticket.estado !== 'activo' && ticket.estado !== 'paid') {
      return NextResponse.json(
        { success: false, message: `Boleto no válido. Estado actual: ${ticket.estado}` },
        { status: 400 }
      );
    }

    // ── 7. Marcar atómicamente como usado ──
    const { error: updateError } = await supabaseAdmin
      .from('boletos')
      .update({ estado: 'usado' })
      .eq('id', realTicketId);

    if (updateError) throw updateError;

    const eventName = (ticket.eventos as { nombre?: string })?.nombre;

    return NextResponse.json({
      success: true,
      message: "Acceso Permitido",
      email: ticket.email_comprador,
      ticketId: ticket.id,
      eventName: eventName || undefined,
    });

  } catch (err) {
    console.error('Validate error:', err);
    return NextResponse.json(
      { success: false, message: "Error en el servidor" },
      { status: 500 }
    );
  }
}