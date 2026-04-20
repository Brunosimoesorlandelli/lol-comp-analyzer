// ─────────────────────────────────────────────────────────────────────────────
// engine.js — Motor de análise determinístico de composições de LoL
//
// Toda a lógica é calculada localmente com base nos dados do Data Dragon.
// Nenhuma chamada externa é feita. Zero dependências.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. PERFIS POR TAG ────────────────────────────────────────────────────────
// Cada tag DDragon contribui com pesos para as dimensões de análise.
// Os valores são aditivos e normalizados depois.

const TAG_PROFILES = {
  Fighter: {
    earlyGame:  0.75,
    teamFight:  0.60,
    poke:       0.10,
    engage:     0.55,
    split:      0.80,
    tankiness:  0.55,
    cc:         0.30,
    mobility:   0.45,
    burst:      0.40,
    sustain:    0.50,
  },
  Tank: {
    earlyGame:  0.40,
    teamFight:  0.75,
    poke:       0.05,
    engage:     0.80,
    split:      0.30,
    tankiness:  0.95,
    cc:         0.75,
    mobility:   0.20,
    burst:      0.05,
    sustain:    0.65,
  },
  Mage: {
    earlyGame:  0.45,
    teamFight:  0.70,
    poke:       0.80,
    engage:     0.25,
    split:      0.15,
    tankiness:  0.10,
    cc:         0.55,
    mobility:   0.20,
    burst:      0.75,
    sustain:    0.15,
  },
  Assassin: {
    earlyGame:  0.80,
    teamFight:  0.35,
    poke:       0.25,
    engage:     0.60,
    split:      0.70,
    tankiness:  0.05,
    cc:         0.15,
    mobility:   0.90,
    burst:      0.95,
    sustain:    0.10,
  },
  Marksman: {
    earlyGame:  0.45,
    teamFight:  0.85,
    poke:       0.65,
    engage:     0.05,
    split:      0.50,
    tankiness:  0.05,
    cc:         0.10,
    mobility:   0.30,
    burst:      0.55,
    sustain:    0.20,
  },
  Support: {
    earlyGame:  0.35,
    teamFight:  0.65,
    poke:       0.40,
    engage:     0.60,
    split:      0.05,
    tankiness:  0.30,
    cc:         0.80,
    mobility:   0.25,
    burst:      0.20,
    sustain:    0.70,
  },
};

// ── 2. PERFIS INDIVIDUAIS POR CAMPEÃO ────────────────────────────────────────
// Override fino para campeões com identidade bem definida.
// Apenas os atributos relevantes precisam ser definidos — o resto vem das tags.

