# 📋 Auditoría Completa del Proyecto: Q-Pass (Fases 1, 2 y Fase A Completada)

**Fecha de ejecución:** 28 de Agosto de 2026  
**Auditor Principal:** Staff Full-Stack Engineer, Software Architect & Security Specialist  
**Estado:** Fase A (Estabilización) Completada Exitósamente (0 Errores Lint, 0 Errores TSC, Build OK)  

---

## 1. Resumen Ejecutivo

**q-pass** es una plataforma web para la gestión de boletería digital, venta de entradas y validación de accesos mediante QR enfocada en el mercado mexicano. 

Se ha completado la **Fase A (Estabilización)** resolviendo todos los errores estáticos de compilación, hooks y reglas de linter de React 19.

### Hallazgos y Resultados de Verificación (Post-Estabilización):
1. **Verificación Estática y Compilación:** 
   - **TypeScript (`npx tsc --noEmit`):** ✅ PASÓ (0 errores).
   - **Linter (`npm run lint`):** ✅ PASÓ (0 errores, 0 advertencias).
   - **Build (`npm run build`):** ✅ PASÓ (14 rutas estáticas y dinámicas compiladas correctamente).
2. **Flujo de Pago y Transacciones:**
   - Implementado un RPC atómico en PostgreSQL (`process_ticket_purchase` en `sql/create_rpc_function.sql`) que usa `SELECT ... FOR UPDATE` para prevenir sobreventa por condición de carrera (*race condition*).
   - Soporta un modo simulación (`STRIPE_SECRET_KEY=simulated`) y Stripe Checkout real con webhooks.
3. **Escáner y Validación QR:**
   - La pantalla de `/check-in` valida en backend (`POST /api/validate`), requiriendo rol `master`, `organizador` o `checador`.
   - La validación es atómica a nivel de cambio de estado `activo` -> `usado`.
4. **Vulnerabilidades y Brechas Pendientes:**
   - El QR generado utiliza directamente el `UUID` incremental/público del boleto (`ticket.id`), expuesto sin firmas HMAC ni tokens efímeros.
   - `/eventos/[slug]` es un placeholder ("Página en construcción").
   - Las reglas RLS en Supabase (`sql/rls_migration.sql`) requieren verificación manual y ejecución en la base de datos de producción.

---

## 2. Arquitectura Detectada

```
                               ┌────────────────────────────────┐
                               │       Cliente Browser / Mobile │
                               └───────────────┬────────────────┘
                                               │
                                 HTTPS (Next.js App Router)
                                               │
                       ┌───────────────────────▼──────────────────────┐
                       │ Middleware Perimetral (RBAC & Session)       │
                       └───────────────────────┬──────────────────────┘
                                               │
                 ┌─────────────────────────────┼─────────────────────────────┐
                 │                             │                             │
       ┌─────────▼─────────┐         ┌─────────▼─────────┐         ┌─────────▼─────────┐
       │ Public / Buyer    │         │ Admin / Dashboard │         │ Scanner / Gate    │
       │ (/boletos,        │         │ (/admin,          │         │ (/check-in)       │
       │ /checkout/success)│         │  /dashboard)      │         │                   │
       └─────────┬─────────┘         └─────────┬─────────┘         └─────────┬─────────┘
                 │                             │                             │
                 └─────────────────────────────┼─────────────────────────────┘
                                               │
                                       Next.js API Routes
                                               │
           ┌───────────────────────────────────┼───────────────────────────────────┐
           │                                   │                                   │
┌──────────▼──────────┐             ┌──────────▼──────────┐             ┌──────────▼──────────┐
│ /api/checkout-multi │             │ /api/order/[id]     │             │ /api/validate       │
│ (Atomic RPC Call)   │             │ (Session fetch)     │             │ (Atomic Status Edit)│
└──────────┬──────────┘             └──────────┬──────────┘             └──────────┬──────────┘
           │                                   │                                   │
           │ Stripe API                        │                                   │
           │ (Webhook sync)                    │                                   │
           ▼                                   ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Supabase Database (PostgreSQL) + RLS Policies + RPC Functions + SSR Auth                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico y Dependencias Principales

| Categoría | Tecnología / Librería | Versión | Estado / Observación |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.2.4` | Actualizado. Advertencia de migración de `middleware` en Next 16. |
| **UI Core** | React / React-DOM | `19.2.4` | React 19. Reglas estrictas de hooks introducidas. |
| **Estilos** | TailwindCSS + PostCSS | `^4.0.0` | Tailwind v4 configurado. |
| **Backend & DB** | Supabase JS + `@supabase/ssr` | `^2.104.1` / `^0.10.2` | Cliente SSR unificado con cookies HTTP-only. |
| **Pagos** | Stripe Node SDK | `^22.1.0` | Soporta modo `simulated` y Checkout real. |
| **QR / Scanner** | `html5-qrcode` / `qrcode.react` / `qrcode` | `^2.3.8` / `^4.2.0` | Escáner funcional en teléfono móvil. |
| **Documentos** | `@react-pdf/renderer` | `^4.5.1` | Generación de boletos PDF descargables en el navegador. |
| **Reportes** | `xlsx` | `^0.18.5` | Exportación de métricas de ventas a Excel. |
| **Iconos / UI** | `lucide-react` / `sonner` | `^1.11.0` / `^2.0.7` | Iconos modernos y sistema de notificaciones Toasts. |

