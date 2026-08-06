// src/App.jsx
//
// Gates: signed in? → in a jar? → show the jar.
//
// A person can be in as many jars as they like. `jars` holds all of them,
// `jarId` is the one on screen, and ChooseJar doubles as the "add another"
// screen — which is why it takes an onCancel.

import React, { useState, useEffect, useCallback } from 'react'
import {
  supabase, myJars, createJar, peekJar, claimSlot, signOut, isAnonymous,
} from './lib/api'
import SignIn from './SignIn'
import SlipJar from './SlipJar'

const CURRENCIES = ['S$', '$', '£', '€', '¥', 'RM']
const MONEY = /^\d{0,6}(\.\d{0,2})?$/

function ChooseJar({ user, onReady, onCancel }) {
  const anon = isAnonymous(user)
  const suggested =
    user.user_metadata?.full_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    ''

  // Anonymous sessions get here holding a code, so start them on the join tab.
  const [tab, setTab] = useState(anon ? 'join' : 'new')
  const [name, setName] = useState(suggested)
  const [partner, setPartner] = useState('')
  const [cur, setCur] = useState('S$')
  const [fine, setFine] = useState('1')
  const [code, setCode] = useState('')
  const [roster, setRoster] = useState(null)   // null until a code is looked up
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fineNum = parseFloat(fine)
  const fineOk = Number.isFinite(fineNum) && fineNum > 0
  const nameOk = name.trim().length > 0
  const partnerOk = partner.trim().length > 0
  const codeOk = code.trim().length >= 4

  const onFine = (e) => {
    const v = e.target.value.replace(',', '.')
    if (v === '' || MONEY.test(v)) setFine(v)
  }

  const guard = (fn) => async () => {
    setBusy(true); setError('')
    try { onReady(await fn()) }
    catch (err) {
      setError(err.message || "That didn't work. Try again.")
      setBusy(false)
    }
  }

  const start = guard(() =>
    createJar(name.trim(), partner.trim(), cur, Math.round(fineNum * 100) / 100)
  )

  const lookUp = async () => {
    if (!codeOk) return
    setBusy(true); setError('')
    try {
      const people = await peekJar(code)
      if (!people.length) setError('No jar with that code.')
      else setRoster(people)
    } catch (err) {
      setError(err.message || 'Could not find that jar.')
    }
    setBusy(false)
  }

  const claim = (person) =>
    guard(() => claimSlot(code, person.member_id, name.trim() || person.display_name))()

  return (
    <div className="sj"><div className="sj-narrow">
      <p className="sj-eyebrow">
        {anon ? 'No account — code only' : `Signed in as ${user.email}`}
      </p>
      <h1 className="sj-h1">One jar,<br /><em>two people.</em></h1>
      <hr className="sj-rule" />

      {!anon && (
        <div className="sj-field">
          <div className="sj-seg">
            <button className="sj-chip coral" aria-pressed={tab === 'new'}
              onClick={() => { setTab('new'); setError('') }}>Start a jar</button>
            <button className="sj-chip" aria-pressed={tab === 'join'}
              onClick={() => { setTab('join'); setError('') }}>Join with a code</button>
          </div>
        </div>
      )}

      {error && <div className="sj-err" role="alert">{error}</div>}

      {tab === 'new' ? (
        <>
          <div className="sj-field">
            <label className="sj-label" htmlFor="cj-name">Your name</label>
            <input id="cj-name" className="sj-input" value={name} maxLength={20}
              placeholder="you" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sj-field">
            <label className="sj-label" htmlFor="cj-partner">His name</label>
            <input id="cj-partner" className="sj-input" value={partner} maxLength={20}
              placeholder="him" onChange={(e) => setPartner(e.target.value)} />
            <p className="sj-hint">
              No account needed. Just log slips against your partner and s/he can
               pick up his/her tab later with the jar code.
            </p>
          </div>
          <div className="sj-field">
            <label className="sj-label">Currency</label>
            <div className="sj-seg">
              {CURRENCIES.map((c) => (
                <button key={c} className="sj-chip" aria-pressed={cur === c}
                  onClick={() => setCur(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div className="sj-field">
            <label className="sj-label" htmlFor="cj-fine">Cost per slip</label>
            <div className="sj-money" aria-invalid={fine !== '' && !fineOk}>
              <span className="sj-cur">{cur}</span>
              <input id="cj-fine" className="sj-input sj-num" value={fine}
                inputMode="decimal" autoComplete="off" placeholder="1.00"
                onChange={onFine} />
            </div>
            <p className={`sj-hint${fine !== '' && !fineOk ? ' bad' : ''}`}>
              {fineOk ? 'You can change this later.' : 'Numbers only, greater than zero.'}
            </p>
          </div>
          <button className="sj-btn wide" onClick={start}
            disabled={busy || !nameOk || !partnerOk || !fineOk}>
            {busy ? 'One moment…' : 'Open the jar'}
          </button>
        </>
      ) : roster ? (
        <>
          <div className="sj-field">
            <label className="sj-label">Which one are you?</label>
            <div className="sj-seg">
              {roster.map((p) => (
                <button key={p.member_id} className="sj-chip"
                  disabled={busy} onClick={() => claim(p)}>
                  {p.display_name}
                  {p.is_me ? ' (you)' : p.claimed ? ' — taken' : ''}
                </button>
              ))}
            </div>
            <p className="sj-hint">
              Picking someone already taken moves that person onto this device.
              Useful on a new phone; awkward if you pick the wrong one.
            </p>
          </div>
          <button className="sj-btn ghost wide"
            onClick={() => { setRoster(null); setError('') }}>
            Different code
          </button>
        </>
      ) : (
        <>
          <div className="sj-field">
            <label className="sj-label" htmlFor="cj-code">Jar code</label>
            <input id="cj-code" className="sj-input sj-num sj-code" value={code}
              maxLength={6} autoComplete="off" placeholder="ABC123"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && codeOk) lookUp() }} />
            <p className="sj-hint">Six characters, shown at the top of her jar.</p>
          </div>
          <div className="sj-field">
            <label className="sj-label" htmlFor="cj-name2">Your name</label>
            <input id="cj-name2" className="sj-input" value={name} maxLength={20}
              placeholder="leave blank to keep what she called you"
              onChange={(e) => setName(e.target.value)} />
          </div>
          <button className="sj-btn wide" onClick={lookUp} disabled={busy || !codeOk}>
            {busy ? 'Looking…' : 'Find the jar'}
          </button>
        </>
      )}

      {onCancel ? (
        <button className="sj-btn ghost wide" style={{ marginTop: 10 }} onClick={onCancel}>
          Back to my jar
        </button>
      ) : (
        <button className="sj-btn ghost wide" style={{ marginTop: 10 }} onClick={signOut}>
          {anon ? 'Back ↼' : 'Sign out'}
        </button>
      )}
    </div></div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [jars, setJars] = useState([])
  const [jarId, setJarId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [loadingJars, setLoadingJars] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setJars([]); setJarId(null); setAdding(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const refreshJars = useCallback(async () => {
    setLoadingJars(true); setError('')
    try {
      const rows = await myJars()
      setJars(rows)
      setJarId((cur) =>
        cur && rows.some((r) => r.jarId === cur) ? cur : rows[0]?.jarId ?? null
      )
    } catch (err) {
      setError(err.message || 'Could not load your jars.')
    }
    setLoadingJars(false)
  }, [])

  useEffect(() => { if (session) refreshJars() }, [session, refreshJars])

  const shell = (text) => (
    <div className="sj"><div className="sj-narrow"><p className="sj-eyebrow">{text}</p></div></div>
  )

  if (checking) return shell('One moment…')
  if (!session) return <SignIn />
  if (loadingJars) return shell('Finding your jars…')

  if (error) {
    return (
      <div className="sj"><div className="sj-narrow">
        <div className="sj-err">{error}</div>
        <button className="sj-btn" onClick={refreshJars}>Try again</button>
      </div></div>
    )
  }

  const arrived = (id) => {
    setJarId(id)
    setAdding(false)
    refreshJars()
  }

  if (adding || !jars.length || !jarId) {
    return (
      <ChooseJar
        user={session.user}
        onReady={arrived}
        onCancel={jars.length && jarId ? () => setAdding(false) : null}
      />
    )
  }

  return (
    <SlipJar
      jarId={jarId}
      user={session.user}
      jars={jars}
      onSwitchJar={setJarId}
      onAddJar={() => setAdding(true)}
      onLeft={() => { setJarId(null); refreshJars() }}
    />
  )
}
