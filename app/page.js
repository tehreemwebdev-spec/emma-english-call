pp'use client';
import { useEffect, useRef, useState } from 'react';

function Face({ talk, listen }) {
  return (
    <svg className={'ai' + (talk ? ' talk' : '') + (listen ? ' listen' : '')} viewBox="0 0 200 270" aria-hidden="true">
      <defs>
        <radialGradient id="sk" cx="45%" cy="35%" r="75%"><stop offset="0" stopColor="#ffffff" /><stop offset=".6" stopColor="#eef2f7" /><stop offset="1" stopColor="#c3cedb" /></radialGradient>
        <radialGradient id="ir" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#c6ecff" /><stop offset=".45" stopColor="#2f86e8" /><stop offset="1" stopColor="#0a2a6a" /></radialGradient>
        <linearGradient id="nk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d3dbe6" /><stop offset="1" stopColor="#7e8a9c" /></linearGradient>
      </defs>
      <path d="M72 205h56l22 65H50z" fill="url(#nk)" />
      <path d="M84 205v18M100 205v22M116 205v18" stroke="#7e8a9c" strokeWidth="2" opacity=".6" />
      <g className="head">
        <circle className="ear" cx="35" cy="118" r="13" fill="#e9eef5" strokeWidth="3.5" />
        <circle className="ear" cx="165" cy="118" r="13" fill="#e9eef5" strokeWidth="3.5" />
        <ellipse cx="100" cy="110" rx="64" ry="84" fill="url(#sk)" />
        <path d="M52 70q48-30 96 0M44 96q4-14 10-22M156 96q-4-14-10-22" stroke="#b7c3d2" strokeWidth="1.6" fill="none" opacity=".8" />
        <path d="M60 92q14-7 28-2M112 90q14-5 28 2" stroke="#aab6c6" strokeWidth="3" strokeLinecap="round" fill="none" />
        <g className="eyes">
          <ellipse cx="74" cy="112" rx="15" ry="10" fill="#fff" /><circle cx="74" cy="112" r="8.5" fill="url(#ir)" /><circle cx="74" cy="112" r="3.2" fill="#06143a" /><circle cx="71" cy="109" r="2" fill="#fff" />
          <ellipse cx="126" cy="112" rx="15" ry="10" fill="#fff" /><circle cx="126" cy="112" r="8.5" fill="url(#ir)" /><circle cx="126" cy="112" r="3.2" fill="#06143a" /><circle cx="123" cy="109" r="2" fill="#fff" />
        </g>
        <path d="M95 128q-5 22 0 30q5 3 10 0" stroke="#c9d3df" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="62" cy="150" r="11" fill="#ffc9d0" opacity=".25" /><circle cx="138" cy="150" r="11" fill="#ffc9d0" opacity=".25" />
        <ellipse className="cav" cx="100" cy="174" rx="13" ry="8" fill="#6d1f2b" />
        <path d="M78 174q11-9 22-4q11-5 22 4q-22 6-44 0z" fill="#e59aa2" />
        <g className="jaw"><path d="M80 174q20 18 40 0q-20 5-40 0z" fill="#efaab1" /></g>
      </g>
    </svg>
  );
}
const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
const SCENARIOS = ['Free talk', 'Daily life', 'Job interview', 'Travel', 'Shopping', 'Office meeting', 'Doctor visit'];
const sbtn = { border: 0, borderRadius: 12, background: 'var(--g)', color: 'var(--ink)', padding: '9px 16px', cursor: 'pointer', fontSize: 15 };
const dbtn = { ...sbtn, background: '#fde4e4', color: '#a11' };

