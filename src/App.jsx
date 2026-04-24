import ProScene from "./ProScene.jsx";
import SavedComps, { useSavedComps, SaveModal } from "./SavedComps.jsx";
import { useState, useEffect, useCallback, useMemo } from "react";
import { analyzeComp } from "./engine.js";

// ─── Data Dragon ───────────────────────────────────────────────────────────────
const DDRAGON_VERSIONS  = "https://ddragon.leagueoflegends.com/api/versions.json";
const DDRAGON_CHAMPIONS = (v, lang = "pt_BR") =>
  `https://ddragon.leagueoflegends.com/cdn/${v}/data/${lang}/champion.json`;
const DDRAGON_IMG = (v, id) =>
  `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${id}.png`;

const ROLES = [
  { key:"top",     label:"TOP",    icon:"⚔",  color:"#e8442b", glow:"#e8442b" },
  { key:"jungle",  label:"JUNGLE", icon:"◈",  color:"#3cb043", glow:"#3cb043" },
  { key:"mid",     label:"MID",    icon:"◆",  color:"#0bc4e3", glow:"#0bc4e3" },
  { key:"adc",     label:"BOT",    icon:"◎",  color:"#f0b429", glow:"#f0b429" },
  { key:"support", label:"SUPPORT",icon:"◉",  color:"#a78bfa", glow:"#a78bfa" },
];

const ROLE_OVERRIDES = {
  Darius:"top",Garen:"top",Fiora:"top",Malphite:"top",Camille:"top",
  Riven:"top",Shen:"top",Ornn:"top",Gnar:"top",Renekton:"top",
  Teemo:"top",Kennen:"top",Chogath:"top",Urgot:"top",Mordekaiser:"top",
  Illaoi:"top",Tryndamere:"top",Nasus:"top",Singed:"top",Poppy:"top",
  DrMundo:"top",Kayle:"top",Gangplank:"top",Jayce:"top",Volibear:"top",Irelia:"top",
  Vi:"jungle",Warwick:"jungle",Amumu:"jungle",Hecarim:"jungle",Nidalee:"jungle",
  Kayn:"jungle",Viego:"jungle",Graves:"jungle",Khazix:"jungle",Rengar:"jungle",
  Evelynn:"jungle",MasterYi:"jungle",Shaco:"jungle",Diana:"jungle",JarvanIV:"jungle",
  Nocturne:"jungle",Shyvana:"jungle",Udyr:"jungle",Sejuani:"jungle",Rammus:"jungle",
  Zac:"jungle",Ekko:"jungle",Elise:"jungle",Fiddlesticks:"jungle",Ivern:"jungle",
  Karthus:"jungle",LeeSin:"jungle",Lillia:"jungle",Nunu:"jungle",Olaf:"jungle",
  RekSai:"jungle",Skarner:"jungle",Trundle:"jungle",MonkeyKing:"jungle",XinZhao:"jungle",
  Yasuo:"mid",Ahri:"mid",Zed:"mid",Syndra:"mid",Orianna:"mid",Viktor:"mid",
  Cassiopeia:"mid",Leblanc:"mid",Fizz:"mid",Katarina:"mid",Yone:"mid",
  AurelionSol:"mid",Azir:"mid",Kassadin:"mid",Lissandra:"mid",Malzahar:"mid",
  Ryze:"mid",Swain:"mid",Taliyah:"mid",Talon:"mid",TwistedFate:"mid",
  Veigar:"mid",Vex:"mid",Vladimir:"mid",Xerath:"mid",Zoe:"mid",Ziggs:"mid",
  Qiyana:"mid",Neeko:"mid",Akali:"mid",Galio:"mid",Corki:"mid",
  Jinx:"adc",Ezreal:"adc",Caitlyn:"adc",Vayne:"adc",Jhin:"adc",Kaisa:"adc",
  Tristana:"adc",Draven:"adc",Sivir:"adc",Xayah:"adc",Lucian:"adc",
  Aphelios:"adc",MissFortune:"adc",Samira:"adc",Ashe:"adc",KogMaw:"adc",
  Twitch:"adc",Varus:"adc",Zeri:"adc",Nilah:"adc",Smolder:"adc",
  Thresh:"support",Leona:"support",Blitzcrank:"support",Nami:"support",
  Soraka:"support",Lulu:"support",Nautilus:"support",Braum:"support",
  Yuumi:"support",Morgana:"support",Janna:"support",Senna:"support",
  Rakan:"support",Alistar:"support",Pyke:"support",Bard:"support",
  Karma:"support",Maokai:"support",Rell:"support",Sona:"support",
  Taric:"support",Zyra:"support",Zilean:"support",Seraphine:"support",Lux:"support",
  Aatrox:"top",Akshan:"mid",Ambessa:"top",Anivia:"mid",Annie:"mid",Aurora:"mid",
  Belveth:"jungle",Brand:"support",Briar:"jungle",Gragas:"support",Gwen:"top",
  Heimerdinger:"mid",Hwei:"mid",Jax:"top",KSante:"top",Kalista:"adc",
  Kindred:"jungle",Kled:"top",Mel:"support",Milio:"support",Naafiri:"jungle",
  Pantheon:"support",Quinn:"top",Renata:"support",Rumble:"top",Sett:"top",
  Sion:"top",Sylas:"jungle",TahmKench:"support",Velkoz:"support",Yorick:"top",
  Yunara:"adc",Zaahen:"jungle",
};
const TAG_ROLE_MAP = {
  Fighter:["top","jungle"],Tank:["top","support"],
  Mage:["mid","support"],Assassin:["mid","jungle"],
  Marksman:["adc"],Support:["support"],
};
function deriveRoles(id, tags) {
  if (ROLE_OVERRIDES[id]) return [ROLE_OVERRIDES[id]];
  const s = new Set(); tags.forEach(t=>(TAG_ROLE_MAP[t]||[]).forEach(r=>s.add(r)));
  return s.size ? [...s] : ["mid"];
}

// ─── ChampImg ─────────────────────────────────────────────────────────────────
function ChampImg({ version, id, name, size=40, radius=2, border, style={} }) {
  return (
    <img
      src={DDRAGON_IMG(version, id)}
      alt={name}
      style={{ width:size, height:size, objectFit:"cover", borderRadius:radius,
        border: border||"none", flexShrink:0, ...style }}
    />
  );
}

