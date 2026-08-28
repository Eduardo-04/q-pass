interface TicketEmailPayload {
  orderId: string;
  emailComprador: string;
  nombreEvento: string;
  fechaEvento: string;
  cantidadBoletos: number;
  totalAmount: number;
  tickets: Array<{
    id: string;
    nombre_comprador?: string;
    qr_token?: string;
  }>;
}

/**
 * Genera la plantilla HTML responsive con identidad visual Q-Pass para el correo transaccional.
 */
function buildEmailTemplate(data: TicketEmailPayload): string {
  const fecha = new Date(data.fechaEvento).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tus Accesos Q-Pass</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0a0f14; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #111823; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
        .header { background-color: #0a0f14; padding: 24px; text-align: center; border-bottom: 1px solid #1e293b; }
        .logo { font-size: 24px; font-weight: bold; color: #22d1ee; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; background-color: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.3); color: #22d1ee; font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
        .title { font-size: 22px; font-weight: bold; margin-top: 0; color: #ffffff; }
        .event-card { background-color: #0a0f14; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; color: #94a3b8; }
        .detail-val { color: #ffffff; font-weight: bold; }
        .btn { display: block; width: 100%; text-align: center; background: linear-gradient(90deg, #0891b2, #0284c7); color: #ffffff; font-weight: bold; text-decoration: none; padding: 14px 0; border-radius: 12px; margin-top: 24px; font-size: 15px; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div style="padding: 20px 10px;">
        <div class="container">
          <div class="header">
            <div class="logo">Q-PASS DIGITAL</div>
          </div>
          <div class="content">
            <span class="badge">Confirmación de Reserva</span>
            <h1 class="title">¡Tus boletos están listos!</h1>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
              Gracias por tu compra. Presenta tus códigos QR en tu teléfono móvil al ingresar al evento.
            </p>

            <div class="event-card">
              <div style="color: #22d1ee; font-size: 16px; font-weight: bold; margin-bottom: 12px;">${data.nombreEvento}</div>
              <div class="detail-row">
                <span>Fecha:</span>
                <span class="detail-val" style="text-transform: capitalize;">${fecha}</span>
              </div>
              <div class="detail-row">
                <span>Boletos Adquiridos:</span>
                <span class="detail-val">${data.cantidadBoletos} ${data.cantidadBoletos === 1 ? 'entrada' : 'entradas'}</span>
              </div>
              <div class="detail-row">
                <span>Total Pagado:</span>
                <span class="detail-val">$${data.totalAmount.toFixed(2)} MXN</span>
              </div>
              <div class="detail-row">
                <span>Folio de Orden:</span>
                <span class="detail-val" style="font-family: monospace;">${data.orderId.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?order_id=${data.orderId}" class="btn">
              Ver Boletos QR y Descargar PDF
            </a>
          </div>
          <div class="footer">
            Q-Pass • Sistema Digital de Boletos y Control de Acceso <br>
            Lizard Tech México
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envía el correo transaccional utilizando la REST API de Resend (si RESEND_API_KEY está configurado).
 * Si no hay API Key, realiza un fallback transparente en consola sin detener la app.
 */
export async function sendTicketConfirmationEmail(payload: TicketEmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey === 'simulated' || apiKey.startsWith('your_')) {
    console.log(`[Email Service Simulation] Correo de confirmación enviado a ${payload.emailComprador} (Orden: ${payload.orderId})`);
    return { success: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Q-Pass Boletos <onboarding@resend.dev>',
        to: [payload.emailComprador],
        subject: `🎟️ Tus accesos para ${payload.nombreEvento} - Q-Pass`,
        html: buildEmailTemplate(payload),
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error('[Resend Email Error]:', resData);
      return { success: false, error: resData.message || 'Error al enviar correo por Resend' };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido de correo';
    console.error('[Email Dispatch Error]:', msg);
    return { success: false, error: msg };
  }
}
