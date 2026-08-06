import React, { useState, useEffect, useCallback } from "react";

const KEY = "slipjar:v1";
const CURRENCIES = ["S$", "$", "£", "€", "¥", "RM"];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400;1,6..72,500&family=DM+Mono:wght@400;500&display=swap');

.sj {
  --paper: #EDEFE9;
  --paper-2: #E3E7DE;
  --pine: #123B36;
  --pine-soft: #4C6560;
  --coral: #F2617A;
  --ochre: #E0A126;
  --plum: #4A2E4A;
  --line: rgba(18,59,54,0.16);

  background: var(--paper);
  color: var(--pine);
  font-family: 'DM Mono', ui-monospace, monospace;
  min-height: 100%;
  padding: 28px 20px 64px;
  -webkit-font-smoothing: antialiased;
}
.sj * { box-sizing: border-box; }
.sj-wrap { max-width: 940px; margin: 0 auto; }

.sj-eyebrow {
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--pine-soft); margin: 0 0 10px;
}
.sj-h1 {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-weight: 800; font-size: clamp(38px, 8vw, 68px);
  line-height: .92; letter-spacing: -.03em; margin: 0;
}
.sj-h1 em { font-style: normal; color: var(--coral); }
.sj-sub {
  font-family: 'Newsreader', Georgia, serif; font-size: 17px;
  color: var(--pine-soft); margin: 12px 0 0; max-width: 34ch; line-height: 1.4;
}

.sj-rule { height: 1px; background: var(--line); margin: 26px 0; border: 0; }

.sj-cols { display: grid; grid-template-columns: 260px 1fr; gap: 40px; align-items: start; }
@media (max-width: 760px) { .sj-cols { grid-template-columns: 1fr; gap: 28px; } }

.sj-jarcol { position: sticky; top: 20px; }
@media (max-width: 760px) { .sj-jarcol { position: static; } }

.sj-jar { width: 100%; max-width: 230px; display: block; margin: 0 auto; }
.sj-coin { mix-blend-mode: multiply; }

.sj-balance { text-align: center; margin-top: 10px; }
.sj-bal-num {
  font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800;
  font-size: clamp(34px, 7vw, 46px); letter-spacing: -.03em; line-height: 1;
}
.sj-bal-lab { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--pine-soft); margin-top: 8px; }

.sj-streak {
  margin-top: 18px; border: 1px solid var(--line); border-radius: 2px;
  padding: 10px 12px; text-align: center; font-size: 12px; color: var(--pine-soft);
}
.sj-streak b { color: var(--pine); font-weight: 500; }

.sj-label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--pine-soft); display: block; margin-bottom: 8px; }

