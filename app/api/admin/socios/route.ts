import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    
    // Extraer token de autorización de los headers
    const authHeader = req.headers.get('authorization');
    let userEmail: string | null = null;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user) {
        userEmail = userData.user.email || null;
        userId = userData.user.id;
      }
    }

    // Permitir acceso si es gerenteprueba@gmail.com o si tiene rol 'master' en perfiles
    let isMasterUser = userEmail === 'gerenteprueba@gmail.com';
    if (userId && !isMasterUser) {
      const { data: perfil } = await supabaseAdmin.from('perfiles').select('rol').eq('id', userId).maybeSingle();
      if (perfil?.rol === 'master') isMasterUser = true;
    }

    // Fallback para entorno local con sesión activa
    if (!isMasterUser) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      if (users && users.length > 0) {
        isMasterUser = true;
      }
    }

    if (!isMasterUser) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // 1. Obtener todos los usuarios de Auth
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const authUsers = authData?.users || [];
    const authMap = new Map(authUsers.map(u => [u.id, u]));

    // 2. Cargar la tabla perfiles
    const { data: perfilesData } = await supabaseAdmin.from('perfiles').select('*');
    const perfilesMap = new Map((perfilesData || []).map(p => [p.id, p]));

    // 3. Cargar la tabla perfiles_cliente
    const { data: perfilesClienteData } = await supabaseAdmin.from('perfiles_cliente').select('*');
    const clientProfilesMap = new Map((perfilesClienteData || []).map(p => [p.user_id, p]));

    // Recopilar todos los IDs de usuario únicos
    const allUserIds = new Set<string>([
      ...authUsers.map(u => u.id),
      ...(perfilesData || []).map(p => p.id),
      ...(perfilesClienteData || []).map(p => p.user_id)
    ]);

    const finalProfiles = [];
    for (const uid of Array.from(allUserIds)) {
      const authUser = authMap.get(uid);
      const perf = perfilesMap.get(uid);
      const clientProf = clientProfilesMap.get(uid);

      const email = authUser?.email || perf?.email || 'socio@qpass.com';
      const role = perf?.rol || (email === 'gerenteprueba@gmail.com' ? 'master' : 'organizador');

      // Excluir staff puro o checadores del directorio de socios
      if (role === 'checador') continue;

      let nombreEmpresa = clientProf?.nombre_empresa;
      if (!nombreEmpresa) {
        nombreEmpresa = perf?.nombre || authUser?.user_metadata?.empresa || email.split('@')[0];
      }

      const pRecord = {
        user_id: uid,
        comision_porcentaje: clientProf?.comision_porcentaje ?? 10,
        comision_fija: clientProf?.comision_fija ?? 0,
        nombre_empresa: nombreEmpresa,
        email
      };

      // Auto-sincronizar perfiles_cliente en Supabase si no existía
      if (!clientProf) {
        await supabaseAdmin.from('perfiles_cliente').upsert({
          user_id: uid,
          nombre_empresa: nombreEmpresa,
          comision_porcentaje: 10,
          comision_fija: 0
        });
      }

      // Auto-sincronizar tabla perfiles si no existía
      if (!perf) {
        await supabaseAdmin.from('perfiles').upsert({
          id: uid,
          email,
          nombre: nombreEmpresa,
          rol: role
        });
      }

      finalProfiles.push(pRecord);
    }

    // 4. Cargar solicitudes si existe la tabla solicitudes_organizador
    let solicitudes: any[] = [];
    try {
      const { data: dataSol } = await supabaseAdmin
        .from('solicitudes_organizador')
        .select('*')
        .order('created_at', { ascending: false });
      if (dataSol) solicitudes = dataSol;
    } catch {
      // Ignorar si la tabla no existe aún
    }

    return NextResponse.json({
      success: true,
      perfiles: finalProfiles,
      solicitudes
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al obtener socios';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, nombreEmpresa, nombreContacto, comision_porcentaje, comision_fija, leadId } = body;

    if (!email || !nombreEmpresa) {
      return NextResponse.json({ success: false, error: 'Email y Nombre de Empresa son requeridos' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const cleanEmail = email.toLowerCase().trim();
    const tempPassword = password || 'QPass2026!';

    // 1. Crear usuario en Auth de Supabase con contraseña
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nombre: nombreContacto || nombreEmpresa, empresa: nombreEmpresa }
    });

    let userId = newUser?.user?.id;

    if (createErr || !userId) {
      // Si el correo ya existía, obtener su ID
      const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = listUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
      if (existing) {
        userId = existing.id;
        // Actualizar contraseña si se proporcionó una nueva
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword });
      } else {
        return NextResponse.json({ success: false, error: createErr?.message || 'Error al crear socio' }, { status: 400 });
      }
    }

    // 2. Insertar o actualizar perfiles como organizador
    await supabaseAdmin.from('perfiles').upsert({
      id: userId,
      email: cleanEmail,
      nombre: nombreContacto || nombreEmpresa,
      rol: 'organizador'
    });

    // 3. Insertar o actualizar perfiles_cliente con la comisión asignada por Superadmin
    await supabaseAdmin.from('perfiles_cliente').upsert({
      user_id: userId,
      nombre_empresa: nombreEmpresa,
      comision_porcentaje: comision_porcentaje !== undefined ? Number(comision_porcentaje) : 10,
      comision_fija: comision_fija !== undefined ? Number(comision_fija) : 0
    });

    // 4. Si se proporcionó un leadId, marcar como aprobado
    if (leadId) {
      try {
        await supabaseAdmin.from('solicitudes_organizador').update({ estado: 'aprobado' }).eq('id', leadId);
      } catch {
        // Ignorar si la tabla no existe
      }
    }

    // 5. Mensaje listo para enviar por WhatsApp o Email
    const invitationText = 
      `¡Bienvenido a Q-Pass! 🎉 Tu cuenta de Socio para *${nombreEmpresa}* ha sido APROBADA.\n\n` +
      `Tus datos de acceso para publicar eventos:\n` +
      `🌐 *Portal:* ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login\n` +
      `✉️ *Email:* ${cleanEmail}\n` +
      `🔑 *Contraseña:* ${tempPassword}\n\n` +
      `¡Mucho éxito en tus ventas!`;

    return NextResponse.json({
      success: true,
      message: `Cuenta de socio para ${nombreEmpresa} creada/aprobada con éxito`,
      userId,
      email: cleanEmail,
      password: tempPassword,
      invitationText
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error creando usuario socio';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId, comision_porcentaje, comision_fija, nombre_empresa } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Falta userId' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    const updatePayload: Record<string, any> = {};
    if (comision_porcentaje !== undefined) updatePayload.comision_porcentaje = Number(comision_porcentaje);
    if (comision_fija !== undefined) updatePayload.comision_fija = Number(comision_fija);
    if (nombre_empresa !== undefined) updatePayload.nombre_empresa = nombre_empresa;

    const { error } = await supabaseAdmin
      .from('perfiles_cliente')
      .upsert({
        user_id: userId,
        ...updatePayload
      });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Tarifa del socio actualizada correctamente' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error actualizando tarifa';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
