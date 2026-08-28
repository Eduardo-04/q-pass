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

  return (
    <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-6">
            <Image 
              src="/q-pass-logo.png" 
              alt="Q-Pass Logo" 
              width={200} 
              height={200} 
              priority
              className="drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-4">
            Acceso Administrativo
          </div>
          <p className="mt-2 text-sm text-slate-400">Ingresa tus credenciales para continuar</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111823]/80 backdrop-blur-sm shadow-2xl p-8">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Contraseña</label>
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
        </div>

        <p className="text-[10px] text-center text-slate-600 mt-8 tracking-widest uppercase">
          LIZARD TECH • SECURE ACCESS
        </p>
      </div>
    </div>
  );
}
