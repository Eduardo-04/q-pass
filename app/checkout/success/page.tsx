"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { TicketPDF } from "@/components/TicketPDF";

interface Evento {
  id: string;
  nombre: string;
  fecha_evento: string;
}

interface Ticket {
  id: string;
  nombre_comprador: string;
  email_comprador: string;
  qr_token?: string;
}

// Componente para evitar advertencias de useSearchParams en SSR
function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id") || searchParams.get("order_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    order: Record<string, unknown>;
    tickets: Ticket[];
    evento: Evento;
    payment_status: string;
  } | null>(null);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});

  const generateQRCode = async (text: string) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 400,
        margin: 2,
        color: { dark: '#0891b2', light: '#FFFFFF' }
      });
    } catch (err) {
      console.error("Error generando QR:", err);
      return "";
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        setError("No se encontró una sesión válida.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/order/${sessionId}`);
        const result = await res.json();

        if (!result.success) {
          setError(result.error || "No se pudo cargar la orden.");
          setLoading(false);
          return;
        }

        setData(result);

        // Generar QR para cada ticket usando el token firmado
        const qrMap: { [key: string]: string } = {};
        for (const ticket of result.tickets) {
          qrMap[ticket.id] = await generateQRCode(ticket.qr_token || ticket.id);
        }
        setQrCodes(qrMap);
      } catch (err) {
        console.error("Error al obtener orden:", err);
        setError("Error de conexión al obtener los detalles.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400 mb-4" />
        <p className="text-slate-400">Verificando tu pago y generando boletos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="text-3xl">⚠️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">No se encontró la orden</h2>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="w-full rounded-xl border border-white/15 bg-[#111823] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const fechaEventoFormateada = data.evento?.fecha_evento
    ? new Date(data.evento.fecha_evento).toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header Result */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 mb-2">
          <span className="text-3xl">🎉</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">¡Compra Confirmada!</h2>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          {data.payment_status === "paid" 
            ? `Se ${data.tickets.length === 1 ? "ha generado 1 boleto digital" : `han generado ${data.tickets.length} boletos digitales`} listos para tu evento.` 
            : "El pago se está procesando. Actualiza la página en unos momentos."}
        </p>
      </div>

      {/* Resumen del Evento */}
      {data.evento && (
        <div className="rounded-2xl border border-cyan-400/20 bg-[#111823]/90 p-5 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">Evento Reservado</p>
            <h3 className="text-lg font-bold text-white mt-0.5">{data.evento.nombre}</h3>
            {fechaEventoFormateada && (
              <p className="text-xs text-slate-300 capitalize mt-1">📅 {fechaEventoFormateada}</p>
            )}
          </div>
          <div className="text-right sm:border-l sm:border-white/10 sm:pl-5 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Folio Orden</span>
            <span className="text-xs font-mono font-bold text-white bg-black/40 px-2.5 py-1 rounded-md border border-white/10">
              {data.order.id ? (data.order.id as string).slice(0, 8).toUpperCase() : "QPASS"}
            </span>
          </div>
        </div>
      )}

      {/* Grid o Lista centrada de Boletos */}
      <div className="flex flex-col items-center gap-6">
        {data.tickets.map((ticket, index) => (
          <div 
            key={ticket.id} 
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#111823] p-6 shadow-2xl backdrop-blur-xl space-y-5"
          >
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* QR Container */}
              <div className="bg-white p-3 rounded-2xl border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] shrink-0">
                <QRCodeSVG value={ticket.qr_token || ticket.id} size={130} />
              </div>

              {/* Informes del Asistente */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="inline-block rounded-full bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Asistente #{index + 1}
                </div>
                <p className="text-base font-bold text-white leading-snug">{ticket.nombre_comprador}</p>
                <p className="text-xs text-slate-300 font-mono truncate">{ticket.email_comprador}</p>
                <p className="text-[10px] font-mono text-slate-400 pt-1">
                  ID Pase: <span className="text-slate-300">{ticket.id.slice(0, 8)}...{ticket.id.slice(-4)}</span>
                </p>
              </div>
            </div>

            {/* Botón de descarga PDF individual */}
            {qrCodes[ticket.id] && data.payment_status === "paid" && (
              <div className="pt-2 border-t border-white/10">
                <PDFDownloadLink
                  document={
                    <TicketPDF 
                      ticketData={ticket} 
                      evento={data.evento} 
                      qrCodeBase64={qrCodes[ticket.id]} 
                      asistente={{ nombreCompleto: ticket.nombre_comprador, email: ticket.email_comprador }} 
                    />
                  }
                  fileName={`qpass-boleto-${ticket.nombre_comprador.replace(/\s+/g, '-')}.pdf`}
                  className="w-full"
                >
                  {({ loading: pdfLoading }) => (
                    <button
                      disabled={pdfLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50"
                    >
                      {pdfLoading ? "Generando PDF..." : "📄 Descargar Boleto PDF (1 página)"}
                    </button>
                  )}
                </PDFDownloadLink>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botones de acción inferiores */}
      <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={() => router.push("/boletos")}
          className="w-full sm:w-auto rounded-xl border border-white/15 bg-[#111823] px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
        >
          Ver más eventos
        </button>
        {data.payment_status === "paid" && data.tickets.length > 1 && (
          <button
            onClick={() => {
              const links = document.querySelectorAll('a[download]');
              links.forEach((link) => (link as HTMLAnchorElement).click());
            }}
            className="w-full sm:w-auto rounded-xl bg-cyan-500/20 border border-cyan-400/30 px-6 py-3 text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition"
          >
            Descargar todos los boletos
          </button>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0f14] text-white selection:bg-cyan-500 selection:text-black py-10">
      <div className="mx-auto max-w-5xl px-4">
        {/* Top Branding Header */}
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
            ✓ Pago y Registro Exitoso
          </div>
          <h1 className="text-2xl font-extrabold tracking-widest text-white uppercase">Q-PASS TICKETS</h1>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          </div>
        }>
          <SuccessContent />
        </Suspense>

        {/* Footer */}
        <div className="mt-16 pt-6 text-center border-t border-white/10 text-xs text-slate-500">
          LIZARD TECH • Q-PASS DIGITAL ACCESS
        </div>
      </div>
    </div>
  );
}