// ─── CSS global ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Barlow+Condensed:wght@300;400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cyan:     #0bc4e3;
    --gold:     #c8972a;
    --gold-lt:  #f0c060;
    --red:      #e8442b;
    --green:    #3cb043;
    --purple:   #a78bfa;
    --bg0:      #020a14;
    --bg1:      #050f1e;
    --bg2:      #0a1c30;
    --bg3:      #0d2540;
    --surface:  rgba(11,196,227,0.05);
    --border:   rgba(200,151,42,0.25);
    --border-c: rgba(11,196,227,0.15);
    --text:     #c8d4de;
    --muted:    #4e6a80;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--bg0);
    color: var(--text);
    font-family: 'Barlow', sans-serif;
    font-size: 14px;
    min-height: 100vh;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg1); }
  ::-webkit-scrollbar-thumb { background: rgba(200,151,42,0.3); border-radius: 2px; }

  @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes scanline  { 0%{transform:translateY(-100%)} 100%{transform:translateY(500%)} }
  @keyframes goldGlow  { 0%,100%{box-shadow:0 0 10px rgba(200,151,42,.2),inset 0 0 20px rgba(200,151,42,.04)} 50%{box-shadow:0 0 24px rgba(200,151,42,.45),inset 0 0 30px rgba(200,151,42,.08)} }
  @keyframes cyanGlow  { 0%,100%{box-shadow:0 0 10px rgba(11,196,227,.2)} 50%{box-shadow:0 0 28px rgba(11,196,227,.5),0 0 56px rgba(11,196,227,.15)} }
  @keyframes sheetUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes backdropIn{ from{opacity:0} to{opacity:1} }
  @keyframes hexRing   { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes barFill   { from{width:0} }
  @keyframes orbFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes shimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

  /* ─ Background ─ */
  .stars-bg {
    position:fixed; inset:0; pointer-events:none; z-index:0;
    background:
      radial-gradient(ellipse 80% 50% at 20% -5%, rgba(11,196,227,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(200,151,42,0.04) 0%, transparent 60%),
      radial-gradient(ellipse 100% 80% at 50% 50%, rgba(5,15,30,0.95) 0%, var(--bg0) 100%);
  }
  .stars-bg::before {
    content:''; position:absolute; inset:0;
    background-image:
      radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,.35) 0%, transparent 100%),
      radial-gradient(1px 1px at 27% 42%, rgba(255,255,255,.2) 0%, transparent 100%),
      radial-gradient(1px 1px at 43% 9%, rgba(255,255,255,.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 62% 58%, rgba(255,255,255,.18) 0%, transparent 100%),
      radial-gradient(1px 1px at 78% 22%, rgba(255,255,255,.25) 0%, transparent 100%),
      radial-gradient(1px 1px at 88% 72%, rgba(255,255,255,.2) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 6% 82%, rgba(11,196,227,.45) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 92% 38%, rgba(200,151,42,.35) 0%, transparent 100%),
      radial-gradient(1px 1px at 58% 93%, rgba(255,255,255,.15) 0%, transparent 100%);
  }

  /* ─ Hex Ornament ─ */
  .hex-clip {
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  }

  /* ─ Hextech panel ─ */
  .hx-panel {
    background: linear-gradient(135deg, rgba(11,196,227,0.04) 0%, rgba(5,15,30,0.9) 100%);
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }
  .hx-panel::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
    opacity: .5;
  }
  .hx-panel::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent 0%, rgba(11,196,227,.3) 50%, transparent 100%);
  }

  /* Gold corner ornaments */
  .hx-corners::before, .hx-corners::after {
    content:''; position:absolute; width:14px; height:14px;
    border-color: var(--gold); border-style:solid; opacity:.7;
  }
  .hx-corners::before { top:0; left:0; border-width:1.5px 0 0 1.5px; }
  .hx-corners::after  { bottom:0; right:0; border-width:0 1.5px 1.5px 0; }

  /* ─ Buttons ─ */
  .btn-hextech {
    background: linear-gradient(135deg, rgba(200,151,42,0.15) 0%, rgba(200,151,42,0.08) 100%);
    color: var(--gold-lt);
    border: 1px solid rgba(200,151,42,0.5);
    padding: 13px 28px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700; font-size: 12px; letter-spacing: .18em;
    text-transform: uppercase; cursor: pointer;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    transition: all .2s; position: relative; overflow: hidden;
  }
  .btn-hextech::before {
    content:''; position:absolute; inset:0;
    background: linear-gradient(90deg, transparent, rgba(200,151,42,.12), transparent);
    transform: translateX(-100%); transition: transform .4s;
  }
  .btn-hextech:hover::before { transform: translateX(100%); }
  .btn-hextech:hover { border-color: var(--gold-lt); filter: brightness(1.25); }
  .btn-hextech:disabled {
    background: rgba(255,255,255,0.03);
    border-color: rgba(255,255,255,0.08);
    color: var(--muted); cursor: not-allowed; filter: none;
  }
  .btn-hextech.ready { animation: goldGlow 2.5s ease infinite; }

  .btn-cyan {
    background: transparent;
    color: var(--cyan);
    border: 1px solid var(--border-c);
    padding: 10px 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600; font-size: 11px; letter-spacing: .15em;
    text-transform: uppercase; cursor: pointer; transition: all .2s;
  }
  .btn-cyan:hover { border-color: var(--cyan); background: rgba(11,196,227,.07); }

  /* ─ Layout ─ */
  .app-layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    min-height: calc(100vh - 58px);
    position: relative; z-index: 1;
  }
  @media (max-width: 960px) {
    .app-layout { grid-template-columns: 1fr; }
  }

  /* ─ Draft card ─ */
  .draft-card {
    position: relative; cursor: pointer; overflow: hidden;
    transition: outline .2s, box-shadow .2s, transform .15s;
    WebkitTapHighlightColor: transparent; user-select: none;
  }
  .draft-card:active { transform: scale(.97); }

  /* ─ Champion grid ─ */
  .champ-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 6px;
  }
  @media (max-width: 960px) {
    .champ-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; }
  }

  /* ─ Bottom sheet ─ */
  .bottom-sheet {
    position: fixed; bottom:0; left:50%; transform:translateX(-50%);
    width:100%; max-width:540px; z-index:300;
    background: var(--bg1);
    border-top: 1px solid rgba(200,151,42,.35);
    border-radius: 16px 16px 0 0;
    height: 80vh; display:flex; flex-direction:column;
    animation: sheetUp .28s cubic-bezier(0.32,0.72,0,1);
  }
  .sheet-backdrop {
    position:fixed; inset:0; background:rgba(2,10,20,0.88);
    backdrop-filter:blur(10px); z-index:299;
    animation: backdropIn .2s ease;
  }

  /* ─ Tab bar ─ */
  .tab-bar { display:flex; border-bottom:1px solid var(--border); }
  .tab-btn {
    flex:1; padding:10px 4px; background:none; border:none; cursor:pointer;
    font-family:'Barlow Condensed',sans-serif; font-weight:700;
    font-size:10px; letter-spacing:.15em; color:var(--muted);
    border-bottom:2px solid transparent; margin-bottom:-1px;
    transition:all .2s; WebkitTapHighlightColor:transparent;
  }
  .tab-btn.active { color:var(--gold-lt); border-bottom-color:var(--gold); }
  .tab-btn:hover:not(.active) { color:var(--text); }

  /* ─ Scanline ─ */
  .scanline-wrap { position:relative; overflow:hidden; }
  .scanline-wrap::after {
    content:''; position:absolute; left:0; right:0; height:35%;
    background: linear-gradient(transparent, rgba(11,196,227,.025), transparent);
    animation: scanline 5s linear infinite; pointer-events:none;
  }

  /* ─ Stat bar ─ */
  .stat-track {
    height: 5px; background: rgba(255,255,255,0.05);
    border-radius: 0; overflow: hidden; position: relative;
  }
  .stat-fill {
    height: 100%; border-radius: 0;
    transition: width 1.1s cubic-bezier(0.34,1.2,0.64,1);
    animation: barFill 1.1s cubic-bezier(0.34,1.2,0.64,1);
  }

  /* ─ Live stats ─ */
  .live-stat-bar {
    height: 8px; background: rgba(255,255,255,.05); border-radius: 1px; overflow:hidden;
  }

  button:active { opacity:.8; }
