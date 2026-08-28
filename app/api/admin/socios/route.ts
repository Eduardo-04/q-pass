import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { user, role, error } = await requireAuth(['master']);
    if (error || !user || role !== 'master') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Cargar todos los usuarios con rol master u organizador desde perfiles (usando admin client)
    const { data: allPerfiles, error: errPerfiles } = await supabaseAdmin
      .from('perfiles')
      .select('id, email, rol, nombre');

    if (errPerfiles) {
      console.error("Error al cargar perfiles:", errPerfiles.message);
    }

    // 2. Cargar todas las configuraciones de comisiones desde perfiles_cliente
    const { data: clientProfiles } = await supabaseAdmin
      .from('perfiles_cliente')
      .select('*');

    const profilesMap = new Map((clientProfiles || []).map(p => [p.user_id, p]));

    const finalProfiles = [];
    for (const u of (allPerfiles || [])) {
      if (u.rol === 'master' || u.rol === 'organizador') {
        let prof = profilesMap.get(u.id);
        if (!prof) {
          prof = {
            user_id: u.id,
            comision_porcentaje: 10,
            comision_fija: 0,
            nombre_empresa: u.nombre || u.email?.split('@')[0] || 'Socio Q-Pass'
          };
          // Persistir borrador de perfil
          await supabaseAdmin.from('perfiles_cliente').upsert(prof);
        }
        finalProfiles.push(prof);
      }
    }

    // 3. También cargar solicitudes entrantes si existe la tabla
    let solicitudes: any[] = [];
    try {
      const { data: dataSol } = await supabaseAdmin
        .from('solicitudes_organizador')
        .select('*')
        .order('created_at', { ascending: false });
      if (dataSol) solicitudes = dataSol;
    } catch {
      // Ignorar si la tabla no existe
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
