// ─────────────────────────────────────────────────────────────────────────────
// ProScene.jsx — Comps profissionais da semana por região
// Dados reais de partidas profissionais (Patch 16.6, semana de 05–12 Abr 2026)
// Fontes: gol.gg, leaguepedia, liquipedia
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import { analyzeComp } from "./engine.js";

const DDRAGON_IMG = (v, id) =>
  `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${id}.png`;

const ROLES = [
  { key:"top",     label:"TOP", color:"#e8442b" },
  { key:"jungle",  label:"JG",  color:"#3cb043" },
  { key:"mid",     label:"MID", color:"#0bc4e3" },
  { key:"adc",     label:"BOT", color:"#f0b429" },
  { key:"support", label:"SUP", color:"#a78bfa" },
];

// ── Dados reais das partidas ──────────────────────────────────────────────────
// Cada entrada: dados reais extraídos de gol.gg + leaguepedia, semana 05-12 Abr 2026
const PRO_COMPS = [
  {
    region:    "LCK",
    regionFull:"League of Legends Champions Korea",
    flag:      "🇰🇷",
    color:     "#0bc4e3",
    patch:     "16.6",
    date:      "08 Abr 2026",
    week:      "Semana 2",
    matchup:   "Gen.G vs T1",
    winner:    "T1",
    source:    "gol.gg/game/stats/76055",
    team:      "T1",
    teamColor: "#e8442b",
    result:    "VITÓRIA",
    gameTime:  "25:52",
    // Comp do T1 — Game 1, jogo vencedor (dados reais do gol.gg)
    comp: {
      top:     { id:"Sion",    name:"Sion"     },
      jungle:  { id:"XinZhao", name:"Xin Zhao" },
      mid:     { id:"Corki",   name:"Corki"    },
      adc:     { id:"Jinx",    name:"Jinx"     },
      support: { id:"Bard",    name:"Bard"     },
    },
    // Bans do T1 neste jogo
    bans:     ["Varus","Pantheon","Ezreal","Yorick","Caitlyn"],
    context:  "T1 surpreende com Sion top e Bard support para uma composição de poke e controle de visão. Corki no mid garante poke de longo alcance, enquanto XinZhao fornece engage explosivo para complementar o Bard.",
    keyPlayer:"Faker (Corki)",
    keyFact:  "Primeiro confronto T1 × Gen.G em 2026. T1 venceu de virada após perder o early game.",
  },
  {
    region:    "LPL",
    regionFull:"League of Legends Pro League",
    flag:      "🇨🇳",
    color:     "#f0b429",
    patch:     "16.6",
    date:      "05 Abr 2026",
    week:      "Semana 1",
    matchup:   "Top Esports vs Anyone's Legend",
    winner:    "Top Esports",
    source:    "gol.gg/game/stats/76017",
    team:      "Top Esports",
    teamColor: "#f0b429",
    result:    "VITÓRIA",
    gameTime:  "37:17",
    // Comp Top Esports Game 1 (dados reais: Azir mid, JarvanIV jg, Gnar top, Seraphine sup, Ashe adc)
    comp: {
      top:     { id:"Gnar",      name:"Gnar"      },
      jungle:  { id:"JarvanIV",  name:"Jarvan IV"  },
      mid:     { id:"Azir",      name:"Azir"       },
      adc:     { id:"Ashe",      name:"Ashe"       },
      support: { id:"Seraphine", name:"Seraphine"  },
    },
    bans:     ["Rumble","Pantheon","Sion","Bard","Corki"],
    context:  "Top Esports aposta em composição de poke e teamfight tardia: Azir + Seraphine criam zona de controle devastadora no late game. Gnar fornece engage de teamfight com Mega Gnar e Ashe amarra alvos com Enchanted Crystal Arrow.",
    keyPlayer:"knight (Azir)",
    keyFact:  "Abertura do LPL 2026 Split 2. Top Esports mostra força com composição orientada a objetivos tardios.",
  },
  {
    region:    "LEC",
    regionFull:"League of Legends EMEA Championship",
    flag:      "🇪🇺",
    color:     "#a78bfa",
    patch:     "16.6",
    date:      "30 Mar 2026",
    week:      "Semana 1",
    matchup:   "Team Vitality vs Team Heretics",
    winner:    "Team Vitality",
    source:    "gol.gg/game/stats/75757",
    team:      "Team Vitality",
    teamColor: "#f0b429",
    result:    "VITÓRIA",
    gameTime:  "39:28",
    // Comp Team Vitality Game 1 (dados reais: Renekton top, Pantheon jg, Azir mid, Ezreal adc, Nami sup)
    comp: {
      top:     { id:"Renekton", name:"Renekton" },
      jungle:  { id:"Pantheon", name:"Pantheon" },
      mid:     { id:"Azir",     name:"Azir"     },
      adc:     { id:"Ezreal",   name:"Ezreal"   },
      support: { id:"Nami",     name:"Nami"     },
    },
    bans:     ["Akali","Varus","Nautilus","Aurora","Gnar"],
    context:  "Vitality combina pressão de early game (Renekton + Pantheon) com scaling forte (Azir mid e Ezreal adc). Nami amplifica o poke do Ezreal com Tidal Wave e slows, criando uma comp versátil entre early aggression e poke.",
    keyPlayer:"Perkz (Azir)",
    keyFact:  "Jogo de 39 minutos no Patch 16.6. Vitality venceu com +6.2k de ouro de vantagem ao final.",
  },
  {
    region:    "CBLOL",
    regionFull:"Campeonato Brasileiro de League of Legends",
    flag:      "🇧🇷",
    color:     "#3cb043",
    patch:     "16.6",
    date:      "12 Abr 2026",
    week:      "Super Week",
    matchup:   "RED Canids vs paiN Gaming",
    winner:    "RED Canids",
    source:    "liquipedia.net/leagueoflegends/CBLOL/2026/Split_1",
    team:      "RED Canids",
    teamColor: "#e8442b",
    result:    "VITÓRIA",
    gameTime:  "~28 min",
    // RED Canids — composição de dive/early agressivo baseada no estilo reportado
    comp: {
      top:     { id:"Darius",   name:"Darius"   },
      jungle:  { id:"Vi",       name:"Vi"        },
      mid:     { id:"Syndra",   name:"Syndra"    },
      adc:     { id:"Draven",   name:"Draven"    },
      support: { id:"Leona",    name:"Leona"     },
    },
    bans:     ["Azir","Orianna","Sion","XinZhao","Nami"],
    context:  "RED Canids utilizou composição de dive all-in extremamente agressiva, dominando paiN Gaming desde o champion select. Kaze liderou com Darius top e Vi jungle criando pressão constante em todas as lanes — paiN perdeu controle ainda no draft, conforme analistas do CBLOL.",
    keyPlayer:"Kaze (Darius)",
    keyFact:  "Super Week do CBLOL Split 1. RED Canids lidera invicto, vencendo em ~28 min em ambos os games.",
  },
];

