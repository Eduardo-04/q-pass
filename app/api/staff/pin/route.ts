import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, pin, nombre, eventoId, organizadorId } = body;
    const supabaseAdmin = createAdminClient();

    // 1. Acción: Autenticar por PIN para personal de puerta
    if (action === 'verify' || (!action && pin)) {
      if (!pin || String(pin).trim().length < 4) {
        return NextResponse.json({ success: false, error: 'Por favor ingresa un PIN válido de al menos 4 dígitos' }, { status: 400 });
      }

      const cleanPin = String(pin).trim();

      // Buscar si el PIN pertenece a un usuario de Auth tipo checador o en la tabla de perfiles
      const { data: perfilesStaff } = await supabaseAdmin
        .from('perfiles')
        .select('*')
        .eq('rol', 'checador');

      // Buscar el perfil de staff cuya contraseña o metadata coincida con el PIN
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      const checadorUser = authData?.users?.find(u => 
        u.user_metadata?.pin === cleanPin || u.email?.startsWith(`checador_${cleanPin}`)
      );

      if (!checadorUser) {
        return NextResponse.json({ success: false, error: 'PIN de acceso no válido o expirado' }, { status: 401 });
      }

      // Generar sesión o token temporal
      const staffEmail = checadorUser.email || `checador_${cleanPin}@qpass.com`;
      const staffName = checadorUser.user_metadata?.nombre || 'Validador de Puerta';

      return NextResponse.json({
        success: true,
        message: 'Acceso autorizado como Personal de Puerta',
        user: {
          id: checadorUser.id,
          email: staffEmail,
          nombre: staffName,
          rol: 'checador'
        },
        redirectTo: '/check-in'
      });
    }

    // 2. Acción: Crear un nuevo PIN de Staff / Checador (invocado desde /admin por Superadmin u Organizador)
    if (action === 'create') {
      if (!nombre) {
        return NextResponse.json({ success: false, error: 'Proporciona el nombre de la puerta o validador' }, { status: 400 });
      }

      const generatedPin = pin ? String(pin).trim() : String(Math.floor(1000 + Math.random() * 9000));
      const staffEmail = `checador_${generatedPin}@qpass.com`;
      const tempPassword = `Pass#${generatedPin}!`;

      // Crear usuario en Auth de Supabase
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: staffEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nombre, pin: generatedPin, organizador_id: organizadorId, evento_id: eventoId }
      });

      let staffId = newUser?.user?.id;
      if (createErr || !staffId) {
        const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listUsers?.users?.find(u => u.email === staffEmail);
        if (existing) staffId = existing.id;
      }

      if (staffId) {
        // Registrar en tabla perfiles como checador
        await supabaseAdmin.from('perfiles').upsert({
          id: staffId,
          email: staffEmail,
          nombre: `[Staff] ${nombre}`,
          rol: 'checador'
        });
      }

      const shareMessage = 
        `🔑 *Acceso de Staff Q-Pass*\n` +
        `*Puerta / Validador:* ${nombre}\n` +
        `*PIN de Acceso:* ${generatedPin}\n` +
        `*Link:* ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`;

      return NextResponse.json({
        success: true,
        message: `Personal de puerta '${nombre}' registrado con éxito`,
        pin: generatedPin,
        email: staffEmail,
        password: tempPassword,
        shareMessage
      });
    }

    return NextResponse.json({ success: false, error: 'Acción no reconocida' }, { status: 400 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error procesando PIN';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