.sj-seg { display: flex; gap: 8px; flex-wrap: wrap; }
.sj-chip {
  font-family: 'DM Mono', monospace; font-size: 13px;
  border: 1px solid var(--pine); background: transparent; color: var(--pine);
  padding: 9px 14px; border-radius: 2px; cursor: pointer; transition: background .12s, color .12s;
}
.sj-chip:hover { background: rgba(18,59,54,.07); }
.sj-chip[aria-pressed="true"] { background: var(--pine); color: var(--paper); }
.sj-chip.coral[aria-pressed="true"] { background: var(--coral); border-color: var(--coral); color: #fff; }

.sj-field { margin-bottom: 20px; }
.sj-input, .sj-select {
  width: 100%; font-family: 'Newsreader', Georgia, serif; font-size: 17px;
  background: transparent; border: 0; border-bottom: 1px solid var(--pine);
  padding: 8px 2px; color: var(--pine); border-radius: 0;
}
.sj-input::placeholder { color: rgba(18,59,54,.35); font-style: italic; }
.sj-input:focus, .sj-select:focus { outline: 2px solid var(--coral); outline-offset: 3px; }
.sj-num { font-family: 'DM Mono', monospace; font-size: 15px; }
.sj-input[aria-invalid="true"] { border-bottom-color: var(--coral); border-bottom-width: 2px; }
.sj-hint { font-size: 11px; color: var(--pine-soft); margin: 7px 0 0; line-height: 1.5; }
.sj-hint.bad { color: var(--coral); }
.sj-money { display: flex; align-items: baseline; gap: 8px; border-bottom: 1px solid var(--pine); }
.sj-money[aria-invalid="true"] { border-bottom-color: var(--coral); border-bottom-width: 2px; }
.sj-money:focus-within { outline: 2px solid var(--coral); outline-offset: 3px; }
.sj-money .sj-cur { font-size: 14px; color: var(--pine-soft); padding-left: 2px; }
.sj-money .sj-input { border-bottom: 0; }
.sj-money .sj-input:focus { outline: none; }

.sj-btn {
  font-family: 'DM Mono', monospace; font-size: 13px; letter-spacing: .04em;
  background: var(--coral); color: #fff; border: 0; border-radius: 2px;
  padding: 13px 22px; cursor: pointer; transition: transform .1s, filter .12s;
}
.sj-btn:hover { filter: brightness(1.06); }
.sj-btn:active { transform: translateY(1px); }
.sj-btn[disabled] { opacity: .45; cursor: not-allowed; }
.sj-btn.ghost { background: transparent; color: var(--pine); border: 1px solid var(--pine); }
.sj-btn.ghost:hover { background: rgba(18,59,54,.07); }

.sj-ledger { list-style: none; margin: 0; padding: 0; }
.sj-row {
  display: flex; gap: 14px; align-items: baseline;
  padding: 14px 0; border-bottom: 1px solid var(--line);
}
.sj-who {
  font-size: 11px; letter-spacing: .1em; text-transform: uppercase;
  flex: 0 0 auto; padding-top: 3px;
}
.sj-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 7px; vertical-align: 1px; }
.sj-said { flex: 1 1 auto; font-family: 'Newsreader', Georgia, serif; font-size: 17px; line-height: 1.35; font-style: italic; }
.sj-said.none { color: rgba(18,59,54,.4); }
.sj-meta { font-size: 11px; color: var(--pine-soft); font-style: normal; margin-top: 4px; display: block; }
.sj-amt { flex: 0 0 auto; font-size: 14px; }
.sj-del {
  flex: 0 0 auto; background: none; border: 0; color: rgba(18,59,54,.35);
  cursor: pointer; font-size: 15px; padding: 0 2px; line-height: 1;
}
.sj-del:hover { color: var(--coral); }

.sj-cash { padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 13px; color: var(--pine-soft); }
.sj-cash b { color: var(--plum); font-weight: 500; }

.sj-empty {
  border: 1px dashed var(--line); border-radius: 2px; padding: 28px 20px;
  text-align: center; font-family: 'Newsreader', Georgia, serif;
  font-size: 17px; color: var(--pine-soft);
}

.sj-tally { display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 6px; }
.sj-tally div { font-size: 12px; color: var(--pine-soft); }
.sj-tally span { font-size: 18px; color: var(--pine); display: block; margin-top: 4px; }

.sj-foot { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 34px; }
.sj-note { font-size: 11px; color: var(--pine-soft); margin-top: 18px; line-height: 1.6; }