const CHAMP_PROFILES = {
  // ─ TOP ─────────────────────────────────────────────────────────────────────
  Malphite:   { engage: 1.0, cc: 0.95, teamFight: 0.90, split: 0.20, mobility: 0.05 },
  Ornn:       { engage: 0.85, cc: 0.90, teamFight: 0.95, tankiness: 1.0, sustain: 0.40 },
  Shen:       { engage: 0.80, teamFight: 0.85, split: 0.70, sustain: 0.60 },
  Gnar:       { engage: 0.75, cc: 0.85, teamFight: 0.80, poke: 0.55 },
  Camille:    { split: 0.95, mobility: 0.90, burst: 0.75, engage: 0.70, cc: 0.60 },
  Fiora:      { split: 1.0, burst: 0.80, mobility: 0.85, teamFight: 0.25, cc: 0.05 },
  Riven:      { split: 0.85, burst: 0.80, mobility: 0.80, earlyGame: 0.85 },
  Darius:     { earlyGame: 0.90, burst: 0.70, split: 0.80, engage: 0.55, cc: 0.55 },
  Renekton:   { earlyGame: 0.95, split: 0.75, cc: 0.55, burst: 0.65 },
  Irelia:     { split: 0.90, burst: 0.75, mobility: 0.80, teamFight: 0.55 },
  Tryndamere: { split: 0.95, burst: 0.70, mobility: 0.75, teamFight: 0.30 },
  Gangplank:  { poke: 0.80, burst: 0.85, teamFight: 0.70, split: 0.70, earlyGame: 0.30 },
  Kennen:     { teamFight: 0.90, cc: 0.85, engage: 0.75, poke: 0.60, split: 0.45 },
  Teemo:      { poke: 0.85, split: 0.75, earlyGame: 0.70, teamFight: 0.25, cc: 0.20 },
  Singed:     { split: 0.80, sustain: 0.70, cc: 0.50, teamFight: 0.40 },
  Nasus:      { split: 0.70, sustain: 0.75, teamFight: 0.55, earlyGame: 0.20, cc: 0.55 },

  // ─ JUNGLE ──────────────────────────────────────────────────────────────────
  Amumu:      { teamFight: 1.0, cc: 1.0, engage: 0.95, earlyGame: 0.35, split: 0.10 },
  Hecarim:    { engage: 0.95, mobility: 0.95, teamFight: 0.85, earlyGame: 0.80 },
  Sejuani:    { teamFight: 0.90, cc: 0.95, engage: 0.90, tankiness: 0.85 },
  Zac:        { teamFight: 0.90, cc: 0.85, engage: 0.90, tankiness: 0.80, mobility: 0.75 },
  JarvanIV:   { engage: 0.85, cc: 0.75, teamFight: 0.80, earlyGame: 0.75 },
  Vi:         { engage: 0.80, cc: 0.80, burst: 0.65, earlyGame: 0.75 },
  LeeSin:     { earlyGame: 1.0, mobility: 0.95, burst: 0.75, engage: 0.80, teamFight: 0.50 },
  Khazix:     { burst: 1.0, earlyGame: 0.90, mobility: 0.90, split: 0.75, teamFight: 0.25 },
  Rengar:     { burst: 0.95, earlyGame: 0.85, mobility: 0.80, split: 0.70 },
  Evelynn:    { burst: 0.95, mobility: 0.90, earlyGame: 0.35, teamFight: 0.45 },
  Kayn:       { mobility: 0.95, burst: 0.75, split: 0.80, teamFight: 0.60 },
  Viego:      { mobility: 0.80, burst: 0.75, sustain: 0.70, teamFight: 0.65 },
  Graves:     { earlyGame: 0.90, burst: 0.80, poke: 0.60, split: 0.70, teamFight: 0.55 },
  Warwick:    { earlyGame: 0.85, sustain: 0.90, engage: 0.70, cc: 0.60, teamFight: 0.65 },
  MasterYi:   { split: 0.90, burst: 0.85, mobility: 0.80, teamFight: 0.40, cc: 0.0 },
  Shaco:      { burst: 0.80, earlyGame: 0.85, split: 0.80, mobility: 0.85, teamFight: 0.20 },
  Nidalee:    { earlyGame: 0.90, poke: 0.85, mobility: 0.80, teamFight: 0.35 },
  Elise:      { earlyGame: 0.90, burst: 0.75, cc: 0.70, teamFight: 0.45 },
  Nocturne:   { engage: 0.90, burst: 0.80, mobility: 0.85, cc: 0.60, teamFight: 0.50 },
  Fiddlesticks: { teamFight: 0.95, cc: 0.90, poke: 0.40, engage: 0.75, earlyGame: 0.25 },
  Karthus:    { teamFight: 0.90, poke: 0.80, earlyGame: 0.25, cc: 0.30, mobility: 0.0 },
  Lillia:     { poke: 0.75, cc: 0.80, mobility: 0.85, teamFight: 0.75, earlyGame: 0.55 },
  Ivern:      { teamFight: 0.70, sustain: 0.75, cc: 0.65, engage: 0.55, earlyGame: 0.20 },

  // ─ MID ─────────────────────────────────────────────────────────────────────
  Orianna:    { teamFight: 1.0, cc: 0.85, poke: 0.75, burst: 0.70, engage: 0.65 },
  Syndra:     { burst: 0.95, poke: 0.80, teamFight: 0.75, cc: 0.65, earlyGame: 0.70 },
  Viktor:     { poke: 0.85, teamFight: 0.85, burst: 0.80, cc: 0.60, earlyGame: 0.45 },
  Azir:       { teamFight: 0.90, poke: 0.90, earlyGame: 0.30, cc: 0.50, split: 0.20 },
  Xerath:     { poke: 1.0, burst: 0.80, teamFight: 0.70, cc: 0.70, mobility: 0.0 },
  Zoe:        { poke: 0.95, burst: 0.90, cc: 0.75, mobility: 0.70, teamFight: 0.50 },
  Ziggs:      { poke: 0.95, teamFight: 0.70, burst: 0.70, cc: 0.45, mobility: 0.10 },
  Taliyah:    { poke: 0.80, teamFight: 0.80, cc: 0.70, engage: 0.65, mobility: 0.70 },
  Ahri:       { burst: 0.80, mobility: 0.90, poke: 0.65, cc: 0.55, teamFight: 0.65 },
  Zed:        { burst: 0.95, split: 0.85, mobility: 0.90, earlyGame: 0.85, teamFight: 0.35 },
  Akali:      { burst: 0.90, split: 0.85, mobility: 0.95, earlyGame: 0.75, teamFight: 0.40 },
  Katarina:   { burst: 0.85, mobility: 0.85, teamFight: 0.85, earlyGame: 0.55, cc: 0.0 },
  Leblanc:    { burst: 0.95, mobility: 0.90, earlyGame: 0.85, teamFight: 0.35, cc: 0.40 },
  Fizz:       { burst: 0.90, mobility: 0.90, earlyGame: 0.80, teamFight: 0.45, cc: 0.50 },
  Yasuo:      { teamFight: 0.80, split: 0.75, mobility: 0.85, burst: 0.70, cc: 0.50 },
  Yone:       { teamFight: 0.80, split: 0.70, mobility: 0.80, burst: 0.75, cc: 0.60 },
  Kassadin:   { burst: 0.85, mobility: 0.95, split: 0.70, earlyGame: 0.15, teamFight: 0.55 },
  Vladimir:   { sustain: 0.90, teamFight: 0.80, poke: 0.65, earlyGame: 0.25, split: 0.60 },
  Swain:      { sustain: 0.85, teamFight: 0.85, cc: 0.65, poke: 0.55, earlyGame: 0.40 },
  Galio:      { teamFight: 0.90, cc: 0.90, engage: 0.85, tankiness: 0.65, poke: 0.40 },
  Lissandra:  { teamFight: 0.85, cc: 0.90, engage: 0.75, burst: 0.65, split: 0.30 },
  Vex:        { teamFight: 0.80, burst: 0.80, poke: 0.70, cc: 0.65, mobility: 0.10 },
  // TwistedFate — see extended profile below
  Ryze:       { teamFight: 0.80, poke: 0.75, burst: 0.70, earlyGame: 0.35, split: 0.65 },
  Malzahar:   { teamFight: 0.80, cc: 0.90, poke: 0.65, burst: 0.70, mobility: 0.05 },
  // AurelionSol — see extended profile below
  Talon:      { burst: 0.90, split: 0.85, mobility: 0.85, earlyGame: 0.85, teamFight: 0.30 },
  Qiyana:     { burst: 0.90, mobility: 0.90, cc: 0.70, earlyGame: 0.80, teamFight: 0.45 },
  Corki:      { poke: 0.80, burst: 0.70, teamFight: 0.70, earlyGame: 0.65, split: 0.55 },

  // ─ ADC ─────────────────────────────────────────────────────────────────────
  Jinx:       { teamFight: 0.85, poke: 0.65, burst: 0.70, split: 0.50, mobility: 0.05, earlyGame: 0.45 },
  Caitlyn:    { poke: 0.90, earlyGame: 0.80, teamFight: 0.65, burst: 0.65, cc: 0.45 },
  Jhin:       { poke: 0.85, burst: 0.80, cc: 0.60, teamFight: 0.70, mobility: 0.30 },
  Vayne:      { split: 0.90, burst: 0.85, mobility: 0.80, earlyGame: 0.20, teamFight: 0.55 },
  Ezreal:     { poke: 0.90, mobility: 0.85, earlyGame: 0.70, burst: 0.65, teamFight: 0.55 },
  Kaisa:      { teamFight: 0.80, burst: 0.80, mobility: 0.80, earlyGame: 0.55, poke: 0.50 },
  Xayah:      { teamFight: 0.85, burst: 0.70, cc: 0.55, earlyGame: 0.55, split: 0.50 },
  // MissFortune — see extended profile below
  Draven:     { earlyGame: 0.95, burst: 0.85, teamFight: 0.60, poke: 0.60, mobility: 0.25 },
  Samira:     { teamFight: 0.90, burst: 0.85, mobility: 0.70, earlyGame: 0.75, cc: 0.0 },
  Aphelios:   { teamFight: 0.85, poke: 0.75, burst: 0.80, earlyGame: 0.45, cc: 0.40 },
  Tristana:   { burst: 0.80, teamFight: 0.70, split: 0.65, mobility: 0.65, earlyGame: 0.55 },
  Sivir:      { teamFight: 0.80, poke: 0.65, split: 0.55, earlyGame: 0.55, cc: 0.35 },
  Lucian:     { earlyGame: 0.90, poke: 0.75, burst: 0.75, mobility: 0.75, teamFight: 0.60 },
  Ashe:       { poke: 0.80, cc: 0.80, teamFight: 0.75, earlyGame: 0.55, mobility: 0.05 },
  KogMaw:     { teamFight: 0.85, poke: 0.90, burst: 0.70, earlyGame: 0.25, mobility: 0.0 },
  Varus:      { poke: 0.85, cc: 0.80, teamFight: 0.75, earlyGame: 0.60, mobility: 0.10 },
  Twitch:     { teamFight: 0.85, burst: 0.80, poke: 0.60, earlyGame: 0.35, mobility: 0.65 },
  Zeri:       { teamFight: 0.80, mobility: 0.90, burst: 0.70, earlyGame: 0.60, poke: 0.55 },
  Nilah:      { teamFight: 0.85, burst: 0.80, mobility: 0.70, earlyGame: 0.65, cc: 0.0 },
  Smolder:    { poke: 0.80, teamFight: 0.75, burst: 0.70, earlyGame: 0.30, mobility: 0.55 },

  // ─ SUPPORT ─────────────────────────────────────────────────────────────────
  Thresh:     { cc: 0.95, engage: 0.90, teamFight: 0.85, sustain: 0.40, mobility: 0.60 },
  Leona:      { engage: 1.0, cc: 1.0, teamFight: 0.85, tankiness: 0.80, earlyGame: 0.80 },
  Nautilus:   { engage: 0.95, cc: 1.0, teamFight: 0.85, tankiness: 0.80, earlyGame: 0.75 },
  Blitzcrank: { engage: 0.95, cc: 0.90, teamFight: 0.75, earlyGame: 0.80, poke: 0.0 },
  Alistar:    { engage: 0.95, cc: 0.90, teamFight: 0.85, tankiness: 0.85, sustain: 0.55 },
  Rell:       { engage: 0.90, cc: 0.95, teamFight: 0.90, tankiness: 0.75, mobility: 0.20 },
  Braum:      { teamFight: 0.90, cc: 0.85, tankiness: 0.75, engage: 0.70, sustain: 0.40 },
  Rakan:      { engage: 0.95, cc: 0.85, teamFight: 0.85, mobility: 0.90, sustain: 0.30 },
  Nami:       { sustain: 0.85, cc: 0.75, poke: 0.70, teamFight: 0.75, engage: 0.55 },
  Lulu:       { sustain: 0.80, cc: 0.70, teamFight: 0.80, poke: 0.65, engage: 0.40 },
  Soraka:     { sustain: 1.0, teamFight: 0.65, cc: 0.50, poke: 0.60, engage: 0.05 },
  Janna:      { sustain: 0.80, cc: 0.75, teamFight: 0.70, poke: 0.55, engage: 0.10 },
  Yuumi:      { sustain: 0.90, teamFight: 0.70, cc: 0.55, poke: 0.55, engage: 0.0 },
  Sona:       { sustain: 0.90, teamFight: 0.85, poke: 0.70, cc: 0.75, engage: 0.65 },
  Morgana:    { cc: 0.85, poke: 0.70, teamFight: 0.75, engage: 0.55, sustain: 0.30 },
  Zyra:       { poke: 0.85, cc: 0.75, teamFight: 0.80, burst: 0.65, sustain: 0.10 },
  Karma:      { poke: 0.80, sustain: 0.65, cc: 0.55, teamFight: 0.70, engage: 0.45 },
  Bard:       { cc: 0.75, mobility: 0.85, teamFight: 0.75, engage: 0.65, sustain: 0.45 },
  Zilean:     { cc: 0.80, sustain: 0.75, teamFight: 0.75, poke: 0.65, engage: 0.40 },
  Pyke:       { engage: 0.85, burst: 0.85, cc: 0.80, mobility: 0.85, sustain: 0.0 },
  Senna:      { poke: 0.80, sustain: 0.70, teamFight: 0.70, cc: 0.60, split: 0.55 },
  Seraphine:  { poke: 0.80, teamFight: 0.85, cc: 0.75, sustain: 0.70, engage: 0.55 },
  Taric:      { tankiness: 0.80, sustain: 0.85, teamFight: 0.80, cc: 0.75, engage: 0.60 },
  Lux:        { poke: 0.85, burst: 0.80, cc: 0.70, teamFight: 0.70, engage: 0.35 },
  // ─ Novos campeões (patch 16.8) ────────────────────────────────────────────
  // Mel (Mage/Support) — maga de refleção de dano, poke e proteção
  Mel:        { poke: 0.80, teamFight: 0.75, sustain: 0.60, cc: 0.55, burst: 0.70, mobility: 0.35 },
  // Sett (Fighter/Tank) — bruiser de frontline, engage e duelo
  Sett:       { earlyGame: 0.85, split: 0.80, burst: 0.75, tankiness: 0.80, engage: 0.70, cc: 0.60 },
  // Zaahen (Fighter/Assassin) — Darkin assassino, burst e mobilidade
  Zaahen:     { burst: 0.90, earlyGame: 0.85, mobility: 0.85, split: 0.80, teamFight: 0.60, sustain: 0.70 },
  // Belveth (Fighter) — high AS fighter/jungler
  Belveth:    { burst: 0.80, mobility: 0.90, earlyGame: 0.80, teamFight: 0.70, split: 0.65, cc: 0.30 },
  // RekSai já existia como Rek — garantir ID correto

  // ─ TOP (continuação) ───────────────────────────────────────────────────────
  Aatrox:     { earlyGame: 0.85, split: 0.85, burst: 0.80, sustain: 0.75, mobility: 0.70, teamFight: 0.70, engage: 0.65 },
  Ambessa:    { earlyGame: 0.90, split: 0.90, burst: 0.85, mobility: 0.85, teamFight: 0.60, cc: 0.50 },
  Garen:      { earlyGame: 0.80, split: 0.75, tankiness: 0.75, sustain: 0.70, burst: 0.55, cc: 0.40 },
  Illaoi:     { split: 0.85, sustain: 0.85, teamFight: 0.70, burst: 0.65, earlyGame: 0.70, mobility: 0.10 },
  Jax:        { split: 0.95, earlyGame: 0.70, burst: 0.80, mobility: 0.75, sustain: 0.65, teamFight: 0.55 },
  Jayce:      { poke: 0.85, earlyGame: 0.90, split: 0.80, burst: 0.75, mobility: 0.65, teamFight: 0.50 },
  Kayle:      { teamFight: 0.85, split: 0.75, sustain: 0.60, earlyGame: 0.15, poke: 0.55, cc: 0.20 },
  Kled:       { earlyGame: 0.90, engage: 0.85, split: 0.80, burst: 0.70, mobility: 0.80, cc: 0.65 },
  KSante:     { tankiness: 0.90, cc: 0.85, engage: 0.80, teamFight: 0.80, mobility: 0.70, split: 0.55 },
  Mordekaiser: { teamFight: 0.85, sustain: 0.75, split: 0.70, burst: 0.65, cc: 0.55, earlyGame: 0.50 },
  Olaf:       { earlyGame: 0.90, split: 0.80, sustain: 0.75, burst: 0.70, mobility: 0.70, cc: 0.0 },
  Poppy:      { tankiness: 0.80, cc: 0.85, engage: 0.75, earlyGame: 0.75, split: 0.65, teamFight: 0.70 },
  Rumble:     { teamFight: 0.90, poke: 0.80, earlyGame: 0.75, burst: 0.75, cc: 0.55, split: 0.45 },
  Sion:       { teamFight: 0.85, tankiness: 0.90, cc: 0.85, engage: 0.80, split: 0.65, earlyGame: 0.35 },
  TahmKench:  { tankiness: 0.90, sustain: 0.80, cc: 0.70, teamFight: 0.70, engage: 0.55, split: 0.40 },
  DrMundo:    { tankiness: 0.90, sustain: 0.95, split: 0.70, teamFight: 0.65, earlyGame: 0.40, cc: 0.20 },
  Trundle:    { split: 0.80, sustain: 0.75, earlyGame: 0.75, cc: 0.60, tankiness: 0.70, teamFight: 0.60 },
  Udyr:       { earlyGame: 0.85, split: 0.80, mobility: 0.80, sustain: 0.75, cc: 0.70, engage: 0.70 },
  Urgot:      { split: 0.80, earlyGame: 0.80, burst: 0.70, tankiness: 0.70, poke: 0.65, cc: 0.55 },
  Volibear:   { engage: 0.85, earlyGame: 0.80, tankiness: 0.80, cc: 0.70, teamFight: 0.75, split: 0.60 },
  MonkeyKing:     { teamFight: 0.85, engage: 0.80, burst: 0.75, earlyGame: 0.75, cc: 0.70, split: 0.65 },
  Yorick:     { split: 1.0, sustain: 0.75, burst: 0.60, teamFight: 0.40, mobility: 0.10, earlyGame: 0.50 },

  // ─ JUNGLE (continuação) ────────────────────────────────────────────────────
  Belveth:    { burst: 0.85, mobility: 0.90, earlyGame: 0.75, teamFight: 0.70, split: 0.65, cc: 0.35 },
  Briar:      { burst: 0.90, earlyGame: 0.85, mobility: 0.85, engage: 0.80, teamFight: 0.55, cc: 0.50 },
  Diana:      { teamFight: 0.85, burst: 0.85, mobility: 0.80, engage: 0.75, earlyGame: 0.55, cc: 0.65 },
  Ekko:       { burst: 0.85, mobility: 0.90, earlyGame: 0.75, split: 0.75, teamFight: 0.65, cc: 0.55 },
  Gwen:       { split: 0.85, sustain: 0.80, burst: 0.75, teamFight: 0.65, mobility: 0.65, earlyGame: 0.60 },
  Kindred:    { poke: 0.75, burst: 0.70, earlyGame: 0.75, teamFight: 0.70, mobility: 0.80, cc: 0.40 },
  Naafiri:    { burst: 0.90, earlyGame: 0.85, mobility: 0.85, split: 0.75, teamFight: 0.35, cc: 0.20 },
  Nunu:       { engage: 0.85, teamFight: 0.85, cc: 0.80, earlyGame: 0.70, tankiness: 0.70, sustain: 0.60 },
  Quinn:      { earlyGame: 0.85, split: 0.85, poke: 0.75, mobility: 0.90, burst: 0.65, teamFight: 0.30 },
  Rammus:     { engage: 0.90, tankiness: 0.95, cc: 0.85, teamFight: 0.80, earlyGame: 0.70, split: 0.20 },
  RekSai:     { earlyGame: 0.90, burst: 0.80, mobility: 0.85, engage: 0.75, cc: 0.60, teamFight: 0.55 },
  Shyvana:    { teamFight: 0.80, split: 0.75, earlyGame: 0.80, burst: 0.70, mobility: 0.70, cc: 0.35 },
  Skarner:    { engage: 0.90, cc: 0.95, tankiness: 0.80, teamFight: 0.85, earlyGame: 0.70, mobility: 0.75 },
  Sylas:      { teamFight: 0.80, burst: 0.80, mobility: 0.80, cc: 0.65, earlyGame: 0.60, sustain: 0.55 },
  XinZhao:    { earlyGame: 0.90, engage: 0.85, burst: 0.75, cc: 0.65, teamFight: 0.70, mobility: 0.70 },

  // ─ MID (continuação) ───────────────────────────────────────────────────────
  Akshan:     { poke: 0.80, mobility: 0.85, burst: 0.75, split: 0.70, earlyGame: 0.70, cc: 0.55 },
  Anivia:     { teamFight: 0.85, poke: 0.80, cc: 0.80, sustain: 0.60, burst: 0.70, earlyGame: 0.30 },
  Annie:      { burst: 0.90, teamFight: 0.85, cc: 0.85, poke: 0.65, earlyGame: 0.65, mobility: 0.05 },
  AurelionSol:  { teamFight: 0.90, poke: 0.85, burst: 0.85, cc: 0.50, earlyGame: 0.20, mobility: 0.55 },
  Aurora:     { burst: 0.85, mobility: 0.90, poke: 0.75, earlyGame: 0.70, teamFight: 0.65, cc: 0.55 },
  Brand:      { teamFight: 0.90, burst: 0.85, poke: 0.80, cc: 0.55, earlyGame: 0.65, mobility: 0.05 },
  Cassiopeia: { poke: 0.90, teamFight: 0.85, burst: 0.80, cc: 0.75, sustain: 0.50, mobility: 0.10 },
  Chogath:      { tankiness: 0.90, cc: 0.80, teamFight: 0.80, sustain: 0.75, burst: 0.55, split: 0.45 },
  Heimerdinger: { poke: 0.90, split: 0.80, earlyGame: 0.70, burst: 0.70, teamFight: 0.55, mobility: 0.10 },
  Hwei:       { poke: 0.85, teamFight: 0.85, burst: 0.80, cc: 0.70, sustain: 0.50, mobility: 0.20 },
  Neeko:      { teamFight: 0.85, cc: 0.80, burst: 0.80, poke: 0.65, engage: 0.70, mobility: 0.55 },
  Pantheon:   { earlyGame: 0.90, burst: 0.85, engage: 0.80, cc: 0.70, poke: 0.70, teamFight: 0.55 },
  TwistedFate:  { poke: 0.75, burst: 0.70, cc: 0.70, teamFight: 0.65, split: 0.75, mobility: 0.55 },
  Veigar:     { burst: 0.95, teamFight: 0.80, cc: 0.75, poke: 0.70, earlyGame: 0.30, mobility: 0.10 },
  Velkoz:     { poke: 0.95, teamFight: 0.80, burst: 0.80, cc: 0.65, earlyGame: 0.50, mobility: 0.0 },
  Yunara:     { teamFight: 0.85, poke: 0.80, burst: 0.80, cc: 0.65, sustain: 0.50, earlyGame: 0.45 },

  // ─ ADC (continuação) ───────────────────────────────────────────────────────
  Kalista:    { earlyGame: 0.90, teamFight: 0.85, mobility: 0.90, burst: 0.65, poke: 0.55, cc: 0.45 },
  MissFortune:  { teamFight: 0.90, poke: 0.80, burst: 0.75, earlyGame: 0.80, cc: 0.60, mobility: 0.15 },

  // ─ SUPPORT (continuação) ───────────────────────────────────────────────────
  Gragas:     { engage: 0.85, cc: 0.85, teamFight: 0.80, burst: 0.65, tankiness: 0.70, poke: 0.50 },
  Maokai:     { cc: 0.90, tankiness: 0.85, teamFight: 0.85, engage: 0.80, sustain: 0.50, split: 0.30 },
  Milio:      { sustain: 0.85, cc: 0.50, teamFight: 0.75, poke: 0.65, engage: 0.15, sustain: 0.85 },
  Renata:     { cc: 0.80, teamFight: 0.85, sustain: 0.65, poke: 0.65, engage: 0.55, burst: 0.50 },
};

