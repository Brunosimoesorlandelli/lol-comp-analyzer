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
  { key:"support", label:"SUP",    icon:"◉",  color:"#a78bfa", glow:"#a78bfa" },
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
  Aatrox:"top",
  Akshan:"mid",
  Ambessa:"top",
  Anivia:"mid",
  Annie:"mid",
  Aurora:"mid",
  Belveth:"jungle",
  Brand:"support",
  Briar:"jungle",
  Gragas:"support",
  Gwen:"top",
  Heimerdinger:"mid",
  Hwei:"mid",
  Jax:"top",
  KSante:"top",
  Kalista:"adc",
  Kindred:"jungle",
  Kled:"top",
  Mel:"support",
  Milio:"support",
  Naafiri:"jungle",
  Pantheon:"support",
  Quinn:"top",
  Renata:"support",
  Rumble:"top",
  Sett:"top",
  Sion:"top",
  Sylas:"jungle",
  TahmKench:"support",
  Velkoz:"support",
  Yorick:"top",
  Yunara:"adc",
  Zaahen:"jungle",
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

// ─── CSS global ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Beaufort+for+LOL:wght@700&family=Spiegel:wght@400;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cyan:    #0bc4e3;
    --gold:    #f0b429;
    --red:     #e8442b;
    --green:   #3cb043;
    --purple:  #a78bfa;
    --bg0:     #020b18;
    --bg1:     #061525;
    --bg2:     #0a2035;
    --bg3:     #0e2d48;
    --surface: rgba(11,196,227,0.06);
    --border:  rgba(11,196,227,0.18);
    --text:    #cdd6e0;
    --muted:   #5a7a90;
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

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg1); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  /* Animations */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes spin     { to { transform:rotate(360deg); } }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(400%)} }
  @keyframes hexPulse { 0%,100%{filter:drop-shadow(0 0 4px currentColor)} 50%{filter:drop-shadow(0 0 12px currentColor)} }
  @keyframes sheetUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes backdropIn { from{opacity:0} to{opacity:1} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 12px rgba(11,196,227,.2)} 50%{box-shadow:0 0 28px rgba(11,196,227,.5), 0 0 56px rgba(11,196,227,.15)} }

  /* Stars background */
  .stars-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse 80% 50% at 20% -10%, rgba(11,196,227,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 110%, rgba(240,180,41,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 100% 80% at 50% 50%, rgba(6,21,37,0.9) 0%, var(--bg0) 100%);
  }
  .stars-bg::before {
    content:''; position:absolute; inset:0;
    background-image:
      radial-gradient(1px 1px at 10% 15%, rgba(255,255,255,.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 25% 40%, rgba(255,255,255,.25) 0%, transparent 100%),
      radial-gradient(1px 1px at 40% 8%, rgba(255,255,255,.35) 0%, transparent 100%),
      radial-gradient(1px 1px at 60% 55%, rgba(255,255,255,.2) 0%, transparent 100%),
      radial-gradient(1px 1px at 75% 20%, rgba(255,255,255,.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 85% 70%, rgba(255,255,255,.25) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 5% 80%, rgba(11,196,227,.5) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 90% 35%, rgba(240,180,41,.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 55% 90%, rgba(255,255,255,.2) 0%, transparent 100%),
      radial-gradient(1px 1px at 30% 65%, rgba(255,255,255,.15) 0%, transparent 100%);
  }

  /* Hex clip */
  .hex-clip {
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  }

  /* Panel card */
  .panel {
    background: linear-gradient(135deg, rgba(11,196,227,0.05) 0%, rgba(6,21,37,0.8) 100%);
    border: 1px solid var(--border);
    border-radius: 2px;
    position: relative;
    overflow: hidden;
  }
  .panel::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent, var(--cyan), transparent);
    opacity: .5;
  }

  /* Scan line effect */
  .scanline-wrap { position:relative; overflow:hidden; }
  .scanline-wrap::after {
    content:''; position:absolute; left:0; right:0; height:40%;
    background: linear-gradient(transparent, rgba(11,196,227,.03), transparent);
    animation: scanline 4s linear infinite;
    pointer-events:none;
  }

  /* Buttons */
  .btn-primary {
    background: var(--cyan);
    color: var(--bg0);
    border: none;
    padding: 12px 28px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: .15em;
    text-transform: uppercase;
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: all .2s;
  }
  .btn-primary:hover { filter: brightness(1.2); transform: translateY(-1px); }
  .btn-primary:disabled {
    background: var(--bg3);
    color: var(--muted);
    cursor: not-allowed;
    transform: none;
    filter: none;
  }
  .btn-primary.ready {
    animation: glowPulse 2.5s ease infinite;
  }

  .btn-ghost {
    background: transparent;
    color: var(--cyan);
    border: 1px solid var(--border);
    padding: 11px 24px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 600;
    font-size: 12px;
    letter-spacing: .15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all .2s;
  }
  .btn-ghost:hover { border-color: var(--cyan); background: rgba(11,196,227,.08); }

  /* Responsive layout */
  .app-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    grid-template-rows: auto 1fr;
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }
  @media (max-width: 900px) {
    .app-layout {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto 1fr;
    }
  }

  /* Stat bar */
  .stat-row { margin-bottom: 10px; }
  .stat-label { display:flex; justify-content:space-between; margin-bottom:4px; }
  .stat-label span:first-child {
    font-family:'Barlow Condensed',sans-serif; font-weight:600;
    font-size:10px; letter-spacing:.15em; color:var(--muted);
  }
  .stat-label span:last-child { font-size:10px; font-family:monospace; }
  .stat-track {
    height:3px; background:rgba(255,255,255,0.06); border-radius:0; overflow:hidden;
  }
  .stat-fill {
    height:100%; border-radius:0;
    transition: width 1.2s cubic-bezier(0.34,1.56,0.64,1);
  }

  /* Tabs */
  .tab-bar { display:flex; border-bottom:1px solid var(--border); }
  .tab-btn {
    flex:1; padding:10px 4px; background:none; border:none; cursor:pointer;
    font-family:'Barlow Condensed',sans-serif; font-weight:600;
    font-size:10px; letter-spacing:.15em; color:var(--muted);
    border-bottom:2px solid transparent; margin-bottom:-1px;
    transition: all .2s; WebkitTapHighlightColor:transparent;
  }
  .tab-btn.active { color:var(--cyan); border-bottom-color:var(--cyan); }
  .tab-btn:hover:not(.active) { color:var(--text); }

  /* Role slot hexagon */
  .role-hex {
    position: relative;
    cursor: pointer;
    transition: all .2s;
    WebkitTapHighlightColor: transparent;
  }
  .role-hex:hover .hex-inner { filter: brightness(1.2); }
  .role-hex:active { transform: scale(.95); }

  /* Champion grid */
  .champ-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 6px;
  }
  @media (max-width: 900px) {
    .champ-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; }
  }

  /* Bottom sheet */
  .bottom-sheet {
    position: fixed; bottom:0; left:50%; transform:translateX(-50%);
    width:100%; max-width:520px; z-index:300;
    background: var(--bg1);
    border-top: 1px solid var(--border);
    border-radius: 16px 16px 0 0;
    height: 78vh; display:flex; flex-direction:column;
    animation: sheetUp .28s cubic-bezier(0.32,0.72,0,1);
  }
  .sheet-backdrop {
    position:fixed; inset:0; background:rgba(2,11,24,0.85);
    backdrop-filter:blur(8px); z-index:299;
    animation: backdropIn .2s ease;
  }

  /* Hextech decorative border corner */
  .hex-corner::before, .hex-corner::after {
    content:''; position:absolute; width:10px; height:10px;
    border-color:var(--cyan); border-style:solid; opacity:.6;
  }
  .hex-corner::before { top:0; left:0; border-width:1px 0 0 1px; }
  .hex-corner::after  { bottom:0; right:0; border-width:0 1px 1px 0; }

  /* Responsive analysis panel */
  @media (max-width: 900px) {
    .analysis-panel { padding: 16px !important; }
  }

  button:active { opacity:.8; }
