import { useState } from "react";
import "./Login.css";

export default function Login() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setMsg("? Email atau password salah.");
      } else {
        setMsg("? Login berhasil!");
        setTimeout(() => (window.location.href = "/"), 500);
      }
    } catch (err) {
      setMsg("?? Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={submit}>
        <h2>Masuk ke Dashboard</h2>

        <div className="form-group">
          <label>Email</label>
          <input name="email" type="email" placeholder="Email" required />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
          />
        </div>

        <button disabled={loading}>{loading ? "..." : "Masuk"}</button>
        {msg && <div className="message">{msg}</div>}
      </form>
    </div>
  );
}
