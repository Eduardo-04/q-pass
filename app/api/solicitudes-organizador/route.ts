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

    // 1. Intentar guardar en la tabla dedicada solicitudes_organizador
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

    // 2. Si la tabla no existe aún, hacer fallback seguro insertando un perfil de cliente borrador
    if (errInsert) {
      console.warn("Tabla solicitudes_organizador no encontrada. Usando respaldo en perfiles_cliente:", errInsert.message);
      
      const dummyId = crypto.randomUUID();
      await supabaseAdmin.from('perfiles_cliente').insert([{
        user_id: dummyId,
        nombre_empresa: `📌 SOLICITUD: ${nombreEmpresa} (${nombreContacto} - Tel: ${telefono})`,
        comision_porcentaje: 10,
        comision_fija: 0
      }]);
    }

    // 3. Armar mensaje limpio sin caracteres ni codificación extraña para WhatsApp
    const mensajeLimpio = 
      `Hola Q-Pass! Solicito alta como Organizador para mi evento.\n\n` +
      `*Empresa / Evento:* ${nombreEmpresa}\n` +
      `*Contacto:* ${nombreContacto}\n` +
      `*Email:* ${email}\n` +
      `*Teléfono:* ${telefono}\n` +
      `*Aforo Estimado:* ${aforoEstimado || '100-500'}`;

    const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '529665939118';
    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(mensajeLimpio)}`;

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