`;



// ─── SVG icons por role ──────────────────────────────────────────────────────
const ROLE_ICONS = {
  top: (color, size=28) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <line x1="6" y1="22" x2="20" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="18" y1="6" x2="22" y2="10" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="10" y1="11" x2="13" y2="14" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="7" cy="21" r="2" fill={color} opacity="0.6"/>
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

// ─── DraftSlot ────────────────────────────────────────────────────────────────
function DraftSlot({ roleKey, champ, version, onTap, onRemove }) {
  const r = ROLES.find(r => r.key === roleKey);
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={() => onTap(roleKey)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, minWidth: 0, position: "relative",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        borderRadius: 3,
        overflow: "hidden",
        // Border reacts to state
        outline: `1.5px solid ${champ ? r.color + "bb" : hover ? r.color + "44" : "rgba(255,255,255,0.07)"}`,
        boxShadow: champ
          ? `0 0 28px ${r.color}28, inset 0 0 40px ${r.color}06`
          : hover ? `0 0 14px ${r.color}18` : "none",
        transition: "outline .2s, box-shadow .2s",
        // Force full height of container
        alignSelf: "stretch",
      }}
    >
      {/* ── Imagem splash — fill total ── */}
      {champ ? (
        <>
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ.id}_0.jpg`}
            alt={champ.name}
            onError={e => {
              e.target.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.id}.png`;
              e.target.style.objectPosition = "center";
            }}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              transition: "transform .4s ease",
              transform: hover ? "scale(1.04)" : "scale(1)",
            }}
          />
          {/* Gradient: só na parte inferior, preserva rosto */}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(to bottom,
              transparent 0%,
              transparent 45%,
              rgba(6,10,20,0.55) 70%,
              rgba(6,10,20,0.95) 100%)`,
          }}/>
          {/* Barra colorida no topo */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${r.color}, transparent)`,
          }}/>
        </>
      ) : (
        /* ── Estado vazio ── */
        <>
          {/* Fundo com noise sutil */}
          <div style={{
            position: "absolute", inset: 0,
            background: `
              radial-gradient(ellipse at 50% 40%, ${r.color}0d 0%, transparent 70%),
              #060e1a
            `,
          }}/>
          {/* Grid pontilhada */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `radial-gradient(circle, ${r.color}28 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
            opacity: hover ? 0.8 : 0.4,
            transition: "opacity .2s",
          }}/>
          {/* Ícone central grande */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
          }}>
            <div style={{
              opacity: hover ? 0.85 : 0.3,
              transform: hover ? "scale(1.08)" : "scale(1)",
              transition: "all .2s",
            }}>
              {ROLE_ICONS[roleKey](r.color, 48)}
            </div>
            <span style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
              fontSize: 10, letterSpacing: ".2em",
              color: hover ? r.color : "rgba(255,255,255,0.2)",
              transition: "color .2s",
            }}>SELECIONAR</span>
          </div>
          {/* Cantos decorativos */}
          {[[0,0,"top","left"],[0,0,"top","right"],[0,0,"bottom","left"],[0,0,"bottom","right"]].map(([,,v,h],i)=>(
            <div key={i} style={{
              position:"absolute", [v]:10, [h]:10,
              width:14, height:14,
              borderTop: v==="top" ? `1.5px solid ${r.color}` : "none",
              borderBottom: v==="bottom" ? `1.5px solid ${r.color}` : "none",
              borderLeft: h==="left" ? `1.5px solid ${r.color}` : "none",
              borderRight: h==="right" ? `1.5px solid ${r.color}` : "none",
              opacity: hover ? 0.7 : 0.25,
              transition: "opacity .2s",
            }}/>
          ))}
        </>
      )}

      {/* ── Chip role — sempre visível no topo ── */}
      <div style={{
        position: "absolute", top: 10, left: 10,
        display: "flex", alignItems: "center", gap: 5,
        background: "rgba(2,8,20,0.72)", backdropFilter: "blur(6px)",
        borderRadius: 2, padding: "4px 8px",
        border: `1px solid ${r.color}55`,
        zIndex: 2,
      }}>
        {ROLE_ICONS[roleKey](r.color, 13)}
        <span style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
          fontSize: 9, letterSpacing: ".15em", color: r.color,
        }}>{r.label}</span>
      </div>

      {/* ── Botão remover ── */}
      {champ && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(roleKey); }}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 3,
            width: 24, height: 24, borderRadius: "50%",
            background: "rgba(232,68,43,0.82)", backdropFilter: "blur(6px)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", lineHeight: 1,
            WebkitTapHighlightColor: "transparent",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#e8442b"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(232,68,43,0.82)"}
        >×</button>
      )}

      {/* ── Info do campeão — rodapé ── */}
      {champ && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "10px 12px 12px", zIndex: 2,
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800,
            fontSize: "clamp(11px, 1.8vw, 16px)", color: "#fff",
            letterSpacing: ".03em", lineHeight: 1.1,
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{champ.name}</div>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600,
            fontSize: "clamp(8px, 1.2vw, 11px)",
            color: r.color, letterSpacing: ".08em", marginTop: 2,
            textShadow: `0 0 8px ${r.color}88`,
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
      flex: 1, display: "flex", flexDirection: "column",
      padding: "12px 14px 12px",
      background: "var(--bg0)",
      overflow: "hidden",
      minHeight: 0,
    }}>
      {/* Header minimalista */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10, flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
          fontSize: 9, letterSpacing: ".22em", color: "rgba(11,196,227,0.5)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--cyan)",
            display:"inline-block", boxShadow:"0 0 5px var(--cyan)" }}/>
          FASE 01 — DRAFT · SELECIONE OS 5 CAMPEÕES
        </div>
        {/* Progress pips */}
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {ROLES.map(r => (
            <div key={r.key} style={{
              width: comp[r.key] ? 10 : 7, height: comp[r.key] ? 10 : 7,
              borderRadius: 2,
              background: comp[r.key] ? r.color : "rgba(255,255,255,0.08)",
              boxShadow: comp[r.key] ? `0 0 6px ${r.color}` : "none",
              transition: "all .25s",
            }}/>
          ))}
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:13, color: filled===5 ? "var(--gold)" : "var(--muted)",
            marginLeft:4, letterSpacing:".05em", transition:"color .3s",
          }}>{filled}<span style={{ opacity:.4, fontWeight:400 }}>/5</span></span>
        </div>
      </div>

      {/* ── 5 cards — ocupam todo o espaço disponível ── */}
      <div style={{
        display: "flex", gap: 8,
        flex: 1, minHeight: 0,
      }}>
        {ROLES.map(r => (
          <DraftSlot
            key={r.key}
            roleKey={r.key}
            champ={comp[r.key]}
            version={version}
            onTap={onTap}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Botão analisar */}
      <div style={{ marginTop: 10, flexShrink: 0 }}>
        <button
          onClick={onAnalyze} disabled={!allFilled}
          className={`btn-primary ${allFilled ? "ready" : ""}`}
          style={{ width: "100%", padding: "13px", fontSize: 12 }}
        >
          {allFilled
            ? "◆ ANALISAR COMPOSIÇÃO"
            : `SELECIONE MAIS ${5 - filled} CAMPEÃO${5-filled!==1?"ÕES":""}`}
        </button>
        <div style={{ textAlign:"center", marginTop:5, fontSize:8,
          color:"rgba(11,196,227,0.18)", letterSpacing:".1em",
          fontFamily:"'Barlow Condensed',sans-serif" }}>
          ANÁLISE LOCAL · RIOT DATA DRAGON v{ddVersion}
        </div>
      </div>
    </div>
  );
}

