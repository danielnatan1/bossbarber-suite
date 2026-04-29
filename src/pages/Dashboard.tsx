import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Scissors, LogOut, Plus, Pencil, Trash2, DollarSign, Users, Calendar as CalIcon, Copy, ExternalLink, Clock, MessageCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Barber = {
  id: string;
  shop_name: string;
  slug: string;
  phone: string | null;
  whatsapp_number: string | null;
  work_days: number[];
  work_start: string;
  work_end: string;
};

const formatWhatsappMask = (value: string) => {
  // Keep digits only, max 15 (E.164)
  return value.replace(/\D/g, "").slice(0, 15);
};
type Service = { id: string; name: string; price: number; duration_minutes: number };
type Appt = { id: string; client_name: string; client_phone: string; scheduled_at: string; price: number; status: string; service_id: string | null };

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "completed", label: "Concluído" },
  { value: "no_show", label: "Não compareceu" },
  { value: "cancelled", label: "Cancelado" },
];

const statusStyle = (s: string) => {
  switch (s) {
    case "completed": return "border-emerald-500/50 bg-emerald-500/5";
    case "no_show": return "border-red-500/50 bg-red-500/5";
    case "confirmed": return "border-gold/60 bg-primary/5";
    case "cancelled": return "border-muted/40 bg-muted/5 opacity-60";
    default: return "border-border bg-card";
  }
};

