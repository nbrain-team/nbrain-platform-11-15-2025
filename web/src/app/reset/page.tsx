"use client";
import { useEffect, useState } from "react";

export default function ResetPasswordPage(){
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(()=>{
    const p = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : "");
    setToken(p.get('token') || "");
  },[]);

  async function submit(){
    setMsg("");
    if (!token) { setMsg("Invalid or missing token."); return; }
    if (!password || password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setMsg("Passwords do not match."); return; }
    setLoading(true);
    try{
      const r = await fetch(`${api}/public/reset-password`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ token, password }) }).then(r=>r.json());
      if (r && r.ok) {
        setMsg("Password updated. Redirecting to login…");
        setTimeout(()=>{ window.location.href = '/login'; }, 1200);
      } else {
        setMsg(r && r.error ? r.error : "Failed to reset password.");
      }
    }catch{
      setMsg("Failed to reset password.");
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 py-24">
      <div className="w-full rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hyah-logo.png" alt="Hyah! AI" className="mx-auto mb-6 h-12 w-auto" />
        <h1 className="text-center text-2xl font-semibold text-[var(--color-text)]">Reset your password</h1>
        {!token && (
          <p className="mt-2 text-center text-sm text-red-600">Invalid or missing token. Please use the link from your email.</p>
        )}
        <div className="mt-6 grid grid-cols-1 gap-3">
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            placeholder="New password"
          />
          <input
            type="password"
            value={confirm}
            onChange={e=>setConfirm(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2"
            placeholder="Confirm new password"
          />
          {msg && (
            <div className={`text-sm ${msg.toLowerCase().includes('updated') ? 'text-green-700' : 'text-red-600'}`}>{msg}</div>
          )}
          <button onClick={submit} disabled={loading || !token} className="btn-primary disabled:opacity-50">
            {loading ? 'Updating…' : 'Update Password'}
          </button>
          <div className="flex justify-end text-sm">
            <a className="text-[var(--color-primary)] underline" href="/login">Back to login</a>
          </div>
        </div>
      </div>
    </div>
  );
}


