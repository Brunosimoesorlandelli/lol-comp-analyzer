// ─────────────────────────────────────────────────────────────────────────────
// SavedComps.jsx — Histórico de composições salvas (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "riftforge_saved_comps";
const MAX_SAVES   = 30;

const DDRAGON_IMG = (v, id) =>
  `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${id}.png`;

const ROLES = [
  { key:"top",     label:"TOP", color:"#e8442b" },
  { key:"jungle",  label:"JG",  color:"#3cb043" },
  { key:"mid",     label:"MID", color:"#0bc4e3" },
  { key:"adc",     label:"BOT", color:"#f0b429" },
  { key:"support", label:"SUP", color:"#a78bfa" },
];

const RATING_COLORS = { S:"#f0b429", A:"#0bc4e3", B:"#a78bfa", C:"#5a7a90" };

// ── Hook público — use em qualquer componente ─────────────────────────────────
export function useSavedComps() {
  const [saves, setSaves] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  });

  // Persiste sempre que muda
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saves)); }
    catch { /* quota exceeded etc */ }
  }, [saves]);

  const saveComp = useCallback((name, comp, analysis) => {
    const entry = {
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name:      name.trim() || "Composição sem nome",
      savedAt:   new Date().toISOString(),
      comp,      // { top, jungle, mid, adc, support } — cada um é o objeto champ do DDragon
      analysis,  // resultado completo do engine
    };
    setSaves(prev => {
      const updated = [entry, ...prev].slice(0, MAX_SAVES);
      return updated;
    });
    return entry.id;
  }, []);

  const deleteComp = useCallback((id) => {
    setSaves(prev => prev.filter(s => s.id !== id));
  }, []);

  const renameComp = useCallback((id, newName) => {
    setSaves(prev => prev.map(s =>
      s.id === id ? { ...s, name: newName.trim() || s.name } : s
    ));
  }, []);

  return { saves, saveComp, deleteComp, renameComp };
}