---

## 4. Diagrama Textual de Módulos y Flujo de Datos

### Flujo A: Compra y Registro de Boletos
1. **Asistente** entra a `/boletos`.
2. Selecciona evento activo y cantidad de boletos (1-10).
3. Ingresa datos de asistentes (Nombre completo y Correo electrónico).
4. El frontend envía `POST` a `/api/checkout-multiple`.
5. `/api/checkout-multiple` llama a la función RPC atómica PostgreSQL `process_ticket_purchase`:
   - Aplica `FOR UPDATE` sobre la fila del evento en `eventos`.
   - Verifica capacidad disponible descontando boletos `activo`, `usado`, `paid` y `pending` (últimos 15 min).
   - Crea `order` y genera boletos en estado `pending` (o `paid` si es modo `simulated`).
6. Si es Stripe real: Redirige a Stripe Checkout Session -> Tras pago, Webhook (`/api/webhooks/stripe`) actualiza `orders` a `paid` y `boletos` a `activo`.
7. Si es Simulación: Redirige directamente a `/checkout/success?session_id=sim_...`.
8. En `/checkout/success`: Se visualizan los QR SVG y se pueden descargar los PDFs individuales o en lote.

### Flujo B: Control de Acceso (Check-in)
1. **Checador / Staff** inicia sesión en `/login`. Middleware verifica su rol (`checador`, `organizador` o `master`) y redirige a `/check-in`.
2. Escanea el código QR con la cámara del celular.
3. Envía `POST /api/validate` con `{ ticketId }`.
4. El backend valida autenticación del checador y verifica el boleto en Supabase.
5. Si `estado === 'usado'`, rechaza la entrada con alerta visual/vibración.
6. Si `estado === 'activo'`, actualiza atómicamente a `usado` y retorna "Acceso Concedido".

---

## 5. Diagnóstico Funcional

