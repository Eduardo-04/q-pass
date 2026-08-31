# 🗄️ Esquema Completo de Base de Datos - Q-Pass Digital Access

Este documento contiene la arquitectura de entidades, relaciones y campos de la base de datos PostgreSQL en Supabase para **Q-Pass Digital Access**.

---

## 📊 Diagrama Entidad-Relación (Mermaid ERD)

```mermaid
erDiagram
    auth_users ||--o{ perfiles : "1:1 perfil principal"
    auth_users ||--o{ perfiles_cliente : "1:1 perfil comercial"
    perfiles ||--o{ eventos : "crea y administra (organizador_id)"
    eventos ||--o{ boletos : "emite boletos (evento_id)"
    orders ||--o{ boletos : "agrupa boletos pagados (order_id)"
    solicitudes_organizador ||--o{ perfiles : "se aprueba como socio"

    eventos {
        uuid id PK
        text nombre
        integer capacidad
        numeric precio
        timestamp fecha_evento
        date visible_desde
        date visible_hasta
        boolean activo
        numeric comision_porcentaje
        numeric comision_fija
        uuid organizador_id FK
        text banner_url "URL o Base64 del banner del evento"
    }

    boletos {
        uuid id PK
        uuid evento_id FK
        uuid order_id FK
        text email_comprador
        text nombre_comprador
        text estado "pending | paid | activo | usado | cancelado"
        timestamp fecha_compra
        numeric precio_unitario
    }

    orders {
        uuid id PK
        text email_comprador
        numeric total_amount
        text payment_status "pending | paid | cancelled"
        text payment_id
        text payment_method
        timestamp created_at
        timestamp expires_at
    }

    perfiles {
        uuid id PK
        text email
        text nombre
        text rol "master | organizador | checador | staff"
        timestamp creado_el
    }

    perfiles_cliente {
        uuid user_id PK_FK
        text nombre_empresa
        numeric comision_porcentaje
        numeric comision_fija
        timestamp actualizado_el
    }

    solicitudes_organizador {
        uuid id PK
        text nombre_empresa
        text nombre_contacto
        text email
        text telefono
        text aforo_estimado
        text estado "pendiente | aprobado | rechazado"
        timestamp created_at
    }
```

---

## 🛠️ Modificaciones & Migración SQL (`banner_url`)

Para asegurar que la columna `banner_url` exista en la tabla `eventos` en Supabase, ejecuta el siguiente script en la consola de SQL de Supabase:

```sql
-- Agregar columna banner_url a la tabla eventos (si no existe)
ALTER TABLE public.eventos 
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Comentario descriptivo
COMMENT ON COLUMN public.eventos.banner_url IS 'URL pública o data Base64 del banner promocional del evento';
```

---

## 🔒 Políticas de Seguridad (RLS - Row Level Security)

1. **`eventos`**:
   - `SELECT`: Público para eventos activos dentro del rango de visibilidad (`visible_desde` y `visible_hasta`).
   - `ALL`: Permitido para usuarios con rol `master` o `organizador` creador del evento (`organizador_id = auth.uid()`).

2. **`boletos`**:
   - `SELECT`: Público con `id` firmado o token de comprobación.
   - `UPDATE`: Permitido para validación en puerta (`estado = 'usado'`) para roles `master`, `organizador` y `checador`.

3. **`perfiles_cliente`**:
   - Acceso gestionado mediante API con cliente de servicio (`createAdminClient`) para bypass seguro en panel de Superadmin.
