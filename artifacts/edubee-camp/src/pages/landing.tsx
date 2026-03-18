import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, ChevronUp, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { ProgramCard } from "@/components/public/program-card";
import heroBg from "@assets/1_2_1773827220210.jpg";
import { ProgramDetailDrawer } from "@/components/public/program-detail-drawer";
import { ApplicationModal } from "@/components/public/application-modal";
import type { PublicProgram } from "@/lib/program-utils";
import logoImg from "@assets/edubee_logo_800x310b_1773796715563.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fetchPrograms(): Promise<PublicProgram[]> {
  return axios.get(`${BASE}/api/public/packages`).then((r) => r.data);
}

const STATS = [
  { value: "500+", label: "Students Enrolled" },
  { value: "20+",  label: "Active Programs" },
  { value: "10+",  label: "Partner Institutes" },
  { value: "4.8★", label: "Average Rating" },
];

const TESTIMONIALS = [
  {
    name: "Kim Ji-young",
    flag: "🇰🇷",
    quote: "My daughter returned from Sydney with incredible English skills and a global mindset. Best investment we ever made.",
    program: "Sydney Summer Camp",
    initials: "KJ",
  },
  {
    name: "Tanaka Hiroshi",
    flag: "🇯🇵",
    quote: "The entire process — application to accommodation — was seamlessly handled. We felt supported every step.",
    program: "Tokyo Language Camp",
    initials: "TH",
  },
  {
    name: "Somchai Wongsawat",
    flag: "🇹🇭",
    quote: "My son's English and confidence improved dramatically. The London experiences were truly unforgettable.",
    program: "London Academic Program",
    initials: "SW",
  },
];

