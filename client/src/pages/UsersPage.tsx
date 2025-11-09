import { useEffect, useMemo, useState } from "react";
import type { UserRow } from "@/types";
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
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}
function RoleBadge({ role }: { role: UserRow["role"] }) {
  const cls =
    role === "ADMIN"
      ? "bg-amber-900/30 text-amber-300"
      : "bg-slate-800 text-slate-300";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] ${cls}`}
    >
      {role}
    </span>
  );
}

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

function PasswordModal({
  open,
  onClose,
  summary,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  summary: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: (adminPassword: string) => Promise<boolean>; // return true jika sukses
}) {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setPwd("");
      setErr("");
    }
  }, [open]);

  async function handleConfirm() {
    if (!pwd) {
      setErr("Admin password wajib diisi.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const ok = await onConfirm(pwd);
      if (ok) {
        onClose();
      } else {
        setErr("Admin password salah atau aksi ditolak.");
      }
    } catch {
      setErr("Gagal memproses permintaan.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <h3 className="text-base font-semibold">Konfirmasi Admin</h3>
            <button
              onClick={onClose}
              className="rounded-md border border-slate-700 bg-slate-800 p-1 hover:bg-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="text-slate-300 text-sm">{summary}</div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">
                Masukkan admin password untuk melanjutkan
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                type="password"
                placeholder="Admin password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                disabled={busy}
              />
            </div>
            {err && (
              <div className="text-xs text-rose-300 border border-rose-700/40 bg-rose-900/20 rounded-md px-3 py-2">
                {err}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
            <Button
              onClick={onClose}
              className="border border-slate-700 bg-slate-800 hover:bg-slate-700"
              disabled={busy}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className={`${
                danger
                  ? "border border-rose-700 bg-rose-800/60 hover:bg-rose-800"
                  : "border border-emerald-700 bg-emerald-800 hover:bg-emerald-700"
              }`}
              disabled={busy}
            >
              <Save className="h-4 w-4 mr-1" />
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CreatePayload = {
  email: string;
  name: string | null;
  password: string;
  role: "ADMIN" | "USER";
};
type UpdatePayload = {
  email?: string;
  name?: string | null;
  password?: string;
  role?: "ADMIN" | "USER";
};
type PendingAction =
  | { kind: "create"; payload: CreatePayload }
  | { kind: "update"; id: number; payload: UpdatePayload }
  | { kind: "delete"; id: number };

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAdd, setOpenAdd] = useState(false);
  const [newRow, setNewRow] = useState<{
    email: string;
    name?: string;
    password: string;
    role: "ADMIN" | "USER";
  }>({
    email: "",
    name: "",
    password: "",
    role: "USER",
  });

  const [openEdit, setOpenEdit] = useState(false);
  const [draft, setDraft] = useState<{
    id?: number;
    email?: string;
    name?: string;
    password?: string;
    role?: "ADMIN" | "USER";
  }>({});

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await jfetch<{ ok: boolean; rows: UserRow[] }>(
        "/api/users?limit=200"
      );
      setRows(r.ok ? r.rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function confirmCreate() {
    const payload: CreatePayload = {
      email: (newRow.email || "").trim(),
      name: (newRow.name || "").trim() || null,
      password: newRow.password || "",
      role: newRow.role,
    };
    setPending({ kind: "create", payload });
    setPwdOpen(true);
  }

  function confirmSave() {
    if (!draft.id) return;
    const payload: UpdatePayload = {
      email: (draft.email || "").trim(),
      name: (draft.name || "").trim() || null,
      ...(draft.password ? { password: draft.password } : {}),
      ...(draft.role ? { role: draft.role } : {}),
    };
    setPending({ kind: "update", id: draft.id, payload });
    setPwdOpen(true);
  }

  function confirmDelete(id: number) {
    setPending({ kind: "delete", id });
    setPwdOpen(true);
  }

  async function runPending(adminPassword: string): Promise<boolean> {
    if (!pending) return false;
    try {
      if (pending.kind === "create") {
        const body = JSON.stringify({
          ...pending.payload,
          adminPassword,
        });
        const r = await fetch("/api/users", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) {
          if (j?.error === "admin_password_invalid") {
            return false;
          }
          alert(`Gagal menambah user: ${j?.error ?? "unknown"}`);
          return false;
        }
        setOpenAdd(false);
        setNewRow({ email: "", name: "", password: "", role: "USER" });
        setPending(null);
        await load();
        return true;
      }

      if (pending.kind === "update") {
        const body = JSON.stringify({
          ...pending.payload,
          adminPassword,
        });
        const r = await fetch(`/api/users/${pending.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) {
          if (j?.error === "admin_password_invalid") {
            return false;
          }
          alert(`Gagal menyimpan user: ${j?.error ?? "unknown"}`);
          return false;
        }
        setOpenEdit(false);
        setDraft({});
        setPending(null);
        await load();
        return true;
      }

      if (pending.kind === "delete") {
        const r = await fetch(`/api/users/${pending.id}`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminPassword }),
        });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) {
          if (j?.error === "admin_password_invalid") {
            return false;
          }
          if (j?.error === "cannot_delete_self") {
            alert("Tidak boleh menghapus akun sendiri.");
            return false;
          }
          alert(`Gagal menghapus user: ${j?.error ?? "unknown"}`);
          return false;
        }
        setPending(null);
        await load();
        return true;
      }

      return false;
    } catch {
      alert("Gagal menghubungi server.");
      return false;
    }
  }

  const total = useMemo(() => rows.length, [rows]);

  function summaryText(): string {
    if (!pending) return "";
    if (pending.kind === "create") {
      return `Tambah user baru: ${pending.payload.email} (role ${pending.payload.role})`;
    }
    if (pending.kind === "update") {
      const u = rows.find((x) => x.id === pending.id);
      return `Simpan perubahan untuk: ${u?.email ?? `ID ${pending.id}`}`;
    }
    const u = rows.find((x) => x.id === pending.id);
    return `Hapus user: ${u?.email ?? `ID ${pending.id}`}`;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
            Add User
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

      <div className="text-sm text-slate-400">Total: {total} users</div>

      <Card className="overflow-hidden border border-slate-700 bg-slate-900">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-slate-800/60 text-slate-300">
            <tr>
              <Th w="240px">Email</Th>
              <Th w="200px">Name</Th>
              <Th w="120px">Role</Th>
              <Th w="200px">Created</Th>
              <Th w="200px">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-slate-400" colSpan={5}>
                  {loading ? "Loading..." : "Belum ada user"}
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-slate-800 hover:bg-slate-800/50"
                >
                  <Td>{u.email}</Td>
                  <Td>{u.name ?? "-"}</Td>
                  <Td>
                    <RoleBadge role={u.role} />
                  </Td>
                  <Td>{new Date(u.createdAt as any).toLocaleString()}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setDraft({
                            id: u.id,
                            email: u.email,
                            name: u.name ?? "",
                            password: "",
                            role: (u.role as any) || "USER",
                          });
                          setOpenEdit(true);
                        }}
                        className="inline-flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => confirmDelete(u.id)}
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
        title="Tambah User"
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
              onClick={confirmCreate}
              className="border border-emerald-700 bg-emerald-800 hover:bg-emerald-700"
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
            placeholder="Email"
            value={newRow.email}
            onChange={(e) =>
              setNewRow((s) => ({ ...s, email: e.target.value }))
            }
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Name (optional)"
            value={newRow.name || ""}
            onChange={(e) => setNewRow((s) => ({ ...s, name: e.target.value }))}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={newRow.password}
            onChange={(e) =>
              setNewRow((s) => ({ ...s, password: e.target.value }))
            }
          />
          <select
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            value={newRow.role}
            onChange={(e) =>
              setNewRow((s) => ({ ...s, role: e.target.value as any }))
            }
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title="Edit User"
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
              onClick={confirmSave}
              className="border border-emerald-700 bg-emerald-800 hover:bg-emerald-700"
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
            placeholder="Email"
            value={draft.email ?? ""}
            onChange={(e) => setDraft((s) => ({ ...s, email: e.target.value }))}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Name (optional)"
            value={draft.name ?? ""}
            onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
          />
          <input
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Password (biarkan kosong jika tidak diubah)"
            type="password"
            value={draft.password ?? ""}
            onChange={(e) =>
              setDraft((s) => ({ ...s, password: e.target.value }))
            }
          />
          <select
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            value={draft.role ?? "USER"}
            onChange={(e) =>
              setDraft((s) => ({ ...s, role: e.target.value as any }))
            }
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </Modal>

      {/* PASSWORD CONFIRM MODAL */}
      <PasswordModal
        open={pwdOpen}
        onClose={() => {
          setPwdOpen(false);
        }}
        summary={summaryText()}
        confirmLabel={
          pending?.kind === "delete"
            ? "Delete"
            : pending?.kind === "update"
            ? "Save"
            : "Create"
        }
        danger={pending?.kind === "delete"}
        onConfirm={runPending}
      />
    </section>
  );
}
