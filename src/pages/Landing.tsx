import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Link2, TrendingUp, Scissors, Clock, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-barber.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-gold" />
            <span className="font-display text-xl tracking-wide">Boss<span className="text-gold">Barber</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Entrar</Link></Button>
            <Button variant="gold" asChild><Link to="/auth?mode=signup">Cadastrar</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 gradient-radial pointer-events-none" />
        <img
          src={heroImg}
          alt="Barbearia premium"
          width={1536}
          height={1024}
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />

        <div className="container relative z-10 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold bg-primary/5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs uppercase tracking-widest text-gold/90">Sistema premium para barbearias</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6">
            Sua agenda lotada,<br />
            <span className="text-gradient-gold">o dia inteiro.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Pare de perder cliente no WhatsApp. Receba agendamentos 24h, gerencie serviços
            e acompanhe seu faturamento — tudo num único link.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="gold" size="xl" asChild>
              <Link to="/auth?mode=signup">Cadastrar minha Barbearia</Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">Grátis para começar · Sem cartão de crédito</p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-gold mb-3">Por que BossBarber</p>
            <h2 className="font-display text-4xl md:text-5xl">Tudo que sua barbearia precisa</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: "Agenda 24 horas", desc: "Seus clientes agendam de madrugada, no domingo, a hora que quiserem. Você só recebe a notificação." },
              { icon: Link2, title: "Link Personalizado", desc: "Compartilhe seu link único no Instagram e WhatsApp. Em 3 cliques o cliente já está na sua agenda." },
              { icon: TrendingUp, title: "Gestão Financeira", desc: "Veja em tempo real seu faturamento, número de cortes e novos clientes do dia." },
            ].map((b, i) => (
              <div key={i} className="group relative p-8 rounded-2xl border border-border bg-card hover:border-gold transition-all duration-300 hover:-translate-y-1 hover:shadow-gold">
                <div className="inline-flex p-3 rounded-xl gradient-gold mb-5">
                  <b.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-2xl mb-2">{b.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/50">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-4xl md:text-5xl mb-6">
            Pronto para profissionalizar <span className="text-gradient-gold">sua barbearia?</span>
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">Cadastre-se em menos de 1 minuto.</p>
          <Button variant="gold" size="xl" asChild>
            <Link to="/auth?mode=signup">Começar agora</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} BossBarber · Feito para barbeiros foda.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