`;

// ─── SVG Role icons ───────────────────────────────────────────────────────────
const ROLE_ICONS = {
  top: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <line x1="15" y1="5" x2="15" y2="25" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="10" y1="10" x2="20" y2="10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  jungle: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M10 20 Q8 14 10 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 21 Q13 14 14 7" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M18 20 Q20 14 18 8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 22 Q14 25 20 22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  mid: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <polygon points="14,4 22,14 14,24 6,14" stroke={color} strokeWidth="2" fill={color + "22"}/>
      <polygon points="14,9 18,14 14,19 10,14" fill={color} opacity="0.5"/>
    </svg>
  ),
  adc: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="8" stroke={color} strokeWidth="1.8"/>
      <circle cx="14" cy="14" r="2.5" fill={color} opacity="0.7"/>
      <line x1="14" y1="4" x2="14" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="20" x2="14" y2="24" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="4" y1="14" x2="8" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <line x1="20" y1="14" x2="24" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  support: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M14 4 L22 7 L22 15 Q22 21 14 25 Q6 21 6 15 L6 7 Z"
        stroke={color} strokeWidth="2" fill={color + "18"}/>
      <path d="M10 14 L13 17 L18 11" stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ─── HextechLogo ──────────────────────────────────────────────────────────────
function HextechLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 29,9 29,23 16,30 3,23 3,9"
        fill="none" stroke="rgba(200,151,42,0.7)" strokeWidth="1.2"/>
      <polygon points="16,6 25,11 25,21 16,26 7,21 7,11"
        fill="rgba(11,196,227,0.08)" stroke="#0bc4e3" strokeWidth="1"/>
      <polygon points="16,11 20,13.5 20,18.5 16,21 12,18.5 12,13.5"
        fill="rgba(11,196,227,0.25)" stroke="#0bc4e3" strokeWidth=".6"/>
    </svg>
  );
}

// ─── DraftSlot — redesigned Hextech card ─────────────────────────────────────
function DraftSlot({ roleKey, champ, version, onTap, onRemove }) {
  const r = ROLES.find(r => r.key === roleKey);
  const [hover, setHover] = useState(false);

  return (
    <div
      className="draft-card hx-corners"
      onClick={() => onTap(roleKey)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, minWidth: 0,
        outline: `1.5px solid ${champ ? r.color + "cc" : hover ? r.color + "55" : "rgba(200,151,42,0.2)"}`,
        boxShadow: champ
          ? `0 0 32px ${r.color}30, inset 0 0 50px ${r.color}08`
          : hover ? `0 0 16px ${r.color}20` : "none",
        alignSelf: "stretch",
        borderRadius: 2,
      }}
    >
      {champ ? (
        <>
          {/* Splash art */}
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ.id}_0.jpg`}
            alt={champ.name}
            onError={e => { e.target.src = DDRAGON_IMG(version, champ.id); e.target.style.objectPosition = "center"; }}
            style={{
              position:"absolute", inset:0, width:"100%", height:"100%",
              objectFit:"cover", objectPosition:"top center",
              transition:"transform .45s ease",
              transform: hover ? "scale(1.05)" : "scale(1)",
            }}
          />
          {/* Dark vignette — preserve face */}
          <div style={{
            position:"absolute", inset:0,
            background:`linear-gradient(to bottom, rgba(5,12,24,0.05) 0%, transparent 40%, rgba(5,12,24,0.6) 72%, rgba(5,12,24,0.97) 100%)`,
          }}/>
          {/* Top accent bar */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:3,
            background:`linear-gradient(90deg, transparent, ${r.color}, transparent)`,
          }}/>
          {/* Gold hex border top-right ornament */}
          <div style={{
            position:"absolute", top:0, right:0, width:0, height:0,
            borderTop:`20px solid ${r.color}60`,
            borderLeft:"20px solid transparent",
          }}/>
          {/* Scanline hover effect */}
          {hover && (
            <div style={{
              position:"absolute", inset:0,
              background:`repeating-linear-gradient(0deg, transparent, transparent 3px, ${r.color}04 3px, ${r.color}04 4px)`,
              pointerEvents:"none",
            }}/>
          )}
        </>
      ) : (
        /* ── Empty state ── */
        <>
          <div style={{
            position:"absolute", inset:0,
            background:`radial-gradient(ellipse at 50% 40%, ${r.color}0c 0%, transparent 70%), #040c18`,
          }}/>
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:`radial-gradient(circle, ${r.color}22 1px, transparent 1px)`,
            backgroundSize:"22px 22px",
            opacity: hover ? 0.9 : 0.35, transition:"opacity .25s",
          }}/>
          <div style={{
            position:"absolute", inset:0,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:12,
          }}>
            <div style={{
              opacity: hover ? 0.9 : 0.28,
              transform: hover ? "scale(1.1)" : "scale(1)",
              transition:"all .22s",
              filter: hover ? `drop-shadow(0 0 12px ${r.color})` : "none",
            }}>
              {ROLE_ICONS[roleKey](r.color, 46)}
            </div>
            <span style={{
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:9, letterSpacing:".22em",
              color: hover ? r.color : "rgba(255,255,255,0.18)",
              transition:"color .2s",
            }}>SELECIONAR</span>
          </div>
        </>
      )}

      {/* Role chip */}
      <div style={{
        position:"absolute", top:10, left:10,
        display:"flex", alignItems:"center", gap:5,
        background:"rgba(2,8,20,0.78)", backdropFilter:"blur(8px)",
        borderRadius:2, padding:"4px 8px",
        border:`1px solid ${r.color}44`, zIndex:2,
      }}>
        {ROLE_ICONS[roleKey](r.color, 12)}
        <span style={{
          fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:9, letterSpacing:".15em", color:r.color,
        }}>{r.label}</span>
      </div>

      {/* Remove button */}
      {champ && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(roleKey); }}
          style={{
            position:"absolute", top:8, right:8, zIndex:3,
            width:24, height:24, borderRadius:"50%",
            background:"rgba(232,68,43,0.85)", backdropFilter:"blur(6px)",
            border:"1.5px solid rgba(255,255,255,0.15)",
            color:"#fff", fontSize:13, fontWeight:700,
            cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", lineHeight:1,
            WebkitTapHighlightColor:"transparent",
          }}
          onMouseEnter={e => e.currentTarget.style.background="#e8442b"}
          onMouseLeave={e => e.currentTarget.style.background="rgba(232,68,43,0.85)"}
        >×</button>
      )}

      {/* Champion info — footer */}
      {champ && (
        <div style={{
          position:"absolute", bottom:0, left:0, right:0,
          padding:"12px 12px 14px", zIndex:2,
        }}>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:"clamp(11px, 1.8vw, 16px)", color:"#fff",
            letterSpacing:".03em", lineHeight:1.1,
            textShadow:"0 1px 8px rgba(0,0,0,0.95)",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>{champ.name}</div>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
            fontSize:"clamp(7px, 1.1vw, 10px)",
            color:r.color, letterSpacing:".1em", marginTop:2,
            textShadow:`0 0 10px ${r.color}88`,
          }}>{champ.tags?.join(" · ")}</div>
        </div>
      )}
    </div>
  );
}

// ─── DraftBoard ───────────────────────────────────────────────────────────────
function DraftBoard({ comp, version, onTap, onRemove, onAnalyze, allFilled, filled, ddVersion }) {
  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      padding:"14px 16px 14px",
      background:"var(--bg0)", overflow:"hidden", minHeight:0,
    }}>
      {/* Header */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:12, flexShrink:0,
      }}>
        <div style={{
          fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:9, letterSpacing:".22em", color:"rgba(200,151,42,0.55)",
          display:"flex", alignItems:"center", gap:7,
        }}>
          <span style={{
            width:5, height:5, borderRadius:"50%", background:"var(--cyan)",
            display:"inline-block", boxShadow:"0 0 6px var(--cyan)",
          }}/>
          FASE 01 — DRAFT · SELECIONE OS 5 CAMPEÕES
        </div>
        {/* Progress */}
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {ROLES.map(r => (
            <div key={r.key} style={{
              width: comp[r.key] ? 11 : 7, height: comp[r.key] ? 11 : 7,
              borderRadius:2, transition:"all .25s",
              background: comp[r.key] ? r.color : "rgba(255,255,255,0.07)",
              boxShadow: comp[r.key] ? `0 0 8px ${r.color}` : "none",
            }}/>
          ))}
          <span style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:14, marginLeft:4, letterSpacing:".05em",
            color: filled===5 ? "var(--gold-lt)" : "var(--muted)",
            transition:"color .3s",
          }}>{filled}<span style={{ opacity:.35, fontWeight:400 }}>/5</span></span>
        </div>
      </div>

      {/* 5 cards */}
      <div style={{ display:"flex", gap:8, flex:1, minHeight:0 }}>
        {ROLES.map(r => (
          <DraftSlot key={r.key} roleKey={r.key} champ={comp[r.key]}
            version={version} onTap={onTap} onRemove={onRemove} />
        ))}
      </div>

      {/* Analyze button */}
      <div style={{ marginTop:12, flexShrink:0 }}>
        <button
          onClick={onAnalyze} disabled={!allFilled}
          className={`btn-hextech ${allFilled ? "ready" : ""}`}
          style={{ width:"100%", padding:"14px", fontSize:12 }}
        >
          {allFilled
            ? "◆ ANALISAR COMPOSIÇÃO"
            : `SELECIONE MAIS ${5 - filled} CAMPEÃO${5-filled!==1?"ÕES":""}`}
        </button>
        <div style={{ textAlign:"center", marginTop:5, fontSize:8,
          color:"rgba(200,151,42,0.25)", letterSpacing:".12em",
          fontFamily:"'Barlow Condensed',sans-serif" }}>
          ANÁLISE LOCAL · RIOT DATA DRAGON v{ddVersion}
        </div>
      </div>
    </div>
  );
}