// ── 3. REGRAS DE SINERGIA ────────────────────────────────────────────────────
// Cada regra define: condição (função) → { pair, desc, bonus }
// O bonus aumenta os scores da composição se a sinergia for detectada.

const SYNERGY_RULES = [
  // ── Engage + AoE Teamfight ──────────────────────────────────────────────────
  {
    id: "malphite_yasuo",
    match: (c) => has(c, "Malphite") && (has(c, "Yasuo") || has(c, "Yone")),
    pair: () => `Malphite + ${has(c => has(c, "Yasuo"), "Yasuo") ? "Yasuo" : "Yone"}`,
    desc: "Combo clássico de engage: o ultimate do Malphite lança vários inimigos no ar, permitindo ao Yasuo/Yone usar Last Breath para dano massivo em teamfight.",
    bonus: { teamFight: 0.15, engage: 0.10 },
  },
  {
    id: "engage_aoe",
    match: (c) => getScore(c, "engage") > 0.70 && getScore(c, "teamFight") > 0.70,
    pair: (c) => `${getDominantChamp(c, "engage")} + ${getDominantChamp(c, "teamFight")}`,
    desc: "Composição com forte capacidade de iniciar teamfights. O engage primário abre espaço para campeões de dano em área convertam a luta.",
    bonus: { teamFight: 0.08 },
  },

  // ── Dive Comp ───────────────────────────────────────────────────────────────
  {
    id: "dive_comp",
    match: (c) => getScore(c, "mobility") > 0.70 && getScore(c, "burst") > 0.70,
    pair: (c) => `${getDominantChamp(c, "burst")} + ${getDominantChamp(c, "mobility")}`,
    desc: "Composição de dive: alta mobilidade e burst combinados permitem isolar e eliminar carries inimigos rapidamente antes que possam reagir.",
    bonus: { earlyGame: 0.08, burst: 0.10 },
  },

  // ── Poke + Caitlyn/Xerath ───────────────────────────────────────────────────
  {
    id: "poke_comp",
    match: (c) => getScore(c, "poke") > 0.75,
    pair: (c) => `${getDominantChamp(c, "poke")} + ${getSecondDominantChamp(c, "poke")}`,
    desc: "Forte composição de poke: desgasta os inimigos antes de teamfights, forçando recalls e criando vantagem numérica nos objetivos.",
    bonus: { poke: 0.10, earlyGame: 0.05 },
  },

  // ── Protect the Carry ───────────────────────────────────────────────────────
  {
    id: "protect_carry",
    match: (c) => getScore(c, "sustain") > 0.70 && getScore(c, "teamFight") > 0.65,
    pair: (c) => `${getDominantChamp(c, "sustain")} + ${getDominantChamp(c, "teamFight")}`,
    desc: "Composição 'protect the carry': suporte(s) com alto sustain mantêm o carry vivo por mais tempo, maximizando o dano por teamfight.",
    bonus: { teamFight: 0.07, sustain: 0.08 },
  },

  // ── Split Push + Teleport ───────────────────────────────────────────────────
  {
    id: "split_push",
    match: (c) => getScore(c, "split") > 0.75 && getScore(c, "teamFight") > 0.60,
    pair: (c) => `${getDominantChamp(c, "split")} + ${getDominantChamp(c, "teamFight")}`,
    desc: "Pressão de mapa dividida: o splitpusher força o time inimigo a responder em dois fronts, enquanto o resto da equipe controla objetivos.",
    bonus: { split: 0.10 },
  },

  // ── CC Chain ────────────────────────────────────────────────────────────────
  {
    id: "cc_chain",
    match: (c) => getScore(c, "cc") > 0.72,
    pair: (c) => `${getDominantChamp(c, "cc")} + ${getSecondDominantChamp(c, "cc")}`,
    desc: "Cadeia de controle de grupo: múltiplos CCs encadeados impedem que inimigos escapem ou reajam, convertendo lutas com facilidade.",
    bonus: { teamFight: 0.08, engage: 0.06 },
  },

  // ── Assassin + Zone ─────────────────────────────────────────────────────────
  {
    id: "assassin_zone",
    match: (c) => getScore(c, "burst") > 0.80 && getScore(c, "cc") > 0.60,
    pair: (c) => `${getDominantChamp(c, "burst")} + ${getDominantChamp(c, "cc")}`,
    desc: "Assassino + controle de zona: o CC imobiliza o alvo enquanto o assassino desfere burst total, sem chance de reação do inimigo.",
    bonus: { burst: 0.08, earlyGame: 0.06 },
  },

  // ── Tank + Damage dealer ────────────────────────────────────────────────────
  {
    id: "frontback",
    match: (c) => getScore(c, "tankiness") > 0.65 && getScore(c, "burst") > 0.65,
    pair: (c) => `${getDominantChamp(c, "tankiness")} + ${getDominantChamp(c, "burst")}`,
    desc: "Front-to-back clássico: o tank absorve dano e inicia enquanto os carries no backline causam dano com segurança.",
    bonus: { teamFight: 0.06 },
  },

  // ── Late-game scaling ───────────────────────────────────────────────────────
  {
    id: "scaling",
    match: (c) => getScore(c, "earlyGame") < 0.40 && getScore(c, "teamFight") > 0.75,
    pair: (c) => `${getDominantChamp(c, "teamFight")} + ${getSecondDominantChamp(c, "teamFight")}`,
    desc: "Composição de escalonamento: fraca no early game, mas devastadora no late. Sobreviver aos primeiros 20 minutos é a chave para dominar o jogo.",
    bonus: { teamFight: 0.10 },
  },

  // ── High mobility comp ──────────────────────────────────────────────────────
  {
    id: "skirmish",
    match: (c) => getScore(c, "mobility") > 0.75 && getScore(c, "earlyGame") > 0.65,
    pair: (c) => `${getDominantChamp(c, "mobility")} + ${getDominantChamp(c, "earlyGame")}`,
    desc: "Composição de skirmish: alta mobilidade e early game fortes permitem controlar o mapa, invadir jungle e criar vantagens antes dos 15 minutos.",
    bonus: { earlyGame: 0.10 },
  },
];

