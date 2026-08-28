import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombreEmpresa, nombreContacto, email, telefono, aforoEstimado } = body;

    if (!nombreEmpresa || !nombreContacto || !email || !telefono) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos marcados con * son obligatorios.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Intentar guardar en la tabla solicitudes_organizador (si existe)
    const { error: errInsert } = await supabaseAdmin
      .from('solicitudes_organizador')
      .insert([
        {
          nombre_empresa: nombreEmpresa,
          nombre_contacto: nombreContacto,
          email: email.toLowerCase().trim(),
          telefono,
          aforo_estimado: aforoEstimado || '100-500',
          estado: 'pendiente'
        }
      ]);

    if (errInsert) {
      console.warn("Tabla solicitudes_organizador no existe aún o dio error. Guardando en consola:", errInsert.message);
    }

    // Armar mensaje pre-construido de WhatsApp
    const mensajeWA = encodeURIComponent(
      `Hola Q-Pass 👋, solicito alta como Organizador para mi evento.\n\n` +
      `🏢 *Empresa/Evento:* ${nombreEmpresa}\n` +
      `👤 *Contacto:* ${nombreContacto}\n` +
      `✉️ *Email:* ${email}\n` +
      `📞 *Teléfono:* ${telefono}\n` +
      `🎟️ *Aforo Estimado:* ${aforoEstimado || '100-500'}`
    );

    const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '529665939118';
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${mensajeWA}`;

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada correctamente',
      whatsappUrl
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error procesando la solicitud';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { user, role, error } = await requireAuth(['master']);
    if (error || !user || role !== 'master') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    const { data, error: errFetch } = await supabaseAdmin
      .from('solicitudes_organizador')
      .select('*')
      .order('created_at', { ascending: false });

    if (errFetch) {
      return NextResponse.json({ success: true, solicitudes: [] });
    }

    return NextResponse.json({ success: true, solicitudes: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener solicitudes';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