const WEEK_DAYS = [
  { v: 0, l: "Dom" }, { v: 1, l: "Seg" }, { v: 2, l: "Ter" },
  { v: 3, l: "Qua" }, { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" },
];

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", duration_minutes: "30" });

  // Schedule config form
  const [schedForm, setSchedForm] = useState({ work_days: [1,2,3,4,5,6] as number[], work_start: "09:00", work_end: "19:00" });
  const [savingSched, setSavingSched] = useState(false);

  // Profile (WhatsApp)
  const [waPhone, setWaPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: b } = await supabase
        .from("barbers")
        .select("id,shop_name,slug,phone,whatsapp_number,work_days,work_start,work_end")
        .eq("user_id", user.id)
        .maybeSingle();
      if (b) {
        setBarber(b as Barber);
        setWaPhone((b as Barber).whatsapp_number || b.phone || "");
        setSchedForm({
          work_days: b.work_days || [1,2,3,4,5,6],
          work_start: (b.work_start || "09:00:00").slice(0,5),
          work_end: (b.work_end || "19:00:00").slice(0,5),
        });
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!barber) return;
    const loadServices = async () => {
      const { data } = await supabase.from("services").select("*").eq("barber_id", barber.id).order("created_at");
      setServices(data || []);
    };
    const loadAppts = async () => {
      const { data } = await supabase.from("appointments").select("*").eq("barber_id", barber.id).order("scheduled_at", { ascending: false });
      setAppts(data || []);
    };
    loadServices();
    loadAppts();

    const ch = supabase
      .channel("appts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `barber_id=eq.${barber.id}` }, () => loadAppts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [barber]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const todayAppts = appts.filter(a => { const d = new Date(a.scheduled_at); return d >= today && d < tomorrow && !["cancelled","no_show"].includes(a.status); });
  const revenue = todayAppts.filter(a => a.status === "completed").reduce((s, a) => s + Number(a.price), 0);
  const uniqueClients = new Set(todayAppts.map(a => a.client_phone)).size;

  const openNew = () => { setEditing(null); setForm({ name: "", price: "", duration_minutes: "30" }); setOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm({ name: s.name, price: String(s.price), duration_minutes: String(s.duration_minutes) }); setOpen(true); };

  const saveService = async () => {
    if (!barber) return;
    const payload = { name: form.name, price: Number(form.price), duration_minutes: Number(form.duration_minutes), barber_id: barber.id };
    const { error } = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Serviço atualizado" : "Serviço criado");
    setOpen(false);
    const { data } = await supabase.from("services").select("*").eq("barber_id", barber.id).order("created_at");
    setServices(data || []);
  };

  const deleteService = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setServices(services.filter(s => s.id !== id));
    toast.success("Serviço excluído");
  };

  const updateStatus = async (id: string, status: string) => {
    const prev = appts;
    setAppts(appts.map(a => a.id === id ? { ...a, status } : a));
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { setAppts(prev); toast.error(error.message); return; }
    toast.success("Status atualizado");
  };

  const toggleDay = (d: number) => {
    setSchedForm(f => ({
      ...f,
      work_days: f.work_days.includes(d) ? f.work_days.filter(x => x !== d) : [...f.work_days, d].sort(),
    }));
  };

  const saveSchedule = async () => {
    if (!barber) return;
    if (schedForm.work_start >= schedForm.work_end) return toast.error("Horário inicial deve ser menor que o final");
    if (schedForm.work_days.length === 0) return toast.error("Selecione pelo menos um dia");
    setSavingSched(true);
    const { error } = await supabase
      .from("barbers")
      .update({ work_days: schedForm.work_days, work_start: schedForm.work_start, work_end: schedForm.work_end })
      .eq("id", barber.id);
    setSavingSched(false);
    if (error) return toast.error(error.message);
    setBarber({ ...barber, ...schedForm });
    toast.success("Agenda atualizada");
  };

  const bookingUrl = barber ? `${window.location.origin}/agendar/${barber.slug}` : "";
  const copyLink = () => { navigator.clipboard.writeText(bookingUrl); toast.success("Link copiado!"); };

  const saveProfile = async () => {
    if (!barber) return;
    const digits = waPhone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Informe DDD + número (ex: 5511999999999)");
    if (digits.length > 15) return toast.error("Número muito longo");
    // Auto-prepend Brazil country code if missing
    const normalized = digits.length <= 11 ? `55${digits}` : digits;
    setSavingProfile(true);
    const { error } = await supabase
      .from("barbers")
      .update({ whatsapp_number: normalized, phone: normalized })
      .eq("id", barber.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    setBarber({ ...barber, whatsapp_number: normalized, phone: normalized });
    setWaPhone(normalized);
    toast.success("WhatsApp atualizado");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 backdrop-blur bg-background/80 sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-gold" />
            <span className="font-display text-xl">Boss<span className="text-gold">Barber</span></span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sair</Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold mb-1">Painel</p>
          <h1 className="font-display text-4xl">{barber?.shop_name || "Sua Barbearia"}</h1>
        </div>

        {barber && (
          <div className="p-5 rounded-2xl border border-gold bg-primary/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-gold mb-1">Seu link de agendamento</p>
              <p className="font-mono text-sm truncate">{bookingUrl}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={copyLink}><Copy className="h-4 w-4" /> Copiar</Button>
              <Button variant="gold" size="sm" asChild><a href={bookingUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir</a></Button>
            </div>
          </div>
        )}

        {barber && !barber.whatsapp_number && (
          <div className="p-4 rounded-2xl border border-yellow-500/50 bg-yellow-500/5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-yellow-500">Cadastre seu WhatsApp</p>
              <p className="text-muted-foreground">Os clientes precisam do seu número para confirmar agendamentos. Vá em <span className="text-gold">Configurações</span>.</p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: DollarSign, label: "Faturamento hoje (concluídos)", value: `R$ ${revenue.toFixed(2)}` },
            { icon: CalIcon, label: "Cortes hoje", value: todayAppts.length },
            { icon: Users, label: "Clientes únicos", value: uniqueClients },
          ].map((s, i) => (
            <div key={i} className="p-6 rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-gold" />
              </div>
              <p className="font-display text-3xl text-gradient-gold">{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="agenda" className="w-full">
          <TabsList>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="schedule"><Clock className="h-4 w-4" /> Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="mt-6">
            <div className="space-y-3">
              {appts.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                  Nenhum agendamento ainda. Compartilhe seu link!
                </div>
              )}
              {appts.map(a => {
                const svc = services.find(s => s.id === a.service_id);
                return (
                  <div key={a.id} className={cn("rounded-2xl border p-5 transition-colors", statusStyle(a.status))}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{a.client_name}</p>
                          {a.status === "pending" && (
                            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-yellow-500/50 text-yellow-500">
                              Aguardando WhatsApp
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{a.client_phone} {svc && <>· {svc.name}</>}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-display text-lg text-gold">{format(new Date(a.scheduled_at), "dd 'de' MMM · HH:mm", { locale: ptBR })}</p>
                        <p className="text-sm text-muted-foreground">R$ {Number(a.price).toFixed(2)}</p>
                      </div>
                      <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                        <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button variant="gold" onClick={openNew}><Plus className="h-4 w-4" /> Novo serviço</Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Crie seu primeiro serviço.</p>}
              {services.map(s => (
                <div key={s.id} className="p-5 rounded-2xl border border-border bg-card hover:border-gold transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-display text-xl">{s.name}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteService(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <p className="text-2xl text-gold font-semibold">R$ {Number(s.price).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.duration_minutes} min</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-6 space-y-6">
            <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-gold mb-1">Perfil</p>
                <h2 className="font-display text-2xl flex items-center gap-2"><MessageCircle className="h-6 w-6 text-gold" /> Seu WhatsApp</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Este é o número que receberá as mensagens de confirmação dos clientes.
                </p>
              </div>
              <div>
                <Label>WhatsApp para Agendamentos</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={waPhone}
                  onChange={e => setWaPhone(formatWhatsappMask(e.target.value))}
                  placeholder="16994152450"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Digite apenas números com DDD (ex: <span className="font-mono">16994152450</span>). O prefixo <span className="font-mono">55</span> (Brasil) é adicionado automaticamente.
                </p>
              </div>
              <Button variant="gold" size="lg" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Salvando..." : "Salvar WhatsApp"}
              </Button>
            </div>

            <div className="max-w-2xl rounded-2xl border border-border bg-card p-6 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-gold mb-1">Configurações de agenda</p>
                <h2 className="font-display text-2xl">Quando você atende?</h2>
                <p className="text-sm text-muted-foreground mt-1">Os clientes só poderão agendar dentro destes horários.</p>
              </div>

              <div>
                <Label className="mb-3 block">Dias da semana</Label>
                <div className="grid grid-cols-7 gap-2">
                  {WEEK_DAYS.map(d => {
                    const active = schedForm.work_days.includes(d.v);
                    return (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() => toggleDay(d.v)}
                        className={cn(
                          "py-3 rounded-lg border text-sm font-medium transition-all",
                          active ? "border-gold bg-primary/10 text-gold" : "border-border text-muted-foreground hover:border-gold/50"
                        )}
                      >
                        {d.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início</Label>
                  <Input type="time" value={schedForm.work_start} onChange={e => setSchedForm({ ...schedForm, work_start: e.target.value })} />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input type="time" value={schedForm.work_end} onChange={e => setSchedForm({ ...schedForm, work_end: e.target.value })} />
                </div>
              </div>

              <Button variant="gold" size="lg" onClick={saveSchedule} disabled={savingSched}>
                {savingSched ? "Salvando..." : "Salvar agenda"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Corte masculino" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} /></div>
              <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="gold" onClick={saveService}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
