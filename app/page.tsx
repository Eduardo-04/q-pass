"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';

// Colores de la marca
const colors = {
  primary: '#0891b2', // cyan-600
  primaryDark: '#0e7490', // cyan-700
  secondary: '#0f172a', // slate-900
  accent: '#14b8a6', // teal-500
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textLight: '#64748b',
  textLighter: '#94a3b8',
  success: '#10b981',
  successLight: '#d1fae5',
};

// Estilos para el PDF - Diseño tipo boarding pass
const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: colors.background,
    fontFamily: 'Helvetica',
  },
  
  // Contenido principal con bordes redondeados
  container: {
    margin: 30,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  
  // Header con gradiente
  header: {
    backgroundColor: colors.secondary,
    padding: 25,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary,
  },
  
  logo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
  },
  
  logoSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 5,
  },
  
  eventBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  
  eventBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  // Título del evento
  eventTitle: {
    marginTop: 15,
  },
  
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  
  eventDate: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  
  // Cuerpo del ticket
  body: {
    padding: 25,
  },
  
  // Sección de código QR
  qrSection: {
    alignItems: 'center',
    marginBottom: 25,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  
  qrLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textLight,
    letterSpacing: 2,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  
  qrImage: {
    width: 180,
    height: 180,
  },
  
  // Información del ticket en grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 15,
  },
  
  infoCard: {
    width: '48%',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  infoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  
  infoValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: 'semibold',
  },
  
  infoValueSmall: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 4,
  },
  
  // Línea divisoria con efecto perforado
  perforatedLine: {
    marginVertical: 20,
    height: 2,
    backgroundColor: colors.border,
    borderStyle: 'dashed',
  },
  
  // Sección de instrucciones
  instructions: {
    backgroundColor: colors.successLight,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  
  instructionsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  instructionsText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.4,
  },
  
  // Footer
  footer: {
    backgroundColor: colors.secondary,
    padding: 20,
    alignItems: 'center',
  },
  
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 1,
  },
  
  footerHighlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  
  // Método de pago
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  paymentText: {
    fontSize: 8,
    color: colors.textLight,
  },
});

// Componente PDF mejorado
const TicketPDF = ({ ticketData, evento, qrCodeBase64 }: { ticketData: any; evento: Evento | undefined; qrCodeBase64: string }) => {
  const fechaFormateada = evento?.fecha_evento ? new Date(evento.fecha_evento).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Fecha por confirmar';
  
  const horaEvento = evento?.fecha_evento ? new Date(evento.fecha_evento).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  }) : '18:00 hrs';

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.container}>
          {/* Header con gradiente */}
          <View style={pdfStyles.header}>
            <View style={pdfStyles.logo}>
              <View>
                <Text style={pdfStyles.logoText}>Q-PASS</Text>
                <Text style={pdfStyles.logoSub}>Sistema de Acceso Digital</Text>
              </View>
              <View style={pdfStyles.eventBadge}>
                <Text style={pdfStyles.eventBadgeText}>ENTRADA DIGITAL</Text>
              </View>
            </View>
            
            <View style={pdfStyles.eventTitle}>
              <Text style={pdfStyles.eventName}>{evento?.nombre || 'Evento Especial'}</Text>
              <Text style={pdfStyles.eventDate}>{fechaFormateada} • {horaEvento}</Text>
            </View>
          </View>

          {/* Cuerpo del ticket */}
          <View style={pdfStyles.body}>
            {/* Sección QR */}
            <View style={pdfStyles.qrSection}>
              <Text style={pdfStyles.qrLabel}>Código de acceso</Text>
              {qrCodeBase64 && (
                <Image src={qrCodeBase64} style={pdfStyles.qrImage} />
              )}
            </View>

            {/* Grid de información */}
            <View style={pdfStyles.infoGrid}>
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>ID del boleto</Text>
                <Text style={pdfStyles.infoValue}>{ticketData?.id || 'N/A'}</Text>
                <Text style={pdfStyles.infoValueSmall}>Presenta este código</Text>
              </View>
              
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>Titular</Text>
                <Text style={pdfStyles.infoValue}>{ticketData?.email?.split('@')[0] || 'Usuario'}</Text>
                <Text style={pdfStyles.infoValueSmall}>{ticketData?.email || 'Registrado'}</Text>
              </View>
              
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>Localidad</Text>
                <Text style={pdfStyles.infoValue}>General</Text>
                <Text style={pdfStyles.infoValueSmall}>Acceso libre</Text>
              </View>
              
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>Asiento</Text>
                <Text style={pdfStyles.infoValue}>No asignado</Text>
                <Text style={pdfStyles.infoValueSmall}>Acceso general</Text>
              </View>
            </View>

            {/* Precio si aplica */}
            {evento?.precio && evento.precio > 0 && (
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.infoLabel}>Monto pagado</Text>
                <Text style={[pdfStyles.infoValue, { color: colors.primary, fontSize: 14, fontWeight: 'bold' }]}>
                  ${evento.precio.toLocaleString()} MXN
                </Text>
              </View>
            )}

            {/* Línea perforada */}
            <View style={pdfStyles.perforatedLine} />

            {/* Instrucciones */}
            <View style={pdfStyles.instructions}>
              <Text style={pdfStyles.instructionsTitle}>📌 Instrucciones de acceso</Text>
              <Text style={pdfStyles.instructionsText}>
                1. Presenta este pase digital en la entrada del evento{'\n'}
                2. El personal escaneará el código QR{'\n'}
                3. Válido para un solo ingreso{'\n'}
                4. No se permiten reimpresiones ni duplicados
              </Text>
            </View>

            {/* Método de pago */}
            <View style={pdfStyles.paymentMethod}>
              <Text style={pdfStyles.paymentText}>Pago procesado por Q-Pass</Text>
              <Text style={pdfStyles.paymentText}>Fecha de emisión: {new Date().toLocaleDateString()}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={pdfStyles.footer}>
            <Text style={pdfStyles.footerText}>
              © 2024 <Text style={pdfStyles.footerHighlight}>LIZARD TECH</Text> • Q-PASS DIGITAL ACCESS
            </Text>
            <Text style={[pdfStyles.footerText, { marginTop: 5 }]}>
              Para más información: soporte@qpass.com
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

