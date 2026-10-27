type Ventana = { count: number; resetAt: number }

const buckets = new Map<string, Ventana>()
const LIMITE = 10
const VENTANA_MS = 60_000

export function rateLimit(ip: string): { ok: boolean; restante: number; resetEn: number } {
  const ahora = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || ahora > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: ahora + VENTANA_MS })
    return { ok: true, restante: LIMITE - 1, resetEn: VENTANA_MS }
  }

  if (bucket.count >= LIMITE) {
    return { ok: false, restante: 0, resetEn: bucket.resetAt - ahora }
  }

  bucket.count += 1
  return { ok: true, restante: LIMITE - bucket.count, resetEn: bucket.resetAt - ahora }
}

// Limpieza periódica para no acumular memoria
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const ahora = Date.now()
    for (const [ip, b] of buckets) if (ahora > b.resetAt) buckets.delete(ip)
  }, 5 * 60_000).unref?.()
}
