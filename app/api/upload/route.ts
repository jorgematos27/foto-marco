import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const tTotal = Date.now()
  const marks: Record<string, number> = {}
  const mark = (label: string) => { marks[label] = Date.now() - tTotal }

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
  mark('formData')
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
  mark('arrayBuffer')
  const sizeMB = (rawBuffer.length / 1024 / 1024).toFixed(2)

  const optimizado = await sharp(rawBuffer)
    .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88, effort: 2 })
    .toBuffer()
  mark('sharp')
  const outKB = (optimizado.length / 1024).toFixed(1)

  const id = crypto.randomUUID()
  const fileName = `${id}.webp`

  const { error: storageError } = await supabaseAdmin.storage
    .from('fotos-marco')
    .upload(fileName, optimizado, { contentType: 'image/webp' })
  mark('storageUpload')

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('fotos-marco')
    .getPublicUrl(fileName)

  const qrUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/share/${id}`
  const nombre = (formData.get('nombre') as string | null) || null

  const { error: dbError } = await supabaseAdmin
    .from('fotos')
    .insert({ id, image_url: publicUrl, qr_url: qrUrl, nombre })
  mark('dbInsert')

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  console.log(`[upload] id=${id} in=${sizeMB}MB out=${outKB}KB timings:`, marks, `total=${Date.now() - tTotal}ms`)

  return NextResponse.json({ id, image_url: publicUrl })
}
