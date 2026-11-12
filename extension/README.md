# Club Companion FC — extensão local

Protótipo de extensão Chrome Manifest V3 para acompanhar o EA FC Ultimate Team Web App. O painel e as funções locais já existem; leitura do clube, preenchimento de SBC e ações sobre itens ainda precisam ser ajustados e conferidos com a Web App autenticada.

## Instalar no Chrome

1. Baixe `dist/Club-Companion-FC-v0.6.1-chrome.zip` no repositório e extraia o arquivo.
2. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta extraída que contém `manifest.json`.
4. Abra a Web App oficial e entre diretamente na EA. A extensão não pede nem guarda senha.

O Chrome não instala uma extensão local diretamente do ZIP: extraia-o e carregue a pasta pelo modo do desenvolvedor. Para atualizar, extraia a nova versão em outra pasta, remova a versão antiga em `chrome://extensions` e carregue a nova pasta.

## Estado atual do adaptador

A estrutura autenticada observada usa `main li.listFUTItem`, com OVR, posição e nome em `.entityContainer`. A lista do clube é paginada: escaneie cada página carregada e confira a contagem. Quando FUTGenie fornece um ID no DOM, ele é usado como referência; sem esse ID, a extensão cria uma chave aproximada que pode mudar com a ordenação. Liga, nação e clube não são preenchidos pela leitura atual e devem ser importados ou corrigidos manualmente.

A aba **Análise** resume somente cartas locais com estado `club`, por posição, liga, clube e raridade. Campos ausentes são contados como “Sem informação”. Ela não representa automaticamente o clube inteiro: é preciso escanear as páginas do clube, importar CSV ou cadastrar cartas. A aba **Links** abre referências externas; não carrega nem executa o código delas.

O planejador SBC local propõe jogadores e exclui cartas protegidas. A área DME observada não expõe IDs estáveis dos candidatos; o botão de preenchimento não clica nessa tela. O envio ao clube depende de uma ação visível selecionada e confirmação. O envio final do SBC continua manual.

`Alt+C` abre/fecha o painel, `Alt+S` lê as cartas carregadas na tela, `Alt+P` alterna o pulo de animação e `Alt+G` abre a Gallery do Paletools quando ele está carregado. O Companion detecta e mostra a versão visível, mas não copia nem executa o userscript. O seletor de destino só funciona quando detecta exatamente `v27.2.1` e encontra, no mesmo diálogo de item comprado, “Send to club” e “Send to transfer list” (ou equivalentes em português). Ao escolher um, pede confirmação e clica só no destino escolhido. A compra continua no Paletools. O pulo só clica em “Pular/Continuar” depois de você abrir um pacote; não abre nem compra pacotes.

O importador aceita CSV UTF-8 com as colunas `instanceId,itemId,name,ovr,position,league,nation,club,rarity,holographic,tradeable,duplicate,protected,status,notes`. Para pontuação manual, adicione `itemScoreOverride`; os estados aceitos são `club`, `past` e `used`.

## Permissões e dados

- A única permissão de extensão é `storage`.
- O script roda somente em `www.ea.com/ea-sports-fc/ultimate-team/web-app`.
- Não acessa cookies, chamadas privadas, tráfego de rede, credenciais ou outros sites.
- Não coleta preços automaticamente. FUTBIN/FUT.GG abrem suas listas para busca manual.
- Paletools é aberto pela UI visível usando o controle `Paletools` e a ação `Open Gallery`. A extensão não instala nem atualiza o script; use a [página oficial do Paletools](https://pale.tools/fifa/paletools.html). A integração depende dos rótulos visíveis e pode exigir ajuste após atualizações.
- FUTClubAnalyzer é referência para a análise local reimplementada nesta extensão. EasyFUT e FUT-Trader aparecem somente como links. FUT-Trader está arquivado e seu bot de mercado/CAPTCHA não é integrado.
- A EA recomenda evitar extensões de terceiros e proíbe bots/automação. A extensão altera a UI do Web App e pode contrariar as regras da EA; você escolheu seguir com esse risco.

Antes de considerar o adaptador pronto, a Web App deve ser aberta e autenticada pelo próprio usuário; nunca envie senha ou código de autenticação aqui.
