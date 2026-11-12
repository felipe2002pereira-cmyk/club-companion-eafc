# Club Companion EA FC

Ferramentas locais para organizar cartas do Ultimate Team e planejar SBCs: um companion PWA independente e um protótipo de extensão Chrome para a Web App.

## Componentes

- **PWA na raiz:** cadastro/importação de elenco, proteção de cartas, planos de SBC tradicional e Item Score, Gallery Sets, histórico e cotações manuais. Não se conecta à conta EA.
- **Extensão em `extension/`:** painel Manifest V3, leitura das cartas visíveis, atalhos e ações opcionais na interface da Web App. Consulte [`extension/README.md`](extension/README.md) para instalar e conhecer os limites.
- **Pacote Chrome:** [baixar Club Companion FC v0.6.2](dist/Club-Companion-FC-v0.6.2-chrome.zip). Extraia o ZIP e carregue a pasta com `manifest.json` em `chrome://extensions` no modo do desenvolvedor.
- **Documentação em `docs/`:** decisões de produto e plano de implementação.

## Executar o PWA

Sirva a raiz deste repositório por um servidor estático local ou publique-a em GitHub Pages. Não há etapa de build nem dependências de pacote. Service worker e instalação PWA requerem HTTPS ou `localhost`.

## Dados e privacidade

O PWA guarda elenco, eventos, planos e cotações no IndexedDB local. A extensão guarda seus próprios dados em `chrome.storage.local`. Nenhum deles envia o elenco a um servidor. Exporte um backup JSON do PWA antes de trocar de navegador ou dispositivo.

O CSV aceita uma linha por cópia física. `instanceId` identifica a cópia; `itemId` identifica a versão da carta. Campos obrigatórios: `instanceId,itemId,name,ovr,position,league,nation,club,rarity,holographic,tradeable,duplicate,protected,status,notes`. `itemScoreOverride` é opcional.

## Planejamento de SBC

- O modo Item Score usa valores-base de carta e permite informar manualmente o valor final para cartas especiais.
- O modo tradicional usa 11 jogadores e os limites informados. Não calcula química; a nota do elenco é identificada como estimativa.
- Cartas protegidas são excluídas das sugestões de SBC. A prioridade favorece duplicadas e depois menor OVR.
- Confira os requisitos e a escalação no jogo antes de usar um plano.

## Mercado e Gallery

FUTBIN e FUT.GG são abertos para pesquisa manual. As cotações são registradas pelo usuário; não há feed em tempo real nem scraping. Na extensão, alvos de preço locais podem gerar um aviso quando uma nova cotação manual os atinge. Gallery Sets e histórico também são locais.

## Limites da extensão

A extensão é experimental e depende da estrutura visível do Web App, que pode mudar. A leitura do clube é paginada. No DME observado, os cartões candidatos não expõem IDs estáveis, então o preenchimento automático é bloqueado nessa tela. O envio final de SBC permanece manual; não há compra ou abertura automática de pacotes.

A aba Análise da extensão resume os itens locais por posição, liga, clube e raridade; ela só cobre cartas escaneadas, importadas ou cadastradas. `Alt+G` abre a Gallery do Paletools carregado na Web App. Com a versão exata v27.2.1, depois de uma compra iniciada por você, o Companion só escolhe Clube ou Lista de Transferências se detectar ambas as opções no mesmo diálogo e pedir confirmação; não inicia compras. FUTClubAnalyzer é referência funcional reimplementada, enquanto EasyFUT e FUT-Trader são apenas links externos. Não importamos automações de compra, lances, relistagem ou CAPTCHA do FUT-Trader.

A EA recomenda evitar extensões de terceiros e proíbe bots/automação. O uso pode contrariar as regras da EA e expor a conta a restrições. Consulte as [regras oficiais da EA](https://help.ea.com/pt-BR/articles/ea-sports-fc/fc-rules/) antes de usar a extensão.

## Atualizações do PWA

O PWA é estático e versionado. O service worker solicita confirmação antes de ativar uma versão nova e preserva os dados locais. `release.json` registra a versão e o changelog.
