import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'URL no válida' }, { status: 400 });
    }

    // Fetch imagen en el servidor (sin bloqueos de CORS del navegador)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: `No se pudo descargar la imagen (Status ${res.status})` }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      base64
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la imagen externa';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
