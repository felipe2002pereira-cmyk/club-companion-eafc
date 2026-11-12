# Club Companion EA FC

Ferramentas locais para organizar cartas do Ultimate Team e planejar SBCs: um companion PWA independente e um protótipo de extensão Chrome para a Web App.

## Componentes

- **PWA na raiz:** cadastro/importação de elenco, proteção de cartas, planos de SBC tradicional e Item Score, Gallery Sets, histórico e cotações manuais. Não se conecta à conta EA.
- **Extensão Chrome:** o botão da barra de ferramentas abre o planejador, mostra o Clube ao vivo na Web App e importa as cartas visíveis quando solicitado. [Baixar ZIP v0.7.1](dist/Club-Companion-FC-v0.7.1-chrome.zip) · [Instalação e uso](extension/README.md).
- **Documentação em `docs/`:** decisões de produto e plano de implementação.

## Executar o PWA

Sirva a raiz deste repositório por um servidor estático local ou publique-a em GitHub Pages. Não há etapa de build nem dependências de pacote. Service worker e instalação PWA requerem HTTPS ou `localhost`.

## Dados e privacidade

O PWA e a extensão guardam elenco, eventos, planos, alvos e cotações em bancos IndexedDB separados. Use a exportação e a importação de backup JSON em **Configurações** para transferir os registros.

O CSV aceita uma linha por cópia física. `instanceId` identifica a cópia; `itemId` identifica a versão da carta. Campos obrigatórios: `instanceId,itemId,name,ovr,position,league,nation,club,rarity,holographic,tradeable,duplicate,protected,status,notes`. `itemScoreOverride` é opcional.

## Planejamento de SBC

- O modo Item Score usa valores-base de carta e permite informar manualmente o valor final para cartas especiais.
- O modo tradicional usa 11 jogadores e os limites informados. Não calcula química; a nota do elenco é identificada como estimativa.
- Cartas protegidas são excluídas das sugestões de SBC. A prioridade favorece duplicadas e depois menor OVR.
- Confira os requisitos e a escalação no jogo antes de usar um plano.

## Mercado e Gallery

FUTBIN e FUT.GG são abertos para pesquisa manual. Ao registrar uma cotação, o painel avisa se ela atingiu o alvo configurado para a carta, fonte e plataforma. Gallery Sets e histórico ficam no banco local.

## Limites da extensão

A extensão lê cartas na tela do Clube sob demanda. A análise resume as cartas registradas por posição, liga, clube e raridade. Preenchimento e envio de SBC, destino de itens, abertura de pacotes e operações de mercado são feitos na interface do jogo.

A EA recomenda evitar extensões de terceiros e proíbe bots/automação. O uso pode contrariar as regras da EA e expor a conta a restrições. Consulte as [regras oficiais da EA](https://help.ea.com/pt-BR/articles/ea-sports-fc/fc-rules/) antes de usar a extensão.

## Atualizações do PWA

O PWA é estático e versionado. O service worker solicita confirmação antes de ativar uma versão nova e preserva os dados locais. `release.json` registra a versão e o changelog.
