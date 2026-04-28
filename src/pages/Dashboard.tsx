import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Scissors, LogOut, Plus, Pencil, Trash2, DollarSign, Users, Calendar as CalIcon, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Barber = { id: string; shop_name: string; slug: string };
type Service = { id: string; name: string; price: number; duration_minutes: number };
type Appt = { id: string; client_name: string; client_phone: string; scheduled_at: string; price: number; status: string; service_id: string | null };

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", duration_minutes: "30" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: b } = await supabase.from("barbers").select("id,shop_name,slug").eq("user_id", user.id).maybeSingle();
      if (b) setBarber(b);
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
  const todayAppts = appts.filter(a => { const d = new Date(a.scheduled_at); return d >= today && d < tomorrow && a.status !== "cancelled"; });
  const revenue = todayAppts.reduce((s, a) => s + Number(a.price), 0);
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

  const bookingUrl = barber ? `${window.location.origin}/agendar/${barber.slug}` : "";
  const copyLink = () => { navigator.clipboard.writeText(bookingUrl); toast.success("Link copiado!"); };

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

        {/* Booking link card */}
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

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: DollarSign, label: "Faturamento hoje", value: `R$ ${revenue.toFixed(2)}` },
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
          </TabsList>

          <TabsContent value="agenda" className="mt-6">
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {appts.length === 0 && <p className="p-8 text-center text-muted-foreground">Nenhum agendamento ainda. Compartilhe seu link!</p>}
              {appts.map(a => {
                const svc = services.find(s => s.id === a.service_id);
                return (
                  <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{a.client_name}</p>
                      <p className="text-sm text-muted-foreground">{a.client_phone} {svc && <>· {svc.name}</>}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-display text-lg text-gold">{format(new Date(a.scheduled_at), "dd 'de' MMM · HH:mm", { locale: ptBR })}</p>
                      <p className="text-sm text-muted-foreground">R$ {Number(a.price).toFixed(2)}</p>
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
