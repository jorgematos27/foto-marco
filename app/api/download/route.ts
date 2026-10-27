import { NextRequest, NextResponse } from 'next/server'

// Proxy de descarga para evitar restricciones CORS al descargar desde Supabase Storage
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const id = req.nextUrl.searchParams.get('id') ?? 'foto'

  if (!url) return NextResponse.json({ error: 'URL requerida' }, { status: 400 })

  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ error: 'No se pudo obtener la imagen' }, { status: 500 })

  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="foto-marco-${id}.png"`,
    },
  })
}