export default function Page() {
  const [screen, setScreen] = useState('home');
  const [status, setStatus] = useState('');
  const [secs, setSecs] = useState(0);
  const [you, setYou] = useState('');
  const [em, setEm] = useState('');
  const [card, setCard] = useState(null);
  const [talking, setTalking] = useState(false);
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState('Beginner');
  const [scenario, setScenario] = useState('Free talk');
  const [hinglish, setHinglish] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [rate, setRate] = useState(0.95);
  const [saveOn, setSaveOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [summary, setSummary] = useState(null);
  const [typed, setTyped] = useState('');
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const R = useRef({ inCall: false, busy: false, hist: [], log: [], rec: null, audio: null, timer: null, secs: 0, past: [], deadMic: false });
  const cfg = useRef({});
  cfg.current = { level, scenario, hinglish, voiceOn, muted, rate, saveOn };

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('emma_settings') || '{}');
      if (s.level) setLevel(s.level);
      if (s.scenario) setScenario(s.scenario);
      if (typeof s.hinglish === 'boolean') setHinglish(s.hinglish);
      if (typeof s.voiceOn === 'boolean') setVoiceOn(s.voiceOn);
      if (typeof s.rate === 'number') setRate(s.rate);
      if (typeof s.saveOn === 'boolean') setSaveOn(s.saveOn);
      setHistory(JSON.parse(localStorage.getItem('emma_history') || '[]'));
      R.current.past = JSON.parse(localStorage.getItem('emma_past') || '[]');
    } catch (e) {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem('emma_settings', JSON.stringify({ level, scenario, hinglish, voiceOn, rate, saveOn })); } catch (e) {}
  }, [loaded, level, scenario, hinglish, voiceOn, rate, saveOn]);

  function persistHistory(n) {
    setHistory(n);
    try { localStorage.setItem('emma_history', JSON.stringify(n)); } catch (e) {}
  }

  /* ---------- Emma's voice ---------- */
  function browserSpeak(text) {
    return new Promise((ok) => {
      if (!('speechSynthesis' in window)) return ok();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = cfg.current.rate; u.onend = u.onerror = ok;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
  }
  async function speak(text) {
    const r = R.current;
    if (!cfg.current.voiceOn || !text) return;
    stopListening();
    setTalking(true); setStatus('Emma bol rahi hai…');
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        await new Promise((done) => {
          const a = new Audio(url); r.audio = a; a.playbackRate = Math.min(1.3, Math.max(0.7, cfg.current.rate / 0.95));
          a.onended = a.onerror = () => { URL.revokeObjectURL(url); done(); };
          a.play().catch(done);
        });
      } else await browserSpeak(text);
    } catch (e) { await browserSpeak(text); }
    setTalking(false);
  }

  /* ---------- hands-free listening ---------- */
  function stopListening() {
    const r = R.current;
    if (r.rec) { r.rec.onend = null; try { r.rec.abort(); } catch (e) {} r.rec = null; }
    setListening(false);
  }
  function listen() {
    const r = R.current;
    if (!r.inCall || cfg.current.muted || r.busy || r.rec) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus('Is browser me mic support nahi hai – Chrome use karo, ya neeche type karo'); return; }
    let heard = '';
    const rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e) => { heard = [...e.results].map((x) => x[0].transcript).join(' '); };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { r.deadMic = true; setStatus('Mic permission block hai – address bar me mic Allow karo, ya type karo'); }
    };
    rec.onend = () => {
      setListening(false); r.rec = null;
      if (r.deadMic || !r.inCall || cfg.current.muted || r.busy) return;
      const t = heard.trim();
      if (t) turn(t); else setTimeout(listen, 250);
    };
    try { rec.start(); r.rec = rec; setListening(true); setStatus('Aap boliye… 🎤'); } catch (e) { setTimeout(listen, 500); }
  }

  /* ---------- one conversation turn ---------- */
  async function turn(text, start) {
    const r = R.current;
    if (r.busy || !r.inCall) return;
    r.busy = true; stopListening();
    if (!start) { setYou(text); setCard(null); }
    setStatus('Emma soch rahi hai…');
    try {
      const c = cfg.current;
      const msg = start ? '[CALL_CONNECTED]' : text;
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: r.hist.slice(-12), level: c.level, scenario: c.scenario, hinglish: c.hinglish, past: r.past.slice(0, 6) }),
      });
      if (!res.ok) throw new Error(res.status === 429 ? 'Bahut zyada requests – thoda ruko' : 'Server error (' + res.status + ')');
      const j = await res.json();
      if (!r.inCall) { r.busy = false; return; }
      r.hist.push({ role: 'user', content: msg }, { role: 'assistant', content: j.reply || '.' });
      setEm(j.reply || '');
      if (!start) {
        r.log.push({ said: text, ok: !j.has_mistake, fix: j.corrected, why: j.explanation, tip: j.tip });
        setCard(j);
        if (j.has_mistake) {
          r.past.unshift({ said: text, fix: j.corrected }); r.past = r.past.slice(0, 40);
          try { localStorage.setItem('emma_past', JSON.stringify(r.past)); } catch (e) {}
        }
      }
      r.busy = false;
      await speak((!start && j.has_mistake && j.corrected ? 'You can say: ' + j.corrected + '. ' : '') + (j.reply || ''));
      if (r.inCall) listen();
    } catch (e) {
      r.busy = false; setStatus(e.message || 'Error – dobara bolo');
      setTimeout(() => { if (R.current.inCall) listen(); }, 1500);
    }
  }

  /* ---------- call controls ---------- */
  function startCall() {
    const r = R.current;
    Object.assign(r, { inCall: true, busy: false, hist: [], log: [], deadMic: false, secs: 0 });
    setSecs(0); setYou(''); setEm(''); setCard(null); setMuted(false); cfg.current.muted = false;
    setScreen('call'); setStatus('Connecting…');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => { r.deadMic = true; setStatus('Mic permission Allow karo (ya neeche type karo)'); });
    }
    r.timer = setInterval(() => { r.secs++; setSecs(r.secs); }, 1000);
    setTimeout(() => turn(null, true), 600);
  }
  function endCall() {
    const r = R.current;
    if (!r.inCall) return;
    r.inCall = false; clearInterval(r.timer); stopListening();
    if (r.audio) { try { r.audio.pause(); } catch (e) {} }
    try { speechSynthesis.cancel(); } catch (e) {}
    setTalking(false);
    const log = [...r.log];
    const c = cfg.current;
    const saved = c.saveOn && log.length > 0;
    if (saved) {
      const item = { id: Date.now(), ts: Date.now(), secs: r.secs, level: c.level, scenario: c.scenario, log };
      persistHistory([item, ...history].slice(0, 30));
    }
    setSummary({ secs: r.secs, log, saved });
    setScreen('sum');
  }
  function toggleMute() {
    const m = !muted; setMuted(m); cfg.current.muted = m;
    if (m) { stopListening(); setStatus('Mute hai'); } else listen();
  }
  function toggleVoice() {
    const v = !voiceOn; setVoiceOn(v); cfg.current.voiceOn = v;
    if (!v) { if (R.current.audio) R.current.audio.pause(); try { speechSynthesis.cancel(); } catch (e) {} }
  }
  function sendTyped() {
    const t = typed.trim(); if (!t) return;
    setTyped(''); stopListening(); turn(t);
  }
  function clearMistakes() {
    R.current.past = [];
    try { localStorage.removeItem('emma_past'); } catch (e) {}
    alert('Purani galtiyan bhula di gayi.');
  }

  /* ---------- screens ---------- */
  if (screen === 'home') {
    return (
      <div className="scr">
        <h1>📞 Emma se English me baat karo</h1>
        <p>Call lagao aur seedha bolo. Galti ho to Emma turant sahi karke samjhayegi.</p>
        <div className="vc-stage" style={{ background: 'radial-gradient(120% 80% at 50% 20%,#24406b,#0b1220)', width: 210 }}><Face talk={false} listen={false} /></div>
        <div className="row">
          <select value={level} onChange={(e) => setLevel(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}>{SCENARIOS.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
        <button className="call" onClick={startCall}>📞 Call Emma</button>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button style={sbtn} onClick={() => setScreen('hist')}>📜 History ({history.length})</button>
          <button style={sbtn} onClick={() => setScreen('set')}>⚙️ Settings</button>
        </div>
        <p style={{ fontSize: 13 }}>Headphones lagao, Chrome use karo, aur mic permission Allow karo.</p>
      </div>
    );
  }
  if (screen === 'set') {
    return (
      <div className="scr">
        <h1>⚙️ Settings</h1>
        <div className="mi"><b>Level</b><select value={level} onChange={(e) => setLevel(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        <div className="mi"><b>Scenario</b><select value={scenario} onChange={(e) => setScenario(e.target.value)}>{SCENARIOS.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="mi"><label><input type="checkbox" checked={hinglish} onChange={(e) => setHinglish(e.target.checked)} /> Explanation Hinglish me do</label></div>
        <div className="mi"><label><input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} /> Emma ki awaaz on rakho</label></div>
        <div className="mi"><b>Awaaz ki speed: {rate.toFixed(2)}</b><input type="range" min="0.6" max="1.2" step="0.05" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} style={{ width: '100%' }} /></div>
        <div className="mi"><label><input type="checkbox" checked={saveOn} onChange={(e) => setSaveOn(e.target.checked)} /> Calls History me save karo</label></div>
        <div className="mi"><button style={sbtn} onClick={clearMistakes}>🧹 Purani galtiyan bhulao</button></div>
        <div className="mi"><button style={dbtn} onClick={() => { if (confirm('Poori history hata dein?')) persistHistory([]); }}>🗑️ Poori history hatao</button></div>
        <button style={sbtn} onClick={() => setScreen('home')}>🏠 Home</button>
      </div>
    );
  }
  if (screen === 'hist') {
    return (
      <div className="scr">
        <h1>📜 Meri History</h1>
        {!history.length && <p>Abhi koi call save nahi hui. Ek call karo, phir yahan dikhegi.</p>}
        {history.map((c) => {
          const bad = c.log.filter((l) => !l.ok).length;
          return (
            <div className="mi" key={c.id}>
              <div onClick={() => setOpen(open === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                <b>{new Date(c.ts).toLocaleString()}</b>
                <div>{c.scenario} · {c.level} · {fmt(c.secs)} · {c.log.length} sentences · {bad} galtiyan {open === c.id ? '▲' : '▼'}</div>
              </div>
              {open === c.id && (
                <div>
                  {c.log.map((l, i) => (
                    <div key={i} style={{ marginTop: 8 }}>
                      {l.ok ? <div className="f">✅ {l.said}</div> : (<><div className="s">{l.said}</div><div className="f">✅ {l.fix}</div>{l.why && <div>💡 {l.why}</div>}{l.tip && <div>📌 {l.tip}</div>}</>)}
                    </div>
                  ))}
                  <button style={{ ...dbtn, marginTop: 10 }} onClick={() => persistHistory(history.filter((h) => h.id !== c.id))}>🗑️ Ye call hatao</button>
                </div>
              )}
            </div>
          );
        })}
        <button style={sbtn} onClick={() => setScreen('home')}>🏠 Home</button>
      </div>
    );
  }
  if (screen === 'sum' && summary) {
    const bad = summary.log.filter((l) => !l.ok);
    return (
      <div className="scr">
        <h1>Call khatam 👏</h1>
        <div className="stats"><div><b>{fmt(summary.secs)}</b>Time</div><div><b>{summary.log.length}</b>Sentences</div><div><b>{bad.length}</b>Galtiyan</div></div>
        {summary.saved && <p>✅ History me save ho gayi</p>}
        {!summary.log.length && <p>Is baar koi sentence nahi bola. Dobara try karo!</p>}
        {summary.log.length > 0 && !bad.length && <p>Ek bhi galti nahi – shaandaar! 🎉</p>}
        {bad.map((l, i) => (
          <div className="mi" key={i}><div className="s">{l.said}</div><div className="f">✅ {l.fix}</div><div>💡 {l.why}</div>{l.tip && <div>📌 {l.tip}</div>}</div>
        ))}
        <button className="call" onClick={startCall}>📞 Phir se call karo</button>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button style={sbtn} onClick={() => setScreen('hist')}>📜 History</button>
          <button style={sbtn} onClick={() => setScreen('home')}>🏠 Home</button>
        </div>
      </div>
    );
  }
  return (
    <div className="vc">
      <div className="vc-top"><span>🟢 Emma · AI Tutor</span><span className="tm">{fmt(secs)}</span></div>
      <div className={'vc-stage' + (listening ? ' listen' : '')}><Face talk={talking} listen={listening} /></div>
      <div className="vc-over">
        {card && card.has_mistake && (<><div className="bad">❌ {you}</div><div className="good">✅ {card.corrected}</div></>)}
        {card && !card.has_mistake && <div className="good">✅ Perfect!</div>}
        {em && <div className="sub">{em}</div>}
      </div>
      <div className="st">{status}</div>
      {card && card.has_mistake && (
        <div className="info">
          {card.mistake && <div>❓ {card.mistake}</div>}
          {card.explanation && <div>💡 {card.explanation}</div>}
          {card.tip && <div>📌 {card.tip}</div>}
        </div>
      )}
      <div className="typed" style={{ maxWidth: 460, marginTop: 10 }}>
        <input type="text" value={typed} placeholder="Mic na chale to yahan type karo…" onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendTyped()} />
        <button onClick={sendTyped}>Send</button>
      </div>
      <div className="ctl">
        <button className={'rb' + (muted ? ' on' : '')} onClick={toggleMute} aria-label="Mute">{muted ? '🔇' : '🎤'}</button>
        <button className="rb end" onClick={endCall} aria-label="End call">📞</button>
        <button className={'rb' + (!voiceOn ? ' on' : '')} onClick={toggleVoice} aria-label="Voice">{voiceOn ? '🔊' : '🔈'}</button>
      </div>
    </div>
  );
  }
