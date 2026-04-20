# ⚔️ LoL Comp Analyzer

Analisador de composição de League of Legends com dados oficiais da Riot Games (Data Dragon).

**Análise 100% local** — nenhuma API key necessária, funciona offline após o primeiro carregamento.

---

## Pré-requisito

- [Node.js](https://nodejs.org) versão 18 ou superior

---

## Instalação e execução

```bash
cd lol-analyzer
npm install
npm run dev
```

Acesse **http://localhost:5173** no navegador.

---

## Como funciona

- Dados dos campeões carregados diretamente do **Riot Games Data Dragon** (versão mais recente, em PT-BR)
- Motor de análise determinístico baseado nas **tags e stats oficiais** de cada campeão
- Nenhuma chamada a IA ou API externa — tudo calculado localmente no browser
