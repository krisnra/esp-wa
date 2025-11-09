import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Lock,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cooldown > 0) return;

    setMsg(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json().catch(() => ({} as any));

      if (!r.ok || !j?.ok) {
        const next = attempts + 1;
        setAttempts(next);

        if (next >= MAX_ATTEMPTS) {
          setCooldown(COOLDOWN_SECONDS);
          setMsg({
            type: "error",
            text: `Terlalu banyak percobaan. Coba lagi dalam ${COOLDOWN_SECONDS}s.`,
          });
        } else {
          setMsg({ type: "error", text: "Email atau password salah." });
        }
        return;
      }

      setMsg({ type: "success", text: "Login berhasil! Mengalihkan..." });
      setTimeout(() => (window.location.href = "/"), 500);
    } catch {
      setMsg({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || cooldown > 0;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-slate-800/60 bg-slate-900/40 backdrop-blur">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="text-sm">ESP-WA System</span>
          </div>
          <CardTitle className="text-xl">Login ESP-WA</CardTitle>
          <p className="text-sm text-slate-400">
            Gunakan akun yang telah terdaftar.
          </p>
        </CardHeader>

        <form onSubmit={submit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@mail.com"
                  className="pl-9"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-200 focus:outline-none"
                  aria-label={
                    showPw ? "Sembunyikan password" : "Tampilkan password"
                  }
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {msg && (
              <Alert
                variant={msg.type === "error" ? "destructive" : "default"}
                className="py-2"
              >
                <AlertDescription className="flex items-start gap-2">
                  {msg.type === "error" && (
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                  )}
                  {msg.text}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" disabled={disabled} className="w-full mt-3">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses…
                </span>
              ) : cooldown > 0 ? (
                `Tunggu ${cooldown}s`
              ) : (
                "Masuk"
              )}
            </Button>

            {attempts > 0 && attempts < MAX_ATTEMPTS && cooldown === 0 && (
              <p className="text-xs text-slate-400 text-center">
                Percobaan: {attempts}/{MAX_ATTEMPTS}
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
