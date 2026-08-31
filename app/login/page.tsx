"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import type { UserRole } from "@/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = error.message === "Invalid login credentials" ? "Credenciales inválidas" : error.message;
        toast.error(msg);
        setLoading(false);
      } else {
        // Obtener rol desde la tabla perfiles
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", data.user?.id)
          .single();

        const role: UserRole = (perfil?.rol as UserRole) || "staff";
        
        toast.success("¡Bienvenido de nuevo!");

        // Redirigir según rol
        const target = ["master", "organizador"].includes(role)
          ? "/admin"
          : role === "checador"
          ? "/check-in"
          : "/boletos";
        window.location.href = target;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Desconocido";
      toast.error("Error inesperado: " + errorMsg);
      setLoading(false);
    }
  };

  const [resetMode, setResetMode] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor ingresa tu correo electrónico.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Te hemos enviado un correo para restablecer tu contraseña.");
        setResetMode(false);
      }
    } catch {
      toast.error("Error al enviar solicitud de recuperación.");
    } finally {
      setLoading(false);
    }
  };

  const [pinMode, setPinMode] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      toast.error("Ingresa un PIN válido de al menos 4 dígitos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/staff/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin: pinInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Acceso autorizado: ${data.user.nombre}`);
        // Iniciar sesión Auth para checador
        await supabase.auth.signInWithPassword({
          email: data.user.email,
          password: `Pass#${pinInput}!`
        }).catch(() => {});
        window.location.href = "/check-in";
      } else {
        toast.error(data.error || "PIN de acceso no válido");
        setLoading(false);
      }
    } catch {
      toast.error("Error al verificar el PIN");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="mb-4">
            <Image 
              src="/q-pass-logo.png" 
              alt="Q-Pass Logo" 
              width={200} 
              height={200} 
              priority
              className="drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            />
          </div>
          
          {/* Selector de Modo: Admin / Organizador vs PIN de Puerta */}
          <div className="flex rounded-full border border-white/10 bg-[#111823] p-1 mb-4">
            <button
              type="button"
              onClick={() => { setPinMode(false); setResetMode(false); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${!pinMode && !resetMode ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              Organizador / Admin
            </button>
            <button
              type="button"
              onClick={() => { setPinMode(true); setResetMode(false); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${pinMode ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              🔑 PIN Staff Puerta
            </button>
          </div>

          <p className="text-xs text-slate-400">
            {resetMode 
              ? "Recupera el acceso a tu cuenta" 
              : pinMode 
              ? "Ingresa con el PIN de 4 dígitos asignado a tu puerta" 
              : "Ingresa tus credenciales para continuar"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111823]/80 backdrop-blur-sm shadow-2xl p-8">
          {pinMode ? (
            <form onSubmit={handlePinLogin} className="space-y-5">
              <div className="text-center">
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">
                  PIN de Acceso a Puerta
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Ej. 4920"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold rounded-xl border border-emerald-500/30 bg-[#0a0f14] px-4 py-4 text-emerald-400 placeholder:text-slate-600 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 shadow-lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar a Escáner de Puerta"}
              </button>
            </form>
          ) : resetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Correo Registrado</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Correo de Recuperación"}
              </button>

              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition"
              >
                Volver a Iniciar Sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Entrar al panel"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-[10px] text-center text-slate-600 mt-8 tracking-widest uppercase">
          LIZARD TECH • SECURE ACCESS
        </p>
      </div>
    </div>
  );
}
