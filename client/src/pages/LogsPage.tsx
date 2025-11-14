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

  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [level, setLevel] = useState<"" | "INFO" | "WARN" | "ERROR">("");
  const [q, setQ] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [total, setTotal] = useState<number>(0);

  async function load(pageArg?: number, pageSizeArg?: number) {
    const targetPage = pageArg ?? page;
    const targetPageSize = pageSizeArg ?? pageSize;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("pageSize", String(targetPageSize));

      if (category) params.set("category", category);
      if (level) params.set("level", level);
      if (q.trim()) params.set("q", q.trim());

      const url = `/api/logs?${params.toString()}`;
      const r = await jfetch<{
        ok: boolean;
        rows: LogRow[];
        total?: number;
        page?: number;
        pageSize?: number;
      }>(url);

      if (r.ok) {
        setLogs(r.rows ?? []);
        setTotal(r.total ?? r.rows?.length ?? 0);
        setPage(r.page ?? targetPage);
        setPageSize(r.pageSize ?? targetPageSize);
      } else {
        setLogs([]);
        setTotal(0);
      }
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
    } catch {}
  }

  useEffect(() => {
    load(1, 50);
    loadCategories();
  }, []);

  useEffect(() => {
    load(1);
  }, [category, level]);

  const pageCount = useMemo(
    () => (total === 0 ? 1 : Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const currentPage = Math.min(page, pageCount);
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = total === 0 ? 0 : Math.min(startIndex + logs.length, total);

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
              if (e.key === "Enter") load(1);
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
            onClick={() => load(1)}
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
              setTimeout(() => load(1), 0);
            }}
            className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="text-sm text-slate-400">
        Total {total} log
        {category ? ` di kategori "${category}"` : ""}
        {level ? ` (level ${level})` : ""}.
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-800/60 text-slate-300">
            <tr>
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

        {/* bottom pagination bar */}
        <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing {total === 0 ? 0 : startIndex + 1} to {endIndex} of {total}{" "}
            results
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  setPage(1);
                  load(1, newSize);
                }}
                className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="rounded-md border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => {
                  if (currentPage > 1) {
                    setPage(1);
                    load(1);
                  }
                }}
                disabled={currentPage === 1 || total === 0}
              >
                {"<<"}
              </button>
              <button
                className="rounded-md border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => {
                  if (currentPage > 1) {
                    const newPage = currentPage - 1;
                    setPage(newPage);
                    load(newPage);
                  }
                }}
                disabled={currentPage === 1 || total === 0}
              >
                {"<"}
              </button>

              <span className="px-2">
                Page {total === 0 ? 0 : currentPage} of{" "}
                {total === 0 ? 0 : pageCount}
              </span>

              <button
                className="rounded-md border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => {
                  if (currentPage < pageCount) {
                    const newPage = currentPage + 1;
                    setPage(newPage);
                    load(newPage);
                  }
                }}
                disabled={currentPage === pageCount || total === 0}
              >
                {">"}
              </button>
              <button
                className="rounded-md border border-slate-700 px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => {
                  if (currentPage < pageCount) {
                    setPage(pageCount);
                    load(pageCount);
                  }
                }}
                disabled={currentPage === pageCount || total === 0}
              >
                {">>"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