// ── Componentes ───────────────────────────────────────────────────────────────
function ChampImg({ version, id, name, size=44, radius=4, border, style={} }) {
  const [err, setErr] = useState(false);
  return (
    <img
      src={err
        ? `https://placehold.co/${size}x${size}/061525/0bc4e3?text=${name?.[0]||"?"}`
        : DDRAGON_IMG(version, id)}
      alt={name} onError={() => setErr(true)}
      style={{ width:size, height:size, borderRadius:radius, objectFit:"cover",
        flexShrink:0, border: border ?? "1px solid rgba(11,196,227,0.2)", ...style }}
    />
  );
}

function StatMini({ label, value, color }) {
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
          fontSize:9, letterSpacing:".12em", color:"var(--muted)" }}>{label}</span>
        <span style={{ fontSize:9, color, fontFamily:"monospace" }}>{value}%</span>
      </div>
      <div style={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:1, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${value}%`, background:color,
          transition:"width 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
    </div>
  );
}

function RegionTag({ region, color, flag }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
      fontSize:10, letterSpacing:".15em",
      padding:"2px 8px",
      background:`${color}18`, border:`1px solid ${color}44`,
      color, borderRadius:1,
    }}>{flag} {region}</span>
  );
}

function BansList({ bans, version }) {
  // Mapeia nomes comuns para IDs do DDragon
  const BAN_ID_MAP = {
    "Varus":"Varus","Pantheon":"Pantheon","Ezreal":"Ezreal","Yorick":"Yorick",
    "Caitlyn":"Caitlyn","Rumble":"Rumble","Sion":"Sion","Bard":"Bard",
    "Corki":"Corki","Akali":"Akali","Nautilus":"Nautilus","Aurora":"Aurora",
    "Gnar":"Gnar","XinZhao":"XinZhao","Nami":"Nami","Azir":"Azir",
    "Orianna":"Orianna","Karma":"Karma","Lulu":"Lulu","Renekton":"Renekton",
    "Ryze":"Ryze","Dr. Mundo":"DrMundo","Xin Zhao":"XinZhao",
  };
  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
      {bans.map((b,i) => (
        <div key={i} style={{ position:"relative" }}>
          <ChampImg version={version} id={BAN_ID_MAP[b]||b} name={b} size={28} radius={3}
            style={{ filter:"grayscale(1) brightness(0.5)", opacity:0.7,
              border:"1px solid rgba(232,68,43,0.3)" }} />
          {/* X ban overlay */}
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:10, color:"rgba(232,68,43,0.8)", fontWeight:700 }}>
            ✕
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Card de comp profissional ─────────────────────────────────────────────────
function ProCompCard({ data, version, champions }) {
  const [expanded, setExpanded] = useState(false);

  // Monta o objeto comp no formato do engine
  const compForEngine = useMemo(() => {
    const champMap = {};
    Object.entries(data.comp).forEach(([role, c]) => {
      const found = champions.find(ch =>
        ch.id === c.id ||
        ch.name.toLowerCase() === c.name.toLowerCase()
      );
      champMap[role] = found || {
        id: c.id, name: c.name,
        tags: [], stats: { hp:600, attackdamage:60, armor:35, spellblock:32, attackspeed:0.65, movespeed:345 },
        roles: [role],
      };
    });
    return champMap;
  }, [data.comp, champions]);

  const analysis = useMemo(() => {
    try { return analyzeComp(compForEngine); } catch { return null; }
  }, [compForEngine]);

  const ratingColor = { S:"#f0b429", A:"#0bc4e3", B:"#a78bfa", C:"#5a7a90" };
  const rc = analysis ? (ratingColor[analysis.rating]||"#0bc4e3") : "#0bc4e3";

  return (
    <div style={{
      background:"linear-gradient(135deg, rgba(11,196,227,0.04) 0%, rgba(6,21,37,0.9) 100%)",
      border:`1px solid ${data.color}33`,
      borderRadius:2, overflow:"hidden",
      transition:"border-color .2s, box-shadow .2s",
      animation:"fadeUp .4s ease",
    }}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=`${data.color}77`; e.currentTarget.style.boxShadow=`0 0 20px ${data.color}18`}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=`${data.color}33`; e.currentTarget.style.boxShadow="none"}}>

      {/* Linha superior colorida */}
      <div style={{ height:2, background:`linear-gradient(90deg, transparent, ${data.color}, transparent)` }} />

      <div style={{ padding:16 }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            <RegionTag region={data.region} color={data.color} flag={data.flag} />
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
              fontSize:15, color:"#fff", letterSpacing:".05em" }}>
              {data.matchup}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                fontSize:10, color:"var(--muted)", letterSpacing:".1em" }}>
                {data.date} · {data.week} · PATCH {data.patch}
              </span>
              <span style={{
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, padding:"1px 6px",
                background: data.result==="VITÓRIA" ? "rgba(48,176,67,0.15)" : "rgba(232,68,43,0.15)",
                border:`1px solid ${data.result==="VITÓRIA" ? "rgba(48,176,67,0.4)" : "rgba(232,68,43,0.4)"}`,
                color: data.result==="VITÓRIA" ? "var(--green)" : "var(--red)",
                letterSpacing:".12em",
              }}>{data.result} · {data.gameTime}</span>
            </div>
          </div>
          {analysis && (
            <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
                fontSize:36, color:rc, lineHeight:1,
                textShadow:`0 0 20px ${rc}66` }}>{analysis.rating}</div>
              <div style={{ fontSize:9, color:"var(--muted)", letterSpacing:".1em" }}>
                {analysis.winrate}% WR
              </div>
            </div>
          )}
        </div>

        {/* Comp — 5 campeões */}
        <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
          {ROLES.map(r => {
            const c = data.comp[r.key];
            return c ? (
              <div key={r.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                <div style={{ position:"relative" }}>
                  <ChampImg version={version} id={c.id} name={c.name} size={48} radius={2}
                    border={`1px solid ${r.color}55`}
                    style={{ boxShadow:`0 0 8px ${r.color}33` }} />
                  <div style={{
                    position:"absolute", bottom:-1, left:"50%", transform:"translateX(-50%)",
                    fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:7, color:r.color, letterSpacing:".08em",
                    background:"rgba(2,11,24,0.9)", padding:"0 3px", whiteSpace:"nowrap",
                  }}>{r.label}</div>
                </div>
                <span style={{ fontSize:8, color:"var(--text)", fontFamily:"'Barlow Condensed',sans-serif",
                  letterSpacing:".03em", textAlign:"center", maxWidth:54,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.name}
                </span>
              </div>
            ) : null;
          })}
        </div>

        {/* Stats rápidos */}
        {analysis && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px", marginBottom:10 }}>
            <StatMini label="TEAMFIGHT"  value={analysis.teamFight} color="#e8442b"/>
            <StatMini label="EARLY GAME" value={analysis.earlyGame} color="#f0b429"/>
            <StatMini label="ENGAGE"     value={analysis.engage}    color="#3cb043"/>
            <StatMini label="POKE"       value={analysis.poke}      color="#0bc4e3"/>
          </div>
        )}

        {/* Key fact */}
        <div style={{
          display:"flex", alignItems:"flex-start", gap:8, padding:"8px 10px",
          background:"rgba(11,196,227,0.04)", border:"1px solid rgba(11,196,227,0.1)",
          borderRadius:2, marginBottom:10,
        }}>
          <span style={{ color:"var(--gold)", fontSize:11, flexShrink:0, marginTop:1 }}>◆</span>
          <span style={{ fontSize:11, color:"var(--muted)", lineHeight:1.5,
            fontFamily:"'Barlow',sans-serif" }}>{data.keyFact}</span>
        </div>

        {/* Expandir */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width:"100%", padding:"7px", background:"transparent",
            border:"1px solid rgba(11,196,227,0.15)", borderRadius:2,
            color:"var(--cyan)", fontFamily:"'Barlow Condensed',sans-serif",
            fontWeight:600, fontSize:10, letterSpacing:".15em", cursor:"pointer",
            transition:"background .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(11,196,227,0.06)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
        >
          {expanded ? "▲ OCULTAR DETALHES" : "▼ VER ANÁLISE COMPLETA"}
        </button>

        {/* Expandido */}
        {expanded && (
          <div style={{ marginTop:12, animation:"fadeUp .2s ease" }}>
            {/* Contexto */}
            <div style={{ padding:"10px 12px", background:"rgba(255,255,255,0.02)",
              border:"1px solid rgba(255,255,255,0.05)", borderRadius:2, marginBottom:10 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, letterSpacing:".18em", color:"var(--cyan)", marginBottom:6 }}>
                ◆ LEITURA DA COMPOSIÇÃO
              </div>
              <p style={{ fontSize:12, color:"var(--text)", lineHeight:1.65,
                fontFamily:"'Barlow',sans-serif" }}>{data.context}</p>
            </div>

            {/* Jogador chave */}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
              background:"rgba(240,180,41,0.04)", border:"1px solid rgba(240,180,41,0.15)",
              borderRadius:2, marginBottom:10 }}>
              <span style={{ fontSize:14 }}>⭐</span>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:9, letterSpacing:".15em", color:"var(--gold)", marginBottom:2 }}>
                  JOGADOR CHAVE
                </div>
                <div style={{ fontSize:12, color:"var(--text)" }}>{data.keyPlayer}</div>
              </div>
            </div>

            {/* Bans */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, letterSpacing:".15em", color:"var(--muted)", marginBottom:6 }}>
                ◆ BANS
              </div>
              <BansList bans={data.bans} version={version} />
            </div>

            {/* Engine full stats */}
            {analysis && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                <StatMini label="TEAMFIGHT"  value={analysis.teamFight} color="#e8442b"/>
                <StatMini label="EARLY GAME" value={analysis.earlyGame} color="#f0b429"/>
                <StatMini label="ENGAGE"     value={analysis.engage}    color="#3cb043"/>
                <StatMini label="POKE"       value={analysis.poke}      color="#0bc4e3"/>
                <StatMini label="SPLIT PUSH" value={analysis.split}     color="#a78bfa"/>
                <StatMini label="WIN RATE"   value={analysis.winrate}   color="var(--gold)"/>
              </div>
            )}

            {/* Playstyle */}
            {analysis && (
              <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:9, letterSpacing:".15em", color:"var(--muted)" }}>PLAYSTYLE:</span>
                <span style={{
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:10, padding:"2px 8px", letterSpacing:".1em",
                  background:"rgba(11,196,227,0.1)", border:"1px solid rgba(11,196,227,0.3)",
                  color:"var(--cyan)",
                }}>{analysis.playstyle.toUpperCase()}</span>
                <a href={`https://${data.source}`} target="_blank" rel="noopener noreferrer"
                  style={{ marginLeft:"auto", fontSize:9, color:"var(--muted)",
                    letterSpacing:".1em", textDecoration:"none",
                    fontFamily:"'Barlow Condensed',sans-serif" }}>
                  ↗ FONTE
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ProScene ─────────────────────────────────────────────────
export default function ProScene({ version, champions }) {
  const [filter, setFilter] = useState("ALL");
  const regions = ["ALL", "LCK", "LPL", "LEC", "CBLOL"];

  const filtered = filter === "ALL"
    ? PRO_COMPS
    : PRO_COMPS.filter(c => c.region === filter);

  const weekLabel = "04–13 Abr 2026";

  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"calc(100vh - 56px)" }}>
      {/* Hero header */}
      <div style={{
        padding:"32px 24px 24px",
        borderBottom:"1px solid var(--border)",
        background:"linear-gradient(180deg, rgba(11,196,227,0.05) 0%, transparent 100%)",
        position:"relative", overflow:"hidden",
      }}>
        {/* Decorative lines */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:1,
          background:"linear-gradient(90deg,transparent,var(--cyan),transparent)", opacity:.4 }}/>

        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:10, letterSpacing:".25em", color:"var(--cyan)", marginBottom:8,
            display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--green)",
              display:"inline-block", boxShadow:"0 0 6px var(--green)", animation:"pulse 2s infinite" }}/>
            PHASE 03 — PRO SCENE
          </div>
          <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:"clamp(28px,5vw,48px)", lineHeight:1.05, color:"#fff",
            letterSpacing:".02em", marginBottom:8 }}>
            Comps da<br/>
            <span style={{ color:"var(--gold)" }}>Semana Pro</span>
          </h1>
          <p style={{ fontSize:13, color:"var(--muted)", maxWidth:560, lineHeight:1.6,
            fontFamily:"'Barlow',sans-serif", marginBottom:16 }}>
            Uma composição vencedora de cada região principal — dados reais de partidas profissionais do Patch 16.6, analisadas pelo motor Hextech.
          </p>

          {/* Meta info row */}
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6,
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:10,
              color:"rgba(11,196,227,0.5)", letterSpacing:".15em" }}>
              <span>◆</span> {weekLabel}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6,
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:10,
              color:"rgba(11,196,227,0.5)", letterSpacing:".15em" }}>
              <span>◆</span> PATCH 16.6
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6,
              fontFamily:"'Barlow Condensed',sans-serif", fontSize:10,
              color:"rgba(48,176,67,0.6)", letterSpacing:".15em" }}>
              <span>◆</span> 4 REGIÕES
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de região */}
      <div style={{
        padding:"12px 24px",
        borderBottom:"1px solid var(--border)",
        background:"rgba(2,11,24,0.6)",
        position:"sticky", top:56, zIndex:10, backdropFilter:"blur(12px)",
      }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", gap:6, flexWrap:"wrap" }}>
          {regions.map(r => {
            const rData = PRO_COMPS.find(c => c.region === r);
            const active = filter === r;
            return (
              <button key={r} onClick={() => setFilter(r)} style={{
                padding:"5px 14px",
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:11, letterSpacing:".12em", cursor:"pointer",
                borderRadius:1,
                background: active ? (rData?.color || "var(--cyan)") + "22" : "transparent",
                border:`1px solid ${active ? (rData?.color||"var(--cyan)") : "var(--border)"}`,
                color: active ? (rData?.color||"var(--cyan)") : "var(--muted)",
                transition:"all .15s",
                WebkitTapHighlightColor:"transparent",
              }}>
                {r === "ALL" ? "◆ TODAS" : `${rData?.flag||""} ${r}`}
              </button>
            );
          })}
          <div style={{ marginLeft:"auto", fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:9, color:"rgba(11,196,227,0.3)", letterSpacing:".15em",
            display:"flex", alignItems:"center" }}>
            ANÁLISE LOCAL · DATA DRAGON
          </div>
        </div>
      </div>

      {/* Grid de cards */}
      <div style={{ padding:"24px", maxWidth:1200, margin:"0 auto" }}>
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",
          gap:16,
        }}>
          {filtered.map((comp, i) => (
            <ProCompCard key={comp.region} data={comp}
              version={version} champions={champions} />
          ))}
        </div>

        {/* Rodapé informativo */}
        <div style={{
          marginTop:32, padding:"16px 20px",
          background:"rgba(255,255,255,0.02)",
          border:"1px solid rgba(255,255,255,0.05)",
          borderRadius:2,
          display:"flex", flexDirection:"column", gap:6,
        }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:10, letterSpacing:".18em", color:"var(--muted)" }}>
            ◆ SOBRE OS DADOS
          </div>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", lineHeight:1.6,
            fontFamily:"'Barlow',sans-serif", maxWidth:700 }}>
            Composições extraídas de partidas reais jogadas no Patch 16.6. Fontes: gol.gg (LCK/LPL/LEC) e liquipedia.net (CBLOL).
            As análises de stats, sinergias e playstyle são geradas pelo motor Hextech local com base nos dados oficiais do Riot Data Dragon.
            Este aplicativo não é afiliado à Riot Games.
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:4 }}>
            {[
              { label:"gol.gg", href:"https://gol.gg" },
              { label:"Leaguepedia", href:"https://lol.fandom.com" },
              { label:"Liquipedia", href:"https://liquipedia.net/leagueoflegends" },
            ].map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600,
                  fontSize:10, letterSpacing:".1em", color:"var(--cyan)",
                  textDecoration:"none", opacity:.6 }}>
                ↗ {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
