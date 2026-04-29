import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Scissors, Check, ChevronLeft, MessageCircle, AlertCircle } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";

type Barber = { id: string; shop_name: string; slug: string; phone: string | null; whatsapp_number: string | null; work_days: number[]; work_start: string; work_end: string };
type Service = { id: string; name: string; price: number; duration_minutes: number };

const phoneSchema = z.string()
  .trim()
  .min(8, "WhatsApp inválido")
  .max(20, "WhatsApp muito longo")
  .regex(/^[\d\s()+\-]+$/, "Use apenas números e ( ) + -")
  .refine(v => v.replace(/\D/g, "").length >= 10, "Informe DDD + número");

const nameSchema = z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo");

const buildSlots = (start: string, end: string) => {
  // start/end as "HH:MM" or "HH:MM:SS"
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const slots: { h: number; m: number }[] = [];
  for (let t = startMin; t + 30 <= endMin; t += 30) {
    slots.push({ h: Math.floor(t / 60), m: t % 60 });
  }
  return slots;
};

const Booking = () => {
  const { slug } = useParams();
  const [step, setStep] = useState(1);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<{ h: number; m: number } | null>(null);
  const [taken, setTaken] = useState<{ scheduled_at: string; duration_minutes: number }[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingApptId, setPendingApptId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: b } = await supabase
        .from("barbers")
        .select("id,shop_name,slug,phone,whatsapp_number,work_days,work_start,work_end")
        .eq("slug", slug)
        .maybeSingle();
      if (!b) return;
      setBarber(b as Barber);
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

  const slots = useMemo(() => barber ? buildSlots(barber.work_start, barber.work_end) : [], [barber]);

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

  const slotFitsInWorkday = (h: number, m: number) => {
    if (!barber || !service) return true;
    const [eh, em] = barber.work_end.split(":").map(Number);
    const endLimit = eh * 60 + em;
    return (h * 60 + m + service.duration_minutes) <= endLimit;
  };

  const submit = async () => {
    if (!barber || !service || !date || !time) return;
    const nameRes = nameSchema.safeParse(name);
    const phoneRes = phoneSchema.safeParse(phone);
    const newErrors: typeof errors = {};
    if (!nameRes.success) newErrors.name = nameRes.error.issues[0].message;
    if (!phoneRes.success) newErrors.phone = phoneRes.error.issues[0].message;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    const scheduled = new Date(date);
    scheduled.setHours(time.h, time.m, 0, 0);
    const appointmentId = crypto.randomUUID();
    const { error } = await supabase.from("appointments").insert({
      id: appointmentId,
      barber_id: barber.id,
      service_id: service.id,
      client_name: name.trim(),
      client_phone: phone.trim(),
      scheduled_at: scheduled.toISOString(),
      duration_minutes: service.duration_minutes,
      price: service.price,
      status: "pending",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message || "Erro ao agendar");
    setPendingApptId(appointmentId);
  };

  const finalizeWhatsApp = async () => {
    if (!pendingApptId || !barber || !service || !date || !time) return;
    if (!barber.phone || barber.phone.replace(/\D/g, "").length < 10) {
      toast.error("Esta barbearia ainda não cadastrou um WhatsApp para receber confirmações.");
      return;
    }
    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", pendingApptId);
    if (error) { toast.error(error.message); return; }

    const dateStr = format(date, "dd/MM/yyyy");
    const timeStr = `${String(time.h).padStart(2,"0")}:${String(time.m).padStart(2,"0")}`;
    const msg =
      `Olá! Gostaria de confirmar meu agendamento de *${service.name}* ` +
      `para o dia *${dateStr}* às *${timeStr}*.\n\n` +
      `Nome: ${name}\n` +
      `WhatsApp: ${phone}\n` +
      `Valor: R$ ${Number(service.price).toFixed(2)}`;

    // Sanitiza: apenas dígitos, e garante código do país (Brasil = 55) quando ausente
    let target = barber.phone.replace(/\D/g, "");
    if (target.startsWith("0")) target = target.replace(/^0+/, "");
    if (target.length <= 11) target = `55${target}`;

    const url = `https://wa.me/${target}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setConfirmed(true);
  };

  if (!barber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Carregando barbearia...
      </div>
    );
  }

  if (confirmed) {
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

  // "Quase lá" screen
  if (pendingApptId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full p-8 rounded-2xl border border-gold bg-card text-center">
          <div className="inline-flex p-4 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-xs uppercase tracking-widest text-gold mb-2">Quase lá!</p>
          <h1 className="font-display text-3xl mb-3">Falta um passo</h1>
          <p className="text-muted-foreground mb-6">
            Para confirmar de verdade seu horário, envie a mensagem para o barbeiro pelo WhatsApp.
            Sem isso, o agendamento <span className="text-yellow-500">não será confirmado</span>.
          </p>

          <div className="p-4 rounded-xl border border-border bg-background/50 mb-6 text-left">
            <p className="font-display text-lg">{service?.name}</p>
            <p className="text-sm text-muted-foreground">
              {date && format(date, "dd 'de' MMMM", { locale: ptBR })} ·{" "}
              {time && `${String(time.h).padStart(2,"0")}:${String(time.m).padStart(2,"0")}`}
            </p>
            <p className="text-gold mt-1">R$ {service && Number(service.price).toFixed(2)}</p>
          </div>

          <Button variant="gold" size="xl" className="w-full" onClick={finalizeWhatsApp}>
            <MessageCircle className="h-5 w-5" /> Finalizar via WhatsApp
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Ao clicar, abriremos o WhatsApp com a mensagem pronta para o barbeiro.
          </p>
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
                disabled={(d) => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  if (d < today) return true;
                  return !barber.work_days.includes(d.getDay());
                }}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </div>

            {date ? (
              <>
                <h3 className="font-display text-xl mb-3">Horários disponíveis</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-6">
                  {slots.map(({ h, m }) => {
                    const disabled = isSlotTaken(h, m) || isPast(h, m) || !slotFitsInWorkday(h, m);
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
              </>
            ) : (
              <p className="text-muted-foreground mb-6">Selecione um dia no calendário.</p>
            )}
            <Button variant="gold" size="lg" className="w-full" disabled={!time} onClick={() => setStep(3)}>Continuar</Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-xs uppercase tracking-widest text-gold mb-2">Passo 3</p>
            <h2 className="font-display text-3xl mb-6">Seus dados</h2>
            <div className="space-y-4 mb-6">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" maxLength={80} />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" maxLength={20} />
                {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
              </div>
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
              {submitting ? "Enviando..." : "Confirmar agendamento"}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              No próximo passo você finalizará pelo WhatsApp.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Booking;
