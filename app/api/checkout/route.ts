import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, eventoId } = await req.json();

    const { data, error } = await supabaseAdmin
      .from('boletos')
      .insert([{ 
        evento_id: eventoId, 
        email_comprador: email, 
        estado: 'activo' 
        // Nota: fecha_compra se llena sola con NOW() si lo pusiste en el SQL
      }])
      .select()
      .single();

    if (error) {
      console.error("Error Supabase:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket: data });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Error en el servidor" }, { status: 500 });
  }
}