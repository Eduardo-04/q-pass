"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  ChevronRight,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  User,
  X,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [formLead, setFormLead] = useState({
    nombreEmpresa: "",
    nombreContacto: "",
    email: "",
    telefono: "",
    aforoEstimado: "100-500"
  });

  const handleSolicitarAlta = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);

    try {
      const res = await fetch("/api/solicitudes-organizador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formLead)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo enviar la solicitud");
      }

      toast.success("¡Solicitud enviada con éxito! Abrimos chat de atención directa...");
      setModalOpen(false);
      setFormLead({
        nombreEmpresa: "",
        nombreContacto: "",
        email: "",
        telefono: "",
        aforoEstimado: "100-500"
      });

      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white overflow-x-hidden">
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0f14]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/q-pass-logo.png" alt="Q-Pass Logo" width={40} height={40} />
            <span className="text-xl font-bold tracking-tighter text-white">Q-PASS</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <a href="#beneficios" className="text-sm font-medium text-slate-400 transition hover:text-cyan-400">Beneficios</a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-400 transition hover:text-cyan-400">Cómo funciona</a>
            <button
              onClick={() => setModalOpen(true)}
              className="text-sm font-semibold text-cyan-400 transition hover:text-cyan-300 border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 rounded-full"
            >
              ¿Organizas un evento?
            </button>
            <Link href="/boletos" className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              Comprar Boletos
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full -z-10" />
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full -z-10" />

        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mb-8 flex justify-center">
            <Image 
              src="/q-pass-logo.png" 
              alt="Q-Pass Logo" 
              width={200} 
              height={200} 
              priority
              className="drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]"
            />
          </div>
          
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-300 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            La evolución del ticketing digital
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl mb-8">
            Control Total para tu <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent italic">Bolera o Evento</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-400 md:text-xl mb-12">
            La plataforma de gestión de accesos más rápida, segura y transparente del mercado. 
            Vende boletos, valida QRs en segundos y liquida tus finanzas sin complicaciones.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/boletos" className="group flex items-center gap-2 rounded-2xl bg-cyan-500 px-8 py-4 text-lg font-bold text-white transition hover:bg-cyan-600 active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.4)]">
              Ver Eventos Disponibles
              <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-8 py-4 text-lg font-bold text-cyan-300 backdrop-blur-sm transition hover:bg-cyan-400/20 active:scale-95"
            >
              Vender mi Evento en Q-Pass
            </button>
          </div>
        </div>
      </section>

      {/* Beneficios Section */}
      <section id="beneficios" className="py-24 bg-[#0d1219]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">¿Por qué elegir Q-Pass?</h2>
            <p className="mt-4 text-slate-400">Diseñado específicamente para eventos locales con alto volumen de asistentes.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-[#111823] p-8 transition hover:border-cyan-500/30">
              <div className="mb-6 inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-400 border border-cyan-500/20">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Escaneo Ultra Rápido</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Escáner optimizado para navegadores móviles con soporte acústico y validación manual de folios de 8 dígitos.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111823] p-8 transition hover:border-cyan-500/30">
              <div className="mb-6 inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-400 border border-cyan-500/20">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Cero Re-uso ni Fraude</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Códigos QR firmados digitalmente con criptografía HMAC-SHA256 y bloqueo instantáneo de re-escaneo en puerta.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111823] p-8 transition hover:border-cyan-500/30">
              <div className="mb-6 inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-400 border border-cyan-500/20">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Transparencia Financiera</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Dashboard en tiempo real con cálculo exacto de comisiones y exportación directa a reportes en Excel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-to-t from-cyan-900/20 to-transparent">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-8">
            ¿Listo para vender tu evento con Q-Pass?
          </h2>
          <p className="text-lg text-slate-400 mb-12">
            Únete a las boleras, universidades y organizadores que ya están modernizando su operación.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto rounded-2xl bg-cyan-500 px-8 py-4 text-lg font-bold text-white transition hover:bg-cyan-600 active:scale-95 shadow-xl"
            >
              Solicitar Alta de Organizador
            </button>
            <Link href="/login" className="w-full sm:w-auto rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95">
              Acceso Staff / Socios
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/q-pass-logo.png" alt="Q-Pass Logo" width={30} height={30} />
              <span className="text-sm font-bold tracking-widest uppercase">Q-PASS</span>
            </div>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Q-Pass Digital Access. Powered by Lizard Tech.
            </p>
            <div className="flex gap-6">
              <span className="text-xs text-slate-500">Privacidad</span>
              <span className="text-xs text-slate-500">Términos</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal de Solicitud de Alta de Organizador */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#111823] p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition"
            >
              <X size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-2">
                B2B Partner Onboarding
              </div>
              <h3 className="text-2xl font-bold text-white">Vende tus boletos con Q-Pass</h3>
              <p className="text-xs text-slate-400 mt-1">
                Completa tus datos y un asesor te atenderá por WhatsApp para configurar tu comisión y publicar tu evento.
              </p>
            </div>

            <form onSubmit={handleSolicitarAlta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de la Empresa o Evento *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Bolera Central / Festival Universitario"
                    value={formLead.nombreEmpresa}
                    onChange={(e) => setFormLead({ ...formLead, nombreEmpresa: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0f14] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de Contacto *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={formLead.nombreContacto}
                    onChange={(e) => setFormLead({ ...formLead, nombreContacto: e.target.value })}
                    className="w-full rounded-xl border border-white/15 bg-[#0a0f14] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="contacto@empresa.com"
                      value={formLead.email}
                      onChange={(e) => setFormLead({ ...formLead, email: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-[#0a0f14] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp / Teléfono *</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      placeholder="961 123 4567"
                      value={formLead.telefono}
                      onChange={(e) => setFormLead({ ...formLead, telefono: e.target.value })}
                      className="w-full rounded-xl border border-white/15 bg-[#0a0f14] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Aforo Estimado del Evento</label>
                <select
                  value={formLead.aforoEstimado}
                  onChange={(e) => setFormLead({ ...formLead, aforoEstimado: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-[#0a0f14] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                >
                  <option value="50-200">50 a 200 personas</option>
                  <option value="200-500">200 a 500 personas</option>
                  <option value="500-1500">500 a 1,500 personas</option>
                  <option value="1500+">Más de 1,500 personas</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={procesando}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-bold text-white shadow-lg transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 mt-2"
              >
                <MessageSquare size={18} />
                {procesando ? "Enviando solicitud..." : "Enviar Solicitud y Contactar por WhatsApp"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