// ─── RadarChart — Synergy Metrics ─────────────────────────────────────────────
function RadarChart({ analysis }) {
  const dims = [
    { label:"CROWD\nCONTROL", val: analysis.engage },
    { label:"POKE",           val: analysis.poke },
    { label:"DURABILITY",     val: Math.round((analysis.teamFight + analysis.earlyGame)/2) },
    { label:"MOBILITY",       val: analysis.split },
    { label:"INITIATION",     val: analysis.engage },
  ];
  const N = dims.length;
  const cx = 90, cy = 90, r = 65;
  const pts = dims.map((d, i) => {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
    const frac = d.val / 100;
    return { x: cx + Math.cos(angle) * r * frac, y: cy + Math.sin(angle) * r * frac };
  });
  const webs = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg width={180} height={180} viewBox="0 0 180 180">
      {/* Web rings */}
      {webs.map(w => {
        const webPts = dims.map((_, i) => {
          const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
          return `${cx + Math.cos(angle) * r * w},${cy + Math.sin(angle) * r * w}`;
        }).join(" ");
        return <polygon key={w} points={webPts} fill="none" stroke="rgba(200,151,42,0.15)" strokeWidth="0.8"/>;
      })}
      {/* Axis lines */}
      {dims.map((d, i) => {
        const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
        return <line key={i}
          x1={cx} y1={cy}
          x2={cx + Math.cos(angle) * r} y2={cy + Math.sin(angle) * r}
          stroke="rgba(200,151,42,0.2)" strokeWidth="0.8"/>;
      })}
      {/* Fill area */}
      <polygon
        points={pts.map(p => `${p.x},${p.y}`).join(" ")}
        fill="rgba(11,196,227,0.15)" stroke="#0bc4e3" strokeWidth="1.5"
        style={{ filter:"drop-shadow(0 0 6px rgba(11,196,227,0.5))" }}
      />
      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3}
          fill="#0bc4e3" style={{ filter:"drop-shadow(0 0 4px #0bc4e3)" }}/>
      ))}
      {/* Labels */}
      {dims.map((d, i) => {
        const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 18);
        const ly = cy + Math.sin(angle) * (r + 18);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fontFamily="'Barlow Condensed',sans-serif" fontWeight="700"
            letterSpacing=".08em" fill="rgba(200,210,220,0.6)">
            {d.label.split("\n").map((line, li) => (
              <tspan key={li} x={lx} dy={li === 0 ? 0 : 9}>{line}</tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

// ─── BarChart — Damage Type ───────────────────────────────────────────────────
function DamageChart({ physical, magic }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:20, padding:"8px 16px 0" }}>
      {[
        { label:"PHYSICAL\nDAMAGE", pct:physical, color:"#c8442b" },
        { label:"MAGIC\nDAMAGE",    pct:magic,    color:"#0bc4e3" },
      ].map(bar => (
        <div key={bar.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <span style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:18, color: bar.color,
            textShadow:`0 0 16px ${bar.color}80`,
          }}>{bar.pct}%</span>
          <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ width:"60%", height:60, display:"flex", flexDirection:"column",
              justifyContent:"flex-end" }}>
              <div style={{
                width:"100%", height:`${bar.pct}%`,
                background:`linear-gradient(180deg, ${bar.color} 0%, ${bar.color}66 100%)`,
                boxShadow:`0 0 12px ${bar.color}60`,
                borderRadius:"2px 2px 0 0",
                transition:"height 1s cubic-bezier(0.34,1.2,0.64,1)",
              }}/>
            </div>
          </div>
          <span style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:8, letterSpacing:".1em", color:"var(--muted)",
            textAlign:"center", whiteSpace:"pre-line", lineHeight:1.4,
          }}>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── BigStatBar ───────────────────────────────────────────────────────────────
function BigStatBar({ label, value, color }) {
  return (
    <div style={{ marginBottom:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
        <span style={{
          fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:10, letterSpacing:".14em", color:"var(--muted)",
        }}>{label}</span>
        <span style={{
          fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
          fontSize:13, color, letterSpacing:".05em",
        }}>{value}</span>
      </div>
      <div className="stat-track">
        <div className="stat-fill" style={{
          width:`${value}%`,
          background:`linear-gradient(90deg, ${color}55, ${color})`,
          boxShadow:`0 0 8px ${color}50`,
        }}/>
      </div>
    </div>
  );
}

// ─── WinProbOrb ───────────────────────────────────────────────────────────────
function WinProbOrb({ winrate, rating, playstyle }) {
  const RC = { S:"#f0b429", A:"#0bc4e3", B:"#a78bfa", C:"#5a7a90" };
  const color = RC[rating] || "#0bc4e3";
  const circumference = 2 * Math.PI * 38;
  const pct = winrate / 100;
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"16px 0",
    }}>
      <div style={{ position:"relative", width:120, height:120 }}>
        {/* Hextech frame rings */}
        <svg width={120} height={120} viewBox="0 0 120 120" style={{ position:"absolute", inset:0 }}>
          {/* outer hex */}
          <polygon points="60,4 112,32 112,88 60,116 8,88 8,32"
            fill="none" stroke="rgba(200,151,42,0.4)" strokeWidth="1.2"/>
          {/* inner hex */}
          <polygon points="60,14 102,37 102,83 60,106 18,83 18,37"
            fill="rgba(11,196,227,0.04)" stroke="rgba(11,196,227,0.2)" strokeWidth="0.8"/>
          {/* Progress circle */}
          <circle cx="60" cy="60" r="38" fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
          <circle cx="60" cy="60" r="38" fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            strokeLinecap="butt"
            transform="rotate(-90 60 60)"
            style={{ filter:`drop-shadow(0 0 6px ${color})`, transition:"stroke-dashoffset 1.2s ease" }}
          />
          {/* Gear-like ticks */}
          {[...Array(6)].map((_,i) => {
            const angle = (60 * i - 90) * Math.PI / 180;
            return <line key={i}
              x1={60 + Math.cos(angle)*48} y1={60 + Math.sin(angle)*48}
              x2={60 + Math.cos(angle)*53} y2={60 + Math.sin(angle)*53}
              stroke="rgba(200,151,42,0.5)" strokeWidth="2"/>;
          })}
        </svg>
        {/* Center content */}
        <div style={{
          position:"absolute", inset:0,
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          gap:0,
        }}>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
            fontSize:28, lineHeight:1, color:"var(--gold-lt)",
            textShadow:"0 0 20px rgba(200,151,42,0.6)",
          }}>{winrate}%</div>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:8, letterSpacing:".12em", color:"var(--muted)",
            marginTop:2,
          }}>WIN PROBABILITY</div>
          <div style={{
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:9, letterSpacing:".08em", color,
            marginTop:3,
          }}>Confidence: {rating==="S"?"High":rating==="A"?"High":rating==="B"?"Medium":"Low"}</div>
        </div>
      </div>
    </div>
  );
}

