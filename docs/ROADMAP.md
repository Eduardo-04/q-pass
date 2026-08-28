# 🗺️ Q-Pass — Roadmap Técnico y Plan de Producto

## 🎯 Objetivos del MVP

Transformar **Q-Pass** en una solución ligera, veloz y robusta para la venta y control de acceso a eventos locales en México (universidades, antros, congresos, torneos y recaudaciones).

---

## 📌 Estado de Fases de Desarrollo

### ✅ Fase A: Estabilización Inmediata (COMPLETADA)
- Resoluciones estricta de linter ESLint (0 errores, 0 advertencias).
- Verificación estática TypeScript (0 errores).
- Compilación de producción probada (`npm run build`).
- Creación de `.env.example` y actualización de `README.md`.

### ✅ Fase B: Fundaciones y Seguridad (COMPLETADA)
- **RBAC**: Permisos probados para `master`, `organizador`, `checador` y `staff`.
- **Firma HMAC en QR**: Creación de `lib/qr.ts` con generación y validación de tokens de QR firmados digitalmente.
- **Soporte Boletos Gratuitos ($0 MXN)**: Emisión e inserción atómica instantánea sin llamada a pasarela de pagos.
- **Aislamiento entre Organizadores**: Bloqueo estricto en `/api/validate` para evitar que un organizador escanee boletos de otro evento.
- **Documentación de Seguridad**: Creación del archivo `docs/SECURITY.md`.

### 🔄 Fase C: Flujo Esencial y Experiencia Pública (PRÓXIMA)
- Desarrollo de la página pública del evento `/eventos/[slug]` con información del organizador, mapa y selector directo.
- Mejoras UX en el formulario de datos de asistentes.

### ⏳ Fase D: Validación Avanzada y Scanner Móvil
- Historial local de escaneos y métricas rápidas de puerta en `/check-in`.
- Retroalimentación sonora en navegadores móviles compatibles.

### ⏳ Fase E: Notificaciones y Emails
- Integración de servicio transaccional (Resend / SendGrid) para envío automático del pase PDF adjunto por correo.

---

## 📋 Lista de Trabajo Pendiente Priorizado

1. **Página pública de evento (`/eventos/[slug]`)** — Alta.
2. **Envío automático de email transaccional con PDF** — Media.
3. **Múltiples zonas/tipos de boletos por evento (VIP, General)** — Media.
4. **Filtro de checadores asignados a eventos específicos en DB** — Media.
