"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientSignupDialog } from "@/components/ClientSignupDialog";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signupOpen, setSignupOpen] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string>("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Login failed");
      // Store JWT token so subsequent requests are authenticated
      if (data.token) {
        try {
          localStorage.setItem("xsourcing_token", data.token as string);
          // Non-HttpOnly demo cookie so you can see it in browser storage
          document.cookie = `xsourcing_token=${data.token}; Max-Age=${7 * 24 * 60 * 60}; Path=/; SameSite=Lax;`;
        } catch (_) { /* ignore */ }
      }
      const role = data.user.role as string;
      if (role === "admin") window.location.href = "/admin";
      else if (role === "advisor") window.location.href = "/advisor";
      else window.location.href = "/dashboard";
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("An unexpected error occurred.");
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 py-24">
      <div className="w-full rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hyah-logo.png" alt="Hyah! AI" className="mx-auto mb-6 h-12 w-auto" />
        <h1 className="text-center text-2xl font-semibold text-[var(--color-text)]">Sign in</h1>
        <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">Use admin/admin, advisor/advisor, or client/client.</p>
        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-3">
          <input className="rounded-md border border-[var(--color-border)] px-3 py-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="rounded-md border border-[var(--color-border)] px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="btn-primary">Continue</button>
        </form>
        <div className="mt-3 flex items-center justify-between text-sm">
          <button className="text-[var(--color-primary)] underline" onClick={()=>{ setForgotMsg(""); setForgotEmail(""); setForgotOpen(true) }}>Forgot Password?</button>
          <button className="text-[var(--color-primary)] underline" onClick={()=>setSignupOpen(true)}>Need an account? Click here</button>
        </div>
      </div>

      {/* Forgot Password modal */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-[var(--color-text-muted)]">Enter your account email. We’ll send a reset link when email is configured.</p>
            <input className="w-full rounded-md border border-[var(--color-border)] px-3 py-2" type="email" placeholder="you@company.com" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} />
            <div className="flex items-center gap-2">
              <button className="btn-primary" onClick={async()=>{
                setForgotMsg("")
                const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/public/forgot-password`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email: forgotEmail }) }).then(r=>r.json()).catch(()=>null)
                if (r && r.ok) setForgotMsg('If that email exists, we\'ll send reset instructions shortly.')
                else setForgotMsg(r?.error || 'Request failed. Please try again later.')
              }}>Send reset link</button>
              {forgotMsg && <span className="text-xs text-[var(--color-text-muted)]">{forgotMsg}</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Signup modal */}
      <ClientSignupDialog open={signupOpen} onOpenChange={setSignupOpen} />
    </div>
  );
}


