// src/SlipJar.jsx
//
// Entries are attributed to a jar_members row, so "who said it" works whether
// or not that person has ever signed in.

import React, { useState, useEffect, useCallback } from 'react'
import {
  getJar, getMembers, getEntries, getCashouts,
  addEntry, deleteEntry, addCashout,
  updateJar, addPerson, renamePerson, leaveJar, watchJar, signOut,
} from './lib/api'

const MONEY = /^\d{0,6}(\.\d{0,2})?$/

const acceptMoney = (raw) => {
  const v = raw.replace(',', '.').trim()
  if (v === '') return ''
  return MONEY.test(v) ? v : null
}
const moneyValue = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : NaN
}
const fmt = (cur, n) =>
  `${cur}${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '')}`
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

const rnd = (i, s) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function Jar({ count }) {
  const visible = Math.min(count, 64)
  const coins = []
  for (let i = 0; i < visible; i++) {
    coins.push({
      x: 52 + (i % 4) * 32 + (rnd(i, 1) - 0.5) * 11,
      y: 298 - Math.floor(i / 4) * 12 - rnd(i, 2) * 3,
      r: 14 + rnd(i, 3) * 2,
    })
  }
  const body =
    'M 68 56 C 68 76, 28 78, 28 108 L 28 288 C 28 306, 42 316, 60 316 L 140 316 C 158 316, 172 306, 172 288 L 172 108 C 172 78, 132 76, 132 56 Z'

  return (
    <svg className="sj-jar" viewBox="0 0 200 344" role="img"
      aria-label={`Jar containing ${count} coin${count === 1 ? '' : 's'}`}>
      <defs><clipPath id="sj-inside"><path d={body} /></clipPath></defs>
      <rect x="60" y="18" width="80" height="22" rx="4" fill="#123B36" opacity="0.9" />
      <rect x="68" y="40" width="64" height="18" fill="none" stroke="#123B36" strokeWidth="2.5" />
      <path d={body} fill="#ffffff" opacity="0.5" />
      <g clipPath="url(#sj-inside)">
        {coins.map((c, i) => (
          <g className="sj-coin" key={i}>
            <circle cx={c.x} cy={c.y} r={c.r} fill="#E0A126" opacity="0.92" />
            <circle cx={c.x} cy={c.y} r={c.r * 0.55} fill="none" stroke="#123B36" strokeWidth="1.1" opacity="0.35" />
          </g>
        ))}
      </g>
      <path d={body} fill="none" stroke="#123B36" strokeWidth="2.5" />
      <path d="M 44 130 L 44 250" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
      {count > visible && (
        <text x="100" y="336" textAnchor="middle" fontSize="11" fill="#4C6560" fontFamily="DM Mono, monospace">
          +{count - visible} more
        </text>
      )}
      {count === 0 && (
        <text x="100" y="200" textAnchor="middle" fontSize="12" fill="#4C6560" fontFamily="DM Mono, monospace" opacity="0.7">
          empty
        </text>
      )}
    </svg>
  )
}

