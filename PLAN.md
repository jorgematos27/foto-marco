# Foto Marco — Plan de Proyecto

---

## ¿Qué hace esta app?

1. El usuario abre la web y activa su cámara
2. Toma una foto → la app superpone el marco PNG encima
3. Se genera un QR que apunta a una página única con esa foto (/foto/[id])
4. La imagen compuesta (foto + marco) se guarda en Supabase Storage
5. Los metadatos se guardan en Supabase Database
6. El usuario puede descargar la imagen o escanear el QR para compartirla

---

## Stack tecnológico recomendado

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | **Next.js 14** (React) | Rutas dinámicas para `/foto/[id]`, SSR para la card page, fácil deploy en Vercel |
| Frame overlay | **Canvas API** (nativo del browser) | Cero dependencias, composita la foto + marco PNG en el cliente |
| Generación de QR | **qrcode** (npm, `qrcode`) | Librería JS pura, genera QR en canvas o como imagen base64 |
| Base de datos | **Supabase PostgreSQL** | Almacena metadatos de cada foto |
| Almacenamiento de fotos | **Supabase Storage** | S3-compatible, bucket público para las imágenes |
| Estilos | **Tailwind CSS** | Rápido, sin diseñar desde cero |
| Despliegue | **Vercel** | Deploy automático desde GitHub, free tier, integra perfecto con Next.js |

### ¿Python? No es necesario.
Todo el procesamiento de imagen (superponer el marco) se hace con el **Canvas API del navegador**, 100% en el cliente. No necesitas un backend ni Python para esto. La imagen resultante se exporta como PNG directamente desde el browser.

### ¿Supabase tiene storage para fotos?
**Sí.** Supabase Storage es un object storage S3-compatible incluido en todos los planes:
- Free tier: **1 GB** de almacenamiento, **2 GB** de transferencia/mes
- Puedes crear un bucket público (`fotos-marco`) donde cada imagen queda accesible por URL directa
- URL de ejemplo: `https://xxxx.supabase.co/storage/v1/object/public/fotos-marco/foto-abc123.png`

---

## Estructura de la base de datos (Supabase)

```sql
-- Tabla principal: una fila por foto tomada
CREATE TABLE fotos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  image_url   TEXT NOT NULL,        -- URL pública en Supabase Storage
  qr_url      TEXT,                 -- URL a la que apunta el QR (/foto/[id])
  downloads   INTEGER DEFAULT 0    -- contador de descargas (opcional)
);
```

### Bucket de Supabase Storage

```
Bucket: fotos-marco
Acceso: público (lectura sin autenticación)
Política de subida: solo desde el servidor (service role key)
Nombre de archivo: {uuid}.png
```

---

## Pasos de desarrollo (en orden)

### Fase 1 — Setup inicial
- [x] `npx create-next-app@latest foto-marco --typescript --tailwind --app` ✓
- [x] Instalar dependencias: `npm install @supabase/supabase-js qrcode @types/qrcode` ✓
- [x] Crear `.env.local` con las keys de Supabase (template listo, faltan tus keys) ✓
- [ ] **TU TURNO:** Crear proyecto en Supabase (supabase.com)
- [ ] **TU TURNO:** Crear bucket `fotos-marco` en Supabase Storage → marcar como público
- [ ] **TU TURNO:** Ejecutar el SQL de creación de tabla en el SQL Editor de Supabase
- [ ] **TU TURNO:** Pegar tus keys en `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # solo en servidor, nunca en cliente
```

### Fase 2 — Lógica del marco (Canvas)
- [x] Crear componente `components/CamaraCaptura.tsx` ✓
  - Activa `getUserMedia` con cámara trasera, aspecto 9:16
  - Video en vivo con marco PNG superpuesto como CSS overlay
  - Al capturar: canvas 1080x1920 con recorte "cover" + marco encima
  - Exporta con `canvas.toBlob()` → PNG final
- [x] Marco PNG en `public/marco.png` (1080x1920) ✓

