import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Scissors, Check, ChevronLeft } from "lucide-react";
import { format, addMinutes, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Barber = { id: string; shop_name: string; slug: string };
type Service = { id: string; name: string; price: number; duration_minutes: number };

const HOURS = Array.from({ length: 22 }, (_, i) => { // 09:00 to 19:30 in 30-min slots
  const h = 9 + Math.floor(i / 2);
  const m = (i % 2) * 30;
  return { h, m };
});

const Booking = () => {
  const { slug } = useParams();
  const [step, setStep] = useState(1);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<{ h: number; m: number } | null>(null);
  const [taken, setTaken] = useState<{ scheduled_at: string; duration_minutes: number }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: b } = await supabase.from("barbers").select("id,shop_name,slug").eq("slug", slug).maybeSingle();
      if (!b) return;
      setBarber(b);
      const { data: s } = await supabase.from("services").select("*").eq("barber_id", b.id).order("price");
      setServices(s || []);
    })();
  }, [slug]);

  useEffect(() => {
    if (!barber || !date) return;
    (async () => {
      const day = format(date, "yyyy-MM-dd");
      const { data } = await supabase.rpc("get_taken_slots", { _barber_id: barber.id, _day: day });
      setTaken(data || []);
    })();
  }, [barber, date]);

  const isSlotTaken = (h: number, m: number) => {
    if (!date || !service) return false;
    const slot = new Date(date); slot.setHours(h, m, 0, 0);
    const slotEnd = addMinutes(slot, service.duration_minutes);
    return taken.some(t => {
      const s = new Date(t.scheduled_at);
      const e = addMinutes(s, t.duration_minutes);
      return slot < e && slotEnd > s;
    });
  };

  const isPast = (h: number, m: number) => {
    if (!date) return false;
    const slot = new Date(date); slot.setHours(h, m, 0, 0);
    return slot < new Date();
  };

  const submit = async () => {
    if (!barber || !service || !date || !time) return;
    setSubmitting(true);
    const scheduled = new Date(date);
    scheduled.setHours(time.h, time.m, 0, 0);
    const { error } = await supabase.from("appointments").insert({
      barber_id: barber.id,
      service_id: service.id,
      client_name: name,
      client_phone: phone,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: service.duration_minutes,
      price: service.price,
      status: "confirmed",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setDone(true);
  };

  if (!barber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Carregando barbearia...
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center p-8 rounded-2xl border border-gold bg-card">
          <div className="inline-flex p-4 rounded-full gradient-gold mb-4"><Check className="h-8 w-8 text-primary-foreground" /></div>
          <h1 className="font-display text-3xl mb-2">Agendamento confirmado!</h1>
          <p className="text-muted-foreground mb-6">
            {service?.name} em {date && format(date, "dd 'de' MMMM", { locale: ptBR })} às{" "}
            {time && `${String(time.h).padStart(2,"0")}:${String(time.m).padStart(2,"0")}`}
          </p>
          <p className="text-sm text-muted-foreground">Te esperamos na <span className="text-gold">{barber.shop_name}</span>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur bg-background/80 sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-gold" />
            <span className="font-display text-xl truncate">{barber.shop_name}</span>
          </div>
          <span className="text-xs text-muted-foreground">Etapa {step}/3</span>
        </div>
      </header>

      <main className="container max-w-2xl py-8 space-y-6">
        {step > 1 && (
          <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
        )}

        {step === 1 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-gold mb-2">Passo 1</p>
            <h2 className="font-display text-3xl mb-6">Escolha o serviço</h2>
            <div className="space-y-3">
              {services.length === 0 && <p className="text-muted-foreground">Esta barbearia ainda não cadastrou serviços.</p>}
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setService(s); setStep(2); }}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl border bg-card transition-all hover:border-gold hover:shadow-gold",
                    service?.id === s.id ? "border-gold" : "border-border"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-display text-xl">{s.name}</h3>
                      <p className="text-sm text-muted-foreground">{s.duration_minutes} min</p>
                    </div>
                    <p className="text-xl font-semibold text-gold">R$ {Number(s.price).toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && service && (
          <div>
            <p className="text-xs uppercase tracking-widest text-gold mb-2">Passo 2</p>
            <h2 className="font-display text-3xl mb-6">Data e horário</h2>

            <div className="rounded-2xl border border-border bg-card p-2 inline-block mb-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { setDate(d); setTime(null); }}
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </div>

            <h3 className="font-display text-xl mb-3">Horários disponíveis</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
              {HOURS.map(({ h, m }) => {
                const disabled = isSlotTaken(h, m) || isPast(h, m);
                const selected = time && time.h === h && time.m === m;
                return (
                  <button
                    key={`${h}-${m}`}
                    disabled={disabled}
                    onClick={() => setTime({ h, m })}
                    className={cn(
                      "py-2 rounded-lg border text-sm font-medium transition-all",
                      disabled && "opacity-30 cursor-not-allowed line-through border-border",
                      !disabled && !selected && "border-border hover:border-gold hover:text-gold",
                      selected && "border-gold bg-primary/10 text-gold"
                    )}
                  >
                    {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}
                  </button>
                );
              })}
            </div>
            <Button variant="gold" size="lg" className="w-full" disabled={!time} onClick={() => setStep(3)}>Continuar</Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-gold mb-2">Passo 3</p>
            <h2 className="font-display text-3xl mb-6">Seus dados</h2>
            <div className="space-y-4 mb-6">
              <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" /></div>
              <div><Label>WhatsApp</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
            </div>
            <div className="p-5 rounded-2xl border border-gold bg-primary/5 mb-6">
              <p className="text-xs uppercase tracking-widest text-gold mb-2">Resumo</p>
              <p className="font-display text-xl">{service?.name}</p>
              <p className="text-sm text-muted-foreground">
                {date && format(date, "dd 'de' MMMM", { locale: ptBR })} · {time && `${String(time.h).padStart(2,"0")}:${String(time.m).padStart(2,"0")}`}
              </p>
              <p className="text-gold text-lg mt-2">R$ {service && Number(service.price).toFixed(2)}</p>
            </div>
            <Button variant="gold" size="lg" className="w-full" disabled={!name || !phone || submitting} onClick={submit}>
              {submitting ? "Confirmando..." : "Confirmar agendamento"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Booking;
