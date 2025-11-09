import { useEffect, useMemo, useState } from "react";
import type { SubscriberFlat, SubRow } from "@/types";
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
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 align-top ${mono ? "font-mono" : ""}`}>
      {children}
    </td>
  );
}
function Badge({ on }: { on?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${
        on
          ? "bg-emerald-900/30 text-emerald-300"
          : "bg-slate-800 text-slate-300"
      }`}
    >
      {on ? "Enabled" : "Disabled"}
    </span>
  );
}

export default function SubsPage() {
  const [subsFlat, setSubsFlat] = useState<SubscriberFlat[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await jfetch<{ ok: boolean; rows: SubscriberFlat[] }>(
        "/api/subscribes"
      );
      setSubsFlat(r.ok ? r.rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const subsGrouped: SubRow[] = useMemo(() => {
    const map = new Map<string, SubRow>();
    for (const s of subsFlat) {
      if (!map.has(s.phone)) {
        map.set(s.phone, {
          phone: s.phone,
          name: s.name ?? "",
          alarm: false,
          brankas: false,
        });
      }
      const row = map.get(s.phone)!;
      if (s.topic === "ALARM") row.alarm = s.enabled;
      if (s.topic === "BRANKAS") row.brankas = s.enabled;
    }
    return Array.from(map.values()).sort((a, b) =>
      a.phone.localeCompare(b.phone)
    );
  }, [subsFlat]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Subscribers Aktif</h2>
        <Button
          onClick={load}
          className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-800/60 text-slate-300">
            <tr>
              <Th w="160px">Phone</Th>
              <Th w="220px">Name</Th>
              <Th w="140px">ALARM</Th>
              <Th w="140px">BRANKAS</Th>
            </tr>
          </thead>
          <tbody>
            {subsGrouped.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={4}>
                  {loading ? "Loading..." : "Belum ada subscriber aktif"}
                </td>
              </tr>
            ) : (
              subsGrouped.map((s) => (
                <tr
                  key={s.phone}
                  className="border-t border-slate-800 hover:bg-slate-800/50"
                >
                  <Td mono>{s.phone}</Td>
                  <Td>{s.name || "-"}</Td>
                  <Td>
                    <Badge on={s.alarm} />
                  </Td>
                  <Td>
                    <Badge on={s.brankas} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
