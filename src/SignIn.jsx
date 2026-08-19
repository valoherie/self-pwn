// src/SignIn.jsx
//
// Google is the front door. The code route is the shortcut for someone who
// already has a jar code and doesn't want an account — it opens an anonymous
// Supabase session, which still carries a real auth.uid(), so every RLS policy
// keeps working. Email is kept as a quiet fallback.

import React, { useState } from 'react'
import { signInWithGoogle, signInWithEmail, signInAnonymously } from './lib/api'

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  )
}

export default function SignIn() {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [emailMode, setEmailMode] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim())

  const wrap = (key, fn) => async () => {
    setBusy(key); setError('')
    try { await fn() }
    catch (err) {
      const label = { google: 'Google sign-in', code: 'Anonymous sign-in', email: 'Email sign-in' }[key]
      setError(
        err.message?.match(/disabled|not enabled|provider/i)
          ? `${label} is turned off in Supabase — enable it under Authentication → Sign In / Providers.`
          : err.message || "That didn't work. Try again."
      )
      setBusy('')
    }
  }

  const google = wrap('google', signInWithGoogle)
  const code = wrap('code', signInAnonymously)
  const link = wrap('email', async () => {
    await signInWithEmail(email)
    setSent(true)
    setBusy('')
  })

  if (sent) {
    return (
      <div className="sj"><div className="sj-narrow">
        <p className="sj-eyebrow">Check your inbox</p>
        <h1 className="sj-h1">Link<br /><em>sent.</em></h1>
        <p className="sj-sub">
          We emailed <b>{email.trim()}</b> a link that signs you straight in.
          It lasts an hour and works once.
        </p>
        <hr className="sj-rule" />
        <button className="sj-btn ghost wide" onClick={() => { setSent(false); setError('') }}>
          Back
        </button>
      </div></div>
    )
  }

  return (
    <div className="sj"><div className="sj-narrow">
      <h1 className="sj-h1">Kindness<br /><em> Jar</em></h1>
      <p className="sj-sub">
        A jar for the unkind things — the ones aimed at yourself, and the ones
        aimed at each other.
      </p>
      <hr className="sj-rule" />

      {error && <div className="sj-err" role="alert">{error}</div>}

      <button className="sj-google" onClick={google} disabled={Boolean(busy)}>
        <GoogleMark />
        {busy === 'google' ? 'Taking you to Google…' : 'Continue with Google'}
      </button>
      <p className="sj-note" style={{ marginTop: 10 }}>
        Your jars follow your account onto any device.
      </p>

      <div className="sj-or"><span>or</span></div>

      <button className="sj-btn ghost wide" onClick={code} disabled={Boolean(busy)}>
        {busy === 'code' ? 'One moment…' : 'I already have a jar code'}
      </button>
      <p className="sj-note" style={{ marginTop: 10 }}>
        No account needed — you'll enter the code next and pick which of you you
        are. Quicker, but tied to this browser, and anyone holding the code can
        open the jar.
      </p>

      <hr className="sj-rule" />

      {emailMode ? (
        <>
          <div className="sj-field">
            <label className="sj-label" htmlFor="si-email">Your email</label>
            <input id="si-email" className="sj-input" type="email" value={email}
              autoComplete="email" placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && emailOk) link() }} />
          </div>
          <button className="sj-btn wide" onClick={link} disabled={Boolean(busy) || !emailOk}>
            {busy === 'email' ? 'Sending…' : 'Email me a link'}
          </button>
        </>
      ) : (
        <div>
        <label className="sj-note">Rather not use Google?</label><br/>
        <button className="sj-link" onClick={() => { setEmailMode(true); setError('') }}>
         Email me a link instead
        </button>
        </div>
      )}
    </div></div>
  )
}
