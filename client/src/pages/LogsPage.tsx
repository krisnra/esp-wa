import { useEffect, useMemo, useState } from "react";
import type { LogRow } from "@/types";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

async function jfetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: "include", ...init });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}

function Th({ children, w }: { children: React.ReactNode; w?: string }) {
  return (
    <th
      className="px-3 py-2 text-left font-semibold"
      style={w ? { width: w } : undefined}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  mono,
  className = "",
}: {
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2 align-top ${mono ? "font-mono" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  // filter opsional
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [level, setLevel] = useState<"" | "INFO" | "WARN" | "ERROR">("");
  const [q, setQ] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200"); // tetap batasi 200 terbaru dari server
      if (category) params.set("category", category);
      if (level) params.set("level", level);
      if (q.trim()) params.set("q", q.trim());

      const url = `/api/logs?${params.toString()}`;
      const r = await jfetch<{ ok: boolean; rows: LogRow[] }>(url);
      setLogs(r.ok ? r.rows : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const r = await jfetch<{ ok: boolean; categories: string[] }>(
        "/api/logs/categories"
      );
      if (r.ok) setCategories(r.categories);
    } catch {
      // kalau endpoint categories belum ada, UI tetap jalan
    }
  }

  useEffect(() => {
    load();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-reload saat kategori/level berubah
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, level]);

  const total = useMemo(() => logs.length, [logs]);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Tabel Log</h2>

        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Cari (q) di category/message…"
            className="w-64 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
            title="Filter kategori (opsional)"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm"
            title="Filter level (opsional)"
          >
            <option value="">Semua level</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>

          <Button
            onClick={load}
            className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
            disabled={loading}
            title="Terapkan filter"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => {
              setQ("");
              setCategory("");
              setLevel("");
              setTimeout(() => load(), 0);
            }}
            className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="text-sm text-slate-400">
        Menampilkan {total} log terakhir
        {category ? ` di kategori "${category}"` : ""}
        {level ? ` (level ${level})` : ""}.
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-800/60 text-slate-300">
            <tr>
              <Th w="90px">ID</Th>
              <Th w="180px">Timestamp</Th>
              <Th w="160px">Category</Th>
              <Th w="100px">Level</Th>
              <Th>Message</Th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={5}>
                  {loading ? "Loading..." : "Belum ada data"}
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-800 hover:bg-slate-800/50"
                >
                  <Td mono>{row.id}</Td>
                  <Td>{new Date(row.ts as any).toLocaleString()}</Td>
                  <Td>{row.category}</Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${
                        row.level === "ERROR"
                          ? "bg-rose-900/30 text-rose-300"
                          : row.level === "WARN"
                          ? "bg-amber-900/30 text-amber-300"
                          : "bg-emerald-900/30 text-emerald-300"
                      }`}
                    >
                      {row.level}
                    </span>
                  </Td>
                  <Td className="truncate">{row.message ?? "-"}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