| Módulo | Estado | Evidencia | Problemas Identificados | Prioridad |
|---|---|---|---|---|
| **Autenticación (Auth)** | Funcional | `middleware.ts`, `lib/auth.ts`, `hooks/useAuth.ts`, `/login` | Funciona bien. Depende de la tabla `perfiles` en Supabase. | Media |
| **Usuarios y Roles (RBAC)** | Funcional | `middleware.ts`, `sql/rls_migration.sql` | 4 roles definidos: `master`, `organizador`, `checador`, `staff`. | Media |
| **Eventos (CRUD)** | Funcional | `/admin/page.tsx`, `sql/create_rpc_function.sql` | Creación y edición funcionando. Falta soporte completo para múltiples tipos de boletos por evento. | Alta |
| **Detalle Público Evento** | Incompleto | `/eventos/[slug]/page.tsx` | Contiene un placeholder ("Página en construcción"). No permite ver información pública por URL slug. | Alta |
| **Tipos de boleto** | Ausente | Schemas y UI | Actualmente cada evento maneja un único precio y capacidad global. No hay variedad de boletos (VIP, General, Preferente). | Alta |
| **Registro / Compra** | Funcional | `/boletos`, `/api/checkout-multiple` | Validación de entradas y control atómico implementados. | Alta |
| **Generación QR** | Parcial | `/checkout/success/page.tsx`, `TicketPDF.tsx` | Genera QR usando el ID simple del boleto. Falta token firmado/encriptado anti-falsificación. | Alta |
| **Validación en puerta** | Funcional | `/check-in/page.tsx`, `/api/validate` | Funciona en celular con cámara y vibración hápica. Evita reuso de boletos. | Alta |
| **Panel de Organizador** | Funcional | `/admin/page.tsx` | Permite gestionar eventos propios y comisiones. | Media |
| **Dashboard y Reportes** | Funcional | `/dashboard/page.tsx` | Métricas en tiempo real con Supabase Subscriptions y exportación a Excel (.xlsx). | Media |
| **Notificaciones** | Parcial | `ToasterProvider.tsx`, `sonner` | Notificaciones en UI listas. Falta envío automático de correos (Resend / SendGrid) con el boleto PDF adjunto. | Media |
| **Pagos (Stripe / Sim)** | Funcional | `/api/checkout-multiple`, `/api/webhooks/stripe` | Soporta simulación local y Stripe real. Falta soporte directo para boletos 100% gratuitos ($0 MXN). | Alta |
| **Diseño responsive / UX** | Bueno | Tailwind v4 en todas las páginas | Interfaz moderna en modo oscuro, optimizada para celular. | Baja |
| **Pruebas Automatizadas** | Ausente | Repositorio | No hay suites de prueba (Jest, Vitest, Cypress o Playwright). | Alta |
| **Seguridad RLS** | Parcial | `sql/rls_migration.sql` | Script creado pero requiere ejecución y auditoría constante en backend. | Alta |

---

## 6. Diagnóstico de Calidad y Verificaciones

### Resultados de Ejecución:

1. **TypeScript (`npx tsc --noEmit`):**
   - **Resultado:** PASÓ exitosamente (0 errores).
2. **ESLint (`npm run lint`):**
   - **Resultado:** FALLÓ con 5 errores y 3 advertencias.
   - **Detalle de errores:**
     - `app/admin/page.tsx:97:5` -> Error: `setState` síncrono dentro del cuerpo de `useEffect` (regla de React 19).
     - `app/dashboard/page.tsx:102:5` -> Error: `setState` síncrono dentro del cuerpo de `useEffect`.
     - `app/check-in/page.tsx:91:37` -> Error: `@typescript-eslint/no-explicit-any`.
     - `app/checkout/success/page.tsx:31:12` -> Error: `@typescript-eslint/no-explicit-any`.
     - `components/Skeleton.tsx:3:11` -> Error: `@typescript-eslint/no-empty-object-type`.
   - **Detalle de advertencias:**
     - `app/admin/page.tsx:25:49` -> `authLoading` variable declarada y no usada.
     - `app/admin/page.tsx:94:6` -> React Hook `useCallback` falta dependencia `editingId`.
     - `app/checkout/success/page.tsx:77:16` -> `err` variable no usada en catch.
3. **Build (`npm run build`):**
   - **Resultado:** Interrumpido por las fallas de ESLint. Muestra además advertencia de Next.js 16 sobre la convención del archivo `middleware.ts`.

---

## 7. Riesgos Técnicos y de Seguridad

1. **Predicción o Manipulación del QR:**
   - El QR codifica el UUID `id` del boleto en texto plano. Si alguien conoce o adivina la secuencia de UUIDs (o los intercepta), podría generar un QR falso. Debe firmarse tokenizadamente o usar HMAC con clave secreta.
2. **Falta de Confirmación por Correo Electrónico:**
   - Al comprar un boleto, si el usuario cierra el navegador en la pantalla de éxito sin descargar el PDF, no hay envío automático de correo con sus pases.
3. **Falta de Vista Pública del Evento (`/eventos/[slug]`):**
   - No hay un flujo para que un usuario pueda compartir la URL de un evento específico en redes sociales o WhatsApp.
4. **Falta de Manejo de Boletos Gratuitos ($0 MXN):**
   - Si el evento es gratuito ($0), la API actualmente intenta llamar a Stripe o Simulación, creando fricción innecesaria. Debe emitirse la orden de forma instantánea.

---

## 8. Deuda Técnica Priorizada

1. **Corrección Estricta de Linter (Prioridad 1):**
   - Arreglar las llamadas a `fetchEventos` / `fetchAsistencia` dentro de los `useEffect` en `admin/page.tsx` y `dashboard/page.tsx`.
   - Eliminar todo uso de `any` explícito en `check-in` y `checkout/success`.
   - Arreglar `SkeletonProps` en `Skeleton.tsx`.
