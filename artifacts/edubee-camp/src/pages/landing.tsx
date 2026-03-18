import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Menu, X, ArrowRight, ChevronUp, GraduationCap, Search, Star, Users, BookOpen, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { ProgramCard } from "@/components/public/program-card";
import { ProgramDetailDrawer } from "@/components/public/program-detail-drawer";
import { ApplicationModal } from "@/components/public/application-modal";
import type { PublicProgram } from "@/lib/program-utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function fetchPrograms(): Promise<PublicProgram[]> {
  return axios.get(`${BASE}/api/public/packages`).then((r) => r.data);
}

const TESTIMONIALS = [
  {
    name: "Kim Ji-young",
    flag: "🇰🇷",
    quote: "My daughter came back from Sydney with incredible English skills and a global mindset. Best investment we ever made.",
    rating: 5,
    program: "Sydney Summer Camp",
    avatar: "KJ",
  },
  {
    name: "Tanaka Hiroshi",
    flag: "🇯🇵",
    quote: "The entire process — from application to accommodation — was seamlessly handled. We felt supported every step of the way.",
    rating: 5,
    program: "Tokyo Language Camp",
    avatar: "TH",
  },
  {
    name: "Somchai Wongsawat",
    flag: "🇹🇭",
    quote: "My son's English and confidence improved dramatically. The cultural experiences in London were truly unforgettable.",
    rating: 5,
    program: "London Academic Program",
    avatar: "SW",
  },
];

