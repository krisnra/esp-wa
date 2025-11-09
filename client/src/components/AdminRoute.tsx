// src/components/AdminRoute.tsx
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

type MeResponse = {
  ok?: boolean;
  user?: { id: number; email: string; role?: "ADMIN" | "USER" | (string & {}) };
};

export default function AdminRoute({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include" });
        if (!r.ok) throw new Error();
        const data = (await r.json()) as MeResponse;
        const role = (data?.user?.role ?? "USER") as string;
        if (alive) {
          setLoggedIn(!!data?.ok);
          setIsAdmin(role === "ADMIN");
        }
      } catch {
        if (alive) {
          setLoggedIn(false);
          setIsAdmin(false);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="p-6 text-slate-200">Loading…</div>;
  if (!loggedIn) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
