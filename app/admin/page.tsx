"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";
import type { Evento, EventoFormData, PerfilCliente, Mensaje } from "@/types";
import { toast } from "sonner";

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
  banner_url: "",
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
  const [zonasForm, setZonasForm] = useState<Array<{ id: string; nombre: string; precio: number; capacidad: number; descripcion: string }>>([]);

  const agregarZona = () => {
    setZonasForm(prev => [
      ...prev,
      { id: crypto.randomUUID(), nombre: `Zona ${prev.length + 1}`, precio: formData.precio || 100, capacidad: 100, descripcion: "" }
    ]);
  };

  const eliminarZona = (index: number) => {
    setZonasForm(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarZona = (index: number, field: string, value: any) => {
    setZonasForm(prev => prev.map((z, i) => i === index ? { ...z, [field]: value } : z));
  };

  const [userProfile, setUserProfile] = useState<PerfilCliente | null>(null);
  const [showClientes, setShowClientes] = useState(false);
  const [perfiles, setPerfiles] = useState<PerfilCliente[]>([]);
  const [solicitudes, setSolicitudes] = useState<Array<{
    id?: string;
    nombre_empresa?: string;
    nombre_contacto?: string;
    email?: string;
    telefono?: string;
    aforo_estimado?: string;
    created_at?: string;
  }>>([]);
  const [busquedaSocios, setBusquedaSocios] = useState("");
  const [credencialesModal, setCredencialesModal] = useState<{
    open: boolean;
    email?: string;
    password?: string;
    empresa?: string;
    whatsappUrl?: string;
  } | null>(null);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<{
    id?: string;
    nombre_empresa: string;
    nombre_contacto: string;
    email: string;
    telefono: string;
    comision_porcentaje: number;
    comision_fija: number;
    password: string;
  } | null>(null);

  const [nuevoStaffNombre, setNuevoStaffNombre] = useState("");
  const [nuevoStaffPin, setNuevoStaffPin] = useState("");
  const [staffModalOpen, setStaffModalOpen] = useState(false);

  const crearPinStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoStaffNombre) return;

    try {
      const res = await fetch("/api/staff/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          nombre: nuevoStaffNombre,
          pin: nuevoStaffPin || undefined,
          organizadorId: currentUser?.id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`PIN ${data.pin} creado para ${nuevoStaffNombre}`);
        const cleanMessage = `Hola ${nuevoStaffNombre} 👋, tu PIN de acceso para escanear accesos en Q-Pass es: *${data.pin}*\nEntra a: ${window.location.origin}/login`;
        window.open(`https://wa.me/?text=${encodeURIComponent(cleanMessage)}`, "_blank");
        setNuevoStaffNombre("");
        setNuevoStaffPin("");
        setStaffModalOpen(false);
      } else {
        toast.error(data.error || "Error creando PIN");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    }
  };

  const convertirUrlExterna = async (urlStr: string) => {
    if (!urlStr || !urlStr.startsWith("http") || urlStr.startsWith("data:")) return;
    try {
      toast.loading("Procesando imagen para PDF...", { id: "proxy-img" });
      const res = await fetch("/api/image-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlStr })
      });
      const data = await res.json();
      if (res.ok && data.success && data.base64) {
        updateFormField("banner_url", data.base64);
        toast.success("Imagen optimizada y lista para PDF e impresión", { id: "proxy-img" });
      } else {
        toast.dismiss("proxy-img");
      }
    } catch {
      toast.dismiss("proxy-img");
    }
  };

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
      .maybeSingle();
    
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

    // Si es Master, cargar todos los socios y solicitudes desde la API Admin (bypass RLS)
    if (isMaster) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resSocios = await fetch("/api/admin/socios", {
          headers: {
            "Authorization": `Bearer ${session?.access_token || ""}`
          }
        });
        const dataSocios = await resSocios.json();
        if (dataSocios.success) {
          setPerfiles(dataSocios.perfiles || []);
          setSolicitudes(dataSocios.solicitudes || []);
        }
      } catch (e) {
        console.warn("Error cargando socios:", e);
      }
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
    setZonasForm([]);
  }, []);

  const updateFormField = useCallback(<K extends keyof EventoFormData>(field: K, value: EventoFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const cargarEventoParaEditar = useCallback(async (ev: Evento) => {
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
      banner_url: ev.banner_url ?? "",
      mapa_zonas_url: ev.mapa_zonas_url ?? "",
    });

    // Intentar cargar zonas de la tabla zonas_evento si existe
    try {
      const { data: zData } = await supabase
        .from("zonas_evento")
        .select("*")
        .eq("evento_id", ev.id);
      setZonasForm((zData as any[]) || []);
    } catch {
      setZonasForm([]);
    }

    showMessage(`Editando: ${ev.nombre}`, "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const actualizarPerfilCliente = async (userId: string, porcentaje: number, fija: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/socios", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({ userId, comision_porcentaje: porcentaje, comision_fija: fija })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Tarifa del socio actualizada correctamente");
        fetchEventos();
      } else {
        toast.error(data.error || "Error al actualizar tarifa del socio");
      }
    } catch (err) {
      toast.error("Error conectando con el servidor");
    }
  };

  const abrirModalAprobacion = (sol: any) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setSolicitudSeleccionada({
      id: sol.id,
      nombre_empresa: sol.nombre_empresa || "",
      nombre_contacto: sol.nombre_contacto || "",
      email: sol.email || "",
      telefono: sol.telefono || "",
      comision_porcentaje: 10,
      comision_fija: 0,
      password: `QPass#${randomNum}`
    });
  };

  const confirmarAprobacionSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitudSeleccionada) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/socios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify({
          email: solicitudSeleccionada.email,
          password: solicitudSeleccionada.password,
          nombreEmpresa: solicitudSeleccionada.nombre_empresa,
          nombreContacto: solicitudSeleccionada.nombre_contacto,
          comision_porcentaje: solicitudSeleccionada.comision_porcentaje,
          comision_fija: solicitudSeleccionada.comision_fija,
          leadId: solicitudSeleccionada.id
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`¡Socio ${solicitudSeleccionada.nombre_empresa} aprobado exitosamente!`);
        const cleanTel = (solicitudSeleccionada.telefono || '').replace(/\D/g, '');
        const formattedTel = cleanTel.length === 10 ? `52${cleanTel}` : cleanTel;
        const waUrl = `https://wa.me/${formattedTel}?text=${encodeURIComponent(data.invitationText)}`;
        
        const empresaNombre = solicitudSeleccionada.nombre_empresa;
        setSolicitudSeleccionada(null);
        setCredencialesModal({
          open: true,
          email: data.email,
          password: data.password,
          empresa: empresaNombre,
          whatsappUrl: waUrl
        });

        fetchEventos();
      } else {
        toast.error(data.error || "Error al aprobar socio");
      }
    } catch {
      toast.error("Error conectando con el servidor");
    }
  };

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
    
    // Si hay zonas configuradas, calcular capacidad total y precio mínimo automáticamente
    const capacidadFinal = zonasForm.length > 0 
      ? zonasForm.reduce((sum, z) => sum + Number(z.capacidad || 0), 0)
      : formData.capacidad;

    const precioFinal = zonasForm.length > 0
      ? Math.min(...zonasForm.map(z => Number(z.precio || 0)))
      : formData.precio;

    const payload: Record<string, any> = {
      nombre: formData.nombre,
      capacidad: capacidadFinal,
      precio: precioFinal,
      fecha_evento: formData.fecha_evento,
      visible_desde: formData.visible_desde,
      visible_hasta: formData.visible_hasta,
      activo: formData.activo,
      comision_porcentaje: formData.comision_porcentaje,
      comision_fija: formData.comision_fija,
      organizador_id: currentUser?.id, // Firma del creador
    };

    if (formData.banner_url) {
      payload.banner_url = formData.banner_url;
    }
    if (formData.mapa_zonas_url) {
      payload.mapa_zonas_url = formData.mapa_zonas_url;
    }

    let targetEventId = editingId;
    let { error, data: saveRes } = editingId 
      ? await supabase.from("eventos").update(payload).eq("id", editingId).select()
      : await supabase.from("eventos").insert([payload]).select();

    if (error && (error.message.includes("banner_url") || error.message.includes("mapa_zonas_url"))) {
      // Fallback: Si alguna columna opcional aún no existe en Supabase
      delete payload.banner_url;
      delete payload.mapa_zonas_url;
      const retry = editingId 
        ? await supabase.from("eventos").update(payload).eq("id", editingId).select()
        : await supabase.from("eventos").insert([payload]).select();
      
      error = retry.error;
      saveRes = retry.data;
    }

    if (error) {
      showMessage(`Error al ${editingId ? "actualizar" : "crear"} evento: ${error.message}`, "error");
    } else {
      targetEventId = saveRes?.[0]?.id || editingId;
      if (targetEventId && zonasForm.length > 0) {
        try {
          for (const z of zonasForm) {
            await supabase.from("zonas_evento").upsert({
              evento_id: targetEventId,
              nombre: z.nombre,
              precio: Number(z.precio || 0),
              capacidad: Number(z.capacidad || 100),
              descripcion: z.descripcion || null,
              activo: true
            });
          }
        } catch {
          // Ignorar silenciosamente si no se ha ejecutado el SQL de zonas_evento
        }
      }

      showMessage(`Evento ${editingId ? "actualizado" : "creado"} con éxito`, "success");
      resetForm();
      fetchEventos();
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
    // 1. Verificar si el evento tiene boletos emitidos en la base de datos
    const { count } = await supabase
      .from("boletos")
      .select("id", { count: "exact", head: true })
      .eq("evento_id", ev.id);

    if (count && count > 0) {
      toast.error(`🔒 ¡Acción bloqueada! No puedes eliminar "${ev.nombre}" porque tiene ${count} boleto(s) registrado(s).`);
      return;
    }

    const caducado = ev.fecha_evento?.slice(0, 10) < hoy;

    if (!caducado) {
      showMessage("Solo puedes eliminar eventos caducados sin boletos", "error");
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

            <div className="flex gap-3 items-center">
              <button
                onClick={() => setStaffModalOpen(true)}
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-400/20 transition flex items-center gap-1.5"
              >
                🔑 PINs Staff Puerta
              </button>
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

        {/* Modal de Creación de PINs para Staff de Puerta */}
        {staffModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/30 bg-[#111823] p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">🔑 Crear Acceso Staff de Puerta</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Genera un PIN directo para escanear sin exponer tu clave</p>
                </div>
                <button
                  onClick={() => setStaffModalOpen(false)}
                  className="text-slate-400 hover:text-white transition text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={crearPinStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Validador / Puerta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Puerta 1 - Acceso General"
                    value={nuevoStaffNombre}
                    onChange={(e) => setNuevoStaffNombre(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PIN de 4 dígitos (Opcional - Deja vacío para auto-generar)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Ej. 4920"
                    value={nuevoStaffPin}
                    onChange={(e) => setNuevoStaffPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-emerald-300 font-mono font-bold outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStaffModalOpen(false)}
                    className="w-1/2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-xs font-bold text-white shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition"
                  >
                    ✓ Generar & Compartir PIN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

            {/* Solicitudes Entrantes desde Landing Page */}
            {solicitudes.length > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-[#111823] p-6 shadow-2xl space-y-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1">
                    Leads Entrantes desde Landing Page
                  </div>
                  <h3 className="text-lg font-bold text-white">Solicitudes de Nuevos Organizadores</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Empresa / Evento</th>
                        <th className="px-4 py-3">Contacto</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Teléfono</th>
                        <th className="px-4 py-3">Aforo</th>
                        <th className="px-4 py-3 text-right">Contacto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {solicitudes.map((sol, idx) => (
                        <tr key={sol.id || idx} className="text-slate-300 transition hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-semibold text-white">{sol.nombre_empresa}</td>
                          <td className="px-4 py-3 text-xs">{sol.nombre_contacto}</td>
                          <td className="px-4 py-3 text-xs font-mono text-cyan-300">{sol.email}</td>
                          <td className="px-4 py-3 text-xs font-mono">{sol.telefono}</td>
                          <td className="px-4 py-3 text-xs text-amber-300 font-semibold">{sol.aforo_estimado}</td>
                          <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                            {(() => {
                              const cleanTel = (sol.telefono || '').replace(/\D/g, '');
                              const formattedTel = cleanTel.length === 10 ? `52${cleanTel}` : cleanTel;
                              return (
                                <a
                                  href={`https://wa.me/${formattedTel}?text=${encodeURIComponent(`Hola ${sol.nombre_contacto} 👋, te escribo de Q-Pass sobre tu solicitud para ${sol.nombre_empresa}.`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                                >
                                  💬 Contactar
                                </a>
                              );
                            })()}
                            <button
                              onClick={() => abrirModalAprobacion(sol)}
                              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition active:scale-95"
                            >
                              ✓ Aprobar Socio
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal para Personalizar Aprobación de Socio */}
            {solicitudSeleccionada && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
                <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#111823] p-6 shadow-2xl space-y-5">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Aprobar Socio & Configurar Acceso</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{solicitudSeleccionada.nombre_empresa}</p>
                    </div>
                    <button
                      onClick={() => setSolicitudSeleccionada(null)}
                      className="text-slate-400 hover:text-white transition text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={confirmarAprobacionSocio} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Email de Inicio de Sesión *</label>
                      <input
                        type="email"
                        required
                        value={solicitudSeleccionada.email}
                        onChange={(e) => setSolicitudSeleccionada({ ...solicitudSeleccionada, email: e.target.value })}
                        className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña Asignada / Generada *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={solicitudSeleccionada.password}
                          onChange={(e) => setSolicitudSeleccionada({ ...solicitudSeleccionada, password: e.target.value })}
                          className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-cyan-300 outline-none focus:border-cyan-400 font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const randomNum = Math.floor(1000 + Math.random() * 9000);
                            setSolicitudSeleccionada({ ...solicitudSeleccionada, password: `QPass#${randomNum}` });
                          }}
                          className="absolute right-2 top-2 text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2.5 py-1 rounded-lg hover:bg-cyan-500/30 transition"
                        >
                          Generar Nueva
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Puedes personalizar esta contraseña antes de enviársela al socio.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Comisión (%)</label>
                        <input
                          type="number"
                          required
                          value={solicitudSeleccionada.comision_porcentaje}
                          onChange={(e) => setSolicitudSeleccionada({ ...solicitudSeleccionada, comision_porcentaje: Number(e.target.value) })}
                          className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-cyan-300 outline-none focus:border-cyan-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo Fijo ($)</label>
                        <input
                          type="number"
                          required
                          value={solicitudSeleccionada.comision_fija}
                          onChange={(e) => setSolicitudSeleccionada({ ...solicitudSeleccionada, comision_fija: Number(e.target.value) })}
                          className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-amber-300 outline-none focus:border-cyan-400 font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSolicitudSeleccionada(null)}
                        className="w-1/2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-2.5 text-xs font-bold text-white shadow-lg hover:from-cyan-600 hover:to-cyan-700 transition"
                      >
                        ✓ Aprobar y Enviar Accesos
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal de Credenciales para el Socio Aprobado */}
            {credencialesModal?.open && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
                <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/30 bg-[#111823] p-6 shadow-2xl space-y-6">
                  <div className="text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-2xl">
                      🎉
                    </div>
                    <h3 className="text-xl font-bold text-white">¡Socio Aprobado Exitosamente!</h3>
                    <p className="text-xs text-slate-400">
                      Se han generado las credenciales de acceso para <strong className="text-white">{credencialesModal.empresa}</strong>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0a0f14] p-4 space-y-3 font-mono text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">Email del Socio</p>
                      <p className="text-white font-bold select-all mt-0.5">{credencialesModal.email}</p>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">Contraseña Temporal</p>
                      <p className="text-cyan-300 font-bold text-base select-all mt-0.5">{credencialesModal.password}</p>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">Link de Acceso al Portal</p>
                      <p className="text-slate-300 font-sans mt-0.5">http://localhost:3000/login</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {credencialesModal.whatsappUrl && (
                      <a
                        href={credencialesModal.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-xs font-bold text-white shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition"
                      >
                        💬 Enviar Accesos por WhatsApp al Socio
                      </a>
                    )}

                    <button
                      onClick={() => setCredencialesModal(null)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                    >
                      Cerrar Ventana
                    </button>
                  </div>
                </div>
              </div>
            )}
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

                {zonasForm.length > 0 ? (
                  <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">⚡ Calculado por Zonas ({zonasForm.length})</p>
                      <p className="text-slate-300 mt-0.5">
                        Capacidad Total: <span className="font-extrabold text-white">{zonasForm.reduce((sum, z) => sum + Number(z.capacidad || 0), 0)} boletos</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Precio Base</span>
                      <span className="font-extrabold text-cyan-300 text-sm">Desde ${Math.min(...zonasForm.map(z => Number(z.precio || 0)))} MXN</span>
                    </div>
                  </div>
                ) : (
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
                )}

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

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Banner del Evento (Subir Archivo o URL)
                  </label>
                  
                  <div className="space-y-2">
                    {/* Botón de Cargar Archivo */}
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20 transition flex items-center gap-1.5">
                        📁 Seleccionar Imagen
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 8 * 1024 * 1024) {
                              toast.error("La imagen no debe pesar más de 8MB");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new window.Image();
                              img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const maxW = 1000;
                                const scale = Math.min(1, maxW / img.width);
                                canvas.width = img.width * scale;
                                canvas.height = img.height * scale;
                                const ctx = canvas.getContext("2d");
                                if (ctx) {
                                  ctx.fillStyle = "#FFFFFF";
                                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                  const jpegUrl = canvas.toDataURL("image/jpeg", 0.85);
                                  updateFormField("banner_url", jpegUrl);
                                  toast.success("Imagen de banner procesada para PDF y Web");
                                } else {
                                  updateFormField("banner_url", event.target?.result as string);
                                }
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-slate-500 font-sans">o pega un enlace abajo</span>
                    </div>

                    <input
                      type="url"
                      placeholder="https://ejemplo.com/banner-evento.jpg"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                      value={formData.banner_url || ""}
                      onChange={(e) => updateFormField("banner_url", e.target.value)}
                      onBlur={(e) => convertirUrlExterna(e.target.value)}
                    />
                  </div>

                  {formData.banner_url && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-white/10 h-24 w-full">
                      <img 
                        src={formData.banner_url} 
                        alt="Vista previa del banner" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => updateFormField("banner_url", "")}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-[10px] px-2 py-1 rounded-md"
                      >
                        Quitar
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 mt-1">
                    🖼️ Se mostrará en la portada del evento y se imprimirá en los boletos PDF.
                  </p>
                </div>

                {/* 🗺️ MAPA DEL RECINTO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Mapa del Recinto / Ubicación de Zonas (Opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-xl border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition flex items-center gap-1.5">
                      🗺️ Subir Croquis/Mapa
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            updateFormField("mapa_zonas_url", evt.target?.result as string);
                            toast.success("Mapa del recinto cargado");
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/mapa-zonas.jpg"
                      className="flex-1 rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                      value={formData.mapa_zonas_url || ""}
                      onChange={(e) => updateFormField("mapa_zonas_url", e.target.value)}
                    />
                  </div>
                  {formData.mapa_zonas_url && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-white/10 h-28 w-full">
                      <img src={formData.mapa_zonas_url} alt="Mapa del recinto" className="w-full h-full object-contain bg-black/60" />
                      <button type="button" onClick={() => updateFormField("mapa_zonas_url", "")} className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">Quitar</button>
                    </div>
                  )}
                </div>

                {/* 🎟️ GESTOR DE ZONAS Y ETAPAS DE PREVENTA */}
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">🎟️ Zonas y Etapas de Preventa (Fases)</h4>
                      <p className="text-[10px] text-slate-400">Agrega zonas (ej: VIP, Preferente) o etapas (ej: Fase 1, Preventa)</p>
                    </div>
                    <button
                      type="button"
                      onClick={agregarZona}
                      className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-600 transition"
                    >
                      + Agregar Zona / Fase
                    </button>
                  </div>

                  {zonasForm.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-1">
                      No has agregado zonas específicas. El evento usará el precio base general (${formData.precio} MXN).
                    </p>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {zonasForm.map((zona, idx) => (
                        <div key={zona.id || idx} className="bg-[#080d12] p-4 rounded-xl border border-white/10 space-y-3 shadow-inner">
                          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-start justify-between">
                            <div className="flex-1 min-w-[180px]">
                              <label className="block text-[10px] text-slate-300 uppercase font-semibold mb-1">Nombre de Zona / Fase</label>
                              <input
                                type="text"
                                placeholder="ej: VIP Front Stage"
                                className="w-full bg-[#111823] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                                value={zona.nombre}
                                onChange={(e) => actualizarZona(idx, "nombre", e.target.value)}
                              />
                            </div>
                            <div className="w-28">
                              <label className="block text-[10px] text-slate-300 uppercase font-semibold mb-1">Precio ($ MXN)</label>
                              <input
                                type="number"
                                className="w-full bg-[#111823] border border-white/15 rounded-lg px-3 py-2 text-xs text-cyan-300 font-extrabold outline-none focus:border-cyan-400"
                                value={zona.precio}
                                onChange={(e) => actualizarZona(idx, "precio", Number(e.target.value))}
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-[10px] text-slate-300 uppercase font-semibold mb-1">Capacidad</label>
                              <input
                                type="number"
                                className="w-full bg-[#111823] border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                                value={zona.capacidad}
                                onChange={(e) => actualizarZona(idx, "capacidad", Number(e.target.value))}
                              />
                            </div>
                            <div className="pt-5 shrink-0">
                              <button
                                type="button"
                                onClick={() => eliminarZona(idx)}
                                className="text-xs text-red-400 hover:text-red-300 font-bold bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg border border-red-500/20 transition"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Descripción opcional (ej: Incluye meet & greet, bebida de bienvenida...)"
                              className="w-full bg-[#0d131a] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
                              value={zona.descripcion || ""}
                              onChange={(e) => actualizarZona(idx, "descripcion", e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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