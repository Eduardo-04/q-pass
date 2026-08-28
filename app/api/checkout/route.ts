import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, eventoId } = await req.json();

    if (!email || !eventoId) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('boletos')
      .insert([{ 
        evento_id: eventoId, 
        email_comprador: email, 
        estado: 'activo' 
      }])
      .select()
      .single();

    if (error) {
      console.error("Error Supabase:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket: data });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ success: false, error: "Error en el servidor" }, { status: 500 });
  }
}