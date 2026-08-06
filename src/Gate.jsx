// src/Gate.jsx
//
// Wraps the jar in a real sign-in screen. Nothing renders — and more to the
// point, no data is readable — until Supabase hands back a valid session.
// Accounts are created by hand in the Supabase dashboard; there's no sign-up
// here on purpose, so no one can make themselves an account.

import React, { useState, useEffect } from "react";
import { supabase } from "./lib/storage";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;800&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=DM+Mono:wght@400;500&display=swap');

.gt {
  --paper: #EDEFE9; --pine: #123B36; --pine-soft: #4C6560;
  --coral: #F2617A; --line: rgba(18,59,54,0.16);
  background: var(--paper); color: var(--pine);
  font-family: 'DM Mono', ui-monospace, monospace;
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 28px 20px;
}
.gt * { box-sizing: border-box; }
.gt-card { width: 100%; max-width: 380px; }
.gt-eyebrow { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--pine-soft); margin: 0 0 10px; }
.gt-h1 { font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 800; font-size: clamp(34px, 8vw, 52px); line-height: .92; letter-spacing: -.03em; margin: 0; }
.gt-h1 em { font-style: normal; color: var(--coral); }
.gt-sub { font-family: 'Newsreader', Georgia, serif; font-size: 16px; color: var(--pine-soft); margin: 12px 0 0; line-height: 1.4; }
.gt-rule { height: 1px; background: var(--line); margin: 26px 0; border: 0; }
.gt-label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--pine-soft); display: block; margin-bottom: 8px; }
.gt-field { margin-bottom: 20px; }
.gt-input {
  width: 100%; font-family: 'DM Mono', monospace; font-size: 15px;
  background: transparent; border: 0; border-bottom: 1px solid var(--pine);
  padding: 8px 2px; color: var(--pine); border-radius: 0;
}
.gt-input::placeholder { color: rgba(18,59,54,.35); }
.gt-input:focus { outline: 2px solid var(--coral); outline-offset: 3px; }
.gt-pw { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--pine); }
.gt-pw:focus-within { outline: 2px solid var(--coral); outline-offset: 3px; }
.gt-pw .gt-input { border-bottom: 0; }
.gt-pw .gt-input:focus { outline: none; }
.gt-peek {
  background: none; border: 0; cursor: pointer; color: var(--pine-soft);
  font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .12em;
  text-transform: uppercase; padding: 4px 2px; white-space: nowrap;
}
.gt-peek:hover { color: var(--coral); }
.gt-btn {
  font-family: 'DM Mono', monospace; font-size: 13px; letter-spacing: .04em;
  background: var(--coral); color: #fff; border: 0; border-radius: 2px;
  padding: 13px 22px; cursor: pointer; width: 100%;
}
.gt-btn:hover { filter: brightness(1.06); }
.gt-btn[disabled] { opacity: .45; cursor: not-allowed; }
.gt-err { background: var(--coral); color: #fff; padding: 10px 14px; border-radius: 2px; font-size: 12px; margin-bottom: 18px; line-height: 1.5; }
.gt-note { font-size: 11px; color: var(--pine-soft); margin-top: 22px; line-height: 1.6; }

.gt-out {
  position: fixed; top: 14px; right: 14px; z-index: 50;
  font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .1em;
  text-transform: uppercase; background: rgba(237,239,233,.92);
  border: 1px solid rgba(18,59,54,.16); color: #4C6560;
  padding: 7px 12px; border-radius: 2px; cursor: pointer; backdrop-filter: blur(4px);
}
.gt-out:hover { color: #F2617A; border-color: #F2617A; }
`;

export default function Gate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [peek, setPeek] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "That email and password don't match an account."
          : err.message
      );
      setPassword("");
    }
    setBusy(false);
  };

  if (checking) {
    return (
      <div className="gt"><style>{css}</style>
        <p className="gt-eyebrow">Checking the lock…</p>
      </div>
    );
  }

  if (session) {
    return (
      <>
        <style>{css}</style>
        <button className="gt-out" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
        {children}
      </>
    );
  }

  return (
    <div className="gt"><style>{css}</style>
      <div className="gt-card">
        <p className="gt-eyebrow">Private jar</p>
        <h1 className="gt-h1">Self-,<br /><em>Pwn Jar</em></h1>
        <p className="gt-sub">Just the two of you. Sign in to see the jar.</p>
        <hr className="gt-rule" />

        {error && <div className="gt-err" role="alert">{error}</div>}

        <div className="gt-field">
          <label className="gt-label" htmlFor="gt-email">Email</label>
          <input id="gt-email" className="gt-input" type="email" value={email}
            autoComplete="username" placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") signIn(); }} />
        </div>

        <div className="gt-field">
          <label className="gt-label" htmlFor="gt-pw">Password</label>
          <div className="gt-pw">
            <input id="gt-pw" className="gt-input" value={password}
              type={peek ? "text" : "password"}
              autoComplete="current-password" placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") signIn(); }} />
            <button className="gt-peek" type="button"
              onClick={() => setPeek((p) => !p)}
              aria-label={peek ? "Hide password" : "Show password"}>
              {peek ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button className="gt-btn" onClick={signIn}
          disabled={busy || !email.trim() || !password}>
          {busy ? "Opening…" : "Unlock the jar"}
        </button>

        <p className="gt-note">
          Accounts are set up by hand — there's no sign-up here, so nobody else
          can make one.
        </p>
      </div>
    </div>
  );
}
