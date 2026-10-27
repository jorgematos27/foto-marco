import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'anon'

  const limit = rateLimit(ip)
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta en ${Math.ceil(limit.resetEn / 1000)}s.` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetEn / 1000)) } }
    )
  }

  const formData = await req.formData()
  const foto = formData.get('foto') as File | null

  if (!foto) {
    return NextResponse.json({ error: 'No se recibió ninguna imagen' }, { status: 400 })
  }

  const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp']
  if (!tiposPermitidos.includes(foto.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no válido' }, { status: 400 })
  }

  if (foto.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen supera los 5MB' }, { status: 400 })
  }

  const rawBuffer = Buffer.from(await foto.arrayBuffer())

  // Comprimir a WebP — objetivo ~256KB manteniendo 1080x1920
  const optimizado = await sharp(rawBuffer)
    .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 4 })
    .toBuffer()

  const id = crypto.randomUUID()
  const fileName = `${id}.webp`

  const { error: storageError } = await supabaseAdmin.storage
    .from('fotos-marco')
    .upload(fileName, optimizado, { contentType: 'image/webp' })

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('fotos-marco')
    .getPublicUrl(fileName)

  const qrUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/foto/${id}`
  const nombre = (formData.get('nombre') as string | null) || null

  const { error: dbError } = await supabaseAdmin
    .from('fotos')
    .insert({ id, image_url: publicUrl, qr_url: qrUrl, nombre })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ id, image_url: publicUrl })
}