.sj-err { background: var(--coral); color: #fff; padding: 10px 14px; border-radius: 2px; font-size: 12px; margin-bottom: 18px; }

.sj-setup { max-width: 430px; }
.sj-h2 { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 22px; letter-spacing: -.02em; margin: 0 0 22px; }

@media (prefers-reduced-motion: reduce) {
  .sj * { transition: none !important; animation: none !important; }
}
`;

const rnd = (i, s) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function Jar({ count }) {
  const visible = Math.min(count, 64);
  const coins = [];
  for (let i = 0; i < visible; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = 52 + col * 32 + (rnd(i, 1) - 0.5) * 11;
    const y = 298 - row * 12 - rnd(i, 2) * 3;
    coins.push({ x, y, r: 14 + rnd(i, 3) * 2 });
  }
  const body =
    "M 68 56 C 68 76, 28 78, 28 108 L 28 288 C 28 306, 42 316, 60 316 L 140 316 C 158 316, 172 306, 172 288 L 172 108 C 172 78, 132 76, 132 56 Z";

  return (
    <svg className="sj-jar" viewBox="0 0 200 344" role="img"
      aria-label={`Jar containing ${count} coin${count === 1 ? "" : "s"}`}>
      <defs>
        <clipPath id="sj-inside">
          <path d={body} />
        </clipPath>
      </defs>

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
        <text x="100" y="336" textAnchor="middle" fontSize="11"
          fill="#4C6560" fontFamily="DM Mono, monospace">
          +{count - visible} more
        </text>
      )}
      {count === 0 && (
        <text x="100" y="200" textAnchor="middle" fontSize="12"
          fill="#4C6560" fontFamily="DM Mono, monospace" opacity="0.7">
          empty
        </text>
      )}
    </svg>
  );
}

// Money input rules: digits only, at most one decimal point, at most two
// places after it, and no more than six digits before it. Anything that
// doesn't match is never allowed into state, so letters and stray symbols
// can't be typed or pasted in the first place.
const MONEY = /^\d{0,6}(\.\d{0,2})?$/;

// Normalises a comma decimal separator, then accepts or rejects the whole
// candidate value. Returns null when the keystroke should be ignored.
const acceptMoney = (raw) => {
  const v = raw.replace(",", ".").trim();
  if (v === "") return "";
  return MONEY.test(v) ? v : null;
};

// "" and "." are valid things to have typed so far, but neither is a number.
const moneyValue = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
};

const fmt = (cur, n) =>
  `${cur}${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "")}`;

const daysSince = (ts) => Math.floor((Date.now() - ts) / 86400000);

const dateLabel = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function SlipJar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [setupMode, setSetupMode] = useState(false);
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [cur, setCur] = useState("S$");
  const [fine, setFine] = useState("1");

  const [who, setWho] = useState("a");
  const [target, setTarget] = useState("self");
  const [said, setSaid] = useState("");
  const [amt, setAmt] = useState("");

  // Only commit a keystroke if the result is still a valid partial amount.
  const onMoneyChange = (setter) => (e) => {
    const next = acceptMoney(e.target.value);
    if (next !== null) setter(next);
  };

  const fineNum = moneyValue(fine);
  const fineValid = Number.isFinite(fineNum) && fineNum > 0;

  // Blank is fine here — it means "charge the usual".
  const amtBlank = amt.trim() === "";
  const amtNum = moneyValue(amt);
  const amtValid = amtBlank || (Number.isFinite(amtNum) && amtNum > 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.storage.get(KEY, true);
      const parsed = res && res.value ? JSON.parse(res.value) : null;
      if (parsed && parsed.config) {
        setData(parsed);
        setNameA(parsed.config.a);
        setNameB(parsed.config.b);
        setCur(parsed.config.currency);
        setFine(String(parsed.config.fine));
      } else {
        setData(null);
        setSetupMode(true);
      }
    } catch {
      setData(null);
      setSetupMode(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const write = async (next) => {
    setBusy(true);
    setError("");
    try {
      await window.storage.set(KEY, JSON.stringify(next), true);
      setData(next);
      return true;
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Re-read before writing so two phones editing at once don't wipe each other.
  const merge = async (mutate) => {
    let latest = data;
    try {
      const res = await window.storage.get(KEY, true);
      if (res && res.value) latest = JSON.parse(res.value);
    } catch { /* fall back to local copy */ }
    return write(mutate(latest));
  };

  const saveSetup = async () => {
    if (!fineValid) return;
    const a = nameA.trim() || "Me";
    const b = nameB.trim() || "Them";
    const f = Math.round(fineNum * 100) / 100;
    const base = data || { entries: [], cashouts: [] };
    const ok = await write({ ...base, config: { a, b, currency: cur, fine: f } });
    if (ok) setSetupMode(false);
  };

  const addEntry = async () => {
    if (!amtValid) return;
    const amount = amtBlank ? data.config.fine : Math.round(amtNum * 100) / 100;
    const entry = {
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      who, target, text: said.trim(), amount, ts: Date.now(),
    };
    const ok = await merge((d) => ({ ...d, entries: [entry, ...(d.entries || [])] }));
    if (ok) { setSaid(""); setAmt(""); }
  };

  const removeEntry = (id) =>
    merge((d) => ({ ...d, entries: (d.entries || []).filter((e) => e.id !== id) }));

  const emptyJar = async (balance) => {
    const note = window.prompt("What are you spending it on?");
    if (note === null) return;
    const c = {
      id: `c_${Date.now()}`,
      note: note.trim() || "something nice",
      amount: balance,
      ts: Date.now(),
    };
    merge((d) => ({ ...d, cashouts: [c, ...(d.cashouts || [])] }));
  };

  const startOver = async () => {
    if (!window.confirm("Delete every entry and start the jar from scratch?")) return;
    try {
      await window.storage.delete(KEY, true);
      setData(null); setSetupMode(true);
      setNameA(""); setNameB(""); setFine("1");
    } catch {
      setError("Couldn't clear the jar. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="sj"><style>{css}</style>
        <div className="sj-wrap"><p className="sj-eyebrow">Opening the jar…</p></div>
      </div>
    );
  }

  if (setupMode || !data || !data.config) {
    return (
      <div className="sj"><style>{css}</style>
        <div className="sj-wrap sj-setup">
          <p className="sj-eyebrow">Shared jar</p>
          <h1 className="sj-h1">Ownself<br /><em>check ownself.</em></h1>
          <p className="sj-sub">A jar for the unkind things</p>
          <hr className="sj-rule" />
          {error && <div className="sj-err">{error}</div>}

          <div className="sj-field">
            <label className="sj-label" htmlFor="sj-a">Your name</label>
            <input id="sj-a" className="sj-input" value={nameA} placeholder="you"
              onChange={(e) => setNameA(e.target.value)} maxLength={20} />
          </div>
          <div className="sj-field">
            <label className="sj-label" htmlFor="sj-b">Partner's name</label>
            <input id="sj-b" className="sj-input" value={nameB} placeholder="him"
              onChange={(e) => setNameB(e.target.value)} maxLength={20} />
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
            <label className="sj-label" htmlFor="sj-f">Cost per slip</label>
            <div className="sj-money" aria-invalid={fine !== "" && !fineValid}>
              <span className="sj-cur">{cur}</span>
              <input id="sj-f" className="sj-input sj-num" value={fine}
                inputMode="decimal" autoComplete="off" placeholder="1.00"
                aria-describedby="sj-f-hint"
                onChange={onMoneyChange(setFine)}
                onKeyDown={(e) => { if (e.key === "Enter" && fineValid && !busy) saveSetup(); }} />
            </div>
            <p id="sj-f-hint" className={`sj-hint${fine !== "" && !fineValid ? " bad" : ""}`}>
              {fine === ""
                ? "Numbers only, up to two decimal places."
                : fineValid
                  ? `Each slip costs ${fmt(cur, fineNum)}.`
                  : "Enter an amount greater than zero."}
            </p>
          </div>

          <button className="sj-btn" onClick={saveSetup} disabled={busy || !fineValid}>
            {data ? "Save changes" : "Open the jar"}
          </button>
          {data && (
            <button className="sj-btn ghost" style={{ marginLeft: 10 }}
              onClick={() => setSetupMode(false)}>Cancel</button>
          )}
          <p className="sj-note">
            Everything in this jar is stored as shared data — anyone who opens this
            artifact sees the same names, entries and total.
          </p>
        </div>
      </div>
    );
  }

  const { config } = data;
  const entries = data.entries || [];
  const cashouts = data.cashouts || [];
  const collected = entries.reduce((s, e) => s + e.amount, 0);
  const spent = cashouts.reduce((s, c) => s + c.amount, 0);
  const balance = Math.max(0, collected - spent);
  const coinCount = Math.round(balance / Math.max(config.fine, 0.01));
  const nameOf = (k) => (k === "a" ? config.a : config.b);
  const colorOf = (k) => (k === "a" ? "#F2617A" : "#123B36");
  const tallyA = entries.filter((e) => e.who === "a").length;
  const tallyB = entries.filter((e) => e.who === "b").length;
  const selfCount = entries.filter((e) => e.target === "self").length;
  const streak = entries.length ? daysSince(entries[0].ts) : null;

  const feed = [
    ...entries.map((e) => ({ kind: "e", ts: e.ts, e })),
    ...cashouts.map((c) => ({ kind: "c", ts: c.ts, c })),
  ].sort((x, y) => y.ts - x.ts);

  return (
    <div className="sj"><style>{css}</style>
      <div className="sj-wrap">
        <p className="sj-eyebrow">{config.a} &amp; {config.b} — shared jar</p>
        <h1 className="sj-h1">Ownself, <em>check ownself</em></h1>
        <p className="sj-sub">Every unkind word costs {fmt(config.currency, config.fine)}.</p>
        <hr className="sj-rule" />
        {error && <div className="sj-err">{error}</div>}

        <div className="sj-cols">
          <div className="sj-jarcol">
            <Jar count={coinCount} />
            <div className="sj-balance">
              <div className="sj-bal-num">{fmt(config.currency, balance)}</div>
              <div className="sj-bal-lab">in the jar</div>
            </div>
            <div className="sj-streak">
              {streak === null
                ? <>Nothing said yet. <b>Good start.</b></>
                : streak === 0
                  ? <>Last slip was <b>today</b>.</>
                  : <>Kind for <b>{streak} day{streak === 1 ? "" : "s"}</b>.</>}
            </div>
          </div>

          <div>
            <div className="sj-field">
              <label className="sj-label">Who said it</label>
              <div className="sj-seg">
                <button className="sj-chip coral" aria-pressed={who === "a"}
                  onClick={() => setWho("a")}>{config.a}</button>
                <button className="sj-chip" aria-pressed={who === "b"}
                  onClick={() => setWho("b")}>{config.b}</button>
              </div>
            </div>

            <div className="sj-field">
              <label className="sj-label">Aimed at</label>
              <div className="sj-seg">
                <button className="sj-chip" aria-pressed={target === "self"}
                  onClick={() => setTarget("self")}>themselves</button>
                <button className="sj-chip" aria-pressed={target === "partner"}
                  onClick={() => setTarget("partner")}>the other one</button>
              </div>
            </div>

            <div className="sj-field">
              <label className="sj-label" htmlFor="sj-said">What was said</label>
              <input id="sj-said" className="sj-input" value={said} maxLength={140}
                placeholder="optional — write it down, then let it go"
                onChange={(e) => setSaid(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !busy) addEntry(); }} />
            </div>

            <div className="sj-field">
              <label className="sj-label" htmlFor="sj-amt">Amount</label>
              <div className="sj-money" aria-invalid={!amtValid}>
                <span className="sj-cur">{config.currency}</span>
                <input id="sj-amt" className="sj-input sj-num" value={amt}
                  inputMode="decimal" autoComplete="off"
                  placeholder={`${config.fine} — leave blank for the usual`}
                  aria-describedby="sj-amt-hint"
                  onChange={onMoneyChange(setAmt)}
                  onKeyDown={(e) => { if (e.key === "Enter" && amtValid && !busy) addEntry(); }} />
              </div>
              <p id="sj-amt-hint" className={`sj-hint${amtValid ? "" : " bad"}`}>
                {amtBlank
                  ? `Charges the usual ${fmt(config.currency, config.fine)}.`
                  : amtValid
                    ? `Charging ${fmt(config.currency, amtNum)} for this one.`
                    : "Enter an amount greater than zero."}
              </p>
            </div>

            <button className="sj-btn" onClick={addEntry} disabled={busy || !amtValid}>
              Drop a coin in
            </button>

            <hr className="sj-rule" />

            <div className="sj-tally">
              <div>{config.a}<span>{tallyA}</span></div>
              <div>{config.b}<span>{tallyB}</span></div>
              <div>about themselves<span>{selfCount}</span></div>
              <div>collected ever<span>{fmt(config.currency, collected)}</span></div>
            </div>

            <hr className="sj-rule" />

            {feed.length === 0 ? (
              <div className="sj-empty">Nothing in the jar yet. Long may it last.</div>
            ) : (
              <ul className="sj-ledger">
                {feed.map((item) =>
                  item.kind === "c" ? (
                    <li className="sj-cash" key={item.c.id}>
                      Jar emptied on <b>{item.c.note}</b> — {fmt(config.currency, item.c.amount)}
                      <span className="sj-meta">{dateLabel(item.c.ts)}</span>
                    </li>
                  ) : (
                    <li className="sj-row" key={item.e.id}>
                      <span className="sj-who">
                        <i className="sj-dot" style={{ background: colorOf(item.e.who) }} />
                        {nameOf(item.e.who)}
                      </span>
                      <span className={`sj-said${item.e.text ? "" : " none"}`}>
                        {item.e.text ? `“${item.e.text}”` : "no note"}
                        <span className="sj-meta">
                          {item.e.target === "self" ? "about themselves" : "about the other one"} · {dateLabel(item.e.ts)}
                        </span>
                      </span>
                      <span className="sj-amt">{fmt(config.currency, item.e.amount)}</span>
                      <button className="sj-del" onClick={() => removeEntry(item.e.id)}
                        aria-label="Remove this entry" title="Remove">×</button>
                    </li>
                  )
                )}
              </ul>
            )}

            <div className="sj-foot">
              <button className="sj-btn ghost" onClick={() => emptyJar(balance)} disabled={busy || balance <= 0}>
                Empty the jar
              </button>
              <button className="sj-btn ghost" onClick={() => setSetupMode(true)}>Names &amp; amount</button>
              <button className="sj-btn ghost" onClick={load} disabled={busy}>Refresh</button>
              <button className="sj-btn ghost" onClick={startOver}>Start over</button>
            </div>

            <p className="sj-note">
              Saved as shared data, so you both see the same jar. Hit refresh if he's
              just added something on his end.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
