import Image from "next/image";
import Link from "next/link";
import { 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  ChevronRight,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0f14] text-white overflow-x-hidden">
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0f14]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Image src="/q-pass-logo.png" alt="Q-Pass Logo" width={40} height={40} />
            <span className="text-xl font-bold tracking-tighter text-white">Q-PASS</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#beneficios" className="text-sm font-medium text-slate-400 transition hover:text-cyan-400">Beneficios</a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-400 transition hover:text-cyan-400">Cómo funciona</a>
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
              width={220} 
              height={220} 
              priority
              className="drop-shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-float"
            />
          </div>
          
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-300 mb-6 animate-fade-in">
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
            <a href="#beneficios" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95">
              Conocer más
            </a>
          </div>
        </div>
      </section>

      {/* Beneficios Section */}
      <section id="beneficios" className="py-24 bg-[#0d1219]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">¿Por qué elegir Q-Pass?</h2>
            <p className="mt-4 text-slate-400">Diseñado para la eficiencia operativa y la tranquilidad financiera.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Beneficio 1 */}
            <div className="group rounded-3xl border border-white/5 bg-[#111823] p-8 transition hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                <ShieldCheck size={28} />
              </div>
              <h3 className="mb-4 text-xl font-bold text-white">Seguridad de Hierro</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Boletos QR encriptados e infalsificables. Cada código es único y solo puede ser validado una vez, evitando el fraude.
              </p>
            </div>

            {/* Beneficio 2 */}
            <div className="group rounded-3xl border border-white/5 bg-[#111823] p-8 transition hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <TrendingUp size={28} />
              </div>
              <h3 className="mb-4 text-xl font-bold text-white">Finanzas Claras</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Dashboard financiero detallado. Conoce exactamente cuánto recaudaste y el desglose de comisiones en tiempo real.
              </p>
            </div>

            {/* Beneficio 3 */}
            <div className="group rounded-3xl border border-white/5 bg-[#111823] p-8 transition hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Zap size={28} />
              </div>
              <h3 className="mb-4 text-xl font-bold text-white">Check-in Veloz</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Valida accesos en menos de un segundo con cualquier smartphone. Sin necesidad de hardware costoso o instalaciones complejas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-24 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-16 lg:flex-row lg:items-center">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300 mb-6">
                Panel Administrativo
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
                Todo tu negocio en la palma de tu mano
              </h2>
              <ul className="space-y-4">
                {[
                  "Monitoreo de asistencia en tiempo real",
                  "Gestión de múltiples eventos y pistas",
                  "Reportes exportables a Excel",
                  "Configuración de comisiones flexible"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 size={20} className="text-cyan-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex gap-4">
                <Link href="/login" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition">
                  Explorar Panel de Gestión <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-[80px] -z-10 rounded-full" />
              <div className="rounded-2xl border border-white/10 bg-[#111823] p-4 shadow-2xl overflow-hidden">
                 <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                    <div className="h-3 w-3 rounded-full bg-red-500/50" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                    <div className="h-3 w-3 rounded-full bg-green-500/50" />
                    <div className="ml-4 h-4 w-48 rounded bg-white/5" />
                 </div>
                 <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
                    <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
                 </div>
                 <div className="h-48 rounded-xl bg-white/5 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-to-t from-cyan-900/20 to-transparent">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-8">
            ¿Listo para digitalizar tu evento?
          </h2>
          <p className="text-lg text-slate-400 mb-12">
            Únete a las boleras y organizadores que ya están modernizando su operación con Q-Pass.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/boletos" className="w-full sm:w-auto rounded-2xl bg-white px-8 py-4 text-lg font-bold text-black transition hover:bg-slate-200 active:scale-95 shadow-xl">
              Comprar Boletos
            </Link>
            <Link href="/login" className="w-full sm:w-auto rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95">
              Acceso Staff
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
    </div>
  );
}
