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
    const cleanEmail = email.toLowerCase().trim();

    // 1. Intentar guardar en la tabla dedicada solicitudes_organizador
    const { error: errInsert } = await supabaseAdmin
      .from('solicitudes_organizador')
      .insert([
        {
          nombre_empresa: nombreEmpresa,
          nombre_contacto: nombreContacto,
          email: cleanEmail,
          telefono,
          aforo_estimado: aforoEstimado || '100-500',
          estado: 'pendiente'
        }
      ]);

    // 2. Si la tabla dedicada no existe aún en Supabase, auto-crear la cuenta de socio en Auth y Perfiles
    if (errInsert) {
      console.warn("Tabla solicitudes_organizador no existe en Supabase. Creando cuenta de socio en perfiles_cliente:", errInsert.message);
      
      try {
        // Intentar crear usuario con su correo
        let { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: true,
          user_metadata: { nombre: nombreContacto, empresa: nombreEmpresa }
        });

        let targetEmail = cleanEmail;
        let targetUserId = newUser?.user?.id;

        // Si el correo ya existía en Auth (ej. pruebas repetidas con el mismo email),
        // creamos una cuenta de socio secundaria única para evitar sobreescribir al socio existente
        if (createErr || !targetUserId) {
          targetEmail = `socio_${Date.now()}@qpass.com`;
          const { data: fallbackUser } = await supabaseAdmin.auth.admin.createUser({
            email: targetEmail,
            email_confirm: true,
            user_metadata: { nombre: nombreContacto, empresa: nombreEmpresa, emailOriginal: cleanEmail }
          });
          targetUserId = fallbackUser?.user?.id;
        }

        if (targetUserId) {
          // Registrar en tabla perfiles como organizador
          await supabaseAdmin.from('perfiles').upsert({
            id: targetUserId,
            email: targetEmail,
            nombre: nombreContacto,
            rol: 'organizador'
          });

          // Registrar en perfiles_cliente con el nombre de la empresa
          await supabaseAdmin.from('perfiles_cliente').upsert({
            user_id: targetUserId,
            nombre_empresa: nombreEmpresa,
            comision_porcentaje: 10,
            comision_fija: 0
          });
        }
      } catch (authErr) {
        console.error("Error en auto-provisionamiento de socio:", authErr);
      }
    }

    // 3. Armar mensaje limpio de WhatsApp
    const mensajeLimpio = 
      `Hola Q-Pass! Solicito alta como Organizador para mi evento.\n\n` +
      `*Empresa / Evento:* ${nombreEmpresa}\n` +
      `*Contacto:* ${nombreContacto}\n` +
      `*Email:* ${cleanEmail}\n` +
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