### Fase 3 — Subida y guardado
- [x] `app/api/upload/route.ts` ✓
  - Valida tipo (png/jpg/webp) y tamaño (máx 5MB)
  - Sube a Supabase Storage bucket `fotos-marco`
  - Inserta fila en tabla `fotos` con URL e id
- [x] `lib/supabase-admin.ts` — cliente servidor con service_role ✓
- [x] `lib/supabase.ts` — cliente público con anon key ✓

### Fase 4 — Generación del QR
- [x] QR generado en el cliente con librería `qrcode` ✓
- [x] URL del QR apunta a `/foto/{id}` ✓
- [x] Se muestra junto a la foto tras la captura ✓

### Fase 5 — Página de la carta/card
- [x] `app/foto/[id]/page.tsx` — ruta dinámica ✓
  - Fetch de foto desde Supabase por id
  - Meta tags OG para WhatsApp/Instagram
  - Botón de descarga vía proxy `/api/download`
- [x] `app/api/download/route.ts` — proxy CORS-safe para descarga ✓

### Fase 6 — Descarga de imagen
- [x] Descarga directa desde la pantalla de captura (data URL local) ✓
- [x] Descarga desde card page vía proxy API (evita bloqueo CORS) ✓

### Fase 7 — Despliegue
- [ ] Subir código a GitHub (repo privado)
- [ ] Conectar repositorio en Vercel (vercel.com) → import project
- [ ] Agregar variables de entorno en Vercel (las mismas del `.env.local`)
- [ ] Vercel genera URL automáticamente: `foto-marco.vercel.app`
- [ ] Actualizar `.env` con el dominio real para los QR generados
- [ ] Dominio personalizado: opcional, desde Vercel → Settings → Domains

---

## Seguridad — qué tener en cuenta

Aunque la app es simple, hay puntos importantes:

### Críticos
| Riesgo | Solución |
|---|---|
| Alguien sube archivos que no son imágenes | Validar MIME type en la API route (`image/png`, `image/jpeg` únicamente) |
| Alguien llena tu storage con miles de fotos | Rate limiting por IP con `@upstash/ratelimit` + Vercel Edge (free) |
| La `service_role_key` queda expuesta | Nunca usarla en código cliente, solo en `app/api/` (server-side) |
| Tamaño de archivo sin límite | Limitar a máx 5MB en la API route antes de subir a Supabase |

### Importantes (pero opcionales para MVP)
- Habilitar **Row Level Security (RLS)** en Supabase para la tabla `fotos`, con política de solo lectura pública
- Agregar un **bucket policy** en Supabase Storage que solo permita insertar desde tu dominio
- Si crece el uso: `NEXT_PUBLIC_SUPABASE_ANON_KEY` solo debe tener permisos de lectura (configurar en Supabase Dashboard → API)

### No necesitas
- Autenticación de usuarios (es pública por diseño)
- HTTPS propio (Vercel lo maneja automáticamente)
- WAF o firewall avanzado (escala de proyecto no lo justifica)

---

## Sobre el marco PNG (pendiente)

Cuando me pases el archivo, verificaré:
- Que tenga **fondo transparente** (canal alpha)
- Que la relación de aspecto sea cuadrada (1:1) o la que uses para la cámara
- Que la resolución sea suficiente para no verse pixelado

Si me lo pasas en otro formato (JPG, WebP, AI, PSD), te diré cómo convertirlo.

---

## Resumen de respuestas directas

| Pregunta | Respuesta |
|---|---|
| ¿Supabase tiene storage? | Sí, bucket S3-compatible, free 1GB |
| ¿Usamos Python para el marco? | No, Canvas API del browser (JavaScript) |
| ¿Cómo se generan los QR? | Librería `qrcode` en npm, puro JavaScript |
| ¿Qué formato necesita el marco? | PNG con fondo transparente (alpha) |
| ¿Dónde se despliega? | Vercel, gratis, automático desde GitHub |
