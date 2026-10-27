'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

type Estado = 'bienvenida' | 'camara' | 'nombre' | 'guardando' | 'resultado'

const COUNTDOWN = 3
const REINICIO_SEG = 10

export default function CamaraCaptura() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const marcoRef = useRef<HTMLImageElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frontalRef = useRef(true)

  const [estado, setEstado] = useState<Estado>('bienvenida')
  const [frontal, setFrontal] = useState(true)
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)
  const [fotoId, setFotoId] = useState<string | null>(null)
  const [reinicioSeg, setReinicioSeg] = useState(REINICIO_SEG)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = '/marco.png'
    img.onload = () => { marcoRef.current = img }
  }, [])

  useEffect(() => {
    if (estado === 'camara' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [estado])

  const limpiarTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const detenerStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const iniciarStream = async (esFrontal: boolean) => {
    detenerStream()
    // No forzamos aspectRatio ni resolución exacta: así el browser usa el
    // campo de visión natural del sensor y evita hacer zoom digital agresivo
    // (sobre todo en móviles). El crop a 9:16 se hace al capturar en canvas.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: esFrontal ? 'user' : 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    })
    streamRef.current = stream
    if (videoRef.current) videoRef.current.srcObject = stream
  }

  const capturarFoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const marco = marcoRef.current
    if (!video || !canvas || !marco) return

    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!

    const vw = video.videoWidth || 1080
    const vh = video.videoHeight || 1920
    const ratio = 1080 / 1920
    const vRatio = vw / vh
    let sx = 0, sy = 0, sw = vw, sh = vh
    if (vRatio > ratio) { sw = vh * ratio; sx = (vw - sw) / 2 }
    else { sh = vw / ratio; sy = (vh - sh) / 2 }

    if (frontalRef.current) {
      ctx.save()
      ctx.translate(1080, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1080, 1920)
      ctx.restore()
    } else {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1080, 1920)
    }
    ctx.drawImage(marco, 0, 0, 1080, 1920)

    detenerStream()
    setCapturedUrl(canvas.toDataURL('image/png'))
    setEstado('nombre')
  }, [])

  const iniciarConteo = useCallback(() => {
    let count = COUNTDOWN
    setCountdown(count)
    const tick = () => {
      count -= 1
      setCountdown(count)
      if (count > 0) timerRef.current = setTimeout(tick, 1000)
      else capturarFoto()
    }
    timerRef.current = setTimeout(tick, 1000)
  }, [capturarFoto])

  const irACamara = useCallback(async () => {
    setError(null)
    limpiarTimer()
    try {
      await iniciarStream(frontalRef.current)
      setEstado('camara')
      iniciarConteo()
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }, [iniciarConteo])

  const cancelarCamara = () => {
    limpiarTimer()
    detenerStream()
    setEstado('bienvenida')
  }

  const toggleCamara = async () => {
    limpiarTimer()
    const nueva = !frontalRef.current
    frontalRef.current = nueva
    setFrontal(nueva)
    setCountdown(COUNTDOWN)
    try {
      await iniciarStream(nueva)
      iniciarConteo()
    } catch {
      setError('Error al cambiar la cámara.')
    }
  }

  const generarCard = async () => {
    if (!capturedUrl || !canvasRef.current || !nombre.trim()) return
    setEstado('guardando')
    setProgreso(0)

    const t0 = performance.now()
    const log = (label: string) => console.log(`[card] ${label}: ${Math.round(performance.now() - t0)}ms`)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    canvas.width = 1080
    canvas.height = 1920

    await new Promise<void>(res => {
      const img = new Image()
      img.onload = () => { ctx.drawImage(img, 0, 0, 1080, 1920); res() }
      img.src = capturedUrl
    })
    log('canvas listo')

    await document.fonts.ready
    const text = nombre.trim().toUpperCase()
    const size = Math.max(72, Math.min(130, Math.floor(950 / Math.max(text.length, 1))))

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold italic ${size}px Oswald, Impact, Arial Black`
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 5
    ctx.strokeStyle = '#2a0000'
    ctx.lineWidth = 8
    ctx.strokeText(text, 540, 1640)
    const grad = ctx.createLinearGradient(0, 1590, 0, 1695)
    grad.addColorStop(0, '#FFF176')
    grad.addColorStop(0.45, '#FFD700')
    grad.addColorStop(1, '#B8860B')
    ctx.fillStyle = grad
    ctx.fillText(text, 540, 1640)
    ctx.restore()

    // Fake progress animation
    let fake = 0
    const interval = setInterval(() => {
      fake = Math.min(fake + Math.random() * 14 + 4, 85)
      setProgreso(fake)
    }, 130)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      log(`toBlob (${(blob.size/1024).toFixed(0)}KB)`)
      try {
        const form = new FormData()
        form.append('foto', blob, 'foto.png')
        form.append('nombre', nombre.trim())

        const res = await fetch('/api/upload', { method: 'POST', body: form })
        log('fetch respondido')
        const data = await res.json()

        clearInterval(interval)
        setProgreso(100)
        if (!res.ok) throw new Error(data.error)

        const cardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/foto/${data.id}`
        const qr = await QRCode.toDataURL(cardUrl, { width: 280, margin: 1 })

        setQrUrl(qr)
        setImagenUrl(data.image_url)
        setFotoId(data.id)

        setTimeout(() => {
          setEstado('resultado')
          let t = REINICIO_SEG
          setReinicioSeg(t)
          const tick = () => {
            t -= 1
            setReinicioSeg(t)
            if (t > 0) timerRef.current = setTimeout(tick, 1000)
            else reiniciar()
          }
          timerRef.current = setTimeout(tick, 1000)
        }, 400)
      } catch {
        clearInterval(interval)
        setError('Error al guardar. Intenta de nuevo.')
        setEstado('nombre')
      }
    }, 'image/png')
  }

  const reiniciar = () => {
    limpiarTimer()
    detenerStream()
    setCapturedUrl(null)
    setNombre('')
    setQrUrl(null)
    setImagenUrl(null)
    setFotoId(null)
    setProgreso(0)
    setError(null)
    setReinicioSeg(REINICIO_SEG)
    setEstado('bienvenida')
  }

  return (
    <div className="relative w-full min-h-[100dvh] overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* ── 1. BIENVENIDA ── */}
      {estado === 'bienvenida' && (
        <div className="relative w-full min-h-[100dvh] flex flex-col items-center justify-end">
          <img src="/bienvenida.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }}
          />
          <div
            className="relative z-10 flex flex-col items-center gap-4 px-8 w-full"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
          >
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={irACamara}
              className="w-full max-w-xs flex items-center justify-center gap-3 py-4 sm:py-5 rounded-full font-black text-white text-lg sm:text-xl uppercase tracking-widest"
              style={{
                background: 'linear-gradient(135deg, #DD0000 0%, #770000 100%)',
                boxShadow: '0 0 40px rgba(220,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              📷 Tómate tu foto
            </button>
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-[0.22em] text-center">
              Aquí fue que se prendió la cosa
            </p>
          </div>
        </div>
      )}

      {/* ── 2. CÁMARA + COUNTDOWN ── */}
      {estado === 'camara' && (
        <div className="fixed inset-0 w-full h-[100dvh] bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={frontal ? { transform: 'scaleX(-1)' } : {}}
          />
          <div className="absolute inset-0 bg-black/25" />

          {/* Corona */}
          <div className="absolute top-8 inset-x-0 flex justify-center z-10">
            <span className="text-5xl drop-shadow-lg">👑</span>
          </div>

          {/* Guías de encuadre */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="relative w-56 h-64">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-white/90" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-white/90" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-white/90" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-white/90" />
            </div>
          </div>

          {/* Countdown + texto */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none gap-3">
            <span
              className="font-black text-white"
              style={{
                fontSize: '150px',
                lineHeight: 1,
                textShadow: '0 0 60px rgba(220,0,0,0.8), 0 4px 20px rgba(0,0,0,0.8)',
                fontFamily: 'var(--font-oswald), Impact',
              }}
            >
              {countdown}
            </span>
            <span
              className="text-white/90 text-2xl font-semibold tracking-widest uppercase"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
            >
              Prepárate...
            </span>
          </div>

          {/* Controles inferiores */}
          <div className="absolute bottom-10 inset-x-0 flex items-center justify-between px-8 z-10">
            <button
              onClick={toggleCamara}
              className="flex flex-col items-center gap-1 text-white/70 text-xs font-semibold"
            >
              <span className="text-3xl">🔄</span>
              <span>Girar</span>
            </button>
            <button
              onClick={cancelarCamara}
              className="flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm text-white uppercase tracking-wider border border-white/30 bg-black/50 backdrop-blur-sm"
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── 3. NOMBRE ── */}
      {estado === 'nombre' && (
        <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-black overflow-y-auto">
          <div className="flex flex-col items-center px-6 pt-8 pb-10 gap-5">
            <p className="text-white/40 uppercase tracking-[0.22em] text-xs font-bold">Tu Foto</p>

            {capturedUrl && (
              <div className="w-36 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img src={capturedUrl} alt="preview" className="w-full" />
              </div>
            )}

            <div className="w-full max-w-xs flex flex-col gap-4">
              <p className="text-white text-center font-semibold text-lg">Escribe tu nombre</p>

              <div className="relative">
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && nombre.trim() && generarCard()}
                  placeholder="María"
                  maxLength={20}
                  autoFocus
                  className="w-full px-5 py-4 pr-12 rounded-xl bg-white text-black font-bold text-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                {nombre && (
                  <button
                    onClick={() => setNombre('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl leading-none"
                  >✕</button>
                )}
              </div>

              <button
                onClick={generarCard}
                disabled={!nombre.trim()}
                className="w-full py-5 rounded-full font-black text-white text-lg uppercase tracking-widest transition-all disabled:opacity-35"
                style={{
                  background: nombre.trim()
                    ? 'linear-gradient(135deg, #DD0000 0%, #770000 100%)'
                    : '#2a2a2a',
                  boxShadow: nombre.trim() ? '0 0 35px rgba(220,0,0,0.45)' : 'none',
                }}
              >
                Generar mi MVP Card →
              </button>

              <button
                onClick={() => { setCapturedUrl(null); setNombre(''); irACamara() }}
                className="flex items-center justify-center gap-2 text-white/40 text-sm py-2 font-semibold"
              >
                ↺ Tomar otra foto
              </button>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. GUARDANDO ── */}
      {estado === 'guardando' && (
        <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center bg-black px-8">
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div style={{ fontSize: '90px', filter: 'drop-shadow(0 0 25px rgba(255,255,255,0.25))' }}>
              ☁️
            </div>
            <div className="text-center">
              <p className="text-white font-black text-2xl mb-2 uppercase tracking-wide">
                Guardando tu MVP Card...
              </p>
              <p className="text-white/40 text-sm">Esto solo tomará unos segundos</p>
            </div>
            <div className="w-full">
              <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${progreso}%`,
                    background: 'linear-gradient(90deg, #AA0000, #FF3333)',
                    boxShadow: '0 0 10px rgba(255,50,50,0.6)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. RESULTADO ── */}
      {estado === 'resultado' && (
        <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center overflow-y-auto">
          <img src="/bienvenida.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-black/75" />

          <div className="relative z-10 flex flex-col items-center gap-6 px-8 w-full max-w-sm">
            <div className="text-center">
              <p
                className="font-black text-4xl uppercase tracking-wider mb-2"
                style={{
                  color: '#FFD700',
                  fontFamily: 'var(--font-oswald), Impact',
                  textShadow: '0 0 40px rgba(255,215,0,0.5)',
                }}
              >
                ¡Listo! 🏆
              </p>
              <p className="text-white/60 text-sm leading-relaxed">
                Escanea este QR desde tu celular<br />para descargar tu MVP Card
              </p>
            </div>

            {qrUrl && (
              <div className="bg-white p-4 rounded-2xl shadow-2xl">
                <img src={qrUrl} alt="QR Code" className="w-56 h-56" />
              </div>
            )}

            {imagenUrl && (
              <a
                href={`/api/download?url=${encodeURIComponent(imagenUrl)}&id=${fotoId ?? ''}`}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-white font-bold text-sm uppercase tracking-widest border border-white/20 bg-white/10 backdrop-blur-sm"
              >
                ↓ También puedes descargar aquí
              </a>
            )}

            <button
              onClick={reiniciar}
              className="text-white/30 text-xs font-medium"
            >
              Volviendo al inicio en {reinicioSeg}s... (toca para reiniciar)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
