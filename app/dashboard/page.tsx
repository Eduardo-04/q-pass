"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

type Evento = {
  id: string;
  nombre: string;
  fecha_evento: string;
  visible_desde: string;
  visible_hasta: string;
  activo: boolean;
};

type Boleto = {
  id: string;
  email_comprador: string;
  estado: string;
  fecha_compra: string;
  evento_id: string;
};

export default function Dashboard() {
  const [asistentes, setAsistentes] = useState<Boleto[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState("");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, entraron: 0, pendientes: 0 });
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [validandoId, setValidandoId] = useState<string | null>(null);

  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchEventos = async () => {
      setCargandoEventos(true);

      const { data, error } = await supabase
        .from("eventos")
        .select("id, nombre, fecha_evento, visible_desde, visible_hasta, activo")
        .eq("activo", true)
        .lte("visible_desde", hoy)
        .gte("visible_hasta", hoy)
        .order("fecha_evento", { ascending: false });

      if (error) {
        console.error("Error cargando eventos:", error.message);
        setEventos([]);
        setSelectedEvento("");
      } else if (data) {
        setEventos(data);
        if (data.length > 0) {
          setSelectedEvento(data[0].id);
        } else {
          setSelectedEvento("");
        }
      }

      setCargandoEventos(false);
    };

    fetchEventos();
  }, [hoy]);

  const fetchAsistencia = async () => {
    if (!selectedEvento) {
      setAsistentes([]);
      setStats({ total: 0, entraron: 0, pendientes: 0 });
      return;
    }

    const { data, error } = await supabase
      .from("boletos")
      .select("id, email_comprador, estado, fecha_compra, evento_id")
      .eq("evento_id", selectedEvento)
      .order("fecha_compra", { ascending: false });

    if (error) {
      console.error("Error cargando boletos:", error.message);
      setAsistentes([]);
      setStats({ total: 0, entraron: 0, pendientes: 0 });
      return;
    }

    if (data) {
      setAsistentes(data);
      const entraron = data.filter((b) => b.estado === "usado").length;
      const pendientes = data.filter((b) => b.estado !== "usado").length;
      setStats({ total: data.length, entraron, pendientes });
    }
  };

  useEffect(() => {
    fetchAsistencia();

    if (!selectedEvento) return;

    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "boletos",
          filter: `evento_id=eq.${selectedEvento}`,
        },
        () => fetchAsistencia()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEvento]);

  const validarManual = async (id: string) => {
    if (!confirm("¿Confirmar ingreso manual?")) return;

    setValidandoId(id);

    const { error } = await supabase
      .from("boletos")
      .update({ estado: "usado" })
      .eq("id", id);

    if (!error) {
      fetchAsistencia();
    }

    setValidandoId(null);
  };

  const eventoActual = useMemo(
    () => eventos.find((e) => e.id === selectedEvento),
    [eventos, selectedEvento]
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filtrados = asistentes.filter(
    (a) =>
      a.email_comprador?.toLowerCase().includes(search.toLowerCase()) ||
      a.id?.toLowerCase().includes(search.toLowerCase())
  );

  const porcentajeIngreso = stats.total > 0 ? (stats.entraron / stats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f14] via-[#0d1219] to-[#0a0f14]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        
        {/* Header simplificado */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-3">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Control de Accesos
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Q-Pass Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Monitoreo en tiempo real de accesos y validaciones
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-xl border border-white/10 bg-[#111823] px-4 py-2">
                <p className="text-xs text-slate-500">Registrados</p>
                <p className="text-2xl font-semibold text-white">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-2">
                <p className="text-xs text-slate-500">Ingresaron</p>
                <p className="text-2xl font-semibold text-emerald-300">{stats.entraron}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-2">
                <p className="text-xs text-slate-500">Pendientes</p>
                <p className="text-2xl font-semibold text-amber-300">{stats.pendientes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de evento y barra de progreso */}
        <div className="mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-300">
              Seleccionar evento
            </label>
            <div className="relative">
              <select
                value={selectedEvento}
                onChange={(e) => setSelectedEvento(e.target.value)}
                disabled={cargandoEventos || eventos.length === 0}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#111823] px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {eventos.length === 0 ? (
                  <option value="">
                    {cargandoEventos ? "Cargando eventos..." : "No hay eventos vigentes"}
                  </option>
                ) : (
                  eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nombre}
                    </option>
                  ))
                )}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                ▼
              </span>
            </div>
          </div>

          {/* Barra de progreso */}
          {eventoActual && (
            <div className="rounded-xl border border-white/10 bg-[#111823]/50 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400">Progreso de ingreso</span>
                <span className="text-cyan-300 font-medium">{Math.round(porcentajeIngreso)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${porcentajeIngreso}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {stats.entraron} de {stats.total} asistentes han ingresado
              </p>
            </div>
          )}
        </div>

        {/* Búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por correo o ID del boleto..."
              className="w-full rounded-xl border border-white/10 bg-[#111823] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de asistentes */}
        <div className="rounded-xl border border-white/10 bg-[#111823]/50 overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Lista de asistentes
                </h2>
                <p className="text-xs text-slate-500">
                  {filtrados.length} registros encontrados
                </p>
              </div>
            </div>
          </div>

          {filtrados.length > 0 ? (
            <div className="divide-y divide-white/5">
              {filtrados.map((b) => (
                <div key={b.id} className="p-4 hover:bg-white/5 transition">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Info del asistente */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                          <span className="text-sm font-semibold text-cyan-300">
                            {b.email_comprador?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {b.email_comprador}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                            ID: {b.id.slice(0, 8)}...{b.id.slice(-4)}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-600">
                            Registrado: {new Date(b.fecha_compra).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Estado y acción */}
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          b.estado === "usado"
                            ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                            : "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            b.estado === "usado" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                          }`}
                        />
                        {b.estado === "usado" ? "Ingresó" : "Pendiente"}
                      </span>

                      {b.estado !== "usado" && (
                        <button
                          onClick={() => validarManual(b.id)}
                          disabled={validandoId === b.id}
                          className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-600 active:scale-95 disabled:opacity-50"
                        >
                          {validandoId === b.id ? "..." : "Validar ingreso"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-500">
                {asistentes.length === 0 
                  ? "No hay asistentes registrados para este evento"
                  : "No se encontraron resultados para tu búsqueda"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            LIZARD TECH • Q-PASS DIGITAL ACCESS
          </p>
          <p className="mt-1 text-[10px] text-slate-700">
            Monitoreo en tiempo real • Actualización automática
          </p>
        </div>
      </div>
    </div>
  );
}