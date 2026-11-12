# Alertas de preço manual — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alertar dentro da extensão quando uma cotação manual registrada atingir o preço-alvo configurado para aquela carta, fonte e plataforma.

**Architecture:** Adicionar `priceAlerts` ao estado persistido em `chrome.storage.local`; a aba Preços edita limites e registra snapshots. Após salvar snapshot válido, comparar só com o limite de mesma carta/fonte/plataforma e exibir o resultado no aviso atual do painel. Não consultar serviços externos nem operar a Web App.

**Tech Stack:** JavaScript sem dependências, Chrome Manifest V3, `chrome.storage.local`, Shadow DOM existente.

**Spec:** `docs/superpowers/specs/2026-11-12-market-price-alerts-design.md`

## Global Constraints

- Não adicionar permissões ao `extension/manifest.json`.
- Manter FUTBIN/FUT.GG como links e cotações como entrada manual.
- Não fazer scraping, polling do mercado, compra, lance, relistagem ou qualquer ordem.
- Manter alvos e cotações locais em `chrome.storage.local`.
- Não adicionar ou executar testes automatizados; validar por revisão estática do fluxo e do pacote.

## Review Focus

- Migração de estado antigo sem `priceAlerts`: carregar como lista vazia sem apagar outros dados.
- Fonte ou plataforma diferente: não deve disparar o alvo de outro escopo.
- Cotação igual ao alvo: deve disparar; acima do alvo: não deve disparar.
- Entrada inválida ou preço não inteiro: não deve ser salvo nem gerar aviso falso.
- Várias cartas ou alvos iguais: aviso deve identificar a carta e o alvo correto.

---

### Task 1: Configurar e disparar alertas de preço no painel

**Files:**
- Modify: `extension/content.js`
- Modify: `extension/content.css`
- Modify: `extension/README.md`
- Modify: `extension/manifest.json` (incrementar versão patch)
- Modify: `README.md` (apontar para pacote atualizado)
- Create: `dist/Club-Companion-FC-v0.6.2-chrome.zip`

**Interfaces:**
- `state.priceAlerts`: lista de `{ instanceId, source, platform, targetCoins }`.
- Consome o formulário de cotação existente (`data-form="price"`) e o aviso acessível existente (`.cc-notice`).
- Produz um aviso local após salvar: nome do jogador, fonte, plataforma, cotação e alvo atingido.

- [x] Adicionar `priceAlerts: []` ao padrão carregado da extensão; manter o merge de dados antigos e tratar coleção inválida como lista vazia.
- [x] Adicionar formulário de alvo dentro de cada carta na aba Preços, usando os escopos de fonte e plataforma existentes e aceitando moedas inteiras não negativas; permitir limpar um alvo.
- [x] Persistir o alvo por `instanceId + source + platform`, substituindo o anterior do mesmo escopo sem duplicatas.
- [x] Depois de validar e salvar uma cotação, procurar somente o alvo de mesmo escopo; mostrar aviso quando `coins <= targetCoins`, sem chamar controles da Web App.
- [x] Atualizar o texto informativo da aba e os READMEs para explicar que o aviso depende de registrar a cotação manualmente e não é em tempo real.
- [x] Incrementar a versão da extensão para `0.6.2` e recriar o ZIP com `manifest.json` na raiz.
- [ ] Revisar os diffs, confirmar que permissões e fluxo de rede não mudaram, verificar a estrutura do ZIP e publicar o commit e o pacote no GitHub.
