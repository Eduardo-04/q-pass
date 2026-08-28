# 📍 Contexto del Proyecto: Q-Pass

**Última actualización:** 2026-05-10
**Estado:** Auditoría de seguridad completada / Refactorización de Auth finalizada.

## 🚀 Resumen del Proyecto
Q-Pass es una plataforma de gestión de eventos y venta de boletos digitales.
- **Tech Stack:** Next.js 16 (App Router), Supabase (Auth, DB, SSR), Stripe (Pagos), TailwindCSS 4, @react-pdf/renderer.
- **Flujo Principal:** Selección de evento -> Compra de boletos (asistentes múltiples) -> Pago -> Generación de QR/PDF -> Validación en puerta vía escáner móvil.

## 🏗️ Arquitectura de Seguridad (Actualizada)
Se ha migrado de un sistema basado en "patrones de email" hardcodeados a un sistema **RBAC (Role Based Access Control)** real.

### Roles Definidos:
1.  **master:** Acceso total. Gestiona socios, comisiones y todos los eventos.
2.  **organizador:** Dueño de eventos. Ve solo sus eventos y sus métricas en el dashboard.
3.  **checador:** Personal de puerta. Solo tiene acceso a la ruta `/check-in` para validar QR.
4.  **staff:** Rol base sin permisos administrativos.

### Archivos Clave de Infraestructura:
- `types/index.ts`: Definiciones centralizadas de interfaces (Evento, Boleto, Perfil, etc.).
- `utils/supabase/admin.ts`: Cliente de servidor para operaciones que requieren bypass de RLS (Service Role).
- `lib/auth.ts`: Helpers para proteger API routes (`requireAuth`).
- `hooks/useAuth.ts`: Hook de React para manejar sesión y roles en el cliente.
- `middleware.ts`: Control de acceso perimetral basado en la tabla `perfiles`.

## 🛡️ Cambios Críticos Realizados
1.  **Eliminación de fugas:** Se borró `list_users.mjs` que exponía la `SUPABASE_SERVICE_ROLE_KEY`.
2.  **Protección de APIs:** 
    - `/api/validate` requiere rol de checador o superior y token firmado en QR.
    - `/api/checkout-multiple` valida capacidad e inputs en el servidor y soporta boletos $0 MXN.
    - `/api/order/[id]` adjunta tokens de QR firmados.
3.  **Unificación de Supabase:** Estandarizado el uso de `@supabase/ssr`.

## 📋 Pendientes Inmediatos
1.  **SQL Migration:** Ejecutar el contenido de `sql/rls_migration.sql` en el panel de Supabase para habilitar RLS y políticas de seguridad.
2.  **Configurar Perfiles:** Asignar el rol `master` al usuario principal en la tabla `perfiles`.
3.  **Rotar Credenciales:** Regenerar las API Keys en Supabase (Settings -> API) debido a la exposición previa.

---
*Este documento sirve como memoria de contexto técnico del proyecto.*