// ─── AnalysisPanel ─────────────────────────────────────────────────────────────
function AnalysisPanel({ analysis, comp, version, onBack, onReset, onSave }) {
  const [tab, setTab] = useState("synergy");
  const RC = { S:"#f0b429", A:"#0bc4e3", B:"#a78bfa", C:"#5a7a90" };
  const ratingColor = RC[analysis.rating] || "#0bc4e3";

  // Compute physical vs magic from tags
  const physTags = ["Fighter","Tank","Assassin","Marksman"];
  const champList = Object.values(comp).filter(Boolean);
  let physCount = 0, magicCount = 0;
  champList.forEach(c => {
    if (c.tags?.some(t => physTags.includes(t))) physCount++;
    else magicCount++;
  });
  const total = physCount + magicCount || 1;
  const physPct = Math.round(physCount / total * 100);
  const magicPct = 100 - physPct;

  const stats = [
    { label:"TEAMFIGHT",  value:analysis.teamFight, color:"#e8442b" },
    { label:"EARLY GAME", value:analysis.earlyGame,  color:"#f0b429" },
    { label:"ENGAGE",     value:analysis.engage,     color:"#3cb043" },
    { label:"POKE",       value:analysis.poke,       color:"#0bc4e3" },
    { label:"SPLIT PUSH", value:analysis.split,      color:"#a78bfa" },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
      background:"var(--bg0)", overflow:"hidden", animation:"fadeUp .35s ease" }}>

      {/* ── Splash banner ── */}
      <div style={{ position:"relative", flexShrink:0, height:155 }}>
        <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
          {ROLES.map((r, ri) => {
            const c = comp[r.key];
            return (
              <div key={r.key} style={{ flex:1, position:"relative", overflow:"hidden" }}>
                {c ? (
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${c.id}_0.jpg`}
                    alt={c.name}
                    onError={e => { e.target.src = DDRAGON_IMG(version, c.id); }}
                    style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                      objectFit:"cover", objectPosition:"top center" }}
                  />
                ) : (
                  <div style={{ position:"absolute", inset:0, background:`${r.color}08` }}/>
                )}
                <div style={{ position:"absolute", inset:0,
                  background:`linear-gradient(to bottom, rgba(4,10,20,0.1) 0%, rgba(4,10,20,0.75) 100%)` }}/>
                {ri > 0 && <div style={{ position:"absolute", left:0, top:0, bottom:0,
                  width:1, background:`${r.color}40` }}/>}
                <div style={{ position:"absolute", bottom:6, left:0, right:0,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                  {ROLE_ICONS[r.key](r.color, 13)}
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:7, color:r.color, letterSpacing:".12em",
                    textShadow:`0 0 8px ${r.color}` }}>{r.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Gold border top */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
          background:"linear-gradient(90deg, transparent, var(--gold), transparent)" }}/>
        {/* Phase label */}
        <div style={{
          position:"absolute", top:8, left:8, zIndex:4,
          background:"rgba(2,8,20,0.8)", backdropFilter:"blur(8px)",
          border:"1px solid rgba(200,151,42,0.3)", borderRadius:2, padding:"4px 10px",
        }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:8, letterSpacing:".18em", color:"rgba(200,151,42,0.7)" }}>
            FASE 02 — ANÁLISE DE COMPOSIÇÃO
          </span>
        </div>
        {/* Back button */}
        <button onClick={onBack} style={{
          position:"absolute", top:8, right:8, zIndex:4,
          background:"rgba(2,8,20,0.78)", backdropFilter:"blur(6px)",
          border:"1px solid rgba(11,196,227,0.2)", borderRadius:2,
          padding:"5px 10px", color:"var(--cyan)", fontSize:9,
          fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".12em",
          fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4,
        }}>← DRAFT</button>
      </div>

      {/* ── Stats ── */}
      <div style={{
        padding:"12px 16px 10px",
        borderBottom:"1px solid var(--border)",
        background:"linear-gradient(180deg,rgba(200,151,42,0.03) 0%,transparent 100%)",
        flexShrink:0,
      }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 22px" }}>
          {stats.map(s => <BigStatBar key={s.label} label={s.label} value={s.value} color={s.color}/>)}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar" style={{ flexShrink:0 }}>
        {[
          {k:"synergy",  l:"SINERGIAS"},
          {k:"strategy", l:"ESTRATÉGIA"},
          {k:"weak",     l:"FRAQUEZAS"},
          {k:"data",     l:"DATA"},
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`tab-btn ${tab===t.k?"active":""}`}>{t.l}</button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
        {tab==="synergy" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {analysis.synergies?.length ? analysis.synergies.map((s,i) => (
              <div key={i} className="hx-panel hx-corners" style={{ padding:12, borderRadius:2 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:11, color:"var(--gold-lt)", letterSpacing:".08em", marginBottom:5 }}>
                  ◆ {s.pair}
                </div>
                <p style={{ fontSize:12, color:"var(--text)", lineHeight:1.6 }}>{s.desc}</p>
              </div>
            )) : (
              <div style={{ padding:20, textAlign:"center", color:"var(--muted)", fontSize:12 }}>
                Nenhuma sinergia marcante detectada.
              </div>
            )}
          </div>
        )}
        {tab==="strategy" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div className="hx-panel hx-corners" style={{ padding:14, borderRadius:2 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, letterSpacing:".18em", color:"var(--cyan)", marginBottom:8 }}>
                ◆ ESTRATÉGIA GERAL
              </div>
              <p style={{ fontSize:12, color:"var(--text)", lineHeight:1.65 }}>{analysis.strategy}</p>
            </div>
            <div className="hx-panel hx-corners" style={{ padding:14, borderRadius:2, borderColor:"rgba(48,185,69,0.3)" }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, letterSpacing:".18em", color:"var(--green)", marginBottom:8 }}>
                ◆ WIN CONDITION
              </div>
              <p style={{ fontSize:12, color:"var(--text)", lineHeight:1.65 }}>{analysis.win_condition}</p>
            </div>
          </div>
        )}
        {tab==="weak" && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {analysis.weaknesses?.length ? analysis.weaknesses.map((w,i) => (
              <div key={i} className="hx-panel" style={{
                padding:"10px 12px", borderColor:"rgba(232,68,43,0.3)",
                display:"flex", alignItems:"flex-start", gap:10, borderRadius:2,
              }}>
                <span style={{ color:"var(--red)", fontSize:12, flexShrink:0, marginTop:1 }}>◆</span>
                <span style={{ fontSize:12, color:"var(--text)", lineHeight:1.55 }}>{w}</span>
              </div>
            )) : (
              <div style={{ padding:20, textAlign:"center", color:"var(--green)", fontSize:12 }}>
                ✓ Composição bem equilibrada — sem fraquezas críticas.
              </div>
            )}
          </div>
        )}
        {tab==="data" && (
          <div>
            {analysis.champStats && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:9, letterSpacing:".15em", color:"var(--muted)", marginBottom:8 }}>
                  ◆ STATS BASE NÍVEL 1 · DATA DRAGON
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {ROLES.map(r => {
                    const c = comp[r.key]; const s = analysis.champStats?.[r.key];
                    if (!c||!s) return null;
                    return (
                      <div key={r.key} style={{ display:"flex", alignItems:"center",
                        gap:10, padding:"8px 10px",
                        background:"rgba(255,255,255,0.02)",
                        border:`1px solid ${r.color}22`, borderRadius:2 }}>
                        <ChampImg version={version} id={c.id} name={c.name} size={32} radius={2}
                          border={`1px solid ${r.color}55`}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                            fontSize:11, color:"#fff" }}>{c.name}</div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                            fontSize:9, color:r.color, letterSpacing:".08em" }}>{r.label}</div>
                        </div>
                        <div style={{ display:"flex", gap:12 }}>
                          {[["❤",Math.round(s.hp),"#e8442b"],["⚔",Math.round(s.attackdamage),"#f0b429"],
                            ["🛡",Math.round(s.armor),"#38bdf8"],["⚡",Math.round(s.spellblock),"#a78bfa"]]
                            .map(([icon,val,col]) => (
                            <div key={icon} style={{ textAlign:"center" }}>
                              <div style={{ fontSize:9 }}>{icon}</div>
                              <div style={{ fontFamily:"monospace", fontSize:10,
                                color:col, fontWeight:700 }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:9, letterSpacing:".15em", color:"var(--muted)", marginBottom:8 }}>
              ◆ CLASSES · DATA DRAGON OFICIAL
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {ROLES.map(r => comp[r.key]?.tags?.map(tag => (
                <span key={`${r.key}-${tag}`} style={{
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                  fontSize:9, padding:"3px 8px",
                  background:`${r.color}12`, border:`1px solid ${r.color}40`,
                  color:r.color, letterSpacing:".08em" }}>
                  {comp[r.key].name.split(" ")[0].toUpperCase()} · {tag.toUpperCase()}
                </span>
              )))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding:"10px 14px", borderTop:"1px solid var(--border)",
        display:"flex", gap:8, flexShrink:0 }}>
        {onSave && (
          <button onClick={onSave} style={{
            flex:2, padding:"9px",
            background:"rgba(200,151,42,0.1)",
            border:"1px solid rgba(200,151,42,0.4)", borderRadius:2, cursor:"pointer",
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:11, letterSpacing:".12em", color:"var(--gold-lt)", transition:"all .2s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(200,151,42,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(200,151,42,0.1)"}>
            ◇ SALVAR
          </button>
        )}
        <button onClick={onReset} className="btn-cyan"
          style={{ flex:1, padding:"9px", color:"var(--red)",
            borderColor:"rgba(232,68,43,0.3)", fontSize:10 }}>
          ↺ NOVA
        </button>
      </div>
    </div>
  );
}

// ─── LiveStats Sidebar Panel ──────────────────────────────────────────────────
function LiveStatsPanel({ comp, analysis, version, ddVersion, filled, allFilled,
  handleAnalyze, handleReset, onSave }) {

  // Synergy score 1–10
  const synergyScore = analysis
    ? Math.min(10, Math.max(1, Math.round((analysis.synergies?.length || 0) * 2.5 + analysis.teamFight/20 + 1)))
    : Math.round(filled * 0.7 + 0.5);

  // Win probability histogram (fake distribution for visual)
  const histogram = [3,6,9,12,18,28,14,8,4,2];

  return (
    <div style={{ padding:"16px 16px 12px", display:"flex", flexDirection:"column", gap:12 }}>
      {/* Title */}
      <div style={{
        fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
        fontSize:10, letterSpacing:".18em", color:"var(--gold-lt)",
        borderBottom:"1px solid var(--border)", paddingBottom:8, marginBottom:0,
        display:"flex", alignItems:"center", gap:6,
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12">
          <polygon points="6,1 11,3.5 11,8.5 6,11 1,8.5 1,3.5"
            fill="none" stroke="rgba(200,151,42,0.6)" strokeWidth="1"/>
        </svg>
        LIVE STATS
      </div>

      {/* Hextech Synergy Score */}
      <div className="hx-panel hx-corners" style={{ padding:"12px 14px", borderRadius:2 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:9, letterSpacing:".15em", color:"var(--muted)", marginBottom:8 }}>
          HEXTECH SYNERGY SCORE
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
          <div className="live-stat-bar" style={{ flex:1, marginRight:10 }}>
            <div style={{
              height:"100%", width:`${synergyScore * 10}%`,
              background:`linear-gradient(90deg, var(--cyan), rgba(200,151,42,0.8))`,
              transition:"width .8s ease",
            }}/>
          </div>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:14, color:"var(--cyan)", minWidth:28, textAlign:"right" }}>
            {synergyScore.toFixed(1)}
          </span>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
            fontSize:9, color:"var(--muted)", marginLeft:4, letterSpacing:".1em" }}>
            RATING
          </span>
        </div>
      </div>

      {/* Win Probability */}
      <div className="hx-panel hx-corners" style={{ padding:"12px 14px", borderRadius:2 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:9, letterSpacing:".15em", color:"var(--muted)", marginBottom:8 }}>
          WIN PROBABILITY
        </div>
        {/* Bar chart */}
        <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:50, marginBottom:6 }}>
          {histogram.map((h, i) => {
            const isHighlight = i === 5 || i === 6;
            const winPct = analysis?.winrate;
            const normalizedI = winPct ? Math.round(winPct / 10) - 1 : 5;
            const isActive = i === normalizedI;
            return (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
                <div style={{
                  width:"100%", height:`${h * 3}px`,
                  background: isActive
                    ? "var(--gold-lt)"
                    : isHighlight ? "var(--cyan)" : "rgba(11,196,227,0.25)",
                  borderRadius:"1px 1px 0 0",
                  transition:"height .6s ease",
                  boxShadow: isActive ? `0 0 8px var(--gold)` : "none",
                }}/>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <span key={n} style={{ flex:1, textAlign:"center",
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:7,
              color:"rgba(255,255,255,0.2)" }}>{n}</span>
          ))}
        </div>
        {/* Slider indicator */}
        <div style={{ marginTop:8 }}>
          <div style={{ height:4, background:"rgba(255,255,255,0.05)", borderRadius:2, position:"relative" }}>
            <div style={{
              position:"absolute", top:0, left:0,
              width:`${analysis ? analysis.winrate : filled * 14}%`,
              height:"100%",
              background:`linear-gradient(90deg, var(--cyan), var(--gold-lt))`,
              borderRadius:2, transition:"width .8s ease",
            }}/>
          </div>
        </div>
      </div>

      {/* Current comp list */}
      <div className="hx-panel" style={{ padding:"10px 12px", borderRadius:2 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:9, letterSpacing:".15em", color:"var(--muted)", marginBottom:8 }}>
          ◆ COMPOSIÇÃO ATUAL
        </div>
        {ROLES.map(r => {
          const c = comp[r.key];
          return (
            <div key={r.key} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, letterSpacing:".1em", color:r.color, width:30, flexShrink:0 }}>
                {r.label.slice(0,3)}
              </span>
              {c ? (
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <ChampImg version={""} id={c.id} name={c.name} size={22} radius={2}
                    border={`1px solid ${r.color}44`}/>
                  <div>
                    <div style={{ fontSize:11, color:"var(--text)", lineHeight:1.2 }}>{c.name}</div>
                    <div style={{ fontSize:8, color:"var(--muted)" }}>{c.tags?.join(" · ")}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:10, color:"rgba(11,196,227,0.18)", fontStyle:"italic" }}>— vazio</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze} disabled={!allFilled}
        className={`btn-hextech ${allFilled?"ready":""}`}
        style={{ width:"100%", padding:"14px", fontSize:12,
          clipPath:"polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)" }}>
        {allFilled
          ? "◆ ANALISAR COMPOSIÇÃO"
          : `SELECIONE MAIS ${5-filled} CAMPEÃO${5-filled!==1?"ÕES":""}`}
      </button>
      <div style={{ textAlign:"center", fontSize:8,
        color:"rgba(200,151,42,0.22)", letterSpacing:".12em" }}>
        ANÁLISE LOCAL · DATA DRAGON v{ddVersion}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ comp, version, analysis, view, champions,
  picker, setPicker, handleSelect, handleRemove, handleAnalyze,
  handleReset, ddVersion, filled, allFilled, onBack, onSave }) {

  if (view === "analysis" && analysis) {
    return (
      <aside style={{ borderLeft:"1px solid var(--border)",
        display:"flex", flexDirection:"column", overflow:"hidden",
        background:"var(--bg0)" }}>
        <AnalysisPanel analysis={analysis} comp={comp} version={version}
          onBack={onBack} onReset={handleReset} onSave={onSave}/>
      </aside>
    );
  }

  return (
    <aside style={{
      borderLeft:"1px solid var(--border)", display:"flex",
      flexDirection:"column", overflowY:"auto",
      background:"linear-gradient(180deg, rgba(200,151,42,0.025) 0%, transparent 100%)",
    }}>
      <LiveStatsPanel comp={comp} analysis={analysis} version={version}
        ddVersion={ddVersion} filled={filled} allFilled={allFilled}
        handleAnalyze={handleAnalyze} handleReset={handleReset} onSave={onSave}/>
    </aside>
  );
}

// ─── Desktop Analysis Left Panel ───────────────────────────────────────────────
function AnalysisDesktopLeft({ analysis, comp, version, onBack, onReset }) {
  const RC = { S:"#f0b429", A:"#0bc4e3", B:"#a78bfa", C:"#5a7a90" };
  const ratingColor = RC[analysis.rating] || "#0bc4e3";

  const physTags = ["Fighter","Tank","Assassin","Marksman"];
  const champList = Object.values(comp).filter(Boolean);
  let physCount = 0, magicCount = 0;
  champList.forEach(c => {
    if (c.tags?.some(t => physTags.includes(t))) physCount++;
    else magicCount++;
  });
  const total = physCount + magicCount || 1;
  const physPct = Math.round(physCount / total * 100);
  const magicPct = 100 - physPct;

  return (
    <div style={{
      flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"flex-start",
      padding:"24px 28px",
      overflowY:"auto",
      animation:"fadeUp .35s ease",
    }}>
      {/* Phase label */}
      <div style={{
        fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
        fontSize:9, letterSpacing:".22em", color:"rgba(200,151,42,0.6)",
        marginBottom:20, display:"flex", alignItems:"center", gap:8, alignSelf:"flex-start",
      }}>
        <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--cyan)",
          display:"inline-block", boxShadow:"0 0 6px var(--cyan)" }}/>
        FASE 02 — ANÁLISE DE COMPOSIÇÃO
      </div>

      {/* Win orb — center */}
      <WinProbOrb winrate={analysis.winrate} rating={analysis.rating} playstyle={analysis.playstyle}/>

      {/* Two columns: Synergy Metrics + Damage Type */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, width:"100%", marginTop:16 }}>
        {/* Synergy Metrics */}
        <div className="hx-panel hx-corners" style={{ padding:"10px 12px 8px", borderRadius:2 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:9, letterSpacing:".18em", color:"var(--gold-lt)", marginBottom:6 }}>
            SYNERGY METRICS
          </div>
          <div style={{ display:"flex", justifyContent:"center" }}>
            <RadarChart analysis={analysis}/>
          </div>
        </div>

        {/* Damage Distribution */}
        <div className="hx-panel hx-corners" style={{ padding:"10px 12px 8px", borderRadius:2 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:9, letterSpacing:".18em", color:"var(--gold-lt)", marginBottom:6 }}>
            DAMAGE TYPE DISTRIBUTION
          </div>
          <DamageChart physical={physPct} magic={magicPct}/>
        </div>
      </div>

      {/* Strategic Insights */}
      <div className="hx-panel hx-corners" style={{ width:"100%", marginTop:14,
        padding:"12px 16px", borderRadius:2 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:9, letterSpacing:".18em", color:"var(--gold-lt)", marginBottom:12, textAlign:"center" }}>
          STRATEGIC INSIGHTS
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Strengths */}
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:9, letterSpacing:".15em", color:"var(--cyan)", marginBottom:8 }}>
              STRATEGIC STRENGTHS
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {[
                analysis.engage > 60 ? "Excelente controle de mapa early" : null,
                analysis.teamFight > 65 ? "Alto potencial de teamfight" : null,
                analysis.split > 50 ? "Capacidade de split push efetivo" : null,
                analysis.poke > 55 ? "Forte potencial de poke" : null,
              ].filter(Boolean).slice(0,4).map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                  <div style={{ width:6, height:6, background:"var(--cyan)",
                    flexShrink:0, marginTop:3,
                    clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }}/>
                  <span style={{ fontSize:10, color:"var(--text)", lineHeight:1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Weaknesses */}
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:9, letterSpacing:".15em", color:"var(--red)", marginBottom:8 }}>
              STRATEGIC WEAKNESSES
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {(analysis.weaknesses || []).slice(0,4).map((w,i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                  <div style={{ width:6, height:6, background:"var(--red)",
                    flexShrink:0, marginTop:3,
                    clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)" }}/>
                  <span style={{ fontSize:10, color:"var(--text)", lineHeight:1.5 }}>
                    {w.split(":")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Champ recap */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginTop:20 }}>
        {ROLES.map(r => {
          const c = comp[r.key];
          return c ? (
            <div key={r.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ position:"relative" }}>
                <svg width="68" height="68" viewBox="0 0 68 68" style={{ position:"absolute", inset:0 }}>
                  <polygon points="34,2 64,19 64,50 34,67 4,50 4,19"
                    fill={`${r.color}14`} stroke={r.color} strokeWidth="1.5"/>
                </svg>
                <div style={{
                  position:"relative", width:68, height:68, margin:2, overflow:"hidden",
                  clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
                }}>
                  <ChampImg version={version} id={c.id} name={c.name}
                    size="100%" radius={0} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                </div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:9, color:r.color, letterSpacing:".12em" }}>{r.label}</div>
                <div style={{ fontSize:9, color:"var(--text)" }}>{c.name}</div>
              </div>
            </div>
          ) : null;
        })}
      </div>

      <button onClick={() => onBack()} className="btn-cyan" style={{ marginTop:24 }}>
        ← EDITAR COMPOSIÇÃO
      </button>
    </div>
  );
}

// ─── BottomPicker ─────────────────────────────────────────────────────────────
function BottomPicker({ roleKey, comp, champions, version, onSelect, onClose }) {
  const r = ROLES.find(r => r.key === roleKey);
  const [search, setSearch] = useState("");
  const selected = new Set(Object.values(comp).filter(Boolean).map(c => c.id));
  const roleChamps = useMemo(() =>
    champions.filter(c => c.roles.includes(roleKey) && !selected.has(c.id)),
    [champions, roleKey, selected]
  );
  const allChamps = useMemo(() =>
    champions.filter(c => !selected.has(c.id)),
    [champions, selected]
  );
  const [showAll, setShowAll] = useState(false);
  const pool = showAll ? allChamps : roleChamps;
  const filtered = search.trim()
    ? pool.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : pool;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose}/>
      <div className="bottom-sheet">
        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 0" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"rgba(200,151,42,0.3)" }}/>
        </div>
        {/* Header */}
        <div style={{ padding:"10px 16px 10px", borderBottom:"1px solid var(--border)",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {ROLE_ICONS[roleKey](r.color, 18)}
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:12, color:"#fff", letterSpacing:".1em" }}>
                SELECIONAR {r.label}
              </div>
              <div style={{ fontSize:9, color:"var(--muted)" }}>{filtered.length} campeões disponíveis</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            color:"var(--muted)", fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        {/* Search + toggle */}
        <div style={{ padding:"10px 16px 8px", display:"flex", gap:8, alignItems:"center" }}>
          <input
            type="text" placeholder="Buscar campeão…"
            value={search} onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              flex:1, background:"rgba(255,255,255,0.04)",
              border:"1px solid var(--border)", borderRadius:2,
              padding:"8px 12px", color:"var(--text)", fontSize:12,
              fontFamily:"'Barlow',sans-serif", outline:"none",
            }}
          />
          <button onClick={() => setShowAll(v => !v)} style={{
            background: showAll ? "rgba(200,151,42,0.15)" : "none",
            border:`1px solid ${showAll ? "rgba(200,151,42,0.5)" : "var(--border)"}`,
            borderRadius:2, padding:"7px 10px", cursor:"pointer",
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
            fontSize:9, letterSpacing:".1em",
            color: showAll ? "var(--gold-lt)" : "var(--muted)", whiteSpace:"nowrap",
          }}>
            {showAll ? "◆ ROLE" : "TODOS"}
          </button>
        </div>
        {/* Grid */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 14px 16px" }}>
          <div className="champ-grid">
            {filtered.map(c => (
              <div key={c.id} onClick={() => onSelect(roleKey, c)}
                style={{ display:"flex", flexDirection:"column", alignItems:"center",
                  gap:4, cursor:"pointer", padding:"4px 2px", borderRadius:2,
                  transition:"background .15s", WebkitTapHighlightColor:"transparent" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(200,151,42,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background="none"}>
                <div style={{ position:"relative" }}>
                  <ChampImg version={version} id={c.id} name={c.name} size={56} radius={2}
                    border={`1px solid ${r.color}33`}/>
                </div>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                  fontSize:9, color:"var(--text)", textAlign:"center",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  maxWidth:"100%", letterSpacing:".04em" }}>
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [ddVersion, setDdVersion] = useState(null);
  const [champions, setChampions] = useState([]);
  const [ddLoading, setDdLoading] = useState(true);
  const [ddError, setDdError] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 960);

  const [comp, setComp]         = useState({top:null,jungle:null,mid:null,adc:null,support:null});
  const [picker, setPicker]     = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [page, setPage]         = useState("analyzer");
  const [view, setView]         = useState("build");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const { saves, saveComp, deleteComp, renameComp } = useSavedComps();

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  }, [installPrompt]);

  useEffect(() => {
    (async () => {
      setDdLoading(true);
      try {
        const vRes = await fetch(DDRAGON_VERSIONS);
        const versions = await vRes.json();
        const latest = versions[0];
        setDdVersion(latest);
        let cRes = await fetch(DDRAGON_CHAMPIONS(latest, "pt_BR"));
        if (!cRes.ok) cRes = await fetch(DDRAGON_CHAMPIONS(latest, "en_US"));
        const cData = await cRes.json();
        const list = Object.values(cData.data)
          .map(c => ({ id:c.id, key:c.key, name:c.name, title:c.title,
            tags:c.tags, stats:c.stats, roles:deriveRoles(c.id,c.tags) }))
          .sort((a,b) => a.name.localeCompare(b.name));
        setChampions(list);
      } catch(err) {
        setDdError(err.message);
      } finally {
        setDdLoading(false);
      }
    })();
  }, []);

  const filled    = Object.values(comp).filter(Boolean).length;
  const allFilled = filled === 5;

  const handleSelect  = useCallback((role, champ) => {
    setComp(p => ({...p,[role]:champ})); setAnalysis(null); setPicker(null);
  }, []);
  const handleRemove  = useCallback((role) => {
    setComp(p => ({...p,[role]:null})); setAnalysis(null); setView("build");
  }, []);
  const handleReset   = useCallback(() => {
    setComp({top:null,jungle:null,mid:null,adc:null,support:null});
    setAnalysis(null); setView("build");
  }, []);
  const handleAnalyze = useCallback(() => {
    if (!allFilled) return;
    setAnalysis(analyzeComp(comp)); setView("analysis");
  }, [comp, allFilled]);
  const handleSave = useCallback((name) => {
    if (!analysis) return;
    saveComp(name, comp, analysis);
  }, [analysis, comp, saveComp]);
  const handleLoadSave = useCallback((save) => {
    setComp(save.comp); setAnalysis(save.analysis);
    setView("analysis"); setPage("analyzer");
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="stars-bg"/>

      {/* ── NAV ── */}
      <nav style={{
        position:"sticky", top:0, zIndex:50,
        borderBottom:"1px solid var(--border)",
        background:"rgba(2,10,20,0.94)", backdropFilter:"blur(18px)",
        display:"flex", alignItems:"center",
        padding:"0 20px", height:58, gap:0,
      }}>
        {/* Gold gradient line at very top */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
          background:"linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%)",
          opacity:.5 }}/>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:9, marginRight:28 }}>
          <HextechLogo size={30}/>
          <div>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
              fontSize:16, letterSpacing:".16em", color:"#fff" }}>RIFT</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
              fontSize:16, letterSpacing:".16em", color:"var(--cyan)" }}>FORGE</span>
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{ display:"flex", alignItems:"stretch", height:"100%", gap:2 }}>
          {[
            { id:"analyzer", label:"ANALYZER",  icon:"◈" },
            { id:"proscene", label:"PRO SCENE",  icon:"◆" },
            { id:"saved",    label:"SAVED" + (saves.length ? ` (${saves.length})` : ""), icon:"◇" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setPage(tab.id)} style={{
              background: page===tab.id ? "rgba(200,151,42,0.08)" : "none",
              border:"none", cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:11, letterSpacing:".15em",
              padding:"0 16px",
              color: page===tab.id ? "var(--cyan)" : "var(--muted)",
              borderBottom: page===tab.id ? "2px solid var(--gold)" : "2px solid transparent",
              transition:"all .2s",
              display:"flex", alignItems:"center", gap:5,
              WebkitTapHighlightColor:"transparent",
            }}
            onMouseEnter={e=>{ if(page!==tab.id) e.currentTarget.style.color="var(--text)"; }}
            onMouseLeave={e=>{ if(page!==tab.id) e.currentTarget.style.color="var(--muted)"; }}>
              <span style={{ fontSize:9 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right side indicators */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:14 }}>
          {page === "analyzer" && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              {ROLES.map(r => (
                <div key={r.key} style={{ width:7, height:7,
                  clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
                  background: comp[r.key] ? r.color : "rgba(255,255,255,0.07)",
                  boxShadow: comp[r.key] ? `0 0 6px ${r.color}` : "none",
                  transition:"all .3s" }}/>
              ))}
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9,
                color:"var(--muted)", letterSpacing:".1em", marginLeft:2 }}>
                {filled}/5
              </span>
            </div>
          )}
          {ddVersion && (
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9,
              color:"rgba(200,151,42,0.45)", letterSpacing:".12em", display:"flex",
              alignItems:"center", gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:"50%",
                background:"var(--green)", display:"inline-block",
                boxShadow:"0 0 6px var(--green)", animation:"pulse 2s infinite" }}/>
              {ddVersion.split(".").slice(0,2).join(".")}
            </div>
          )}
        </div>
      </nav>

      {/* ── LOADING ── */}
      {ddLoading && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", minHeight:"80vh", gap:20, position:"relative", zIndex:1 }}>
          <div style={{ position:"relative", animation:"orbFloat 2.5s ease-in-out infinite" }}>
            <svg width="70" height="70" viewBox="0 0 70 70" style={{ animation:"spin 2s linear infinite" }}>
              <polygon points="35,2 66,19.5 66,50.5 35,68 4,50.5 4,19.5"
                fill="none" stroke="rgba(200,151,42,0.2)" strokeWidth="1.2"/>
              <polygon points="35,2 66,19.5 66,50.5 35,68 4,50.5 4,19.5"
                fill="none" stroke="var(--gold)" strokeWidth="1.2"
                strokeDasharray="60 140" strokeDashoffset="0"/>
            </svg>
            <svg width="50" height="50" viewBox="0 0 50 50"
              style={{ position:"absolute", top:10, left:10 }}>
              <polygon points="25,2 46,14 46,36 25,48 4,36 4,14"
                fill="none" stroke="var(--cyan)" strokeWidth="1"
                strokeDasharray="30 90" strokeDashoffset="15"
                style={{ animation:"spin 1.5s linear infinite reverse" }}/>
            </svg>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:13, letterSpacing:".2em", color:"var(--gold-lt)", marginBottom:4 }}>
              SINCRONIZANDO COM DATA DRAGON
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:".12em" }}>
              RIOT GAMES OFFICIAL API
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {ddError && !ddLoading && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          minHeight:"80vh", padding:32, textAlign:"center", position:"relative", zIndex:1 }}>
          <div>
            <div style={{ fontSize:10, color:"var(--red)", fontFamily:"'Barlow Condensed',sans-serif",
              letterSpacing:".2em", marginBottom:12 }}>◆ FALHA NA CONEXÃO</div>
            <p style={{ color:"var(--text)", marginBottom:20, maxWidth:340 }}>{ddError}</p>
            <button onClick={() => window.location.reload()} className="btn-hextech">
              TENTAR NOVAMENTE
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN ANALYZER ── */}
      {!ddLoading && !ddError && page === "analyzer" && (
        <>
          {isDesktop ? (
            <div className="app-layout">
              {/* Left panel */}
              <div style={{ display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
                {view === "analysis" && analysis ? (
                  <AnalysisDesktopLeft analysis={analysis} comp={comp} version={ddVersion}
                    onBack={() => setView("build")} onReset={handleReset}/>
                ) : (
                  <DraftBoard comp={comp} version={ddVersion} ddVersion={ddVersion}
                    onTap={setPicker} onRemove={handleRemove}
                    onAnalyze={handleAnalyze} allFilled={allFilled} filled={filled}/>
                )}
              </div>

              {/* Right sidebar */}
              <Sidebar comp={comp} version={ddVersion} analysis={analysis} view={view}
                champions={champions} picker={picker} setPicker={setPicker}
                handleSelect={handleSelect} handleRemove={handleRemove}
                handleAnalyze={handleAnalyze} handleReset={handleReset}
                ddVersion={ddVersion} filled={filled} allFilled={allFilled}
                onBack={() => setView("build")}
                onSave={() => setShowSaveModal(true)}/>
            </div>
          ) : (
            <div style={{ minHeight:"calc(100vh - 58px)", display:"flex",
              flexDirection:"column", position:"relative", zIndex:1 }}>
              {view === "build" ? (
                <DraftBoard comp={comp} version={ddVersion} ddVersion={ddVersion}
                  onTap={setPicker} onRemove={handleRemove}
                  onAnalyze={handleAnalyze} allFilled={allFilled} filled={filled}/>
              ) : (
                <div style={{ flex:1, overflowY:"auto" }}>
                  <AnalysisPanel analysis={analysis} comp={comp} version={ddVersion}
                    onBack={() => setView("build")} onReset={handleReset}
                    onSave={() => setShowSaveModal(true)}/>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── PRO SCENE ── */}
      {!ddLoading && !ddError && page === "proscene" && (
        <ProScene version={ddVersion} champions={champions}/>
      )}

      {/* ── SAVED ── */}
      {!ddLoading && !ddError && page === "saved" && (
        <SavedComps version={ddVersion} saves={saves}
          onLoad={handleLoadSave} onDelete={deleteComp} onRename={renameComp}/>
      )}

      {/* ── SAVE MODAL ── */}
      {showSaveModal && analysis && (
        <SaveModal comp={comp} analysis={analysis} version={ddVersion}
          onSave={handleSave} onClose={() => setShowSaveModal(false)}/>
      )}

      {/* ── PICKER ── */}
      {picker && page === "analyzer" && (
        <BottomPicker roleKey={picker} comp={comp} champions={champions}
          version={ddVersion} onSelect={handleSelect} onClose={() => setPicker(null)}/>
      )}

      {/* ── PWA INSTALL BANNER ── */}
      {installPrompt && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:500,
          background:"rgba(4,10,20,0.97)", backdropFilter:"blur(16px)",
          borderTop:"1px solid rgba(200,151,42,0.3)",
          padding:"12px 20px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          animation:"fadeUp .3s ease",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <HextechLogo size={32}/>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:12, color:"#fff", letterSpacing:".05em" }}>Instalar RiftForge</div>
              <div style={{ fontSize:10, color:"var(--muted)" }}>Acesso rápido, funciona offline</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setInstallPrompt(null)} className="btn-cyan"
              style={{ padding:"6px 12px", fontSize:10 }}>
              AGORA NÃO
            </button>
            <button onClick={handleInstall} className="btn-hextech"
              style={{ padding:"6px 14px", fontSize:10 }}>
              INSTALAR
            </button>
          </div>
        </div>
      )}

      {/* ── LEGAL FOOTER ── */}
      <footer style={{
        borderTop:"1px solid rgba(255,255,255,0.03)",
        padding:"10px 20px",
        background:"rgba(2,10,20,0.85)",
        display:"flex", alignItems:"center", justifyContent:"center",
        flexWrap:"wrap", gap:"6px 16px",
        position:"relative", zIndex:1,
      }}>
        <span style={{ fontSize:9, color:"rgba(255,255,255,0.15)",
          fontFamily:"'Barlow',sans-serif", textAlign:"center", lineHeight:1.5 }}>
          RiftForge não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games
          ou de qualquer pessoa oficialmente envolvida na produção ou gestão de League of Legends.
          League of Legends e Riot Games são marcas registradas da Riot Games, Inc.
          Dados fornecidos pelo{" "}
          <a href="https://developer.riotgames.com/docs/lol" target="_blank" rel="noopener noreferrer"
            style={{ color:"rgba(200,151,42,0.4)", textDecoration:"none" }}>
            Riot Games Data Dragon
          </a>.
        </span>
      </footer>
    </>
  );
}