export default function Landing() {
  const { t } = useTranslation();
  const [scrolled, setScrolled]             = useState(false);
  const [showTop, setShowTop]               = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [drawerProgram, setDrawerProgram]   = useState<PublicProgram | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalProgramId, setModalProgramId] = useState<string | undefined>();

  const programsRef    = useRef<HTMLElement>(null);
  const howItWorksRef  = useRef<HTMLElement>(null);
  const contactRef     = useRef<HTMLElement>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["public-programs"],
    queryFn: fetchPrograms,
  });

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 10);
      setShowTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  }

  function openApply(programId?: string) {
    setModalProgramId(programId);
    setModalOpen(true);
    setDrawerProgram(null);
  }

  const navLinks = [
    { label: t("nav.home"),       action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { label: t("nav.programs"),   action: () => scrollTo(programsRef) },
    { label: t("nav.howItWorks"), action: () => scrollTo(howItWorksRef) },
    { label: t("nav.contact"),    action: () => scrollTo(contactRef) },
  ];

  return (
    <div className="min-h-screen bg-white text-foreground font-sans">

      {/* ── NAVBAR ── */}
      <header className={`fixed top-0 inset-x-0 z-30 transition-all duration-200 ${scrolled ? "bg-white border-b border-border shadow-xs" : "bg-white border-b border-transparent"}`}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-6">
          {/* Logo */}
          <a href="#" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="shrink-0 flex items-center">
            <img src={logoImg} alt="Edubee Camp" className="h-[42px] w-auto object-contain" />
          </a>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4 flex-1">
            {navLinks.map((l) => (
              <button
                key={l.label}
                onClick={l.action}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitcher />
            <Link href="/login">
              <button className="hidden sm:block px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.login")}
              </button>
            </Link>
            <Button
              size="sm"
              className="hidden sm:inline-flex rounded-md h-8 px-4 text-sm font-semibold"
              onClick={() => openApply()}
            >
              {t("nav.applyNow")}
            </Button>
            <button className="md:hidden w-8 h-8 flex items-center justify-center text-foreground hover:bg-muted rounded-md" onClick={() => setMobileOpen(true)}>
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-white flex flex-col"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <img src={logoImg} alt="Edubee Camp" className="h-[42px] w-auto object-contain" />
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md">
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex flex-col p-5 gap-1 flex-1">
              {navLinks.map((l) => (
                <button key={l.label} onClick={l.action} className="text-left px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted rounded-md transition-colors">
                  {l.label}
                </button>
              ))}
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <div className="px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted rounded-md cursor-pointer">{t("nav.login")}</div>
              </Link>
            </nav>
            <div className="p-5 space-y-3 border-t border-border">
              <LanguageSwitcher />
              <Button className="w-full" onClick={() => { openApply(); setMobileOpen(false); }}>{t("nav.applyNow")}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ── */}
      <section
        className="pt-14 relative"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center 40%" }}
      >
        <div className="absolute inset-0 bg-white/72 backdrop-blur-[1px]" />
        <div className="max-w-6xl mx-auto px-5 pt-20 pb-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left copy */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5821F]/10 rounded-full text-xs font-semibold text-[#F5821F] tracking-wide uppercase">
                  🌏 Global Educational Platform
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                  Connecting Students<br />
                  to{" "}
                  <span className="text-[#F5821F]">World-Class</span><br />
                  Camps
                </h1>
                <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
                  {t("hero.subheadline")}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-10 px-5 font-semibold rounded-md gap-2"
                  onClick={() => scrollTo(programsRef)}
                >
                  {t("hero.cta_explore")} <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-5 font-semibold rounded-md gap-2"
                  onClick={() => openApply()}
                >
                  {t("hero.cta_apply")} <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {STATS.map((s, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="text-2xl font-extrabold text-[#F5821F]">{s.value}</div>
                    <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="relative w-full max-w-md">
                {/* Main card */}
                <div className="bg-white rounded-2xl border border-border p-6 shadow-lg space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F5821F]/10 flex items-center justify-center text-xl">🇦🇺</div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">Sydney Summer English Camp</div>
                      <div className="text-xs text-muted-foreground">Sydney, Australia</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["2 Weeks", "4 Weeks", "8 Weeks"].map((d, i) => (
                      <div key={i} className={`rounded-lg p-3 text-center border ${i === 1 ? "border-[#F5821F] bg-[#F5821F]/5" : "border-border"}`}>
                        <div className={`font-bold text-sm ${i === 1 ? "text-[#F5821F]" : "text-foreground"}`}>
                          {["A$2,850", "A$5,200", "A$9,800"][i]}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {["KJ", "PH", "TH"].map((i) => (
                          <div key={i} className="w-6 h-6 rounded-full bg-[#F5821F]/20 text-[#F5821F] text-xs font-bold flex items-center justify-center ring-2 ring-white">{i[0]}</div>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">12 enrolled</span>
                    </div>
                    <div className="text-xs font-semibold text-[#F5821F] flex items-center gap-1">
                      8 spots left <span className="w-1.5 h-1.5 rounded-full bg-[#F5821F] animate-pulse inline-block" />
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-4 -right-4 bg-white border border-border rounded-xl px-3 py-2 shadow-md text-xs font-semibold text-foreground flex items-center gap-1.5">
                  🌏 <span>10+ Countries</span>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-[#F5821F] rounded-xl px-3 py-2 shadow-md text-xs font-semibold text-white flex items-center gap-1.5">
                  ✓ Verified Programs
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Thin orange bottom strip */}
        <div className="border-t border-border bg-white/60 relative z-10">
          <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            {["🇦🇺 Australia", "🇯🇵 Japan", "🇬🇧 United Kingdom", "🇸🇬 Singapore", "🇵🇭 Philippines", "🇹🇭 Thailand"].map((c) => (
              <span key={c} className="flex items-center gap-1">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMS ── */}
      <section ref={programsRef} className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="text-xs font-semibold text-[#F5821F] uppercase tracking-widest mb-2">Programs</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">{t("programs.title")}</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted rounded-xl h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {programs.map((program, i) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                >
                  <ProgramCard program={program} onViewDetails={setDrawerProgram} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section ref={howItWorksRef} className="py-20 px-5 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs font-semibold text-[#F5821F] uppercase tracking-widest mb-2">Process</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">{t("howItWorks.title")}</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto relative">
            {/* connector */}
            <div className="hidden sm:block absolute top-6 left-[calc(16.7%+2rem)] right-[calc(16.7%+2rem)] h-px bg-border" />

            {[
              { emoji: "🔍", step: "01", title: t("howItWorks.step1_title"), desc: t("howItWorks.step1_desc") },
              { emoji: "📝", step: "02", title: t("howItWorks.step2_title"), desc: t("howItWorks.step2_desc") },
              { emoji: "🚀", step: "03", title: t("howItWorks.step3_title"), desc: t("howItWorks.step3_desc") },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-5">
                  <div className="w-12 h-12 rounded-full border-2 border-[#F5821F] bg-white flex items-center justify-center text-2xl">
                    {item.emoji}
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#F5821F] text-white text-[10px] font-extrabold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-bold text-sm text-foreground mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button className="h-10 px-6 font-semibold rounded-md" onClick={() => openApply()}>
              {t("nav.applyNow")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-[#F5821F] uppercase tracking-widest mb-2">Reviews</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">What Parents Say</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="bg-white border border-border rounded-xl p-6 space-y-4"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array(5).fill(0).map((_, j) => (
                    <span key={j} className="text-[#F5821F] text-sm">★</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{item.quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="w-8 h-8 rounded-full bg-[#F5821F]/10 text-[#F5821F] font-bold text-xs flex items-center justify-center shrink-0">
                    {item.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground">{item.name} {item.flag}</div>
                    <div className="text-xs text-muted-foreground">{item.program}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="bg-[#F5821F] py-16 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to start your journey?</h2>
            <p className="text-white/80 mt-1 text-sm">Apply today and we'll reach out within 2 business days.</p>
          </div>
          <Button
            className="bg-white text-[#F5821F] hover:bg-white/90 font-bold rounded-md h-11 px-7 shrink-0 shadow-none"
            onClick={() => openApply()}
          >
            {t("nav.applyNow")} <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer ref={contactRef} className="bg-foreground text-white/70 pt-14 pb-8 px-5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <img src={logoImg} alt="Edubee Camp" className="h-[42px] w-auto object-contain brightness-0 invert opacity-90" />
            <p className="text-sm leading-relaxed">{t("footer.tagline")}</p>
            <LanguageSwitcher variant="footer" />
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2.5">
              {navLinks.map((l) => (
                <li key={l.label}>
                  <button onClick={l.action} className="text-sm hover:text-white transition-colors">{l.label}</button>
                </li>
              ))}
              <li>
                <Link href="/login" className="text-sm hover:text-white transition-colors">{t("nav.login")}</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>hello@edubeecamp.com</li>
              <li>+82 2-1234-5678</li>
              <li>Seoul, Korea</li>
              <li className="text-xs text-white/40">Mon–Fri 9am–6pm KST</li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">{t("footer.followUs")}</h4>
            <div className="flex flex-wrap gap-2">
              {["Instagram", "Facebook", "YouTube", "LINE"].map((sn) => (
                <div key={sn} className="px-3 py-1.5 bg-white/8 hover:bg-white/12 border border-white/10 rounded-md text-xs text-white/70 hover:text-white cursor-pointer transition-colors">
                  {sn}
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="mt-6 w-full rounded-md font-semibold bg-[#F5821F] hover:bg-[#d97600] text-white"
              onClick={() => openApply()}
            >
              {t("nav.applyNow")}
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/30">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>

      {/* ── BACK TO TOP ── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-5 right-5 z-20 w-9 h-9 rounded-md bg-foreground text-white flex items-center justify-center shadow-lg hover:bg-foreground/80 transition-colors"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ChevronUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── PROGRAM DRAWER ── */}
      <ProgramDetailDrawer
        program={drawerProgram}
        onClose={() => setDrawerProgram(null)}
        onApply={(p) => openApply(p.id)}
      />

      {/* ── APPLICATION MODAL ── */}
      <ApplicationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        programs={programs}
        defaultProgramId={modalProgramId}
      />
    </div>
  );
}
