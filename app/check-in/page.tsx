"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';

type ValidationStatus = {
  success: boolean;
  message: string;
  email?: string;
  ticketId?: string;
  eventName?: string;
};

export default function CheckInPage() {
  const { user: currentUser, isOrganizador, signOut } = useAuth();
  const [status, setStatus] = useState<ValidationStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const playAudioFeedback = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        // Tono agudo y rápido (880Hz -> 1046Hz) para éxito
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // Tono grave de alerta (220Hz -> 180Hz) para error o usado
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Ignorar si el navegador bloquea audio sin interacción previa
    }
  };

  const processTicket = useCallback(async (ticketId: string) => {
    // Evitar escaneos duplicados en menos de 3 segundos
    if (isProcessing) return;
    if (lastScanned === ticketId) return;

    setIsProcessing(true);
    setLastScanned(ticketId);

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        body: JSON.stringify({ ticketId }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      setStatus(data);

      // Reproducir sonido y vibración
      playAudioFeedback(data.success);

      if ('vibrate' in navigator) {
        if (data.success) {
          navigator.vibrate(200);
        } else {
          navigator.vibrate([150, 100, 150]);
        }
      }

      // Limpiar el resultado visual después de 5 segundos
      setTimeout(() => {
        setStatus(prev => prev === data ? null : prev);
      }, 5000);

    } catch (err) {
      console.error("Error en la petición:", err);
      playAudioFeedback(false);
      setStatus({ 
        success: false, 
        message: "Error de conexión con el servidor. Intenta nuevamente." 
      });
    } finally {
      setTimeout(() => setIsProcessing(false), 2000);
    }
  }, [isProcessing, lastScanned]);

  useEffect(() => {
    const initScanner = async () => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
          },
          false
        );

        const onScanSuccess = (decodedText: string) => {
          processTicket(decodedText);
        };

        const onScanError = (error: unknown) => {
          // Silencioso - no llenar consola
          const errObj = error as { name?: string };
          if (errObj?.name !== 'NotFoundException') {
            console.debug("Scanner error:", error);
          }
        };

        scannerRef.current.render(onScanSuccess, onScanError);
        setScannerReady(true);
      } catch (err) {
        console.error("Error inicializando scanner:", err);
        setStatus({ 
          success: false, 
          message: "No se pudo iniciar la cámara. Verifica los permisos." 
        });
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => 
          console.error("Error al limpiar scanner", err)
        );
      }
    };
  }, [processTicket]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f14] to-[#06090c]">
      <div className="mx-auto max-w-lg px-4 py-6 md:px-6 md:py-10">
        {/* Header simplificado */}
        <div className="mb-6 text-center flex flex-col items-center">
          <div className="mb-4">
            <Image 
              src="/q-pass-logo.png" 
              alt="Q-Pass Logo" 
              width={100} 
              height={100} 
              priority
              className="drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Sistema de Acceso
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Escanea el código QR del boleto
          </p>
        </div>

        {/* Scanner Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111823]/80 shadow-2xl backdrop-blur-md">
          {/* Header del scanner */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#0a0f14]/60">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${scannerReady ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-xs font-semibold text-slate-300">
                {scannerReady ? 'Cámara Activa' : 'Iniciando cámara...'}
              </span>
            </div>
            <span className="text-xs font-mono font-medium text-cyan-400">
              Escáner Q-Pass
            </span>
          </div>

          {/* Contenedor del scanner */}
          <div className="relative">
            <div
              id="reader"
              className="w-full [&_video]:rounded-none [&_div]:rounded-none"
            />
            
            {/* Overlay de procesamiento */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm transition-all duration-300">
                <div className="text-center p-4">
                  <div className="mb-3 flex justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
                  </div>
                  <p className="text-base font-bold text-white tracking-wide">
                    Validando acceso...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div className="border-t border-white/10 bg-[#0a0f14]/80 px-4 py-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>📷 Buena iluminación</span>
              <span>🎯 Apunta al código QR</span>
            </div>
          </div>
        </div>

        {/* Sección de Validación Manual por Código */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#111823]/60 p-4 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const inputEl = (e.currentTarget.elements.namedItem("manualInput") as HTMLInputElement);
              const val = inputEl?.value?.trim();
              if (val) {
                processTicket(val);
                inputEl.value = "";
              }
            }}
            className="flex gap-2"
          >
            <input
              name="manualInput"
              type="text"
              placeholder="Ingresa Folio de 8 dígitos (ej. 75F9EA34)"
              className="flex-1 rounded-xl border border-white/15 bg-[#0a0f14] px-3.5 py-2.5 text-xs text-cyan-300 uppercase placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono tracking-widest font-bold"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-600 disabled:opacity-50 shrink-0"
            >
              Validar
            </button>
          </form>
        </div>

        {/* Resultado de validación */}
        {status && (
          <div className={`mt-5 overflow-hidden rounded-2xl border-2 transition-all duration-300 animate-in slide-in-from-bottom-4 shadow-2xl ${
            status.success
              ? 'border-emerald-400/50 bg-emerald-950/80 text-emerald-100'
              : 'border-red-500/50 bg-red-950/80 text-red-100'
          }`}>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  status.success ? 'bg-emerald-400/20 text-emerald-300' : 'bg-red-400/20 text-red-300'
                }`}>
                  <span className="text-2xl">
                    {status.success ? '✅' : '🚫'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-lg font-bold tracking-tight ${
                    status.success ? 'text-emerald-300' : 'text-red-300'
                  }`}>
                    {status.success ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
                  </p>
                  <p className="text-sm text-slate-200 mt-1 font-medium leading-snug break-words">
                    {status.message}
                  </p>
                </div>
              </div>
              
              {status.email && (
                <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-3.5 space-y-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">
                      Asistente Registrado
                    </p>
                    <p className="text-base font-semibold font-mono text-white truncate mt-0.5">
                      {status.email}
                    </p>
                  </div>
                  {status.eventName && (
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        Evento
                      </p>
                      <p className="text-xs font-medium text-slate-200 mt-0.5">
                        {status.eventName}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center space-y-4">
          <button
            onClick={() => {
              setStatus(null);
              setLastScanned(null);
            }}
            className="text-xs text-slate-500 transition hover:text-slate-300"
          >
            Limpiar último resultado
          </button>
          
          <div className="flex flex-col items-center gap-3">
            {currentUser && isOrganizador && (
              <button
                onClick={() => window.location.href = "/admin"}
                className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-6 py-2 text-xs font-medium text-cyan-400 hover:bg-cyan-400/10"
              >
                Volver al Panel Administrativo
              </button>
            )}
            
            <button
              onClick={() => signOut()}
              className="rounded-lg border border-red-400/20 bg-red-400/5 px-6 py-2 text-xs font-medium text-red-400 hover:bg-red-400/10"
            >
              Cerrar Sesión
            </button>
          </div>

          <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-600">
            LIZARD TECH • Seguridad Digital
          </p>
        </div>
      </div>
    </div>
  );
}