export default function SlipJar({ jarId, user, jars = [], onSwitchJar, onAddJar, onLeft }) {
  const [jar, setJar] = useState(null)
  const [members, setMembers] = useState([])
  const [entries, setEntries] = useState([])
  const [cashouts, setCashouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [saidBy, setSaidBy] = useState(null)
  const [target, setTarget] = useState('self')
  const [said, setSaid] = useState('')
  const [amt, setAmt] = useState('')
  const [settings, setSettings] = useState(false)
  const [picker, setPicker] = useState(false)
  const [fineDraft, setFineDraft] = useState(null)   // null = not editing

  const load = useCallback(async () => {
    try {
      const [j, m, e, c] = await Promise.all([
        getJar(jarId), getMembers(jarId), getEntries(jarId), getCashouts(jarId),
      ])
      setJar(j); setMembers(m); setEntries(e); setCashouts(c)
      // Default to logging against yourself, but keep any existing choice.
      setSaidBy((cur) =>
        cur && m.some((x) => x.id === cur)
          ? cur
          : m.find((x) => x.user_id === user.id)?.id ?? m[0]?.id ?? null
      )
      setError('')
    } catch (err) {
      setError(err.message || 'Could not open the jar.')
    }
    setLoading(false)
  }, [jarId, user.id])

  useEffect(() => { setLoading(true); load() }, [load])
  useEffect(() => watchJar(jarId, load), [jarId, load])

  const run = async (fn) => {
    setBusy(true); setError('')
    try { await fn(); await load(); return true }
    catch (err) { setError(err.message || "That didn't save. Try again."); return false }
    finally { setBusy(false) }
  }

  const onMoney = (e) => {
    const next = acceptMoney(e.target.value)
    if (next !== null) setAmt(next)
  }

  if (loading) {
    return <div className="sj"><div className="sj-narrow"><p className="sj-eyebrow">Opening the jar…</p></div></div>
  }
  if (!jar) {
    return (
      <div className="sj"><div className="sj-narrow">
        <div className="sj-err">{error || 'That jar is gone.'}</div>
        <button className="sj-btn" onClick={onLeft}>Back</button>
      </div></div>
    )
  }

  const cur = jar.currency
  const fine = Number(jar.fine)
  const collected = entries.reduce((s, e) => s + e.amount, 0)
  const spent = cashouts.reduce((s, c) => s + c.amount, 0)
  const balance = Math.max(0, collected - spent)
  const coinCount = Math.round(balance / Math.max(fine, 0.01))

  const me = members.find((m) => m.user_id === user.id)
  const others = members.filter((m) => m.id !== me?.id)
  const unclaimed = members.filter((m) => !m.user_id)
  const memberById = (id) => members.find((m) => m.id === id)
  const labelFor = (m) => (m.id === me?.id ? 'Me' : m.display_name)
  const colorFor = (id) => (id === me?.id ? '#F2617A' : '#123B36')

  const amtBlank = amt.trim() === ''
  const amtNum = moneyValue(amt)
  const amtValid = amtBlank || (Number.isFinite(amtNum) && amtNum > 0)

  const fineDraftNum = moneyValue(fineDraft ?? '')
  const fineDraftValid = Number.isFinite(fineDraftNum) && fineDraftNum > 0
  const streak = entries.length ? daysSince(entries[0].created_at) : null
  const chosen = memberById(saidBy)

  const feed = [
    ...entries.map((e) => ({ kind: 'e', at: e.created_at, e })),
    ...cashouts.map((c) => ({ kind: 'c', at: c.created_at, c })),
  ].sort((x, y) => new Date(y.at) - new Date(x.at))

  const submit = async () => {
    if (!amtValid || !saidBy) return
    const ok = await run(() => addEntry(jarId, {
      saidBy,
      target,
      text: said.trim(),
      amount: amtBlank ? fine : Math.round(amtNum * 100) / 100,
    }))
    if (ok) { setSaid(''); setAmt('') }
  }

  const empty = () => {
    const note = window.prompt('What are you spending it on?')
    if (note === null) return
    run(() => addCashout(jarId, note.trim() || 'something nice', balance))
  }

  const rename = (m) => {
    const n = window.prompt('What should the jar call them?', m.display_name)
    if (n && n.trim()) run(() => renamePerson(m.id, n.trim().slice(0, 20)))
  }

  const addOther = () => {
    const n = window.prompt("What's his name?")
    if (n && n.trim()) run(() => addPerson(jarId, n.trim().slice(0, 20)))
  }

  // Opens an inline field rather than a prompt — window.prompt can't be
  // constrained, so text would always get as far as parseFloat, which happily
  // reads "12abc" as 12.
  const openFine = () => {
    setFineDraft(String(fine))
    setSettings(true)
  }

  const saveFine = async () => {
    if (!fineDraftValid) return
    const ok = await run(() =>
      updateJar(jarId, { fine: Math.round(fineDraftNum * 100) / 100 })
    )
    if (ok) setFineDraft(null)
  }

  const leave = async () => {
    if (!window.confirm('Leave this jar? The history stays, and you can rejoin with the code.')) return
    const ok = await run(() => leaveJar(jarId))
    if (ok) onLeft()
  }

  return (
    <div className="sj">
      <div className="sj-bar">
        {user.user_metadata?.avatar_url && (
          <img className="sj-avatar" src={user.user_metadata.avatar_url} alt="" />
        )}
        <span>{me?.display_name}</span>
        <button onClick={() => { setPicker((p) => !p); setSettings(false) }}>
          {jars.length > 1 ? `Jars (${jars.length})` : 'Jars'}
        </button>
        <button onClick={() => { setSettings((s) => !s); setPicker(false) }}>Settings</button>
        <button onClick={signOut}>Sign out</button>
      </div>

      {picker && (
        <div className="sj-wrap">
          <div className="sj-invite">
            <p>You're in {jars.length} jar{jars.length === 1 ? '' : 's'}.</p>
            <ul className="sj-jarlist">
              {jars.map((j) => (
                <li key={j.jarId}>
                  <button className={j.jarId === jarId ? 'current' : ''}
                    onClick={() => { onSwitchJar(j.jarId); setPicker(false) }}>
                    <b>{j.people.map((p) => p.display_name).join(' & ')}</b>
                    <span>{j.code} · {j.currency}{j.fine} a slip</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="sj-seg">
              <button className="sj-btn ghost" onClick={onAddJar}>Start or join another</button>
            </div>
          </div>
        </div>
      )}

      <div className="sj-wrap">
        <p className="sj-eyebrow">
          {members.map((m) => m.display_name).join(' & ')} — shared jar
        </p>
        <h1 className="sj-h1">Say it, <em>pay it.</em></h1>
        <p className="sj-sub">
          Every unkind word costs {fmt(cur, fine)}. Aimed at yourself counts too.
        </p>
        <hr className="sj-rule" />

        {error && <div className="sj-err" role="alert">{error}</div>}

        {unclaimed.length > 0 && (
          <div className="sj-invite">
            <p>
              {unclaimed.map((m) => m.display_name).join(' and ')} hasn't signed in
              yet — you can still log slips against him. When he's ready, this code
              hands him everything already on his tab:
            </p>
            <p className="sj-invite-code">{jar.code}</p>
            <button className="sj-btn ghost"
              onClick={() => navigator.clipboard?.writeText(jar.code)}>
              Copy code
            </button>
          </div>
        )}

        {settings && (
          <div className="sj-invite">
            <p>Jar code <b>{jar.code}</b></p>

            {fineDraft !== null ? (
              <div className="sj-field" style={{ marginBottom: 14 }}>
                <label className="sj-label" htmlFor="sj-fine">Cost per slip</label>
                <div className="sj-money" aria-invalid={fineDraft !== '' && !fineDraftValid}>
                  <span className="sj-cur">{cur}</span>
                  <input id="sj-fine" className="sj-input sj-num" value={fineDraft}
                    inputMode="decimal" autoComplete="off" placeholder="1.00" autoFocus
                    aria-describedby="sj-fine-hint"
                    onChange={(e) => {
                      const next = acceptMoney(e.target.value)
                      if (next !== null) setFineDraft(next)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveFine()
                      if (e.key === 'Escape') setFineDraft(null)
                    }} />
                </div>
                <p id="sj-fine-hint" className={`sj-hint${fineDraft !== '' && !fineDraftValid ? ' bad' : ''}`}>
                  {fineDraft === ''
                    ? 'Numbers only, up to two decimal places.'
                    : fineDraftValid
                      ? `Every slip will cost ${fmt(cur, fineDraftNum)}. Past entries keep what they cost.`
                      : 'Enter an amount greater than zero.'}
                </p>
                <div className="sj-seg" style={{ marginTop: 12 }}>
                  <button className="sj-btn" onClick={saveFine} disabled={busy || !fineDraftValid}>
                    Save
                  </button>
                  <button className="sj-btn ghost" onClick={() => setFineDraft(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="sj-seg">
                {members.map((m) => (
                  <button key={m.id} className="sj-btn ghost" onClick={() => rename(m)}>
                    Rename {m.id === me?.id ? 'yourself' : m.display_name}
                  </button>
                ))}
                {members.length < 2 && (
                  <button className="sj-btn ghost" onClick={addOther}>Add him</button>
                )}
                <button className="sj-btn ghost" onClick={openFine}>
                  Change the cost ({fmt(cur, fine)})
                </button>
                <button className="sj-btn ghost" onClick={leave}>Leave this jar</button>
              </div>
            )}
          </div>
        )}

        <div className="sj-cols">
          <div className="sj-jarcol">
            <Jar count={coinCount} />
            <div className="sj-balance">
              <div className="sj-bal-num">{fmt(cur, balance)}</div>
              <div className="sj-bal-lab">in the jar</div>
            </div>
            <div className="sj-streak">
              {streak === null
                ? <>Nothing said yet. <b>Good start.</b></>
                : streak === 0
                  ? <>Last slip was <b>today</b>.</>
                  : <>Kind for <b>{streak} day{streak === 1 ? '' : 's'}</b>.</>}
            </div>
          </div>

          <div>
            <div className="sj-field">
              <label className="sj-label">Who said it</label>
              <div className="sj-seg">
                {members.map((m) => (
                  <button key={m.id}
                    className={m.id === me?.id ? 'sj-chip coral' : 'sj-chip'}
                    aria-pressed={saidBy === m.id}
                    onClick={() => setSaidBy(m.id)}>
                    {labelFor(m)}
                  </button>
                ))}
                {members.length < 2 && (
                  <button className="sj-chip" onClick={addOther}>+ add him</button>
                )}
              </div>
            </div>

            <div className="sj-field">
              <label className="sj-label">Aimed at</label>
              <div className="sj-seg">
                <button className="sj-chip" aria-pressed={target === 'self'}
                  onClick={() => setTarget('self')}>
                  {chosen && chosen.id === me?.id ? 'myself' : 'partner'}
                </button>
                <button className="sj-chip" aria-pressed={target === 'partner'}
                  onClick={() => setTarget('partner')}>the other one</button>
              </div>
            </div>

            <div className="sj-field">
              <label className="sj-label" htmlFor="sj-said">What was said</label>
              <input id="sj-said" className="sj-input" value={said} maxLength={140}
                placeholder="optional — write it down, then let it go"
                onChange={(e) => setSaid(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
            </div>

            <div className="sj-field">
              <label className="sj-label" htmlFor="sj-amt">Amount</label>
              <div className="sj-money" aria-invalid={!amtValid}>
                <span className="sj-cur">{cur}</span>
                <input id="sj-amt" className="sj-input sj-num" value={amt}
                  inputMode="decimal" autoComplete="off"
                  placeholder={`${fine} — leave blank for the usual`}
                  onChange={onMoney}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
              </div>
              <p className={`sj-hint${amtValid ? '' : ' bad'}`}>
                {amtBlank
                  ? `Charges the usual ${fmt(cur, fine)}.`
                  : amtValid
                    ? `Charging ${fmt(cur, amtNum)} for this one.`
                    : 'Enter an amount greater than zero.'}
              </p>
            </div>

            <button className="sj-btn" onClick={submit} disabled={busy || !amtValid || !saidBy}>
              {chosen && chosen.id !== me?.id
                ? `Drop a coin in for ${chosen.display_name}`
                : 'Drop a coin in'}
            </button>

            <hr className="sj-rule" />

            <div className="sj-tally">
              {members.map((m) => (
                <div key={m.id}>
                  {m.id === me?.id ? 'you' : m.display_name}
                  <span>{entries.filter((e) => e.said_by === m.id).length}</span>
                </div>
              ))}
              <div>about themselves
                <span>{entries.filter((e) => e.target === 'self').length}</span>
              </div>
              <div>collected ever<span>{fmt(cur, collected)}</span></div>
            </div>

            <hr className="sj-rule" />

            {feed.length === 0 ? (
              <div className="sj-empty">Nothing in the jar yet. Long may it last.</div>
            ) : (
              <ul className="sj-ledger">
                {feed.map((item) => item.kind === 'c' ? (
                  <li className="sj-cash" key={item.c.id}>
                    Jar emptied on <b>{item.c.note}</b> — {fmt(cur, item.c.amount)}
                    <span className="sj-meta">{dateLabel(item.c.created_at)}</span>
                  </li>
                ) : (
                  <li className="sj-row" key={item.e.id}>
                    <span className="sj-who">
                      <i className="sj-dot" style={{ background: colorFor(item.e.said_by) }} />
                      {item.e.said_by === me?.id
                        ? 'You'
                        : memberById(item.e.said_by)?.display_name || 'someone'}
                    </span>
                    <span className={`sj-said${item.e.text ? '' : ' none'}`}>
                      {item.e.text ? `\u201C${item.e.text}\u201D` : 'no note'}
                      <span className="sj-meta">
                        {item.e.target === 'self' ? 'about themselves' : 'about the other one'}
                        {' · '}{dateLabel(item.e.created_at)}
                        {item.e.logged_by !== user.id && item.e.said_by === me?.id && ' · logged by him'}
                      </span>
                    </span>
                    <span className="sj-amt">{fmt(cur, item.e.amount)}</span>
                    <button className="sj-del" onClick={() => run(() => deleteEntry(item.e.id))}
                      aria-label="Remove this entry" title="Remove">×</button>
                  </li>
                ))}
              </ul>
            )}

            <div className="sj-foot">
              <button className="sj-btn ghost" onClick={empty} disabled={busy || balance <= 0}>
                Empty the jar
              </button>
              <button className="sj-btn ghost" onClick={load} disabled={busy}>Refresh</button>
            </div>

            <p className="sj-note">
              Updates live on both your phones. Only people in this jar can see it.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
