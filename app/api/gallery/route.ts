import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const LIMIT_MAX = 24
const LIMIT_DEFAULT = 12

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const offset = Math.max(parseInt(sp.get('offset') ?? '0') || 0, 0)
  const limit = Math.min(parseInt(sp.get('limit') ?? String(LIMIT_DEFAULT)) || LIMIT_DEFAULT, LIMIT_MAX)

  const { data, error } = await supabase
    .from('fotos')
    .select('id, image_url, nombre, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    fotos: data ?? [],
    hasMore: (data?.length ?? 0) === limit,
  })
}
