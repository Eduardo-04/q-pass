"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FileText } from "lucide-react";
import type { Evento, Boleto } from "@/types";
import Skeleton from "@/components/Skeleton";
import { toast } from "sonner";

const supabase = createClient();

export default function Dashboard() {
  const { user: currentUser, isMaster, signOut } = useAuth();
  const [asistentes, setAsistentes] = useState<Boleto[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState("");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, entraron: 0, pendientes: 0 });
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [cargandoAsistencia, setCargandoAsistencia] = useState(false);
  const [validandoId, setValidandoId] = useState<string | null>(null);

  // Cargar eventos
  useEffect(() => {
    const fetchEventos = async () => {
      setCargandoEventos(true);

      if (!currentUser) return;

      let query = supabase
        .from("eventos")
        .select("id, nombre, fecha_evento, visible_desde, visible_hasta, activo, capacidad, precio, comision_porcentaje, comision_fija, organizador_id")
        .eq("activo", true)
        .order("fecha_evento", { ascending: false });

      // Filtro multi-cliente
      if (!isMaster) {
        query = query.eq("organizador_id", currentUser.id);
      }

      const { data, error } = await query;

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
  }, [currentUser, isMaster]);

  // Obtener boletos del evento seleccionado
  const fetchAsistencia = useCallback(async () => {
    await Promise.resolve(); // Forzar asincronía para evitar advertencia de linter
    if (!selectedEvento) {
      setAsistentes([]);
      setStats({ total: 0, entraron: 0, pendientes: 0 });
      return;
    }

    setCargandoAsistencia(true);
    const { data, error } = await supabase
      .from("boletos")
      .select("id, email_comprador, estado, fecha_compra, evento_id, nombre_comprador")
      .eq("evento_id", selectedEvento)
      .order("fecha_compra", { ascending: false });

    if (error) {
      toast.error("Error al cargar la lista de asistentes");
      console.error("Error cargando boletos:", error.message);
      setAsistentes([]);
      setStats({ total: 0, entraron: 0, pendientes: 0 });
      setCargandoAsistencia(false);
      return;
    }

    if (data) {
      setAsistentes(data);
      const entraron = data.filter((b) => b.estado === "usado").length;
      const pendientes = data.filter((b) => b.estado !== "usado").length;
      setStats({ total: data.length, entraron, pendientes });
    }
    setCargandoAsistencia(false);
  }, [selectedEvento]);

  // Suscripción en tiempo real
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAsistencia();
    }, 0);

    if (!selectedEvento) return () => clearTimeout(timer);

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
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [selectedEvento, fetchAsistencia]);

  // Derivar capacidad del evento seleccionado
  const capacidadEvento = useMemo(() => {
    return eventos.find(e => e.id === selectedEvento)?.capacidad || null;
  }, [selectedEvento, eventos]);

  const validarManual = async (id: string) => {
    if (!confirm("¿Confirmar ingreso manual?")) return;

    setValidandoId(id);

    const { error } = await supabase
      .from("boletos")
      .update({ estado: "usado" })
      .eq("id", id);

    if (!error) {
      toast.success("Ingreso validado correctamente");
      fetchAsistencia();
    } else {
      toast.error("Error al validar el ingreso");
    }

    setValidandoId(null);
  };

  const eventoActual = useMemo(
    () => eventos.find((e) => e.id === selectedEvento),
    [eventos, selectedEvento]
  );

  // const formatDate = ... (removido por no usarse)

  const filtrados = asistentes.filter(
    (a) =>
      a.email_comprador?.toLowerCase().includes(search.toLowerCase()) ||
      a.id?.toLowerCase().includes(search.toLowerCase()) ||
      a.nombre_comprador?.toLowerCase().includes(search.toLowerCase())
  );

  const porcentajeIngreso = stats.total > 0 ? (stats.entraron / stats.total) * 100 : 0;
  const porcentajeVendidos = capacidadEvento ? (stats.total / capacidadEvento) * 100 : 0;
  const disponibles = capacidadEvento ? capacidadEvento - stats.total : null;

  // Cálculos financieros
  const totalBruto = stats.total * (eventoActual?.precio || 0);
  const feeStripeEst = totalBruto * 0.036 + (stats.total * 3);
  const miComision = (totalBruto * ((eventoActual?.comision_porcentaje || 0) / 100)) + (stats.total * (eventoActual?.comision_fija || 0));
  const pagoAlCliente = totalBruto - feeStripeEst - miComision;

  const exportToExcel = () => {
    if (!eventoActual) return;

    // Preparar datos para Excel
    const data = asistentes.map((b) => {
      const precio = eventoActual.precio || 0;
      const stripeFee = precio * 0.036 + 3; // Estimado por boleto
      const miComisionBoleto = (precio * ((eventoActual.comision_porcentaje || 0) / 100)) + (eventoActual.comision_fija || 0);
      const gananciaClienteBoleto = precio - stripeFee - miComisionBoleto;

      return {
        "ID Boleto": b.id,
        "Nombre Comprador": b.nombre_comprador || "N/A",
        "Email": b.email_comprador,
        "Estado": b.estado === "usado" ? "Ingresó" : "Pendiente",
        "Fecha Compra": new Date(b.fecha_compra).toLocaleString(),
        "Recaudación Total": precio,
        "Pasarela de Pago (Externo)": stripeFee,
        "Comisión Q-Pass": miComisionBoleto,
        "Monto a Liquidar": gananciaClienteBoleto,
      };
    });

    // Añadir fila de resumen
    data.push({
      "ID Boleto": "TOTALES",
      "Nombre Comprador": "",
      "Email": "",
      "Estado": "",
      "Fecha Compra": "",
      "Recaudación Total": totalBruto,
      "Pasarela de Pago (Externo)": feeStripeEst,
      "Comisión Q-Pass": miComision,
      "Monto a Liquidar": pagoAlCliente,
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Ventas");
    XLSX.writeFile(workbook, `Reporte_${eventoActual.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Reporte Excel generado correctamente");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f14] via-[#0d1219] to-[#0a0f14]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        
        {/* Header - Oculto en impresión */}
        <div className="no-print mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <Image 
                src="/q-pass-logo.png" 
                alt="Q-Pass Logo" 
                width={80} 
                height={80} 
                priority
                className="drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]"
              />
              <div className="h-10 w-px bg-white/10 hidden md:block" />
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Control de Accesos
                </div>
                <p className="text-sm text-slate-400">
                  Monitoreo en tiempo real
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
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
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportToExcel}
                  disabled={asistentes.length === 0}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111823] px-3 py-1.5 text-[10px] font-medium text-white transition hover:bg-white/5 disabled:opacity-50"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111823] px-3 py-1.5 text-[10px] font-medium text-white transition hover:bg-white/5"
                >
                  <FileText size={14} className="text-cyan-400" />
                  PDF (Imprimir)
                </button>
                <Link
                  href="/admin"
                  className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-[10px] font-medium text-cyan-300 transition hover:bg-cyan-400/10"
                >
                  Panel
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-[10px] font-medium text-red-400 transition hover:bg-red-400/10"
                >
                  Salir
                </button>
              </div>
            </div>
        </div>

        {/* Grid de Stats - Se adapta para impresión */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Recaudación Bruta (Ventas)", val: `$${totalBruto.toLocaleString()}`, color: "text-white" },
            { label: `Pasarela Stripe (Est. ${stats.total} boletos)`, val: `-$${feeStripeEst.toLocaleString()}`, color: "text-emerald-400" },
            { label: `Servicio Q-Pass (${stats.total} boletos)`, val: `-$${miComision.toLocaleString()}`, color: "text-cyan-300" },
            { label: "Monto a Liquidar (Neto)", val: `$${pagoAlCliente.toLocaleString()}`, color: "text-amber-300" }
          ].map((item, idx) => (
            <div key={idx} className="print-card rounded-2xl border border-white/10 bg-[#111823]/80 p-6 backdrop-blur-xl shadow-xl">
              <p className="text-xs uppercase font-semibold tracking-wider text-slate-300 mb-1.5">{item.label}</p>
              {cargandoAsistencia ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className={`text-2xl font-extrabold ${item.color}`}>{item.val}</p>
              )}
            </div>
          ))}
        </div>

        {/* Leyenda financiera informativa */}
        <div className="mb-6 rounded-xl border border-white/10 bg-[#111823]/60 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-xs text-slate-200 uppercase tracking-widest font-bold">Resumen de Tarifas del Evento</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-300 font-medium tracking-wider">
              <span>Precio Boleto: <span className="text-white font-bold">${eventoActual?.precio || 0} MXN</span></span>
              <span>•</span>
              <span>Comisión Q-Pass: <span className="text-cyan-300 font-bold">{eventoActual?.comision_porcentaje}% + ${eventoActual?.comision_fija} MXN</span></span>
              <span>•</span>
              <span>Pasarela Est.: <span className="text-emerald-300 font-bold">3.6% + $3.00 MXN</span></span>
            </div>
          </div>
        </div>

        {/* Selector de evento y métricas */}
        <div className="no-print mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
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

          {/* Tarjetas de capacidad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#111823]/50 p-3">
              <p className="text-xs text-slate-500">Capacidad total</p>
              <p className="text-xl font-bold text-white">
                {capacidadEvento ? capacidadEvento.toLocaleString() : "N/A"}
              </p>
              {capacidadEvento && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Vendidos</span>
                    <span className="text-cyan-300">{Math.round(porcentajeVendidos)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(porcentajeVendidos, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {stats.total} de {capacidadEvento.toLocaleString()} boletos vendidos
                  </p>
                </div>
              )}
            </div>
            
            <div className="rounded-xl border border-white/10 bg-[#111823]/50 p-3">
              <p className="text-xs text-slate-500">Boletos disponibles</p>
              <p className={`text-xl font-bold ${disponibles !== null && disponibles > 0 ? 'text-emerald-300' : 'text-red-400'}`}>
                {disponibles !== null ? disponibles.toLocaleString() : "N/A"}
              </p>
              {disponibles !== null && disponibles <= 10 && disponibles > 0 && (
                <p className="mt-1 text-[10px] text-amber-400">
                  ⚠️ ¡Últimos boletos disponibles!
                </p>
              )}
              {disponibles !== null && disponibles === 0 && (
                <p className="mt-1 text-[10px] text-red-400">
                  ❌ Evento completo - No hay más boletos
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Barra de progreso de ingreso */}
        {eventoActual && (
          <div className="mb-6 rounded-xl border border-white/10 bg-[#111823]/50 p-3">
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

        {/* Búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, correo o ID del boleto..."
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
              {capacidadEvento && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    Ocupación
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {Math.round((stats.total / capacidadEvento) * 100)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {cargandoAsistencia ? (
            <div className="divide-y divide-white/5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filtrados.length > 0 ? (
            <div className="divide-y divide-white/5">
              {filtrados.map((b) => (
                <div key={b.id} className="p-4 hover:bg-white/5 transition">
                  {/* ... resto del código del map ... */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Info del asistente */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                          <span className="text-sm font-semibold text-cyan-300">
                            {b.nombre_comprador?.[0]?.toUpperCase() || b.email_comprador?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {b.nombre_comprador || b.email_comprador.split('@')[0]}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {b.email_comprador}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <p className="font-mono text-[10px] text-slate-500">
                              ID: {b.id.slice(0, 8)}...{b.id.slice(-4)}
                            </p>
                            <p className="text-[10px] text-slate-600">
                              Registrado: {new Date(b.fecha_compra).toLocaleDateString()}
                            </p>
                          </div>
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