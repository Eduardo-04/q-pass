# 🛡️ Q-Pass — Modelo de Seguridad y Protección de Accesos

Este documento describe la arquitectura de seguridad, control de acceso (RBAC), firma de boletos y protección de datos implementados en **Q-Pass**.

---

## 🔐 1. Modelo de Roles y Permisos (RBAC)

El acceso a la plataforma se gobierna a nivel perimetral en `middleware.ts` y en cada endpoint mediante la verificación de la tabla `perfiles` en Supabase:

| Rol | Descripción | Acceso a Rutas | Permisos de API / Datos |
|---|---|---|---|
| `master` | Superadministrador de la plataforma | `/admin`, `/dashboard`, `/check-in`, `/login` | Acceso global a todos los eventos, perfiles de socios y configuración de comisiones. |
| `organizador` | Dueño de evento o bolera | `/admin`, `/dashboard`, `/check-in`, `/login` | Gestiona únicamente sus propios eventos y visualiza las métricas de sus boletos. |
| `checador` | Personal de puerta | `/check-in`, `/login` | Solo puede validar códigos QR en la ruta de escaneo. No tiene acceso a paneles ni a crear eventos. |
| `staff` | Rol base sin privilegios | `/login` | Sin permisos administrativos por defecto. |

---

## 🎟️ 2. Firma Digital HMAC en Códigos QR

Para prevenir la falsificación o adulteración de boletos QR:

1. **Generación de Token Firmado**:
   - Cada código QR emitido no es un UUID desnudo.
   - Formato: `<ticketId>.<hmac_signature_16char>`
   - La firma se calcula mediante **HMAC-SHA256** utilizando la clave secreta del servidor (`SUPABASE_SERVICE_ROLE_KEY`).

2. **Validación Atómica en Puerta**:
   - Al escanear el QR en `/check-in`, el backend en `POST /api/validate` verifica la firma digital del token.
   - Si la firma no coincide con el `ticketId`, el acceso se rechaza inmediatamente con el mensaje *"Firma de seguridad inválida (QR falsificado o alterado)"*.
   - Si el boleto pertenece a otro organizador, el backend bloquea la validación con error `403 Forbidden`.
   - Se mantiene compatibilidad con UUIDs sin firma emitidos anteriormente en fases de desarrollo.

---

## 💳 3. Reglas de Pagos y Emisión

1. **Sin Almacenamiento de Tarjetas**:
   - Q-Pass nunca procesa ni almacena números de tarjeta ni datos PCI-DSS. Todos los pagos con tarjeta son procesados de forma segura por Stripe Checkout.
2. **Boletos Gratuitos ($0 MXN)**:
   - Los registros de boletos gratuitos se procesan de forma inmediata en el backend sin invocar Stripe, creando la orden y emitiendo el pase al instante.
3. **Webhooks Verificados**:
   - La actualización del estado de pago a `paid` y la activación de boletos solo ocurren previa verificación de la firma del Webhook de Stripe en `/api/webhooks/stripe`.

---

## 🔑 4. Manejo de Secretos y Variables de Entorno

- Las claves del cliente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) están restringidas a operaciones públicas con Row Level Security (RLS).
- La clave `SUPABASE_SERVICE_ROLE_KEY` y `STRIPE_SECRET_KEY` **NUNCA** se incluyen en el bundle del cliente y solo se ejecutan en API routes dentro del servidor Next.js.
