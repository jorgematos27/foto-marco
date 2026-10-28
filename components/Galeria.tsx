'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type Foto = {
  id: string
  image_url: string
  nombre: string | null
  created_at: string
}

const PAGE = 12

export default function Galeria({ inicial }: { inicial: Foto[] }) {
  const [fotos, setFotos] = useState<Foto[]>(inicial)
  const [cargando, setCargando] = useState(false)
  const [hayMas, setHayMas] = useState(inicial.length === PAGE)
  const [seleccionada, setSeleccionada] = useState<Foto | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const cargarMas = useCallback(async () => {
    if (cargando || !hayMas) return
    setCargando(true)
    try {
      const res = await fetch(`/api/gallery?offset=${fotos.length}&limit=${PAGE}`)
      const data = await res.json()
      setFotos((prev) => [...prev, ...(data.fotos as Foto[])])
      setHayMas(Boolean(data.hasMore))
    } catch {
      // silencioso: el usuario puede reintentar scrolleando
    } finally {
      setCargando(false)
    }
  }, [cargando, hayMas, fotos.length])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hayMas) return
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && cargarMas(),
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hayMas, cargarMas])

  // ESC cierra el modal
  useEffect(() => {
    if (!seleccionada) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSeleccionada(null)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [seleccionada])

  if (fotos.length === 0) {
    return (
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm py-10">
        <p className="text-white/60 text-center">Aún no hay cartas. ¡Sé la primera!</p>
        <Link
          href="/"
          className="px-8 py-3 rounded-full font-black text-white text-sm uppercase tracking-widest"
          style={{ background: 'linear-gradient(135deg, #DD0000, #770000)' }}
        >
          📷 Crea tu MVP Card
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full">
        {fotos.map((f) => (
          <button
            key={f.id}
            onClick={() => setSeleccionada(f)}
            className="group relative aspect-[9/16] overflow-hidden rounded-lg ring-1 ring-white/10 bg-black/40 cursor-pointer"
          >
            <img
              src={f.image_url}
              alt={f.nombre ?? 'MVP Card'}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {hayMas && (
        <div ref={sentinelRef} className="w-full flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-white/20 border-t-red-500 rounded-full animate-spin" />
        </div>
      )}

      {!hayMas && fotos.length > PAGE && (
        <p className="text-white/30 text-xs text-center py-10 uppercase tracking-widest">
          — Fin de la galería —
        </p>
      )}

      {seleccionada && <Modal foto={seleccionada} onClose={() => setSeleccionada(null)} />}
    </>
  )
}

function Modal({ foto, onClose }: { foto: Foto; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const cerrarConAnimacion = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={cerrarConAnimacion}
      style={{
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <button
        onClick={cerrarConAnimacion}
        className="absolute top-5 right-5 z-10 w-11 h-11 rounded-full bg-white/10 border border-white/30 text-white text-xl flex items-center justify-center backdrop-blur-sm hover:bg-white/20"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        ✕
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
        style={{
          maxWidth: 'min(420px, 90vw)',
          maxHeight: '88vh',
        }}
      >
        <div
          className="relative rounded-2xl p-[3px]"
          style={{
            background: 'linear-gradient(135deg, #FFD700 0%, #FF4444 50%, #FFD700 100%)',
            boxShadow:
              '0 0 60px rgba(255,215,0,0.5), 0 0 120px rgba(220,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.15)',
          }}
        >
          <img
            src={foto.image_url}
            alt={foto.nombre ?? 'MVP Card'}
            className="block rounded-[14px] max-h-[85vh] w-auto"
            style={{ maxWidth: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}