export default function Landing() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerProgram, setDrawerProgram] = useState<PublicProgram | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultProgramId, setModalDefaultProgramId] = useState<string | undefined>();
  const programsRef = useRef<HTMLElement>(null);
  const howItWorksRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["public-programs"],
    queryFn: fetchPrograms,
  });

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  }

  function openApply(programId?: string) {
    setModalDefaultProgramId(programId);
    setModalOpen(true);
    setDrawerProgram(null);
  }

  const navLinks = [
    { label: t("nav.home"), action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { label: t("nav.programs"), action: () => scrollTo(programsRef) },
    { label: t("nav.howItWorks"), action: () => scrollTo(howItWorksRef) },
    { label: t("nav.contact"), action: () => scrollTo(contactRef) },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ─── NAVBAR ─── */}
      <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-xl shadow-sm border-b border-border/40" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">Edubee Camp</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button key={link.label} onClick={link.action} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex font-medium">{t("nav.login")}</Button>
            </Link>
            <Button size="sm" className="rounded-full px-5 font-semibold shadow-md shadow-primary/20 hidden sm:inline-flex" onClick={() => openApply()}>
              {t("nav.applyNow")}
            </Button>
            {/* Mobile hamburger */}
            <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 h-16 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg">Edubee Camp</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col p-6 gap-2 flex-1">
            {navLinks.map((link) => (
              <button key={link.label} onClick={link.action} className="text-left py-3 text-lg font-medium text-foreground border-b border-border/40 hover:text-primary transition-colors">
                {link.label}
              </button>
            ))}
          </nav>
          <div className="p-6 space-y-3">
            <LanguageSwitcher />
            <Button className="w-full rounded-full font-semibold" onClick={() => { openApply(); setMobileMenuOpen(false); }}>
              {t("nav.applyNow")}
            </Button>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full rounded-full">{t("nav.login")}</Button>
            </Link>
          </div>
        </div>
      )}

      {/* ─── HERO ─── */}
      <section id="home" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF] via-[#1D4ED8] to-[#0D9488]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0di00aDJ2NGgxMHYySDM4djEwaC0yVjM2SDI2di0yaDF6TTI0IDI0aC0ydi00aC0ydi0yaC00di0yaDF2MmgzdjJoMnY0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
              🌏 Global Educational Platform
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.05]">
              {t("hero.headline")}
            </h1>

            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              {t("hero.subheadline")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-13 px-8 text-base rounded-full bg-white text-primary hover:bg-white/90 shadow-xl font-bold w-full sm:w-auto"
                onClick={() => scrollTo(programsRef)}
              >
                <Search className="w-5 h-5 mr-2" /> {t("hero.cta_explore")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 text-base rounded-full border-2 border-white/40 text-white hover:bg-white/10 backdrop-blur w-full sm:w-auto"
                onClick={() => openApply()}
              >
                {t("hero.cta_apply")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
              {[
                { icon: <Users className="w-5 h-5" />, value: t("hero.stats.students") },
                { icon: <BookOpen className="w-5 h-5" />, value: t("hero.stats.programs") },
                { icon: <Award className="w-5 h-5" />, value: t("hero.stats.institutes") },
                { icon: <Star className="w-5 h-5" />, value: t("hero.stats.rating") },
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-4 text-center">
                  <div className="text-white/70 flex justify-center mb-2">{stat.icon}</div>
                  <div className="text-white font-bold text-sm sm:text-base">{stat.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── PROGRAMS ─── */}
      <section id="programs" ref={programsRef} className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">{t("programs.title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Explore our curated selection of educational programs across the world.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-2xl border border-border/60 h-72 animate-pulse" />
              ))}
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t("common.noData")}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program, i) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <ProgramCard
                    program={program}
                    onViewDetails={(p) => setDrawerProgram(p)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section ref={howItWorksRef} className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">{t("howItWorks.title")}</h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-12 left-[calc(16.7%+2rem)] right-[calc(16.7%+2rem)] h-0.5 bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />

            {[
              { emoji: "🔍", title: t("howItWorks.step1_title"), desc: t("howItWorks.step1_desc"), step: "1" },
              { emoji: "📝", title: t("howItWorks.step2_title"), desc: t("howItWorks.step2_desc"), step: "2" },
              { emoji: "🚀", title: t("howItWorks.step3_title"), desc: t("howItWorks.step3_desc"), step: "3" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 text-4xl">
                    {item.emoji}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="rounded-full px-8 font-semibold shadow-lg shadow-primary/20" onClick={() => openApply()}>
              {t("nav.applyNow")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-4">What Parents Say</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Real stories from families who trusted Edubee Camp.</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t_item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
              >
                <div className="flex gap-1">
                  {Array(t_item.rating).fill(0).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed italic">"{t_item.quote}"</p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                    {t_item.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{t_item.name} {t_item.flag}</div>
                    <div className="text-xs text-muted-foreground">{t_item.program}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer ref={contactRef} className="bg-gray-900 text-white pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg">Edubee Camp</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{t("footer.tagline")}</p>
            <LanguageSwitcher variant="footer" />
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <button onClick={link.action} className="text-white/60 text-sm hover:text-white transition-colors">
                    {link.label}
                  </button>
                </li>
              ))}
              <li>
                <Link href="/login" className="text-white/60 text-sm hover:text-white transition-colors">
                  {t("nav.login")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">{t("footer.contact")}</h4>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li>📧 hello@edubeecamp.com</li>
              <li>📞 +82 2-1234-5678</li>
              <li>📍 Seoul, Korea</li>
              <li>🕐 Mon–Fri 9am–6pm KST</li>
            </ul>
          </div>

          {/* Follow */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">{t("footer.followUs")}</h4>
            <div className="flex gap-3">
              {["Instagram", "Facebook", "YouTube", "LINE"].map((sn) => (
                <button key={sn} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white text-xs font-bold">
                  {sn[0]}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <Button size="sm" className="rounded-full px-5 font-semibold w-full" onClick={() => openApply()}>
                {t("nav.applyNow")}
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-white/40 text-sm">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </footer>

      {/* ─── BACK TO TOP ─── */}
      {showTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-6 right-6 z-20 w-11 h-11 rounded-full bg-primary text-white shadow-xl shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-colors"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}

      {/* ─── PROGRAM DETAIL DRAWER ─── */}
      <ProgramDetailDrawer
        program={drawerProgram}
        onClose={() => setDrawerProgram(null)}
        onApply={(p) => openApply(p.id)}
      />

      {/* ─── APPLICATION MODAL ─── */}
      <ApplicationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        programs={programs}
        defaultProgramId={modalDefaultProgramId}
      />
    </div>
  );
}
