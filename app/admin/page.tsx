"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import type { Evento, EventoFormData, PerfilCliente, Mensaje } from "@/types";

const supabase = createClient();

const initialFormState: EventoFormData = {
  nombre: "",
  capacidad: 500,
  precio: 0,
  fecha_evento: "",
  visible_desde: "",
  visible_hasta: "",
  activo: true,
  comision_porcentaje: 10,
  comision_fija: 0,
};

export default function AdminPortal() {
  const { user: currentUser, isMaster, signOut } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventoFormData>(initialFormState);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState({ form: false, delete: false });
  const [busqueda, setBusqueda] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<PerfilCliente | null>(null);
  const [showClientes, setShowClientes] = useState(false);
  const [perfiles, setPerfiles] = useState<PerfilCliente[]>([]);
  const [busquedaSocios, setBusquedaSocios] = useState("");

  const hoy = new Date().toISOString().split("T")[0];

  const showMessage = (text: string, type: "success" | "error" | "info" = "info") => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje(null), 5000);
  };

  const fetchEventos = useCallback(async () => {
    await Promise.resolve();
    if (!currentUser) return;

    // Cargar perfil de comisiones
    const { data: profile } = await supabase
      .from("perfiles_cliente")
      .select("*")
      .eq("user_id", currentUser.id)
      .single();
    
    if (profile) {
      setUserProfile(profile);
      // Si es un nuevo evento y no es Master, pre-cargar comisiones del perfil
      if (!editingId) {
        setFormData(prev => ({
          ...prev,
          comision_porcentaje: profile.comision_porcentaje,
          comision_fija: profile.comision_fija
        }));
      }
    }

    let query = supabase
      .from("eventos")
      .select("id, nombre, capacidad, precio, fecha_evento, visible_desde, visible_hasta, activo, organizador_id, comision_porcentaje, comision_fija")
      .order("fecha_evento", { ascending: false });

    // Filtro multi-cliente: Si NO es Master, solo ve lo que le pertenece
    if (!isMaster) {
      query = query.eq("organizador_id", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      showMessage("❌ Error al cargar eventos: " + error.message, "error");
      return;
    }

    setEventos((data ?? []) as Evento[]);

    // Si es Master, cargar todos los usuarios organizadores/socios desde perfiles
    if (isMaster) {
      const { data: allUsers } = await supabase
        .from("perfiles")
        .select("id, email, rol, nombre");

      const { data: existingProfiles } = await supabase
        .from("perfiles_cliente")
        .select("*");

      const profilesMap = new Map((existingProfiles || []).map(p => [p.user_id, p]));

      // Auto-crear entrada de perfil cliente para cada usuario que no la tenga
      const finalProfiles: PerfilCliente[] = [];
      for (const u of (allUsers || [])) {
        if (u.rol === "master" || u.rol === "organizador") {
          let prof = profilesMap.get(u.id);
          if (!prof) {
            prof = {
              user_id: u.id,
              comision_porcentaje: 10,
              comision_fija: 0,
              nombre_empresa: u.nombre || u.email?.split('@')[0] || 'Socio Q-Pass'
            };
            // Intentar persistir silenciosamente
            await supabase.from("perfiles_cliente").upsert(prof);
          }
          finalProfiles.push(prof);
        }
      }

      setPerfiles(finalProfiles);
    }
  }, [currentUser, isMaster, editingId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEventos();
    }, 0);
    return () => clearTimeout(timer);
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
      comision_porcentaje: ev.comision_porcentaje ?? 10,
      comision_fija: ev.comision_fija ?? 0,
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
      comision_porcentaje: formData.comision_porcentaje,
      comision_fija: formData.comision_fija,
      organizador_id: currentUser?.id, // Firma del creador
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

  const actualizarPerfilCliente = async (userId: string, porcentaje: number, fija: number) => {
    const { error } = await supabase
      .from("perfiles_cliente")
      .upsert({ 
        user_id: userId, 
        comision_porcentaje: porcentaje, 
        comision_fija: fija,
        actualizado_el: new Date().toISOString()
      });

    if (error) {
      showMessage("Error al actualizar perfil: " + error.message, "error");
    } else {
      showMessage("Perfil de socio actualizado", "success");
      fetchEventos();
    }
  };

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
            <div className="flex items-center gap-6">
              <Image 
                src="/q-pass-logo.png" 
                alt="Q-Pass Logo" 
                width={100} 
                height={100} 
                priority
                className="drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]"
              />
              <div className="h-12 w-px bg-white/10 hidden md:block" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-cyan-400">
                  Panel de Gestión
                </p>
                <p className="text-sm text-slate-500">Operaciones y Eventos</p>
              </div>
            </div>

            <div className="flex gap-3">
              {isMaster && (
                <button
                  onClick={() => setShowClientes(!showClientes)}
                  className={`rounded-lg border px-4 py-2 text-xs font-medium transition ${
                    showClientes 
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-400" 
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {showClientes ? "Ver Eventos" : "Gestionar Socios"}
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-400/10"
              >
                Cerrar Sesión
              </button>
              <div className="rounded-lg border border-white/10 bg-[#111823] px-4 py-2">
                <p className="text-xs text-slate-500">Total eventos</p>
                <p className="text-2xl font-semibold text-white">{eventos.length}</p>
              </div>
            </div>
          </div>
        </div>

        {showClientes && isMaster ? (
          <div className="animate-fade-in space-y-6">
            <div className="rounded-xl border border-white/10 bg-[#111823] p-6 shadow-2xl">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Gestión de Socios (Partners)</h2>
                  <p className="text-xs text-slate-400">Define las comisiones maestras y nombres comerciales de tus clientes.</p>
                </div>
                <input
                  type="text"
                  placeholder="Buscar socio por ID o Nombre..."
                  value={busquedaSocios}
                  onChange={(e) => setBusquedaSocios(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0a0f14] px-4 py-2 text-xs text-white outline-none focus:border-cyan-400/50 sm:w-64"
                />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Referencia / Empresa</th>
                      <th className="px-4 py-3">ID de Usuario (Auth)</th>
                      <th className="px-4 py-3 text-center">Comisión (%)</th>
                      <th className="px-4 py-3 text-center">Cargo Fijo ($)</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {perfiles
                      .filter(p => 
                        p.user_id.toLowerCase().includes(busquedaSocios.toLowerCase()) || 
                        (p.nombre_empresa || "").toLowerCase().includes(busquedaSocios.toLowerCase())
                      )
                      .map((perf) => (
                      <tr key={perf.user_id} className="text-slate-300 transition hover:bg-white/[0.02]">
                        <td className="px-4 py-4">
                          <input 
                            type="text" 
                            placeholder="Nombre de la Bolera"
                            defaultValue={perf.nombre_empresa}
                            onBlur={(e) => {
                              const val = e.target.value;
                              supabase.from("perfiles_cliente").update({ nombre_empresa: val }).eq("user_id", perf.user_id).then(() => fetchEventos());
                            }}
                            className="w-full bg-transparent border-b border-transparent focus:border-cyan-400/50 outline-none transition text-sm font-medium text-white"
                          />
                        </td>
                        <td className="px-4 py-4 font-mono text-[10px] text-slate-500">{perf.user_id}</td>
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="number" 
                            defaultValue={perf.comision_porcentaje}
                            className="w-16 rounded bg-white/5 px-2 py-1 text-center outline-none focus:ring-1 focus:ring-cyan-400/50 text-cyan-300"
                            id={`pct-${perf.user_id}`}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="number" 
                            defaultValue={perf.comision_fija}
                            className="w-16 rounded bg-white/5 px-2 py-1 text-center outline-none focus:ring-1 focus:ring-cyan-400/50 text-amber-300"
                            id={`fix-${perf.user_id}`}
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button 
                            onClick={() => {
                              const p = (document.getElementById(`pct-${perf.user_id}`) as HTMLInputElement).value;
                              const f = (document.getElementById(`fix-${perf.user_id}`) as HTMLInputElement).value;
                              actualizarPerfilCliente(perf.user_id, Number(p), Number(f));
                            }}
                            className="rounded-md bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-400 transition hover:bg-cyan-400/20"
                          >
                            Guardar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {perfiles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 italic">No hay perfiles de socios registrados en la base de datos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 rounded-lg bg-amber-400/5 border border-amber-400/10 p-4">
                <p className="text-[10px] text-amber-400 font-bold uppercase mb-1">Nota para el Superadmin</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Los cambios aquí realizados definen la <strong>tarifa predeterminada</strong> para nuevos eventos de este socio. 
                  Para modificar la comisión de un evento que ya fue creado, debes usar el botón <strong>&quot;Editar&quot;</strong> directamente en la lista de eventos.
                </p>
              </div>
            </div>
          </div>
        ) : (
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
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Nombre del Evento</label>
                  <input
                    type="text"
                    placeholder="Ej: Festival Universitario Q-Pass 2026"
                    className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                    value={formData.nombre}
                    onChange={(e) => updateFormField("nombre", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Capacidad (Cupo)</label>
                    <input
                      type="number"
                      placeholder="Ej: 500"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                      value={formData.capacidad}
                      onChange={(e) => updateFormField("capacidad", Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Precio ($ MXN)</label>
                    <input
                      type="number"
                      placeholder="0 para Gratuito"
                      step="0.01"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                      value={formData.precio}
                      onChange={(e) => updateFormField("precio", Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Fecha del Evento</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                    value={formData.fecha_evento}
                    onChange={(e) => updateFormField("fecha_evento", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Visible Desde</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                      value={formData.visible_desde}
                      onChange={(e) => updateFormField("visible_desde", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Visible Hasta</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                      value={formData.visible_hasta}
                      onChange={(e) => updateFormField("visible_hasta", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Sección de Comisiones - Solo visible para el Master */}
                {isMaster ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Comisión Q-Pass (%)</label>
                      <input
                        type="number"
                        placeholder="Ej: 10"
                        className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                        value={formData.comision_porcentaje}
                        onChange={(e) => updateFormField("comision_porcentaje", Number(e.target.value))}
                      />
                      <p className="mt-1 text-[10px] text-slate-400 italic">Ajuste manual para este evento</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Cargo Fijo Q-Pass ($)</label>
                      <input
                        type="number"
                        placeholder="Ej: 5.00"
                        className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                        value={formData.comision_fija}
                        onChange={(e) => updateFormField("comision_fija", Number(e.target.value))}
                      />
                      <p className="mt-1 text-[10px] text-slate-400 italic">Costo operativo por boleto</p>
                    </div>
                  </div>
                ) : (
                  // Para el Gerente, mostrar información informativa solamente si el perfil existe
                  userProfile && (
                    <div className="rounded-xl bg-cyan-400/10 border border-cyan-400/20 p-3.5">
                      <p className="text-xs text-cyan-300 uppercase tracking-widest font-bold mb-1">Costo de Servicio Configurado</p>
                      <p className="text-xs text-slate-200">
                        Este evento operará con tu tarifa pactada de <span className="text-white font-bold">{userProfile.comision_porcentaje}%</span> + <span className="text-white font-bold">${userProfile.comision_fija} MXN</span> por boleto.
                      </p>
                    </div>
                  )
                )}

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
                              {isMaster && (
                                <p className="text-[10px] font-mono text-cyan-400 mt-0.5">
                                  👤 {ev.organizador_id === currentUser?.id 
                                      ? "TI (Tú)" 
                                      : perfiles.find(p => p.user_id === ev.organizador_id)?.nombre_empresa || "Cliente Externo"}
                                </p>
                              )}
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
      )}
    </div>
  </div>
);
}