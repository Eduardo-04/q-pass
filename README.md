# 🎟️ Q-Pass — Plataforma Digital de Gestión de Accesos y Boletería

Q-Pass es una solución web de boletería digital y gestión de entradas orientada al mercado mexicano (eventos universitarios, fiestas, conferencias, torneos, recaudaciones y festivales). Permite a organizadores crear eventos, emitir entradas con código QR y validarlas rápidamente en puerta desde un teléfono móvil.

---

## 🚀 Tecnologías Principales

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org) con React 19 y TypeScript.
- **Backend & Base de Datos**: [Supabase](https://supabase.com) (Auth, PostgreSQL DB, `@supabase/ssr`, RLS y Funciones RPC).
- **Pasarela de Pagos**: [Stripe](https://stripe.com) (Soporta Checkout real y Modo Simulación).
- **Documentos & QR**: `@react-pdf/renderer` para PDFs descargables y `html5-qrcode` para escaneo móvil.
- **Estilos**: TailwindCSS 4 y Lucide React.
- **Notificaciones**: `sonner` Toasters.

---

## 📋 Requisitos Previos

- **Node.js**: `v18.x` o superior (`v20.x` recomendado).
- **npm** / **yarn** / **pnpm** / **bun**.
- Cuenta activa en **Supabase** (para BD de producción/desarrollo) o instancia local.

---

## ⚙️ Variables de Entorno

Copia el archivo de ejemplo `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Configura los siguientes valores en `.env.local`:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anónima de Supabase | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada Service Role (Bypasses RLS) | `sb_secret_...` |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe o `simulated` para pruebas locales | `simulated` |
| `STRIPE_WEBHOOK_SECRET` | Secret de firmas para webhooks de Stripe | `whsec_...` |
| `NEXT_PUBLIC_SITE_URL` | URL base de la aplicación | `http://localhost:3000` |

---

## 🛠️ Instalación y Comandos

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar en modo desarrollo
```bash
npm run dev
```
Accede a [http://localhost:3000](http://localhost:3000) en tu navegador.

### 3. Verificación de Código y Calidad
```bash
# Verificación de linter (ESLint)
npm run lint

# Verificación de tipos TypeScript
npx tsc --noEmit

# Compilación para producción
npm run build

# Iniciar servidor de producción
npm run start
```

---

## 🗄️ Migraciones de Base de Datos (Supabase)

Para inicializar las políticas de seguridad (RLS) y la función atómica anti-sobreventa:

1. Ingresa a tu panel de Supabase → **SQL Editor**.
2. Ejecuta el archivo [`sql/rls_migration.sql`](file:///d:/PROYECTOS/qpass-app/sql/rls_migration.sql) para habilitar RLS y políticas RBAC.
3. Ejecuta el archivo [`sql/create_rpc_function.sql`](file:///d:/PROYECTOS/qpass-app/sql/create_rpc_function.sql) para registrar la función RPC `process_ticket_purchase`.

---

## 🔒 Control de Acceso Basado en Roles (RBAC)

- **master**: Administrador total de la plataforma. Gestiona comisiones, socios y todos los eventos.
- **organizador**: Creador del evento. Gestiona sus propios eventos y consulta métricas/asistencia.
- **checador**: Personal de acceso. Solo tiene acceso a la vista `/check-in` para escanear y validar QRs.
- **staff**: Rol base sin acceso administrativo.

---

## 📱 Guía para Probar el Escáner y Validación QR

1. **Crear o activar un evento**: En `/admin`, crea un evento con vigencia actual y boletos disponibles.
2. **Adquirir un boleto**: Ve a `/boletos`, selecciona el evento e ingresa tus datos.
3. **Obtener el QR**: En la pantalla `/checkout/success`, visualiza el QR generado o descarga el PDF.
4. **Validar entrada**:
   - Inicia sesión en `/login` con una cuenta de rol `checador` o `organizador`.
   - Abre la ruta `/check-in`.
   - Escanea el código QR apuntando la cámara de tu celular o dispositivo.
   - Verás el mensaje "Acceso Concedido" (verde) o la alerta en caso de reuso / boleto inválido.