type Evento = {
  id: string;
  nombre: string;
  fecha_evento: string;
  visible_desde: string;
  visible_hasta: string;
  activo: boolean;
  capacidad?: number;
  precio?: number;
};

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  const [mensaje, setMensaje] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [qrCodeBase64, setQrCodeBase64] = useState<string>("");

  const hoy = new Date().toISOString().split("T")[0];

  const showMessage = (text: string, type: "success" | "error" | "info" = "info") => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 5000);
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const generateQRCode = async (text: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(text, {
        width: 400,
        margin: 2,
        color: {
          dark: colors.primary,
          light: '#FFFFFF'
        }
      });
      return qrDataUrl;
    } catch (err) {
      console.error("Error generando QR:", err);
      return "";
    }
  };

  useEffect(() => {
    const fetchEventos = async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, nombre, fecha_evento, visible_desde, visible_hasta, activo, capacidad, precio")
        .eq("activo", true)
        .lte("visible_desde", hoy)
        .gte("visible_hasta", hoy)
        .order("fecha_evento", { ascending: true });

      if (error) {
        showMessage("No se pudieron cargar los eventos disponibles.", "error");
        setEventos([]);
        setSelectedEvento("");
        return;
      }

      const lista = (data ?? []) as Evento[];
      setEventos(lista);

      if (lista.length > 0) {
        setSelectedEvento((prev) => prev || lista[0].id);
      } else {
        setSelectedEvento("");
      }
    };

    fetchEventos();
  }, [hoy]);

  const eventoActual = useMemo(
    () => eventos.find((e) => e.id === selectedEvento),
    [eventos, selectedEvento]
  );

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsEmailValid(validateEmail(newEmail));
  };

  const comprarBoleto = async () => {
    if (!email || !selectedEvento) {
      showMessage("Completa tu correo y selecciona un evento.", "error");
      return;
    }

    if (!validateEmail(email)) {
      showMessage("Ingresa un correo electrónico válido.", "error");
      return;
    }

    setLoading(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, eventoId: selectedEvento }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showMessage(data.error ?? "No se pudo completar el registro.", "error");
        setLoading(false);
        return;
      }

      setTicketId(data.ticket.id);
      setTicketData({ ...data.ticket, email });
      
      const qrBase64 = await generateQRCode(data.ticket.id);
      setQrCodeBase64(qrBase64);
      
      showMessage("¡Registro completado con éxito!", "success");
    } catch (err) {
      console.error("Error:", err);
      showMessage("Error de conexión. Intenta nuevamente.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTicketId(null);
    setTicketData(null);
    setQrCodeBase64("");
    setEmail("");
    setSelectedEvento(eventos[0]?.id || "");
    setMensaje(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f14] via-[#0d1219] to-[#0a0f14]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Panel principal - Registro */}
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border border-white/10 bg-[#111823]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="border-b border-white/10 bg-gradient-to-r from-cyan-500/5 to-transparent px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10">
                    <span className="text-lg">🎫</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Q-Pass Registro</h1>
                    <p className="text-xs text-slate-400">Obtén tu acceso digital</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {!ticketId ? (
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-300">
                        Selecciona tu evento
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-xl border border-white/10 bg-[#0a0f14] px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                          value={selectedEvento}
                          onChange={(e) => setSelectedEvento(e.target.value)}
                          disabled={eventos.length === 0}
                        >
                          {eventos.length === 0 ? (
                            <option value="">No hay eventos disponibles</option>
                          ) : (
                            eventos.map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.nombre} - {new Date(ev.fecha_evento).toLocaleDateString()}
                              </option>
                            ))
                          )}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">▼</span>
                      </div>
                      
                      {eventoActual && (
                        <div className="mt-3 rounded-xl bg-cyan-400/5 border border-cyan-400/10 p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">📅 {formatDate(eventoActual.fecha_evento)}</span>
                            {eventoActual.capacidad && (
                              <span className="text-slate-400">👥 Hasta {eventoActual.capacidad.toLocaleString()} personas</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-300">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        className={`w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition bg-[#0a0f14] placeholder:text-slate-500 focus:ring-1 ${
                          !isEmailValid && email
                            ? 'border-red-400/50 focus:border-red-400/50 focus:ring-red-400/20'
                            : 'border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20'
                        }`}
                        value={email}
                        onChange={handleEmailChange}
                      />
                      {!isEmailValid && email && (
                        <p className="mt-1 text-xs text-red-400">Ingresa un correo válido</p>
                      )}
                    </div>

                    {mensaje && (
                      <div className={`rounded-xl border px-4 py-3 text-sm ${
                        mensaje.type === "success" 
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : mensaje.type === "error"
                          ? "border-red-400/20 bg-red-400/10 text-red-300"
                          : "border-white/10 bg-black/30 text-slate-300"
                      }`}>
                        {mensaje.text}
                      </div>
                    )}

                    <button
                      onClick={comprarBoleto}
                      disabled={loading || !selectedEvento || eventos.length === 0 || !email || !isEmailValid}
                      className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-cyan-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Procesando...
                        </div>
                      ) : (
                        "Registrarme ahora"
                      )}
                    </button>

                    <div className="rounded-xl border border-white/10 bg-[#0a0f14] p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        ¿Cómo funciona?
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        1️⃣ Selecciona tu evento<br />
                        2️⃣ Ingresa tu correo<br />
                        3️⃣ Recibirás tu QR digital
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/20 p-4 text-center">
                      <div className="mb-2 text-3xl">🎉</div>
                      <h3 className="text-lg font-semibold text-emerald-300">¡Registro exitoso!</h3>
                      <p className="mt-1 text-xs text-emerald-300/80">Guarda este QR para tu ingreso</p>
                    </div>

                    <div className="flex justify-center">
                      <div className="rounded-2xl bg-white p-4 shadow-xl">
                        <QRCodeSVG value={ticketId} size={200} />
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#0a0f14] border border-white/10 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">ID del boleto</p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-300">{ticketId}</p>
                      {eventoActual && (
                        <>
                          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evento</p>
                          <p className="mt-1 text-sm text-white">{eventoActual.nombre}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDate(eventoActual.fecha_evento)}</p>
                        </>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {qrCodeBase64 && (
                        <PDFDownloadLink
                          document={<TicketPDF ticketData={ticketData} evento={eventoActual} qrCodeBase64={qrCodeBase64} />}
                          fileName={`qpass-${ticketId}.pdf`}
                          className="flex-1"
                        >
                          {({ loading: pdfLoading }) => (
                            <button
                              disabled={pdfLoading}
                              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] disabled:opacity-50"
                            >
                              {pdfLoading ? "Generando PDF..." : "📄 Descargar PDF"}
                            </button>
                          )}
                        </PDFDownloadLink>
                      )}

                      <button
                        onClick={resetForm}
                        className="flex-1 rounded-xl border border-white/10 bg-[#0a0f14] px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5"
                      >
                        Registrar otro
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel lateral - Información */}
          <div className="order-1 lg:order-2">
            <div className="sticky top-8 space-y-4">
              {eventoActual && (
                <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-400/20 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Evento seleccionado</p>
                      <h3 className="mt-1 text-lg font-bold text-white">{eventoActual.nombre}</h3>
                      <div className="mt-3 space-y-1 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>{formatDate(eventoActual.fecha_evento)}</span>
                        </div>
                        {eventoActual.precio !== undefined && eventoActual.precio > 0 && (
                          <div className="flex items-center gap-2">
                            <span>💰</span>
                            <span>${eventoActual.precio.toLocaleString()} MXN</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl">🎪</div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-[#111823]/50 p-5">
                <h4 className="text-sm font-semibold text-white mb-3">Beneficios del pase digital</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <span className="text-cyan-400">✓</span>
                    <span className="text-slate-300">Acceso sin contacto</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <span className="text-cyan-400">✓</span>
                    <span className="text-slate-300">Validación instantánea</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <span className="text-cyan-400">✓</span>
                    <span className="text-slate-300">Seguro y antifalsificación</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <span className="text-cyan-400">✓</span>
                    <span className="text-slate-300">Descarga tu pase en PDF</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111823]/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Eventos disponibles</span>
                  <span className="text-2xl font-bold text-cyan-300">{eventos.length}</span>
                </div>
              </div>

              <div className="pt-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-600">LIZARD TECH • Q-PASS DIGITAL ACCESS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}