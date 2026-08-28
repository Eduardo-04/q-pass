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

### ✅ Fase C: Flujo Esencial y Experiencia Pública (COMPLETADA)
- Desarrollo completo de la página pública del detalle del evento (`/eventos/[slug]`).
- Selector dinámico de cantidad de boletos y formulario expansible para capturar asistentes múltiples.
- Confirmación instantánea para boletos de $0 MXN y redirección a pasarela/simulación para boletos de pago.
- Diseño visual alineado con la identidad de marca (dark mode `#0a0f14`, degradados cian neón y cristal).

### ✅ Fase D: Validación Avanzada y Scanner Móvil (COMPLETADA)
- **Retroalimentación Acústica (Web Audio API)**: Tonos sintéticos agudos (éxito) y tonos graves de alerta (error / duplicado) en navegadores móviles sin depender de archivos de audio externos.
- **Validación Manual por Código**: Caja de entrada rápida en `/check-in` para digitar IDs o tokens en caso de pantallas móviles rotas o sucias.
- **Detección Atómica de Re-uso**: Identificación explícita cuando un boleto ya fue usado.

### ✅ Fase E: Panel Administrativo, Métricas y Notificaciones (COMPLETADA)
- **Email Transaccional (`lib/email.ts`)**: Módulo con la REST API de Resend y fallback seguro a prueba de fallos.
- **Barra de Progreso de Asistencia**: Avance visual en tiempo real de boletos escaneados vs pendientes en `/dashboard`.
- **Reportes Contables en Excel / CSV**: Descarga inmediata de la lista de asistentes con folios y montos.

### ✅ Fase F: Suite de Pruebas de Integración E2E (COMPLETADA)
- **Script de Pruebas E2E Automáticas (`npm run test:e2e`)**: Suite que prueba de principio a fin la creación de eventos en Supabase, emisión atómica de boletos, firma HMAC, escaneo de puerta, prevención de re-escaneo y limpieza de datos.
- **Compilación de Producción**: Verificada limpiamente con `npm run build` (14 rutas compiladas sin errores).

---

## 📋 Lista de Trabajo Pendiente Priorizado (Backlog Futuro)

1. **Poster/Portada del Evento (`imagen_url`)**: Permitir subida/URL de banner promocional en la página del evento `/eventos/[slug]`.
2. **Múltiples zonas/tipos de boletos por evento (VIP, General)** — Media.
3. **Filtro de checadores asignados a eventos específicos en DB** — Media.
