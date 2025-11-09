// import { useState } from "react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Home, List, Users, UserCircle2 } from "lucide-react";

export default function RootLayout() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "USER" | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include" });
        if (!r.ok) throw new Error();
        const data = await r.json();
        const current = (data?.user?.role ?? null) as "ADMIN" | "USER" | null;
        if (alive) setRole(current);
      } catch {
        if (alive) setRole(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function doLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      nav("/login");
    } finally {
      setBusy(false);
    }
  }

  const LinkBtn = ({
    to,
    label,
    icon,
  }: {
    to: string;
    label: string;
    icon: ReactNode;
  }) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition
         ${
           isActive
             ? "border-emerald-600/70 bg-emerald-900/30 text-emerald-200"
             : "border-slate-700 text-slate-200 hover:bg-slate-800"
         }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <nav className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold">
              E
            </span>
            <span className="font-semibold">ESP-WA Dashboard</span>
          </div>
          <div className="flex items-center gap-1">
            <LinkBtn
              to="/subscribes"
              label="Home"
              icon={<Home className="h-4 w-4" />}
            />
            <LinkBtn
              to="/logs"
              label="Logs"
              icon={<List className="h-4 w-4" />}
            />
            {role === "ADMIN" && (
              <>
                <LinkBtn
                  to="/contacts"
                  label="Contacts"
                  icon={<Users className="h-4 w-4" />}
                />
                <LinkBtn
                  to="/users"
                  label="Users"
                  icon={<UserCircle2 className="h-4 w-4" />}
                />
              </>
            )}

            <Button
              onClick={doLogout}
              variant="secondary"
              disabled={busy}
              className="ml-2 inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
