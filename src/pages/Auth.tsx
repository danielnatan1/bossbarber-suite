import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scissors } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const Auth = () => {
  const [params] = useSearchParams();
  const initial = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initial as any);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate("/dashboard"); }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { shop_name: shopName, phone },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo ao BossBarber.");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate("/dashboard");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao autenticar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 gradient-radial pointer-events-none" />
      <Link to="/" className="container flex items-center gap-2 pt-8 relative z-10">
        <Scissors className="h-5 w-5 text-gold" />
        <span className="font-display text-xl">Boss<span className="text-gold">Barber</span></span>
      </Link>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-elegant">
          <h1 className="font-display text-3xl mb-1">{mode === "login" ? "Entrar" : "Cadastrar barbearia"}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "login" ? "Acesse seu painel" : "Comece grátis em segundos"}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label>Nome da barbearia</Label>
                  <Input required value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Ex: Barbearia do João" />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
              </>
            )}
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-gold hover:underline">
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