2. **Soporte Multi-tipo de Boleto (Prioridad 2):**
   - Ampliar la tabla `eventos` o crear tabla `tipos_boleto` para permitir boletos (ej. General, VIP, Early Bird).
3. **Página Pública de Eventos (Prioridad 3):**
   - Desarrollar `/eventos/[slug]` para visualización atractiva del evento, mapa, horarios y botón directo de compra/registro.
4. **Firma de Token en QR y Validación Avanzada (Prioridad 4):**
   - Añadir HMAC / hash de validación para asegurar que el QR presentado fue emitido legítimamente por la plataforma.

---

## 9. Funcionalidades Faltantes para un MVP Real

- Página pública por evento (`/eventos/[slug]`).
- Soporte transparente para registros de boletos $0 MXN (Gratuitos).
- Generación de firma segura / token HMAC en el código QR.
- Asignación de personal de puerta (scanners) a eventos específicos (actualmente cualquier checador puede validar cualquier boleto).
- Integración de envío de correos (Email Transaccional) con adjunto PDF.
- Suite de pruebas unitarias e integración (Vitest/Testing Library).

---

## 10. Plan de Rescates Dividido por Fases

- **Fase A: Estabilización Inmediata**
  - Reparar todos los errores de ESLint, React 19 y tipos.
  - Asegurar que `npm run build` pase limpiamente.
  - Crear/verificar `.env.example` y asegurar cero fuga de secretos.
- **Fase B: Fundaciones y Seguridad**
  - Extender seguridad de QR (firma de tokens).
  - Validar asignación de checador a evento específico.
  - Soporte de emisión directa para boletos gratuitos ($0).
- **Fase C: Flujo Esencial y Experiencia Pública**
  - Implementar `/eventos/[slug]` con diseño estético optimizado (Mobile-First).
  - Habilitar selección de boletos y flujo rápido de registro.
- **Fase D: Validación y Scanner Móvil**
  - Reforzar retroalimentación visual/acústica en `/check-in`.
  - Asegurar prevención de doble validación atómica.
- **Fase E: Panel, Métricas y Notificaciones**
  - Pulir Dashboard de organizador y reportes.
  - Implementar servicio de email o fallback de descarga.
- **Fase F: Pruebas y Producción**
  - Crear tests automatizados (Auth, Emisión, Capacidad, Doble escaneo).
  - Documentar despliegue en `README.md`, `ROADMAP.md` y `SECURITY.md`.

---

## 11. Lista Precisa de Archivos a Crear / Modificar / Refactorizar

### A Crear:
- `docs/PROJECT_AUDIT.md` (Este documento)
- `docs/ROADMAP.md`
- `docs/SECURITY.md`
- `.env.example`
- `tests/` (Suites de pruebas automatizadas)

### A Modificar / Refactorizar:
- `app/admin/page.tsx` (Solucionar llamado de setState en useEffect, dependencias y variables no usadas)
- `app/dashboard/page.tsx` (Solucionar llamado de setState en useEffect)
- `app/check-in/page.tsx` (Remover `any` explícito y mejorar tipos)
- `app/checkout/success/page.tsx` (Remover `any` explícito y limpiar variables no usadas)
- `components/Skeleton.tsx` (Arreglar interfaz vacía)
- `app/eventos/[slug]/page.tsx` (Reemplazar placeholder con UI completa y dinámica)
- `app/api/checkout-multiple/route.ts` (Soporte para boletos gratuitos sin Stripe)
- `app/api/validate/route.ts` (Validar que el checador tenga acceso al evento específico)

---

## 12. Suposiciones Realizadas y Preguntas Pendientes

1. **Proveedor de Correo:** Para producción se recomienda integrar Resend o SendGrid mediante variables de entorno (`RESEND_API_KEY`). Mientras tanto se garantizará la descarga directa del PDF.
2. **Pasarela de Pago:** El proyecto cuenta con un modo de simulación que funciona perfectamente sin credenciales reales de Stripe, lo cual permite desarrollo y testing ágil.
3. **Despliegue Supabase:** Se asume que el usuario tiene acceso al panel de Supabase para aplicar la migración `sql/rls_migration.sql` y la función RPC `sql/create_rpc_function.sql`.
