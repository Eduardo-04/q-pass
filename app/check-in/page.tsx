"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

type ValidationStatus = {
  success: boolean;
  message: string;
  email?: string;
  ticketId?: string;
  eventName?: string;
};

export default function CheckInPage() {
  const [status, setStatus] = useState<ValidationStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

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

      if (!res.ok) {
        const errorMsg = `Error ${res.status}: No se pudo validar el ticket`;
        setStatus({ success: false, message: errorMsg });
        return;
      }

      const data = await res.json();
      setStatus(data);

      // Feedback visual con vibración si está disponible
      if ('vibrate' in navigator) {
        if (data.success) {
          navigator.vibrate(200);
        } else {
          navigator.vibrate([100, 100, 100]);
        }
      }

      // Limpiar el estado después de 4 segundos
      setTimeout(() => {
        setStatus(prev => prev === data ? null : prev);
      }, 4000);

    } catch (err) {
      console.error("Error en la petición:", err);
      setStatus({ 
        success: false, 
        message: "Error de conexión con el servidor. Intenta nuevamente." 
      });
    } finally {
      setTimeout(() => setIsProcessing(false), 3000);
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
            hideZoomButtonIfSupported: false,
          },
          false
        );

        const onScanSuccess = (decodedText: string) => {
          processTicket(decodedText);
        };

        const onScanError = (error: any) => {
          // Silencioso - no llenar consola
          if (error?.name !== 'NotFoundException') {
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
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Sistema de Acceso
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Validador Q-Pass
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Escanea el código QR del boleto
          </p>
        </div>

        {/* Scanner Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111823]/50 shadow-xl">
          {/* Header del scanner */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${scannerReady ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-xs font-medium text-slate-400">
                {scannerReady ? 'Cámara activa' : 'Iniciando...'}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] text-slate-500">
                QR Code
              </span>
            </div>
          </div>

          {/* Contenedor del scanner */}
          <div className="relative">
            <div
              id="reader"
              className="w-full [&_video]:rounded-none [&_div]:rounded-none"
            />
            
            {/* Overlay de procesamiento */}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                <div className="text-center">
                  <div className="mb-3 flex justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    Validando acceso...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div className="border-t border-white/10 bg-[#0a0f14]/50 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">📷 Asegura buena iluminación</span>
              <span className="text-slate-500">🎯 Centra el código QR</span>
            </div>
          </div>
        </div>

        {/* Resultado de validación */}
        {status && (
          <div className={`mt-4 overflow-hidden rounded-xl border-2 transition-all duration-300 animate-in slide-in-from-bottom-4 ${
            status.success
              ? 'border-emerald-400/30 bg-emerald-400/10'
              : 'border-red-400/30 bg-red-400/10'
          }`}>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  status.success ? 'bg-emerald-400/20' : 'bg-red-400/20'
                }`}>
                  <span className="text-xl">
                    {status.success ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${
                    status.success ? 'text-emerald-300' : 'text-red-300'
                  }`}>
                    {status.success ? 'Acceso Concedido' : 'Acceso Denegado'}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5 break-words">
                    {status.message}
                  </p>
                </div>
              </div>
              
              {status.email && (
                <div className="mt-3 rounded-lg bg-black/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Invitado
                  </p>
                  <p className="text-sm font-mono text-white truncate">
                    {status.email}
                  </p>
                  {status.eventName && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">
                        Evento
                      </p>
                      <p className="text-sm text-slate-300">
                        {status.eventName}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setStatus(null);
              setLastScanned(null);
            }}
            className="text-xs text-slate-500 transition hover:text-slate-300"
          >
            Limpiar último resultado
          </button>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-600">
            LIZARD TECH • Seguridad Digital
          </p>
        </div>
      </div>
    </div>
  );
}