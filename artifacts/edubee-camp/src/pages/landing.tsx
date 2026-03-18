import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Globe, CheckCircle2, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <nav className="h-20 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-display font-bold text-foreground">Edubee Camp</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/login">
            <Button className="hover-elevate shadow-md shadow-primary/20 font-semibold rounded-full px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 overflow-hidden px-6 lg:px-12">
          <div className="absolute inset-0 z-0">
            {/* Using declared generated image */}
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
              alt="Hero background" 
              className="w-full h-full object-cover opacity-60 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <Globe className="w-4 h-4" /> Global Educational Platform
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-extrabold text-foreground tracking-tight leading-[1.1] mb-6">
                Connecting Students to <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">
                  World-Class Camps
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                The comprehensive B2B2C marketplace for educational agencies, camp coordinators, and partner institutes to seamlessly manage student enrollments.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login">
                  <Button size="lg" className="h-14 px-8 text-base rounded-full shadow-xl shadow-primary/25 hover-elevate active-elevate-2 w-full sm:w-auto">
                    Access Portal <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full border-2 hover-elevate bg-background/50 backdrop-blur w-full sm:w-auto">
                  View Public Programs
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-muted/30 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Complete Operational Ecosystem</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">One platform to manage the entire lifecycle of educational camp operations across multiple countries and currencies.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Multi-Role Management', desc: 'Dedicated portals for coordinators, agents, and local partners (hotels, transit, institutes).', color: 'bg-primary/10 text-primary' },
                { title: 'Global Finance Engine', desc: 'Handle multi-currency pricing, dynamic exchange rates, and complex partner commission settlements.', color: 'bg-blue-500/10 text-blue-600' },
                { title: 'Integrated Workflow', desc: 'From initial lead capture to application approval, contract generation, and service fulfillment.', color: 'bg-green-500/10 text-green-600' }
              ].map((feat, i) => (
                <div key={i} className="bg-card rounded-2xl p-8 shadow-lg shadow-black/5 border border-border/50 hover-elevate transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feat.color}`}>
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-display">{feat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border bg-background px-6 lg:px-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8" />
          <span className="font-display font-bold text-lg">Edubee Camp</span>
        </div>
        <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} Edubee Global. All rights reserved.</p>
      </footer>
    </div>
  );
}
