import crypto from 'crypto';

const QR_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'qpass-secure-qr-secret-key-default';

/**
 * Genera un token de QR firmado digitalmente usando HMAC-SHA256.
 * Formato: <ticketId>.<signature_16char>
 */
export function generateSignedQRToken(ticketId: string): string {
  if (!ticketId) return '';
  
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(ticketId)
    .digest('hex')
    .substring(0, 16);

  return `${ticketId}.${signature}`;
}

/**
 * Valida un token de QR escaneado.
 * Retorna el ticketId si la firma es válida o si coincide con formato UUID legacy.
 */
export function verifyAndExtractTicketId(token: string): { valid: boolean; ticketId: string | null; reason?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, ticketId: null, reason: 'Token vacío o de formato inválido' };
  }

  const cleanToken = token.trim();

  // Caso A: Token firmado (ticketId.signature)
  if (cleanToken.includes('.')) {
    const parts = cleanToken.split('.');
    if (parts.length !== 2) {
      return { valid: false, ticketId: null, reason: 'Estructura del código QR inválida' };
    }

    const [ticketId, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(ticketId)
      .digest('hex')
      .substring(0, 16);

    if (signature !== expectedSignature) {
      return { valid: false, ticketId: null, reason: 'Firma de seguridad inválida (QR falsificado o alterado)' };
    }

    return { valid: true, ticketId };
  }

  // Caso B: Legacy UUID (soporte retrocompatible)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(cleanToken)) {
    return { valid: true, ticketId: cleanToken };
  }

  return { valid: false, ticketId: null, reason: 'Código QR no reconocido por el sistema' };
}