// ── 4. HELPERS INTERNOS ──────────────────────────────────────────────────────

function has(comp, champId) {
  return Object.values(comp).some(c => c && c.id === champId);
}

// Calcula o score médio da comp em uma dimensão
function getScore(comp, dim) {
  const champList = Object.values(comp).filter(Boolean);
  if (!champList.length) return 0;
  const sum = champList.reduce((acc, c) => acc + getChampScore(c, dim), 0);
  return sum / champList.length;
}

// Score de um campeão numa dimensão específica
function getChampScore(champ, dim) {
  // 1. Perfil individual tem prioridade
  if (CHAMP_PROFILES[champ.id]?.[dim] !== undefined) {
    return CHAMP_PROFILES[champ.id][dim];
  }
  // 2. Média ponderada das tags
  if (!champ.tags?.length) return 0.3;
  const vals = champ.tags
    .map(t => TAG_PROFILES[t]?.[dim] ?? 0)
    .filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b) / vals.length : 0.3;
}

// Retorna o nome do campeão com maior score numa dimensão
function getDominantChamp(comp, dim) {
  return Object.entries(comp)
    .filter(([, c]) => c)
    .sort(([, a], [, b]) => getChampScore(b, dim) - getChampScore(a, dim))[0]?.[1]?.name || "?";
}

