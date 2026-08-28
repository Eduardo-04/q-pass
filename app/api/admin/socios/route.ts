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
