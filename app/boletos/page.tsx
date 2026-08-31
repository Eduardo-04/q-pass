"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();
import Image from "next/image";

type Evento = {
  id: string;
  nombre: string;
  fecha_evento: string;
  visible_desde: string;
  visible_hasta: string;
  activo: boolean;
  capacidad?: number;
  precio?: number;
  banner_url?: string;
};

type Asistente = {
  id: string;
  nombreCompleto: string;
  email: string;
};


export default function HomePage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState("");
  const [cantidadBoletos, setCantidadBoletos] = useState(1);
  const [asistentes, setAsistentes] = useState<Asistente[]>([
    { id: crypto.randomUUID(), nombreCompleto: "", email: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const hoy = new Date().toISOString().split("T")[0];

  const showMessage = (text: string, type: "success" | "error" | "info" = "info") => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 5000);
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
      if (lista.length > 0) setSelectedEvento(lista[0].id);
    };

    fetchEventos();
  }, [hoy]);

  const eventoActual = useMemo(
    () => eventos.find((e) => e.id === selectedEvento),
    [eventos, selectedEvento]
  );

  const handleCantidadChange = (cantidad: number) => {
    setCantidadBoletos(cantidad);
    const nuevosAsistentes = [...asistentes];
    if (cantidad > nuevosAsistentes.length) {
      for (let i = nuevosAsistentes.length; i < cantidad; i++) {
        nuevosAsistentes.push({ id: crypto.randomUUID(), nombreCompleto: "", email: "" });
      }
    } else {
      nuevosAsistentes.splice(cantidad);
    }
    setAsistentes(nuevosAsistentes);
  };

  const updateAsistente = (index: number, field: keyof Asistente, value: string) => {
    const nuevosAsistentes = [...asistentes];
    nuevosAsistentes[index][field] = value;
    setAsistentes(nuevosAsistentes);
  };

  const validateForm = () => {
    if (!selectedEvento) {
      showMessage("Selecciona un evento", "error");
      return false;
    }
    for (let i = 0; i < asistentes.length; i++) {
      const asistente = asistentes[i];
      if (!asistente.nombreCompleto.trim()) {
        showMessage(`Ingresa el nombre completo del asistente ${i + 1}`, "error");
        return false;
      }
      if (i === 0) {
        if (!asistente.email.trim()) {
          showMessage("Ingresa el correo electrónico del comprador principal", "error");
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(asistente.email)) {
          showMessage("Correo electrónico inválido para el comprador principal", "error");
          return false;
        }
      }
    }
    return true;
  };

  const procesarCompra = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setMensaje(null);

    const mainEmail = asistentes[0]?.email?.trim() || "";
    if (!mainEmail || !mainEmail.includes("@")) {
      showMessage("Ingresa un correo electrónico válido para el comprador principal.", "error");
      setLoading(false);
      return;
    }

    const asistentesNormalizados = asistentes.map((ast, i) => ({
      id: ast.id,
      nombreCompleto: ast.nombreCompleto.trim() || `Asistente ${i + 1}`,
      email: i === 0 ? mainEmail : (ast.email?.trim() || mainEmail)
    }));

    try {
      const res = await fetch("/api/checkout-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento_id: selectedEvento,
          asistentes: asistentesNormalizados,
          email_comprador: mainEmail,
          total: asistentes.length * (eventoActual?.precio || 0)
        }),
      });

      // Guard against non-JSON responses (e.g. Next.js error pages)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("API returned non-JSON response:", res.status);
        showMessage("Error del servidor. Intenta nuevamente.", "error");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        showMessage(data.error ?? "No se pudo completar la compra.", "error");
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error:", err);
      showMessage("Error de conexión. Intenta nuevamente.", "error");
      setLoading(false);
    }
  };

  const total = asistentes.length * (eventoActual?.precio || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f14] via-[#0d1219] to-[#0a0f14]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        
        {/* Header */}
        <div className="mb-12 text-center flex flex-col items-center">
          <div className="mb-8">
            <Image 
              src="/q-pass-logo.png" 
              alt="Q-Pass Logo" 
              width={180} 
              height={180} 
              priority
              className="drop-shadow-[0_0_25px_rgba(34,211,238,0.3)]"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Compra de Boletos Digitales
          </div>
          <p className="mt-2 text-sm text-slate-400">Adquiere tus accesos de forma rápida y segura</p>
        </div>

        {/* Formulario */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-white/10 bg-[#111823]/80 backdrop-blur-sm shadow-2xl overflow-hidden">
            {eventoActual?.banner_url && (
              <div className="relative w-full h-64 sm:h-72 overflow-hidden bg-[#070a0f] border-b border-white/10 flex items-center justify-center">
                <img 
                  src={eventoActual.banner_url} 
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 pointer-events-none"
                />
                <img 
                  src={eventoActual.banner_url} 
                  alt={`Banner de ${eventoActual.nombre}`}
                  className="relative z-10 h-full max-h-64 sm:max-h-72 w-auto object-contain transition-all drop-shadow-md"
                />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#111823] via-transparent to-transparent z-20" />
              </div>
            )}
            <div className="border-b border-white/10 bg-gradient-to-r from-cyan-500/5 to-transparent px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Datos de la compra</h2>
              <p className="text-xs text-slate-400">Completa la información de los asistentes</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Evento</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-white/10 bg-[#0a0f14] px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
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
                {selectedEvento && (
                  <div className="mt-2 text-right">
                    <a
                      href={`/eventos/${selectedEvento}`}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 transition"
                    >
                      Ver sitio exclusivo de este evento →
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Cantidad de boletos</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleCantidadChange(Math.max(1, cantidadBoletos - 1))}
                    className="rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2 text-white hover:bg-white/5"
                  >-</button>
                  <span className="text-xl font-semibold text-white w-12 text-center">{cantidadBoletos}</span>
                  <button
                    type="button"
                    onClick={() => handleCantidadChange(Math.min(10, cantidadBoletos + 1))}
                    className="rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2 text-white hover:bg-white/5"
                  >+</button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Datos de los asistentes</label>
                {asistentes.map((asistente, index) => (
                  <div key={asistente.id} className="rounded-xl border border-white/15 bg-[#0a0f14] p-4 space-y-3 shadow-inner">
                    <p className="text-sm font-bold text-cyan-300">Asistente {index + 1} {index === 0 ? "(Comprador Principal)" : ""}</p>
                    <input
                      type="text"
                      placeholder="Nombre completo (ej: Juan Pérez)"
                      className="w-full rounded-lg border border-white/15 bg-[#111823] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none transition"
                      value={asistente.nombreCompleto}
                      onChange={(e) => updateAsistente(index, "nombreCompleto", e.target.value)}
                    />
                    {index === 0 ? (
                      <div>
                        <input
                          type="email"
                          placeholder="Correo electrónico (ej: juan@ejemplo.com)"
                          className="w-full rounded-lg border border-white/15 bg-[#111823] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 focus:outline-none transition"
                          value={asistente.email}
                          onChange={(e) => updateAsistente(index, "email", e.target.value)}
                        />
                        <p className="text-[10px] text-cyan-400/80 mt-1">
                          📬 Todos los boletos se enviarán juntos a este correo.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#111823]/80 backdrop-blur-sm p-6 sticky top-8">
              <h3 className="text-sm font-semibold text-white mb-4">Resumen de compra</h3>
              {eventoActual && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{eventoActual.nombre}</span>
                    <span className="text-white">${eventoActual.precio?.toLocaleString()} c/u</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cantidad</span>
                    <span className="text-white">{cantidadBoletos} boletos</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">Total</span>
                      <span className="text-cyan-300 text-xl">${total.toLocaleString()} MXN</span>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={procesarCompra}
                disabled={loading}
                className="w-full mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Continuar al pago"}
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-4">🔒 Pago 100% seguro</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 text-center border-t border-white/10">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">LIZARD TECH • Q-PASS DIGITAL ACCESS</p>
        </div>
      </div>
    </div>
  );
}