function getSecondDominantChamp(comp, dim) {
  return Object.entries(comp)
    .filter(([, c]) => c)
    .sort(([, a], [, b]) => getChampScore(b, dim) - getChampScore(a, dim))[1]?.[1]?.name || "?";
}

// ── 5. REGRAS DE FRAQUEZA ────────────────────────────────────────────────────

const WEAKNESS_RULES = [
  {
    id: "no_cc",
    condition: (scores) => scores.cc < 0.35,
    text: "Falta de controle de grupo (CC): composição vulnerável a teamfights organizadas do inimigo, sem forma consistente de interromper canalizações ou prender carries.",
  },
  {
    id: "no_tank",
    condition: (scores) => scores.tankiness < 0.30,
    text: "Sem frontline sólido: carece de resistência para absorver dano e iniciar lutas, ficando exposta a assassinos e composições de dive.",
  },
  {
    id: "no_engage",
    condition: (scores) => scores.engage < 0.35,
    text: "Dificuldade de iniciar teamfights: depende que o inimigo cometa erros para criar oportunidades de luta. Suscetível a composições de poke prolongado.",
  },
  {
    id: "no_sustain",
    condition: (scores) => scores.sustain < 0.25,
    text: "Baixo sustain: pouca capacidade de recuperação em lutas prolongadas. Vulnerável a composições de poke que desgastam antes de teamfights decisivas.",
  },
  {
    id: "no_mobility",
    condition: (scores) => scores.mobility < 0.30,
    text: "Baixa mobilidade: facilmente alvejada por assassinos e composições de pick. Posicionamento cuidadoso é obrigatório em todas as fases do jogo.",
  },
  {
    id: "no_poke",
    condition: (scores) => scores.poke < 0.30,
    text: "Sem pressão de poke: dificuldade para desgastar inimigos à distância antes de objetivos. Precisa ganhar em lutas diretas para obter vantagem.",
  },
  {
    id: "no_split",
    condition: (scores) => scores.split < 0.25,
    text: "Sem ameaça de split push: composição deve sempre jogar em grupo para ser efetiva, sem capacidade de criar pressão de mapa individual.",
  },
  {
    id: "early_weak",
    condition: (scores) => scores.earlyGame < 0.35,
    text: "Early game fraco: vulnerável a composições agressivas nos primeiros 15 minutos. Requer gestão cuidadosa de recursos e evitar lutas desvantajosas.",
  },
  {
    id: "all_in",
    condition: (scores) => scores.teamFight > 0.80 && scores.poke < 0.35 && scores.split < 0.35,
    text: "Composição all-in: extremamente dependente de ganhar teamfights decisivas. Se o inimigo evitar confrontos diretos, a efetividade cai drasticamente.",
  },
];

