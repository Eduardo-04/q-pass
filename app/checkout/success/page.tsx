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
      <div className="text-center py-20">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">Hubo un problema</h2>
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-xl border border-white/10 bg-[#111823] px-6 py-2 text-sm text-white hover:bg-white/5"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-white">¡Compra exitosa!</h2>
        <p className="text-slate-400 mt-1">
          {data.payment_status === "paid" 
            ? `Se han generado ${data.tickets.length} boletos digitales` 
            : "El pago se está procesando. Actualiza la página en unos momentos."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.tickets.map((ticket, index) => (
          <div key={ticket.id} className="rounded-2xl border border-white/10 bg-[#111823]/80 p-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded-xl">
                <QRCodeSVG value={ticket.qr_token || ticket.id} size={80} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Asistente {index + 1}</p>
                <p className="text-sm font-semibold text-white">{ticket.nombre_comprador}</p>
                <p className="text-xs text-slate-400">{ticket.email_comprador}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">ID: {ticket.id.slice(0, 8)}...</p>
              </div>
            </div>
            {/* Botón de descarga PDF individual */}
            {qrCodes[ticket.id] && data.payment_status === "paid" && (
              <div className="mt-3">
                <PDFDownloadLink
                  document={
                    <TicketPDF 
                      ticketData={ticket} 
                      evento={data.evento} 
                      qrCodeBase64={qrCodes[ticket.id]} 
                      asistente={{ nombreCompleto: ticket.nombre_comprador, email: ticket.email_comprador }} 
                    />
                  }
                  fileName={`qpass-${ticket.nombre_comprador.replace(/\s/g, '-')}.pdf`}
                  className="w-full"
                >
                  {({ loading: pdfLoading }) => (
                    <button
                      disabled={pdfLoading}
                      className="w-full rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/30"
                    >
                      {pdfLoading ? "Generando PDF..." : "📄 Descargar boleto"}
                    </button>
                  )}
                </PDFDownloadLink>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center flex gap-3 justify-center">
        <button
          onClick={() => router.push("/")}
          className="rounded-xl border border-white/10 bg-[#111823] px-6 py-2 text-sm text-white hover:bg-white/5"
        >
          Comprar más boletos
        </button>
        {data.payment_status === "paid" && (
          <button
            onClick={() => {
              // Descargar todos los PDFs iterando sobre los links
              const links = document.querySelectorAll('a[download]');
              links.forEach((link) => (link as HTMLAnchorElement).click());
            }}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-2 text-sm text-white hover:from-cyan-600 hover:to-cyan-700"
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f14] via-[#0d1219] to-[#0a0f14]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 mb-4">
            Pago Completado
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Q-Pass Tickets</h1>
        </div>

        <Suspense fallback={
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
          </div>
        }>
          <SuccessContent />
        </Suspense>

        {/* Footer */}
        <div className="mt-12 pt-6 text-center border-t border-white/10">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">LIZARD TECH • Q-PASS DIGITAL ACCESS</p>
        </div>
      </div>
    </div>
  );
}
