"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import type { Evento, Asistente } from "@/types";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Ticket,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  MapPin
} from "lucide-react";
import Skeleton from "@/components/Skeleton";

interface EventoPageProps {
  params: Promise<{ slug: string }>;
}

export default function EventoDetallePage({ params }: EventoPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [boletosVendidos, setBoletosVendidos] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [asistentes, setAsistentes] = useState<Asistente[]>([
    { id: "1", nombreCompleto: "", email: "" }
  ]);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    async function fetchEvento() {
      setLoading(true);
      try {
        // Intentar buscar por ID (UUID) o por coincidencia de id
        let query = supabase.from("eventos").select("*");
        
        // Comprobar si es un UUID válido de 36 caracteres
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

        if (isUUID) {
          query = query.eq("id", slug);
        } else {
          // Si es un slug de texto, buscar por nombre insensible a mayúsculas
          query = query.ilike("nombre", `%${decodeURIComponent(slug).replace(/-/g, " ")}%`);
        }

        const { data, error } = await query.single();

        if (error || !data) {
          setEvento(null);
        } else {
          setEvento(data as Evento);

          // Contar boletos ya ocupados/vendidos para este evento
          const { count } = await supabase
            .from("boletos")
            .select("*", { count: "exact", head: true })
            .eq("evento_id", data.id)
            .in("estado", ["paid", "activo", "usado", "pending"]);

          setBoletosVendidos(count || 0);
        }
      } catch (err) {
        console.error("Error cargando evento:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvento();
  }, [slug, supabase]);

  const capacidadDisponible = evento ? Math.max(0, evento.capacidad - boletosVendidos) : 0;
  const esGratuito = evento?.precio === 0;

  const handleCantidadChange = (nuevaCantidad: number) => {
    const min = 1;
    const max = Math.min(10, capacidadDisponible);
    const val = Math.max(min, Math.min(max, nuevaCantidad));

    setCantidad(val);

    setAsistentes((prev) => {
      if (val > prev.length) {
        const nuevos: Asistente[] = Array.from({ length: val - prev.length }, (_, i) => ({
          id: (prev.length + i + 1).toString(),
          nombreCompleto: "",
          email: ""
        }));
        return [...prev, ...nuevos];
      } else {
        return prev.slice(0, val);
      }
    });
  };

  const updateAsistente = (index: number, field: keyof Asistente, value: string) => {
    const actualizados = [...asistentes];
    actualizados[index] = { ...actualizados[index], [field]: value };
    setAsistentes(actualizados);
  };

  const handleComprar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evento) return;

    // Validar datos del comprador principal y asistentes
    const mainEmail = asistentes[0]?.email?.trim() || "";
    if (!mainEmail || !mainEmail.includes("@")) {
      toast.error("Ingresa un correo electrónico válido para el comprador principal");
      return;
    }

    const asistentesNormalizados = asistentes.map((ast, i) => {
      if (!ast.nombreCompleto.trim()) {
        toast.error(`Ingresa el nombre completo del asistente ${i + 1}`);
        throw new Error(`Ingresa el nombre completo del asistente ${i + 1}`);
      }
      return {
        id: ast.id,
        nombreCompleto: ast.nombreCompleto.trim(),
        email: i === 0 ? mainEmail : (ast.email?.trim() || mainEmail)
      };
    });

    setProcesando(true);
    try {
      const response = await fetch("/api/checkout-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: evento.id,
          asistentes: asistentesNormalizados,
          email_comprador: mainEmail
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "No se pudo procesar la solicitud de compra");
      }

      if (resData.directIssued && resData.orderId) {
        toast.success("¡Reserva confirmada con éxito!");
        router.push(`/checkout/success?order_id=${resData.orderId}`);
      } else if (resData.checkoutUrl) {
        toast.success("Redirigiendo a la pasarela de pago segura...");
        window.location.href = resData.checkoutUrl;
      } else {
        throw new Error("Respuesta de pago no válida del servidor");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(errorMsg);
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f14] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-12 w-3/4 rounded-xl" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64 md:col-span-2 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6 rounded-2xl border border-white/10 bg-[#111823]/80 p-8 backdrop-blur-xl shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Evento no encontrado</h1>
            <p className="mt-2 text-sm text-slate-400">
              El evento que estás buscando no existe o ha sido desactivado por el organizador.
            </p>
          </div>
          <Link
            href="/boletos"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-cyan-600 hover:to-cyan-700"
          >
            Ver eventos disponibles
          </Link>
        </div>
      </div>
    );
  }

  const fechaFormateada = new Date(evento.fecha_evento).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const horaFormateada = new Date(evento.fecha_evento).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const totalEstimado = (evento.precio * cantidad).toFixed(2);

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white selection:bg-cyan-500 selection:text-black">
      {/* Background Glow Deco */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 border-b border-white/10 bg-[#0a0f14]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/q-pass-logo.png"
              alt="Q-Pass Logo"
              width={130}
              height={40}
              priority
              className="drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            />
          </Link>
          <Link
            href="/boletos"
            className="text-xs font-semibold text-slate-300 hover:text-cyan-300 transition"
          >
            ← Todos los Eventos
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Detalles del Evento (Columna Izquierda 7 col) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header del Evento */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" /> Evento Confirmado
                </span>

                {capacidadDisponible > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Boletos Disponibles
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
                    Agotado
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {evento.nombre}
              </h1>
            </div>

            {/* Tarjeta de Información Clave */}
            <div className="rounded-2xl border border-white/10 bg-[#111823]/80 p-6 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Fecha del Evento</p>
                    <p className="text-sm font-bold text-white capitalize mt-0.5">{fechaFormateada}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Horario de Inicio</p>
                    <p className="text-sm font-bold text-white mt-0.5">{horaFormateada} hrs</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Cupo y Disponibilidad</p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {capacidadDisponible} de {evento.capacidad} lugares disponibles
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-wider text-slate-400">Acceso Digital</p>
                    <p className="text-sm font-bold text-white mt-0.5">Código QR en Teléfono Movil</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Garantías y Seguridad Q-Pass */}
            <div className="rounded-2xl border border-white/10 bg-[#0d1219]/90 p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Garantía y Seguridad Q-Pass
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Emisión inmediata de pase digital con firma de seguridad HMAC.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Validación rápida y atómica mediante escáner oficial en puerta.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Descarga en PDF e integración directa a tu dispositivo.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Formulario de Compra / Registro (Columna Derecha 5 col) */}
          <div className="lg:col-span-5">
            <div className="sticky top-8 rounded-2xl border border-cyan-400/20 bg-[#111823] p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)] backdrop-blur-xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Precio por Entrada</p>
                  <p className="text-2xl font-extrabold text-white mt-0.5">
                    {esGratuito ? (
                      <span className="text-emerald-400">GRATUITO ($0 MXN)</span>
                    ) : (
                      `$${evento.precio.toFixed(2)} MXN`
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                  <Ticket className="w-6 h-6" />
                </div>
              </div>

              {capacidadDisponible > 0 ? (
                <form onSubmit={handleComprar} className="space-y-5">
                  
                  {/* Selector de Cantidad */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                      Cantidad de Boletos
                    </label>
                    <div className="flex items-center justify-between rounded-xl border border-white/15 bg-[#0a0f14] p-2">
                      <button
                        type="button"
                        onClick={() => handleCantidadChange(cantidad - 1)}
                        disabled={cantidad <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-30"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-lg font-bold text-white font-mono px-4">
                        {cantidad} {cantidad === 1 ? "boleto" : "boletos"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCantidadChange(cantidad + 1)}
                        disabled={cantidad >= Math.min(10, capacidadDisponible)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-30"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Formulario de Asistentes */}
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Datos de Asistente(s)
                    </label>

                    {asistentes.map((asistente, index) => (
                      <div key={asistente.id} className="rounded-xl border border-white/15 bg-[#0a0f14] p-4 space-y-3 shadow-inner">
                        <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          Asistente #{index + 1} {index === 0 ? "(Comprador Principal)" : ""}
                        </p>
                        <div>
                          <input
                            type="text"
                            placeholder="Nombre Completo *"
                            className="w-full rounded-lg border border-white/15 bg-[#111823] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                            value={asistente.nombreCompleto}
                            onChange={(e) => updateAsistente(index, "nombreCompleto", e.target.value)}
                            required
                          />
                        </div>
                        {index === 0 ? (
                          <div>
                            <input
                              type="email"
                              placeholder="Correo Electrónico *"
                              className="w-full rounded-lg border border-white/15 bg-[#111823] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                              value={asistente.email}
                              onChange={(e) => updateAsistente(index, "email", e.target.value)}
                              required
                            />
                            <p className="text-[10px] text-cyan-400/80 mt-1">
                              📬 Todos los boletos de esta compra se enviarán juntos a este correo.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Resumen Financiero */}
                  <div className="rounded-xl border border-white/10 bg-[#0a0f14]/60 p-4 space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Subtotal ({cantidad} boletos):</span>
                      <span className="font-semibold text-white">${totalEstimado} MXN</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-sm text-white">
                      <span>Total a Pagar:</span>
                      <span className="text-cyan-300">${totalEstimado} MXN</span>
                    </div>
                  </div>

                  {/* Botón de Pago / Registro */}
                  <button
                    type="submit"
                    disabled={procesando}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-4 text-base font-bold text-white shadow-[0_0_25px_rgba(34,211,238,0.4)] transition hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50"
                  >
                    {procesando ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando solicitud...
                      </>
                    ) : esGratuito ? (
                      <>
                        Confirmar Registro Gratis <ArrowRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        Proceder al Pago <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                </form>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <p className="text-base font-bold text-rose-400">Cupo Agotado</p>
                  <p className="text-xs text-slate-400">
                    Este evento ya no cuenta con entradas disponibles en este momento.
                  </p>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-slate-500">
        Q-Pass • Plataforma Digital de Boletos y Control de Acceso
      </footer>
    </div>
  );
}