// ── 6. CÁLCULO DO PLAYSTYLE ──────────────────────────────────────────────────

function calcPlaystyle(scores) {
  const candidates = [
    { label: "Teamfight",   score: scores.teamFight + scores.engage * 0.5 },
    { label: "Engage",      score: scores.engage + scores.cc * 0.5 },
    { label: "Poke",        score: scores.poke + scores.earlyGame * 0.3 },
    { label: "Split Push",  score: scores.split + scores.mobility * 0.3 },
    { label: "Pick",        score: scores.burst + scores.mobility * 0.5 },
    { label: "Scaling",     score: (1 - scores.earlyGame) * 0.6 + scores.teamFight * 0.4 },
  ];
  return candidates.sort((a, b) => b.score - a.score)[0].label;
}

// ── 7. CÁLCULO DO RATING ─────────────────────────────────────────────────────

function calcRating(winrate, synergyCount, weaknessCount) {
  if (winrate >= 57 && synergyCount >= 2 && weaknessCount <= 1) return "S";
  if (winrate >= 53 && synergyCount >= 1 && weaknessCount <= 2) return "A";
  if (winrate >= 49) return "B";
  return "C";
}

// ── 8. ESTRATÉGIA E WIN CONDITION ────────────────────────────────────────────

const STRATEGY_TEMPLATES = [
  {
    match: (s) => s.engage > 0.70 && s.teamFight > 0.70,
    strategy: "Composição orientada a teamfight com forte capacidade de engage. A prioridade é controlar objetivos como Barão e Dragão, forçando o time inimigo a lutar em condições desfavoráveis. Rotações coordenadas e visão no mapa são essenciais para criar oportunidades de engage.",
    win_condition: "Acumule vantagem de objetivos e force teamfights 5v5. Com engage sólido e dano em área, uma única luta bem executada pode encerrar o jogo.",
  },
  {
    match: (s) => s.poke > 0.72,
    strategy: "Composição de desgaste baseada em poke à distância. O objetivo é reduzir a vida e mana dos inimigos antes de cada teamfight, impedindo que entrem em lutas com recursos completos. Priorize zoning de objetivos e force o inimigo a jogar com recursos reduzidos.",
    win_condition: "Desgaste contínuo combinado com controle de visão e objetivos. Quando os inimigos estiverem suficientemente enfraquecidos, converta com um engage decisivo ou ataque o Nexus diretamente.",
  },
  {
    match: (s) => s.split > 0.72,
    strategy: "Estratégia de pressão de mapa com split push como vetor principal. O splitpusher deve criar pressão constante em uma side lane, forçando o time inimigo a dividir recursos enquanto o restante controla o mapa e objetivos centrais.",
    win_condition: "O splitpusher elimina towers e ingressa ao base enquanto o resto do time mantém pressão global. Vitória por smother ou após uma fight 4v4 vantajosa.",
  },
  {
    match: (s) => s.burst > 0.78 && s.mobility > 0.72,
    strategy: "Composição de assassinato e pick: identificar e eliminar ameaças inimigas isoladas antes de teamfights decisivas. Controle de visão é fundamental para emboscadas e rotações eficientes. Evite lutas 5v5 abertas onde o dano sustentado do inimigo pode ser problemático.",
    win_condition: "Elimine os carries inimigos em picks antes das teamfights. Com o dano inimigo reduzido, as lutas tornam-se fáceis de converter.",
  },
  {
    match: (s) => s.sustain > 0.65 && s.teamFight > 0.70,
    strategy: "Composição de sustain e desgaste em teamfights longas. A durabilidade elevada permite fights prolongadas onde o heal supera o dano inimigo. Priorize lutas em espaços abertos onde o sustain seja mais efetivo do que em condições de burst.",
    win_condition: "Vença em lutas de atrito. Quanto mais longa a teamfight, maior a vantagem desta composição. Objetivos no late game são a janela principal de vitória.",
  },
  {
    match: () => true, // fallback
    strategy: "Composição equilibrada com múltiplas estratégias viáveis. Adapte o estilo de jogo conforme a composição inimiga: busque lutas quando tiver vantagem e evite situações desfavoráveis. Bom macro e rotações eficientes são fundamentais para maximizar o potencial.",
    win_condition: "Construa vantagens graduais através de trades vantajosos, controle de objetivos e pressão de mapa consistente para chegar ao late game em posição dominante.",
  },
];

