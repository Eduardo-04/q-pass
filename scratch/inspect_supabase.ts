import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function inspect() {
  console.log("=== INSPECCIONANDO BASE DE DATOS SUPABASE ===");

  const { data: authUsers, error: errAuth } = await supabase.auth.admin.listUsers();
  console.log("1. auth.users count:", authUsers?.users?.length, errAuth ? errAuth.message : "");
  if (authUsers?.users) {
    console.log("   auth.users:", authUsers.users.map(u => ({ id: u.id, email: u.email })));
  }

  const { data: perfiles, error: errPerf } = await supabase.from('perfiles').select('*');
  console.log("2. perfiles table:", perfiles, errPerf ? errPerf.message : "");

  const { data: perfilesCliente, error: errCli } = await supabase.from('perfiles_cliente').select('*');
  console.log("3. perfiles_cliente table:", perfilesCliente, errCli ? errCli.message : "");

  const { data: eventos, error: errEv } = await supabase.from('eventos').select('*');
  console.log("4. eventos table count:", eventos?.length, errEv ? errEv.message : "");

  const { data: solicitudes, error: errSol } = await supabase.from('solicitudes_organizador').select('*');
  console.log("5. solicitudes_organizador table:", solicitudes, errSol ? errSol.message : "");
}

inspect();
