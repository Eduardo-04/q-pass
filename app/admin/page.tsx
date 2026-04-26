"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Evento = {
  id: string;
  nombre: string;
  capacidad: number;
  precio: number;
  fecha_evento: string;
  visible_desde: string;
  visible_hasta: string;
  activo: boolean;
};

type EventoFormData = Omit<Evento, "id">;

const initialFormState: EventoFormData = {
  nombre: "",
  capacidad: 500,
  precio: 0,
  fecha_evento: "",
  visible_desde: "",
  visible_hasta: "",
  activo: true,
};

export default function AdminPortal() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventoFormData>(initialFormState);
  const [mensaje, setMensaje] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState({ form: false, delete: false });
  const [busqueda, setBusqueda] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const hoy = new Date().toISOString().split("T")[0];

  const showMessage = (text: string, type: "success" | "error" | "info" = "info") => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 5000);
  };

  const fetchEventos = useCallback(async () => {
    const { data, error } = await supabase
      .from("eventos")
      .select("id, nombre, capacidad, precio, fecha_evento, visible_desde, visible_hasta, activo")
      .order("fecha_evento", { ascending: false });

    if (error) {
      showMessage("❌ Error al cargar eventos: " + error.message, "error");
      return;
    }

    setEventos((data ?? []) as Evento[]);
  }, []);

  useEffect(() => {
    fetchEventos();
  }, [fetchEventos]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormData(initialFormState);
  }, []);

  const updateFormField = useCallback(<K extends keyof EventoFormData>(field: K, value: EventoFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const cargarEventoParaEditar = useCallback((ev: Evento) => {
    setEditingId(ev.id);
    setFormData({
      nombre: ev.nombre ?? "",
      capacidad: ev.capacidad ?? 500,
      precio: Number(ev.precio ?? 0),
      fecha_evento: ev.fecha_evento?.slice(0, 10) ?? "",
      visible_desde: ev.visible_desde?.slice(0, 10) ?? "",
      visible_hasta: ev.visible_hasta?.slice(0, 10) ?? "",
      activo: ev.activo ?? true,
    });
    showMessage(`Editando: ${ev.nombre}`, "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const validateForm = (): boolean => {
    const { nombre, fecha_evento, visible_desde, visible_hasta } = formData;
    
    if (!nombre || !fecha_evento || !visible_desde || !visible_hasta) {
      showMessage("Completa todos los campos requeridos", "error");
      return false;
    }

    if (visible_desde > visible_hasta) {
      showMessage("La fecha de inicio no puede ser mayor que la de fin", "error");
      return false;
    }

    return true;
  };

  const guardarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(prev => ({ ...prev, form: true }));
    
    const payload = {
      nombre: formData.nombre,
      capacidad: formData.capacidad,
      precio: formData.precio,
      fecha_evento: formData.fecha_evento,
      visible_desde: formData.visible_desde,
      visible_hasta: formData.visible_hasta,
      activo: formData.activo,
    };

    if (editingId) {
      const { error } = await supabase
        .from("eventos")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        showMessage("Error al actualizar: " + error.message, "error");
      } else {
        showMessage("Evento actualizado", "success");
        resetForm();
        fetchEventos();
      }
    } else {
      const { error } = await supabase.from("eventos").insert([payload]);

      if (error) {
        showMessage("Error al crear evento: " + error.message, "error");
      } else {
        showMessage("Evento creado", "success");
        resetForm();
        fetchEventos();
      }
    }

    setIsLoading(prev => ({ ...prev, form: false }));
  };

  const toggleActivo = useCallback(async (id: string, valorActual: boolean) => {
    const { error } = await supabase
      .from("eventos")
      .update({ activo: !valorActual })
      .eq("id", id);

    if (error) {
      showMessage("Error al cambiar estado", "error");
      return;
    }

    showMessage(`Evento ${valorActual ? "desactivado" : "activado"}`, "success");
    if (editingId === id) updateFormField("activo", !valorActual);
    fetchEventos();
  }, [editingId, updateFormField, fetchEventos]);

  const eliminarEvento = useCallback(async (ev: Evento) => {
    const caducado = ev.fecha_evento?.slice(0, 10) < hoy;

    if (!caducado) {
      showMessage("Solo puedes eliminar eventos caducados", "error");
      return;
    }

    const confirmado = confirm(
      `¿Eliminar "${ev.nombre}" y todos sus boletos? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setEliminandoId(ev.id);
    setIsLoading(prev => ({ ...prev, delete: true }));

    const { error } = await supabase.rpc("eliminar_evento_caducado", {
      p_evento_id: ev.id,
    });

    if (error) {
      showMessage("Error al eliminar: " + error.message, "error");
    } else {
      showMessage("Evento eliminado", "success");
      if (editingId === ev.id) resetForm();
      fetchEventos();
    }

    setEliminandoId(null);
    setIsLoading(prev => ({ ...prev, delete: false }));
  }, [hoy, editingId, resetForm, fetchEventos]);

  const eventosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return eventos;

    return eventos.filter((ev) => {
      const fechaTxt = ev.fecha_evento?.slice(0, 10) ?? "";
      return (
        ev.nombre.toLowerCase().includes(q) ||
        ev.id.toLowerCase().includes(q) ||
        fechaTxt.includes(q)
      );
    });
  }, [busqueda, eventos]);

  return (
    <div className="min-h-screen bg-[#0a0f14]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        {/* Header simplificado */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-cyan-400">
                Panel de Control
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Q-Pass Central
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Gestión de eventos y operación
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-lg border border-white/10 bg-[#111823] px-4 py-2">
                <p className="text-xs text-slate-500">Total eventos</p>
                <p className="text-2xl font-semibold text-white">{eventos.length}</p>
              </div>
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-4 py-2">
                <p className="text-xs text-slate-500">Modo</p>
                <p className="text-sm font-medium text-cyan-300">
                  {editingId ? "Edición" : "Creación"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Formulario - más compacto y limpio */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#111823]/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {editingId ? "Editar evento" : "Nuevo evento"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {editingId ? "Modifica los datos" : "Completa el formulario"}
                  </p>
                </div>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <form onSubmit={guardarEvento} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre del evento"
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f14] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
                  value={formData.nombre}
                  onChange={(e) => updateFormField("nombre", e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Capacidad"
                    className="w-full rounded-lg border border-white/10 bg-[#0a0f14] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50"
                    value={formData.capacidad}
                    onChange={(e) => updateFormField("capacidad", Number(e.target.value))}
                  />
                  <input
                    type="number"
                    placeholder="Precio"
                    step="0.01"
                    className="w-full rounded-lg border border-white/10 bg-[#0a0f14] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50"
                    value={formData.precio}
                    onChange={(e) => updateFormField("precio", Number(e.target.value))}
                  />
                </div>

                <input
                  type="date"
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f14] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50"
                  value={formData.fecha_evento}
                  onChange={(e) => updateFormField("fecha_evento", e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    placeholder="Visible desde"
                    className="w-full rounded-lg border border-white/10 bg-[#0a0f14] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50"
                    value={formData.visible_desde}
                    onChange={(e) => updateFormField("visible_desde", e.target.value)}
                    required
                  />
                  <input
                    type="date"
                    placeholder="Visible hasta"
                    className="w-full rounded-lg border border-white/10 bg-[#0a0f14] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/50"
                    value={formData.visible_hasta}
                    onChange={(e) => updateFormField("visible_hasta", e.target.value)}
                    required
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#0a0f14] px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => updateFormField("activo", e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-[#0a0f14] text-cyan-400 focus:ring-cyan-400/20"
                  />
                  <span className="text-slate-300">Evento activo</span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading.form}
                  className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-600 active:scale-95 disabled:opacity-50"
                >
                  {isLoading.form
                    ? editingId ? "Guardando..." : "Creando..."
                    : editingId ? "Guardar cambios" : "Crear evento"}
                </button>
              </form>

              {mensaje && (
                <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
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

            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="flex-1 rounded-lg border border-white/10 bg-[#111823]/50 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-white/5"
              >
                Dashboard
              </Link>
              <Link
                href="/check-in"
                className="flex-1 rounded-lg border border-white/10 bg-[#111823]/50 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-white/5"
              >
                Escáner
              </Link>
            </div>
          </div>

          {/* Lista de eventos - diseño tipo tarjetas */}
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-white">Eventos</h2>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar evento..."
                className="rounded-lg border border-white/10 bg-[#111823] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 sm:w-64"
              />
            </div>

            <div className="space-y-2">
              {eventosFiltrados.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#111823]/50 p-8 text-center text-sm text-slate-500">
                  No hay eventos registrados
                </div>
              ) : (
                eventosFiltrados.map((ev) => {
                  const caducado = ev.fecha_evento?.slice(0, 10) < hoy;
                  const eliminando = eliminandoId === ev.id;
                  
                  return (
                    <div
                      key={ev.id}
                      className="group rounded-lg border border-white/10 bg-[#111823]/50 p-4 transition hover:border-white/20"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Info del evento */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-white truncate" title={ev.nombre}>
                                {ev.nombre}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                <span>📅 {new Date(ev.fecha_evento).toLocaleDateString()}</span>
                                <span>👥 {ev.capacidad.toLocaleString()}</span>
                                <span>💰 ${ev.precio.toLocaleString()}</span>
                                <span className={`inline-flex items-center gap-1 ${
                                  ev.activo ? "text-emerald-400" : "text-red-400"
                                }`}>
                                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                  {ev.activo ? "Activo" : "Inactivo"}
                                </span>
                              </div>
                            </div>
                            
                            {/* Estado de caducidad */}
                            {caducado && (
                              <span className="shrink-0 rounded bg-red-400/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                                Caducado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones - botones más sutiles */}
                        <div className="flex gap-1.5 sm:gap-2">
                          <button
                            onClick={() => cargarEventoParaEditar(ev)}
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/10"
                          >
                            Editar
                          </button>
                          
                          <button
                            onClick={() => toggleActivo(ev.id, ev.activo)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                              ev.activo
                                ? "text-amber-300 hover:bg-amber-400/10"
                                : "text-emerald-300 hover:bg-emerald-400/10"
                            }`}
                          >
                            {ev.activo ? "Desactivar" : "Activar"}
                          </button>
                          
                          <button
                            disabled={!caducado || eliminando}
                            onClick={() => eliminarEvento(ev)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                              caducado && !eliminando
                                ? "text-red-400 hover:bg-red-400/10"
                                : "cursor-not-allowed text-slate-600"
                            }`}
                          >
                            {eliminando ? "..." : "Eliminar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}