// ── 9. FUNÇÃO PRINCIPAL DE ANÁLISE ──────────────────────────────────────────

export function analyzeComp(comp) {
  const champList = Object.values(comp).filter(Boolean);
  if (champList.length !== 5) return null;

  // 9.1 — Calcular scores brutos por dimensão
  const dims = ["earlyGame","teamFight","poke","engage","split","tankiness","cc","mobility","burst","sustain"];
  const rawScores = {};
  dims.forEach(d => { rawScores[d] = getScore(comp, d); });

  // 9.2 — Detectar sinergias
  const detectedSynergies = SYNERGY_RULES
    .filter(rule => rule.match(comp, rawScores))
    .slice(0, 3) // máximo 3 sinergias
    .map(rule => ({
      pair: typeof rule.pair === "function" ? rule.pair(comp) : rule.pair,
      desc: rule.desc,
      bonus: rule.bonus || {},
    }));

  // 9.3 — Aplicar bônus de sinergia
  const scores = { ...rawScores };
  detectedSynergies.forEach(s => {
    Object.entries(s.bonus).forEach(([dim, val]) => {
      if (scores[dim] !== undefined) scores[dim] = Math.min(1, scores[dim] + val);
    });
  });

  // 9.4 — Detectar fraquezas
  const weaknesses = WEAKNESS_RULES
    .filter(r => r.condition(scores))
    .map(r => r.text)
    .slice(0, 4);

  // 9.5 — Calcular win rate
  // Base: 50%. Prêmio por sinergias, penalidade por fraquezas.
  // Score de "força" ponderado pelas dimensões mais relevantes
  const strengthScore =
    scores.teamFight * 0.25 +
    scores.earlyGame * 0.15 +
    scores.engage    * 0.15 +
    scores.burst     * 0.15 +
    scores.cc        * 0.10 +
    scores.poke      * 0.10 +
    scores.tankiness * 0.10;

  const synergyBonus  = detectedSynergies.length * 1.5;
  const weaknessMalus = weaknesses.length * 1.2;
  const winrate = Math.round(
    Math.min(72, Math.max(41,
      44 + strengthScore * 22 + synergyBonus - weaknessMalus
    ))
  );

  // 9.6 — Playstyle e Rating
  const playstyle = calcPlaystyle(scores);
  const rating    = calcRating(winrate, detectedSynergies.length, weaknesses.length);

  // 9.7 — Estratégia e win condition
  const template = STRATEGY_TEMPLATES.find(t => t.match(scores));

  // 9.8 — Converter scores para percentual (0–100) para exibição
  const toPercent = (v) => Math.round(Math.min(100, Math.max(0, v * 100)));

  return {
    winrate,
    earlyGame:  toPercent(scores.earlyGame),
    teamFight:  toPercent(scores.teamFight),
    poke:       toPercent(scores.poke),
    engage:     toPercent(scores.engage),
    split:      toPercent(scores.split),
    synergies:  detectedSynergies,
    strategy:   template.strategy,
    win_condition: template.win_condition,
    weaknesses,
    playstyle,
    rating,
    // Stats base do DDragon para exibição
    champStats: Object.fromEntries(
      Object.entries(comp).filter(([, c]) => c).map(([role, c]) => [role, c.stats])
    ),
  };
}
