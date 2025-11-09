import { useEffect, useMemo, useState } from "react";
import type { ContactRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit3, Save, X, Plus, RefreshCw, Trash2 } from "lucide-react";

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

/** ===== Modal ringan tanpa dependensi eksternal ===== */
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // close dengan ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <h3 className="text-base font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-md border border-slate-700 bg-slate-800 p-1 hover:bg-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/** =================================================== */

export default function ContactsPage() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Add
  const [openAdd, setOpenAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<ContactRow>>({
    phone: "",
    name: "",
    allowed: true,
  });

  // Modal Edit
  const [openEdit, setOpenEdit] = useState(false);
  const [draft, setDraft] = useState<Partial<ContactRow>>({});

  async function load() {
    setLoading(true);
    try {
      const r = await jfetch<{ ok: boolean; rows: ContactRow[] }>(
        "/api/contacts?limit=200"
      );
      setRows(r.ok ? r.rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const body = JSON.stringify({
      phone: (newRow.phone || "").trim(),
      name: (newRow.name || "").trim() || null,
      allowed: !!newRow.allowed,
    });
    await jfetch("/api/contacts", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });
    setOpenAdd(false);
    setNewRow({ phone: "", name: "", allowed: true });
    load();
  }

  function startEdit(c: ContactRow) {
    setDraft({
      id: c.id,
      phone: c.phone,
      name: c.name ?? "",
      allowed: c.allowed,
    });
    setOpenEdit(true);
  }

  async function save() {
    if (!draft?.id) return;
    const body = JSON.stringify({
      phone: (draft.phone || "").trim(),
      name: (draft.name || "").trim() || null,
      allowed: !!draft.allowed,
    });
    await jfetch(`/api/contacts/${draft.id}`, {
      method: "PUT",
      body,
      headers: { "Content-Type": "application/json" },
    });
    setOpenEdit(false);
    setDraft({});
    load();
  }

  async function del(id: number) {
    if (!confirm("Hapus contact ini? Tindakan tidak bisa dibatalkan.")) return;
    await jfetch(`/api/contacts/${id}`, { method: "DELETE" });
    load();
  }

  const total = useMemo(() => rows.length, [rows]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contacts</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
          <Button
            onClick={load}
            className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="text-sm text-slate-400">Total: {total} contacts</div>

      <Card className="overflow-hidden border border-slate-700 bg-slate-900">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-800/60 text-slate-300">
            <tr>
              <Th w="160px">Phone</Th>
              <Th w="220px">Name</Th>
              <Th w="120px">Allowed</Th>
              <Th w="200px">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={4}>
                  {loading ? "Loading..." : "Belum ada contact"}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-slate-800 hover:bg-slate-800/50"
                >
                  <Td mono>{c.phone}</Td>
                  <Td>{c.name ?? "-"}</Td>
                  <Td>{c.allowed ? <Badge on /> : <Badge on={false} />}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startEdit(c)}
                        className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => del(c.id)}
                        className="inline-flex items-center gap-2 border border-rose-700 bg-rose-800/60 hover:bg-rose-800"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* ADD MODAL */}
      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Tambah Contact"
        footer={
          <>
            <Button
              onClick={() => setOpenAdd(false)}
              className="border border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={create}
              disabled={!String(newRow.phone || "").trim()}
              className="border border-emerald-700 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Phone (628...)"
            value={newRow.phone || ""}
            onChange={(e) =>
              setNewRow((s) => ({ ...s, phone: e.target.value }))
            }
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Name (optional)"
            value={newRow.name || ""}
            onChange={(e) => setNewRow((s) => ({ ...s, name: e.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newRow.allowed}
              onChange={(e) =>
                setNewRow((s) => ({ ...s, allowed: e.target.checked }))
              }
            />
            Allowed
          </label>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title="Edit Contact"
        footer={
          <>
            <Button
              onClick={() => setOpenEdit(false)}
              className="border border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!String(draft.phone || "").trim()}
              className="border border-emerald-700 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Phone (628...)"
            value={draft.phone ?? ""}
            onChange={(e) => setDraft((s) => ({ ...s, phone: e.target.value }))}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Name (optional)"
            value={draft.name ?? ""}
            onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!draft.allowed}
              onChange={(e) =>
                setDraft((s) => ({ ...s, allowed: e.target.checked }))
              }
            />
            Allowed
          </label>
        </div>
      </Modal>
    </section>
  );
}