// ── Modal de salvar comp ──────────────────────────────────────────────────────
export function SaveModal({ comp, analysis, version, onSave, onClose }) {
  const [name, setName]     = useState("");
  const [saved, setSaved]   = useState(false);

  const handleSave = () => {
    if (saved) return;
    onSave(name);
    setSaved(true);
    setTimeout(onClose, 900);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  // Auto-suggest name from playstyle + top champ
  const suggestion = analysis
    ? `${analysis.playstyle} — ${Object.values(comp).filter(Boolean)[0]?.name || ""}`
    : "";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, background:"rgba(2,11,24,0.85)",
          backdropFilter:"blur(8px)", zIndex:400,
          animation:"backdropIn .2s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        width:"min(440px, calc(100vw - 32px))",
        zIndex:401,
        background:"var(--bg1)",
        border:"1px solid var(--border)",
        borderRadius:4,
        animation:"fadeUp .25s ease",
        overflow:"hidden",
      }}>
        {/* Top accent */}
        <div style={{ height:2, background:"linear-gradient(90deg,transparent,var(--cyan),transparent)" }}/>

        <div style={{ padding:24 }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:9, letterSpacing:".2em", color:"var(--cyan)", marginBottom:4 }}>
                ◆ SALVAR COMPOSIÇÃO
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
                fontSize:18, color:"#fff", letterSpacing:".05em" }}>
                Dê um nome à sua comp
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none",
              color:"var(--muted)", fontSize:20, cursor:"pointer", lineHeight:1,
              padding:"0 4px" }}>×</button>
          </div>

          {/* Mini comp preview */}
          <div style={{ display:"flex", justifyContent:"space-around", marginBottom:20,
            padding:"12px 0", borderTop:"1px solid var(--border)",
            borderBottom:"1px solid var(--border)" }}>
            {ROLES.map(r => {
              const c = comp[r.key];
              return c ? (
                <div key={r.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <ChampThumb version={version} id={c.id} name={c.name} size={40}
                    border={`1px solid ${r.color}55`} />
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:8, color:r.color, letterSpacing:".1em" }}>{r.label}</span>
                </div>
              ) : null;
            })}
          </div>

          {/* Rating badge */}
          {analysis && (
            <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center" }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
                fontSize:28, color:RATING_COLORS[analysis.rating]||"var(--cyan)",
                textShadow:`0 0 16px ${RATING_COLORS[analysis.rating]}66` }}>
                {analysis.rating}
              </div>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:14, color:"var(--gold)" }}>{analysis.winrate}% WR</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10,
                  color:"var(--muted)", letterSpacing:".1em" }}>
                  {analysis.playstyle.toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {/* Name input */}
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKey}
            placeholder={suggestion || "Ex: Engage comp semana 3..."}
            maxLength={48}
            style={{
              width:"100%", padding:"10px 14px", marginBottom:12,
              background:"rgba(11,196,227,0.05)",
              border:`1px solid ${saved ? "var(--green)" : "var(--border)"}`,
              borderRadius:2, color:"var(--text)", fontSize:13,
              fontFamily:"'Barlow',sans-serif", outline:"none",
              transition:"border-color .2s",
            }}
            onFocus={e => e.target.style.borderColor="var(--cyan)"}
            onBlur={e => e.target.style.borderColor=saved?"var(--green)":"var(--border)"}
          />
          <div style={{ fontSize:10, color:"var(--muted)", marginBottom:16,
            fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".08em" }}>
            {name.length}/48 · Enter para salvar
          </div>

          {/* Buttons */}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} className="btn-ghost"
              style={{ flex:1, padding:"10px" }}>
              CANCELAR
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              style={{
                flex:2, padding:"10px",
                background: saved
                  ? "var(--green)"
                  : "linear-gradient(135deg,#0bc4e3,#0890a8)",
                border:"none", borderRadius:2, cursor: saved ? "default" : "pointer",
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:12, letterSpacing:".15em",
                color: saved ? "#fff" : "var(--bg0)",
                transition:"all .2s",
              }}>
              {saved ? "✓ SALVO!" : "◆ SALVAR"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Miniatura de campeão interna ──────────────────────────────────────────────
function ChampThumb({ version, id, name, size=36, border, style={} }) {
  const [err, setErr] = useState(false);
  return (
    <img
      src={err
        ? `https://placehold.co/${size}x${size}/061525/0bc4e3?text=${name?.[0]||"?"}`
        : DDRAGON_IMG(version, id)}
      alt={name} onError={() => setErr(true)}
      style={{ width:size, height:size, borderRadius:3, objectFit:"cover",
        flexShrink:0, border: border ?? "1px solid rgba(11,196,227,0.2)", ...style }}
    />
  );
}

// ── Card de comp salva ────────────────────────────────────────────────────────
function SavedCard({ save, version, onLoad, onDelete, onRename }) {
  const [editing, setEditing]   = useState(false);
  const [nameVal, setNameVal]   = useState(save.name);
  const [confirming, setConfirm] = useState(false);
  const rc = RATING_COLORS[save.analysis?.rating] || "var(--cyan)";

  const date = new Date(save.savedAt);
  const dateStr = date.toLocaleDateString("pt-BR", { day:"2-digit", month:"short" });
  const timeStr = date.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });

  const handleRename = () => {
    if (nameVal.trim()) { onRename(save.id, nameVal); }
    setEditing(false);
  };

  return (
    <div style={{
      background:"linear-gradient(135deg,rgba(11,196,227,0.04) 0%,rgba(6,21,37,0.9) 100%)",
      border:"1px solid var(--border)",
      borderRadius:2, overflow:"hidden",
      transition:"border-color .2s, box-shadow .2s",
      animation:"fadeUp .3s ease",
    }}
    onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(11,196,227,0.4)"; e.currentTarget.style.boxShadow="0 0 16px rgba(11,196,227,0.08)"; }}
    onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.boxShadow="none"; }}>

      <div style={{ height:1, background:`linear-gradient(90deg,transparent,${rc}66,transparent)` }}/>

      <div style={{ padding:"14px 16px" }}>

        {/* Header row */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ flex:1, minWidth:0, marginRight:12 }}>
            {editing ? (
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") handleRename(); if(e.key==="Escape") setEditing(false); }}
                onBlur={handleRename}
                maxLength={48}
                style={{
                  width:"100%", padding:"4px 8px",
                  background:"rgba(11,196,227,0.08)",
                  border:"1px solid var(--cyan)",
                  borderRadius:2, color:"var(--text)", fontSize:13,
                  fontFamily:"'Barlow',sans-serif", outline:"none",
                }}
              />
            ) : (
              <div
                onClick={() => setEditing(true)}
                title="Clique para renomear"
                style={{
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:14, color:"#fff", letterSpacing:".04em",
                  cursor:"text", overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap",
                  padding:"2px 4px", marginLeft:-4, borderRadius:2,
                  transition:"background .15s",
                }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(11,196,227,0.08)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}
              >
                {save.name}
              </div>
            )}
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9,
              color:"var(--muted)", letterSpacing:".1em", marginTop:3 }}>
              {dateStr} · {timeStr}
            </div>
          </div>

          {/* Rating */}
          {save.analysis && (
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
                fontSize:28, color:rc, lineHeight:1,
                textShadow:`0 0 16px ${rc}55` }}>
                {save.analysis.rating}
              </div>
              <div style={{ fontSize:9, color:"var(--muted)", letterSpacing:".08em",
                fontFamily:"'Barlow Condensed',sans-serif" }}>
                {save.analysis.winrate}%
              </div>
            </div>
          )}
        </div>

        {/* Champion row */}
        <div style={{ display:"flex", gap:6, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
          {ROLES.map(r => {
            const c = save.comp?.[r.key];
            return c ? (
              <div key={r.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <ChampThumb version={version} id={c.id} name={c.name} size={36}
                  border={`1px solid ${r.color}44`} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:7, color:r.color, letterSpacing:".08em" }}>{r.label}</span>
              </div>
            ) : null;
          })}

          {/* Playstyle badge */}
          {save.analysis && (
            <span style={{ marginLeft:"auto",
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:9, padding:"2px 8px", letterSpacing:".1em",
              background:"rgba(11,196,227,0.08)", border:"1px solid rgba(11,196,227,0.2)",
              color:"var(--cyan)", borderRadius:1, alignSelf:"flex-end",
            }}>
              {save.analysis.playstyle.toUpperCase()}
            </span>
          )}
        </div>

        {/* Mini stats */}
        {save.analysis && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"3px 10px", marginBottom:12 }}>
            {[
              { label:"TF",    value:save.analysis.teamFight, color:"#e8442b" },
              { label:"EARLY", value:save.analysis.earlyGame, color:"#f0b429" },
              { label:"POKE",  value:save.analysis.poke,      color:"#0bc4e3" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:8, letterSpacing:".1em", color:"var(--muted)" }}>{s.label}</span>
                  <span style={{ fontSize:8, color:s.color, fontFamily:"monospace" }}>{s.value}</span>
                </div>
                <div style={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:1, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${s.value}%`, background:s.color,
                    transition:"width .8s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:6 }}>
          <button
            onClick={() => onLoad(save)}
            style={{
              flex:1, padding:"8px",
              background:"rgba(11,196,227,0.08)",
              border:"1px solid rgba(11,196,227,0.25)",
              borderRadius:2, cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
              fontSize:10, letterSpacing:".12em", color:"var(--cyan)",
              transition:"all .15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(11,196,227,0.16)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(11,196,227,0.08)"}
          >
            ↩ CARREGAR
          </button>

          {confirming ? (
            <>
              <button
                onClick={() => onDelete(save.id)}
                style={{
                  padding:"8px 12px",
                  background:"rgba(232,68,43,0.2)",
                  border:"1px solid var(--red)",
                  borderRadius:2, cursor:"pointer",
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:10, letterSpacing:".1em", color:"var(--red)",
                }}>CONFIRMAR</button>
              <button
                onClick={() => setConfirm(false)}
                style={{
                  padding:"8px 10px",
                  background:"transparent",
                  border:"1px solid var(--border)",
                  borderRadius:2, cursor:"pointer",
                  color:"var(--muted)", fontSize:11,
                }}>✕</button>
            </>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              title="Excluir"
              style={{
                padding:"8px 12px",
                background:"transparent",
                border:"1px solid rgba(232,68,43,0.2)",
                borderRadius:2, cursor:"pointer",
                color:"rgba(232,68,43,0.5)",
                fontSize:12, transition:"all .15s",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--red)"; e.currentTarget.style.color="var(--red)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(232,68,43,0.2)"; e.currentTarget.style.color="rgba(232,68,43,0.5)"; }}
            >🗑</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal de saves ─────────────────────────────────────────────────
export default function SavedComps({ version, saves, onLoad, onDelete, onRename }) {

  const [sortBy, setSortBy] = useState("date"); // "date" | "rating" | "winrate"
  const [search, setSearch] = useState("");

  const sorted = [...saves]
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) ||
      Object.values(s.comp||{}).some(c => c?.name?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === "date")    return new Date(b.savedAt) - new Date(a.savedAt);
      if (sortBy === "rating") {
        const order = { S:0, A:1, B:2, C:3 };
        return (order[a.analysis?.rating]??9) - (order[b.analysis?.rating]??9);
      }
      if (sortBy === "winrate") return (b.analysis?.winrate||0) - (a.analysis?.winrate||0);
      return 0;
    });

  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"calc(100vh - 56px)" }}>

      {/* Hero header */}
      <div style={{
        padding:"32px 24px 20px",
        borderBottom:"1px solid var(--border)",
        background:"linear-gradient(180deg,rgba(240,180,41,0.05) 0%,transparent 100%)",
        position:"relative",
      }}>
        <div style={{ height:1, position:"absolute", top:0, left:0, right:0,
          background:"linear-gradient(90deg,transparent,var(--gold),transparent)", opacity:.35 }}/>

        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:10, letterSpacing:".25em", color:"var(--gold)", marginBottom:8,
            display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:5, height:5, background:"var(--gold)", borderRadius:"50%",
              display:"inline-block", boxShadow:"0 0 6px var(--gold)" }}/>
            PHASE 04 — SAVED COMPS
          </div>
          <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800,
            fontSize:"clamp(26px,5vw,44px)", color:"#fff", lineHeight:1.05,
            letterSpacing:".02em", marginBottom:8 }}>
            Suas<br/><span style={{ color:"var(--gold)" }}>Composições Salvas</span>
          </h1>
          <p style={{ fontSize:13, color:"var(--muted)", maxWidth:480,
            lineHeight:1.6, fontFamily:"'Barlow',sans-serif" }}>
            {saves.length === 0
              ? "Nenhuma composição salva ainda. Monte uma comp, analise e clique em Salvar."
              : `${saves.length} composição${saves.length !== 1 ? "ões" : ""} salva${saves.length !== 1 ? "s" : ""} localmente no seu dispositivo.`
            }
          </p>
        </div>
      </div>

      {/* Controls */}
      {saves.length > 0 && (
        <div style={{
          padding:"10px 24px",
          borderBottom:"1px solid var(--border)",
          background:"rgba(2,11,24,0.6)",
          position:"sticky", top:56, zIndex:10, backdropFilter:"blur(12px)",
        }}>
          <div style={{ maxWidth:1200, margin:"0 auto",
            display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou campeão..."
              style={{
                flex:"1 1 200px", padding:"7px 12px",
                background:"rgba(11,196,227,0.04)",
                border:"1px solid var(--border)", borderRadius:2,
                color:"var(--text)", fontSize:12,
                fontFamily:"'Barlow Condensed',sans-serif",
                letterSpacing:".04em", outline:"none",
              }}
              onFocus={e=>e.target.style.borderColor="var(--cyan)"}
              onBlur={e=>e.target.style.borderColor="var(--border)"}
            />

            {/* Sort */}
            <div style={{ display:"flex", gap:4 }}>
              {[
                { k:"date",    l:"MAIS RECENTES" },
                { k:"rating",  l:"RATING" },
                { k:"winrate", l:"WIN RATE" },
              ].map(s => (
                <button key={s.k} onClick={() => setSortBy(s.k)} style={{
                  padding:"5px 10px", borderRadius:1, cursor:"pointer",
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:9, letterSpacing:".12em",
                  background: sortBy===s.k ? "rgba(240,180,41,0.15)" : "transparent",
                  border:`1px solid ${sortBy===s.k ? "var(--gold)" : "var(--border)"}`,
                  color: sortBy===s.k ? "var(--gold)" : "var(--muted)",
                  transition:"all .15s",
                }}>{s.l}</button>
              ))}
            </div>

            <div style={{ marginLeft:"auto", fontFamily:"'Barlow Condensed',sans-serif",
              fontSize:9, color:"rgba(240,180,41,0.35)", letterSpacing:".15em" }}>
              {sorted.length}/{saves.length} COMPS
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {saves.length === 0 && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", minHeight:"50vh", gap:16, padding:32, textAlign:"center" }}>
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ opacity:.2 }}>
            <polygon points="32,4 60,19 60,45 32,60 4,45 4,19"
              fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
            <text x="32" y="36" textAnchor="middle" fill="var(--gold)"
              fontSize="20" fontFamily="sans-serif">◈</text>
          </svg>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
            fontSize:14, color:"var(--muted)", letterSpacing:".1em" }}>
            NENHUMA COMPOSIÇÃO SALVA
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)",
            maxWidth:300, lineHeight:1.6, fontFamily:"'Barlow',sans-serif" }}>
            Monte uma composição no Analyzer, analise e clique em{" "}
            <span style={{ color:"var(--gold)" }}>◆ SALVAR COMPOSIÇÃO</span>{" "}
            para guardá-la aqui.
          </div>
        </div>
      )}

      {/* Grid de cards */}
      {sorted.length > 0 && (
        <div style={{ padding:"20px 24px", maxWidth:1200, margin:"0 auto" }}>
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",
            gap:14,
          }}>
            {sorted.map(save => (
              <SavedCard
                key={save.id}
                save={save}
                version={version}
                onLoad={onLoad}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </div>
        </div>
      )}

      {/* No results for search */}
      {saves.length > 0 && sorted.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"var(--muted)",
          fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, letterSpacing:".1em" }}>
          Nenhuma composição encontrada para "{search}"
        </div>
      )}
    </div>
  );
}