// ─── StatBar grande (para tela de análise) ────────────────────────────────────
function BigStatBar({ label, value, color, showValue=true }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:11, letterSpacing:".12em", color:"var(--muted)" }}>{label}</span>
        {showValue && (
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:14, color, letterSpacing:".05em" }}>{value}</span>
        )}
      </div>
      <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:1, overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${value}%`, borderRadius:1,
          background:`linear-gradient(90deg, ${color}66, ${color})`,
          boxShadow:`0 0 8px ${color}55`,
          transition:"width 1.1s cubic-bezier(0.34,1.2,0.64,1)",
        }}/>
      </div>
    </div>
  );
}

// ─── AnalysisPanel — novo layout em duas colunas ─────────────────────────────
function AnalysisPanel({ analysis, comp, version, onBack, onReset, onSave }) {
  const [tab, setTab] = useState("stats");
  const RC = { S:"#f0b429", A:"#0bc4e3", B:"#a78bfa", C:"#5a7a90" };
  const ratingColor = RC[analysis.rating] || "#0bc4e3";

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

      {/* ── TOPO: banner de 5 campeões com splash arts ── */}
      <div style={{ position:"relative", flexShrink:0, height:160 }}>
        {/* Splashes lado a lado */}
        <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
          {ROLES.map((r, ri) => {
            const c = comp[r.key];
            return (
              <div key={r.key} style={{
                flex:1, position:"relative", overflow:"hidden",
              }}>
                {c ? (
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${c.id}_0.jpg`}
                    alt={c.name}
                    onError={e => { e.target.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.id}.png`; }}
                    style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                      objectFit:"cover", objectPosition:"top center" }}
                  />
                ) : (
                  <div style={{ position:"absolute", inset:0, background:`${r.color}0a` }}/>
                )}
                {/* Overlay escuro */}
                <div style={{ position:"absolute", inset:0,
                  background:`linear-gradient(to bottom, rgba(6,10,20,0.1) 0%, rgba(6,10,20,0.7) 100%)` }}/>
                {/* Separador vertical colorido */}
                {ri > 0 && <div style={{ position:"absolute", left:0, top:0, bottom:0,
                  width:1, background:`${r.color}33` }}/>}
                {/* Label role no rodapé */}
                <div style={{ position:"absolute", bottom:6, left:0, right:0,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                  {ROLE_ICONS[r.key](r.color, 14)}
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:8, color:r.color, letterSpacing:".12em",
                    textShadow:`0 0 6px ${r.color}` }}>{r.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Rating overlay — centro do banner */}
        <div style={{
          position:"absolute", top:10, left:"50%", transform:"translateX(-50%)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:0,
          background:"rgba(2,8,20,0.78)", backdropFilter:"blur(10px)",
          border:`1px solid ${ratingColor}55`,
          borderRadius:3, padding:"6px 16px",
          zIndex:3,
        }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:9, letterSpacing:".2em", color:"var(--muted)" }}>
            WIN RATE EST.
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
              fontSize:28, color:"var(--gold)", lineHeight:1,
              textShadow:"0 0 16px rgba(240,180,41,0.5)" }}>
              {analysis.winrate}%
            </span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
              fontSize:28, lineHeight:1, color:ratingColor,
              textShadow:`0 0 16px ${ratingColor}88` }}>
              {analysis.rating}
            </span>
          </div>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
            fontSize:9, letterSpacing:".15em", color:"var(--cyan)" }}>
            {analysis.playstyle.toUpperCase()}
          </span>
        </div>
        {/* Botão voltar — canto esq */}
        <button onClick={onBack} style={{
          position:"absolute", top:10, left:10, zIndex:4,
          background:"rgba(2,8,20,0.72)", backdropFilter:"blur(6px)",
          border:"1px solid rgba(11,196,227,0.2)", borderRadius:2,
          padding:"5px 10px", color:"var(--cyan)", fontSize:9,
          fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".12em",
          fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4,
        }}>← DRAFT</button>
      </div>

      {/* ── CORPO: stats + tabs ── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

        {/* Stats rápidos — 5 barras em destaque */}
        <div style={{
          padding:"14px 16px 10px",
          borderBottom:"1px solid var(--border)",
          background:"linear-gradient(180deg,rgba(11,196,227,0.03) 0%,transparent 100%)",
          flexShrink:0,
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
            {stats.map(s => (
              <BigStatBar key={s.label} label={s.label} value={s.value} color={s.color}/>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ flexShrink:0 }}>
          {[
            {k:"synergy",  l:"SINERGIAS"},
            {k:"strategy", l:"ESTRATÉGIA"},
            {k:"weak",     l:"FRAQUEZAS"},
            {k:"data",     l:"DATA"},
          ].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              className={`tab-btn ${tab===t.k?"active":""}`}>{t.l}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>
          {tab==="synergy" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {analysis.synergies?.length ? analysis.synergies.map((s,i)=>(
                <div key={i} className="panel" style={{ padding:12 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:11, color:"var(--gold)", letterSpacing:".08em", marginBottom:5 }}>
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
              <div className="panel" style={{ padding:14 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:9, letterSpacing:".18em", color:"var(--cyan)", marginBottom:8 }}>
                  ◆ ESTRATÉGIA GERAL
                </div>
                <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.65 }}>{analysis.strategy}</p>
              </div>
              <div className="panel" style={{ padding:14, borderColor:"rgba(48,185,69,0.3)" }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:9, letterSpacing:".18em", color:"var(--green)", marginBottom:8 }}>
                  ◆ WIN CONDITION
                </div>
                <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.65 }}>{analysis.win_condition}</p>
              </div>
            </div>
          )}

          {tab==="weak" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {analysis.weaknesses?.length ? analysis.weaknesses.map((w,i)=>(
                <div key={i} className="panel" style={{ padding:"10px 12px",
                  borderColor:"rgba(232,68,43,0.25)",
                  display:"flex", alignItems:"flex-start", gap:10 }}>
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
              {/* Stats base DDragon */}
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
                          gap:10, padding:"8px 10px", background:"rgba(255,255,255,0.02)",
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
                              .map(([icon,val,col])=>(
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
              {/* Classes */}
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, letterSpacing:".15em", color:"var(--muted)", marginBottom:8 }}>
                ◆ CLASSES · DATA DRAGON OFICIAL
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {ROLES.map(r => comp[r.key]?.tags?.map(tag=>(
                  <span key={`${r.key}-${tag}`} style={{
                    fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                    fontSize:9, padding:"3px 8px",
                    background:`${r.color}14`, border:`1px solid ${r.color}44`,
                    color:r.color, letterSpacing:".08em" }}>
                    {comp[r.key].name.split(" ")[0].toUpperCase()} · {tag.toUpperCase()}
                  </span>
                )))}
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div style={{ padding:"10px 14px", borderTop:"1px solid var(--border)",
          display:"flex", gap:8, flexShrink:0 }}>
          {onSave && (
            <button onClick={onSave} style={{
              flex:2, padding:"9px",
              background:"rgba(240,180,41,0.12)",
              border:"1px solid rgba(240,180,41,0.35)", borderRadius:2, cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:11, letterSpacing:".12em", color:"var(--gold)", transition:"all .2s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(240,180,41,0.2)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(240,180,41,0.12)"}>
              ◇ SALVAR
            </button>
          )}
          <button onClick={onReset} className="btn-ghost"
            style={{ flex:1, padding:"9px", color:"var(--red)",
              borderColor:"rgba(232,68,43,0.3)", fontSize:10 }}>
            ↺ NOVA
          </button>
        </div>
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
    <aside style={{ borderLeft:"1px solid var(--border)", display:"flex",
      flexDirection:"column", overflowY:"auto",
      background:"linear-gradient(180deg, rgba(11,196,227,0.03) 0%, transparent 100%)" }}>
      <div style={{ padding:"20px 16px 14px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
          fontSize:9, letterSpacing:".2em", color:"var(--muted)", marginBottom:14 }}>
          ◆ COMPOSIÇÃO ATUAL
        </div>
        {ROLES.map(r => {
          const c = comp[r.key];
          return (
            <div key={r.key} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:10, letterSpacing:".12em", color:r.color, width:32, flexShrink:0 }}>
                {r.label}
              </div>
              {c ? (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <ChampImg version={version} id={c.id} name={c.name} size={24} radius={2}
                    border={`1px solid ${r.color}44`}/>
                  <div>
                    <div style={{ fontSize:12, color:"var(--text)" }}>{c.name}</div>
                    <div style={{ fontSize:9, color:"var(--muted)", letterSpacing:".05em" }}>
                      {c.tags?.join(" · ")}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:11, color:"rgba(11,196,227,0.2)",
                  fontStyle:"italic", letterSpacing:".05em" }}>— vazio</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding:"14px 16px" }}>
        <button onClick={handleAnalyze} disabled={!allFilled}
          className={`btn-primary ${allFilled?"ready":""}`}
          style={{ width:"100%", padding:"14px", fontSize:12,
            clipPath:"polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)" }}>
          {allFilled
            ? "◆ ANALISAR COMPOSIÇÃO"
            : `SELECIONE MAIS ${5-filled} CAMPEÃO${5-filled!==1?"ÕES":""}`}
        </button>
        <div style={{ textAlign:"center", marginTop:8, fontSize:9,
          color:"rgba(11,196,227,0.25)", letterSpacing:".12em" }}>
          ANÁLISE LOCAL · DATA DRAGON v{ddVersion}
        </div>
      </div>
    </aside>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [ddVersion, setDdVersion] = useState(null);
  const [champions, setChampions] = useState([]);
  const [ddLoading, setDdLoading] = useState(true);
  const [ddError,   setDdError]   = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 900);

  const [comp, setComp]       = useState({top:null,jungle:null,mid:null,adc:null,support:null});
  const [picker, setPicker]   = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [page, setPage]       = useState("analyzer"); // "analyzer" | "proscene" | "saved"
  const [view, setView]       = useState("build"); // "build" | "analysis"
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const { saves, saveComp, deleteComp, renameComp } = useSavedComps();

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // PWA install prompt
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

  // Load DDragon
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
    setComp(p=>({...p,[role]:champ})); setAnalysis(null); setPicker(null);
  }, []);
  const handleRemove  = useCallback((role) => {
    setComp(p=>({...p,[role]:null})); setAnalysis(null); setView("build");
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
    setComp(save.comp);
    setAnalysis(save.analysis);
    setView("analysis");
    setPage("analyzer");
  }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="stars-bg" />

      {/* ── NAV ── */}
      <nav style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid var(--border)",
        background:"rgba(2,11,24,0.92)", backdropFilter:"blur(16px)",
        display:"flex", alignItems:"center",
        padding:"0 20px", height:56, gap:0 }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:24 }}>
          <svg width="26" height="26" viewBox="0 0 28 28">
            <polygon points="14,1 26,7.5 26,20.5 14,27 2,20.5 2,7.5"
              fill="none" stroke="#0bc4e3" strokeWidth="1.5"/>
            <polygon points="14,6 21,10 21,18 14,22 7,18 7,10"
              fill="rgba(11,196,227,0.15)" stroke="#0bc4e3" strokeWidth=".8"/>
          </svg>
          <div>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
              fontSize:15, letterSpacing:".15em", color:"#fff" }}>RIFT</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
              fontSize:15, letterSpacing:".15em", color:"var(--cyan)" }}>FORGE</span>
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
              background:"none", border:"none", cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:11, letterSpacing:".15em",
              padding:"0 14px",
              color: page===tab.id ? "var(--cyan)" : "var(--muted)",
              borderBottom: page===tab.id ? "2px solid var(--cyan)" : "2px solid transparent",
              transition:"all .2s",
              display:"flex", alignItems:"center", gap:5,
              WebkitTapHighlightColor:"transparent",
            }}
            onMouseEnter={e=>{ if(page!==tab.id) e.currentTarget.style.color="var(--text)"; }}
            onMouseLeave={e=>{ if(page!==tab.id) e.currentTarget.style.color="var(--muted)"; }}>
              <span style={{ fontSize:9 }}>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          {page === "analyzer" && (
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              {ROLES.map(r => (
                <div key={r.key} style={{ width:6, height:6,
                  clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
                  background: comp[r.key] ? r.color : "rgba(255,255,255,0.08)",
                  boxShadow: comp[r.key] ? `0 0 5px ${r.color}` : "none",
                  transition:"all .3s" }} />
              ))}
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9,
                color:"var(--muted)", letterSpacing:".1em", marginLeft:2 }}>
                {filled}/5
              </span>
            </div>
          )}
          {ddVersion && (
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9,
              color:"rgba(11,196,227,0.4)", letterSpacing:".12em", display:"flex",
              alignItems:"center", gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:"50%",
                background:"var(--green)", display:"inline-block",
                boxShadow:"0 0 6px var(--green)", animation:"pulse 2s infinite" }} />
              {ddVersion.split(".").slice(0,2).join(".")}
            </div>
          )}
        </div>
      </nav>

      {/* ── LOADING ── */}
      {ddLoading && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", minHeight:"80vh", gap:20, position:"relative", zIndex:1 }}>
          <svg width="60" height="60" viewBox="0 0 60 60"
            style={{ animation:"spin 1.5s linear infinite" }}>
            <polygon points="30,2 56,16 56,44 30,58 4,44 4,16"
              fill="none" stroke="rgba(11,196,227,0.3)" strokeWidth="1.5"/>
            <polygon points="30,2 56,16 56,44 30,58 4,44 4,16"
              fill="none" stroke="var(--cyan)" strokeWidth="1.5"
              strokeDasharray="60 120" strokeDashoffset="0"/>
          </svg>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:13, letterSpacing:".2em", color:"var(--cyan)", marginBottom:4 }}>
              SINCRONIZANDO COM DATA DRAGON
            </div>
            <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:".12em" }}>
              RIOT GAMES OFFICIAL API
            </div>
          </div>
        </div>
      )}

      {/* ── ERRO ── */}
      {ddError && !ddLoading && (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          minHeight:"80vh", padding:32, textAlign:"center", position:"relative", zIndex:1 }}>
          <div>
            <div style={{ fontSize:10, color:"var(--red)", fontFamily:"'Barlow Condensed',sans-serif",
              letterSpacing:".2em", marginBottom:12 }}>◆ FALHA NA CONEXÃO</div>
            <p style={{ color:"var(--text)", marginBottom:20, maxWidth:340 }}>{ddError}</p>
            <button onClick={()=>window.location.reload()} className="btn-primary">
              TENTAR NOVAMENTE
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      {!ddLoading && !ddError && page === "analyzer" && (
        <>
          {isDesktop ? (
            /* ── DESKTOP: grid 2 colunas ── */
            <div className="app-layout" style={{ minHeight:"calc(100vh - 56px)" }}>
              {/* Left: draft */}
              <div style={{ display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
                {view === "analysis" ? (
                  /* Analysis header on desktop left panel */
                  <div style={{ flex:1, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", padding:32 }}>
                    <div style={{ textAlign:"center", marginBottom:32 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                        fontSize:10, letterSpacing:".2em", color:"var(--cyan)", marginBottom:8 }}>
                        ◆ PHASE 02 — ANALYSIS COMPLETE
                      </div>
                      <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
                        fontSize:36, lineHeight:1.1, color:"#fff", marginBottom:8 }}>
                        Composição<br/><span style={{ color:"var(--gold)" }}>dissecada.</span>
                      </h2>
                      <p style={{ color:"var(--muted)", fontSize:13, maxWidth:320 }}>
                        O motor Hextech analisou perfis de dano, janelas de engage e curvas de escalonamento da sua composição.
                      </p>
                    </div>
                    {/* Comp hexes recap */}
                    <div style={{ display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
                      {ROLES.map(r => {
                        const c = comp[r.key];
                        return c ? (
                          <div key={r.key} style={{ display:"flex", flexDirection:"column",
                            alignItems:"center", gap:8 }}>
                            <div style={{ position:"relative" }}>
                              <svg width="80" height="80" viewBox="0 0 80 80"
                                style={{ position:"absolute", inset:0, color:r.color,
                                  animation:"hexPulse 3s ease infinite" }}>
                                <polygon points="40,3 75,22 75,58 40,77 5,58 5,22"
                                  fill={`${r.color}18`} stroke={r.color} strokeWidth="1.5"/>
                              </svg>
                              <div style={{ position:"relative", width:80, height:80,
                                clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",
                                margin:4, overflow:"hidden" }}>
                                <ChampImg version={ddVersion} id={c.id} name={c.name}
                                  size="100%" radius={0} border="none"
                                  style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                              </div>
                            </div>
                            <div style={{ textAlign:"center" }}>
                              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                                fontSize:10, color:r.color, letterSpacing:".12em" }}>{r.label}</div>
                              <div style={{ fontSize:10, color:"var(--text)" }}>{c.name}</div>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <button onClick={()=>setView("build")} className="btn-ghost"
                      style={{ marginTop:32 }}>← EDITAR COMPOSIÇÃO</button>
                  </div>
                ) : (
                  <DraftBoard comp={comp} version={ddVersion} ddVersion={ddVersion}
                    onTap={setPicker} onRemove={handleRemove}
                    onAnalyze={handleAnalyze} allFilled={allFilled} filled={filled} />
                )}
              </div>

              {/* Right: sidebar */}
              <Sidebar comp={comp} version={ddVersion} analysis={analysis} view={view}
                champions={champions} picker={picker} setPicker={setPicker}
                handleSelect={handleSelect} handleRemove={handleRemove}
                handleAnalyze={handleAnalyze} handleReset={handleReset}
                ddVersion={ddVersion} filled={filled} allFilled={allFilled}
                onBack={()=>setView("build")}
                onSave={() => setShowSaveModal(true)} />
            </div>
          ) : (
            /* ── MOBILE: tela única ── */
            <div style={{ minHeight:"calc(100vh - 56px)", display:"flex",
              flexDirection:"column", position:"relative", zIndex:1 }}>

              {view === "build" ? (
                /* Build view */
                <DraftBoard comp={comp} version={ddVersion} ddVersion={ddVersion}
                  onTap={setPicker} onRemove={handleRemove}
                  onAnalyze={handleAnalyze} allFilled={allFilled} filled={filled} />
              ) : (
                /* Analysis view mobile */
                <div style={{ flex:1, overflowY:"auto" }}>
                  <AnalysisPanel analysis={analysis} comp={comp} version={ddVersion}
                    onBack={()=>setView("build")} onReset={handleReset}
                    onSave={() => setShowSaveModal(true)} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── PRO SCENE PAGE ── */}
      {!ddLoading && !ddError && page === "proscene" && (
        <ProScene version={ddVersion} champions={champions} />
      )}

      {/* ── SAVED COMPS PAGE ── */}
      {!ddLoading && !ddError && page === "saved" && (
        <SavedComps
          version={ddVersion}
          saves={saves}
          onLoad={handleLoadSave}
          onDelete={deleteComp}
          onRename={renameComp}
        />
      )}

      {/* ── SAVE MODAL ── */}
      {showSaveModal && analysis && (
        <SaveModal
          comp={comp}
          analysis={analysis}
          version={ddVersion}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {/* ── PICKER SHEET ── */}
      {picker && page === "analyzer" && (
        <BottomPicker roleKey={picker} comp={comp} champions={champions}
          version={ddVersion} onSelect={handleSelect} onClose={()=>setPicker(null)} />
      )}

      {/* ── PWA INSTALL BANNER ── */}
      {installPrompt && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:500,
          background:"rgba(6,21,37,0.97)", backdropFilter:"blur(16px)",
          borderTop:"1px solid rgba(11,196,227,0.25)",
          padding:"12px 20px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          animation:"fadeUp .3s ease",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <svg width="32" height="32" viewBox="0 0 32 32">
              <rect width="32" height="32" fill="#020b18" rx="4"/>
              <polygon points="16,2 29,9 29,23 16,30 3,23 3,9"
                fill="none" stroke="#0bc4e3" strokeWidth="1.5"/>
              <text x="16" y="22" textAnchor="middle" fill="#0bc4e3"
                fontFamily="Arial Black" fontWeight="900" fontSize="16">R</text>
            </svg>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:12, color:"#fff", letterSpacing:".05em" }}>Instalar RiftForge</div>
              <div style={{ fontSize:10, color:"var(--muted)" }}>Acesso rápido, funciona offline</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setInstallPrompt(null)}
              style={{ background:"none", border:"1px solid var(--border)", borderRadius:2,
                padding:"6px 12px", color:"var(--muted)", fontSize:10,
                fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".1em", cursor:"pointer" }}>
              AGORA NÃO
            </button>
            <button onClick={handleInstall}
              style={{ background:"var(--cyan)", border:"none", borderRadius:2,
                padding:"6px 14px", color:"var(--bg0)", fontSize:10, fontWeight:700,
                fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".1em", cursor:"pointer" }}>
              INSTALAR
            </button>
          </div>
        </div>
      )}

      {/* ── LEGAL FOOTER ── */}
      <footer style={{
        borderTop:"1px solid rgba(255,255,255,0.04)",
        padding:"10px 20px",
        background:"rgba(2,11,24,0.8)",
        display:"flex", alignItems:"center", justifyContent:"center",
        flexWrap:"wrap", gap:"6px 16px",
        position:"relative", zIndex:1,
      }}>
        <span style={{ fontSize:9, color:"rgba(255,255,255,0.18)",
          fontFamily:"'Barlow',sans-serif", textAlign:"center", lineHeight:1.5 }}>
          RiftForge não é endossado pela Riot Games e não reflete as visões ou opiniões da Riot Games
          ou de qualquer pessoa oficialmente envolvida na produção ou gestão de League of Legends.
          League of Legends e Riot Games são marcas registradas da Riot Games, Inc.
          Dados fornecidos pelo{" "}
          <a href="https://developer.riotgames.com/docs/lol" target="_blank" rel="noopener noreferrer"
            style={{ color:"rgba(11,196,227,0.4)", textDecoration:"none" }}>
            Riot Games Data Dragon
          </a>.
        </span>
      </footer>
    </>
  );
}
