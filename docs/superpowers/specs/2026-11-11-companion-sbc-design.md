# Companion SBC independente — design

Data: 2026-11-11

## Intenção

Criar uma ferramenta pessoal para reduzir o trabalho de planejar SBCs e organizar o elenco do Ultimate Team, aproveitando as ideias de AutoSBC, FUTGenie e Paletools sem incorporar seus códigos. O usuário mantém os dados do clube no companion e executa manualmente qualquer ação na EA Web App.

## Objetivos

- Manter uma galeria local de itens de jogador e seu estado: disponível, protegido, duplicado e histórico registrado pelo usuário.
- Registrar requisitos de um SBC e calcular escalações candidatas a partir do elenco informado.
- Explicar por que cada carta foi sugerida e destacar cartas protegidas ou de maior valor configurado.
- Oferecer atalhos de teclado dentro do próprio companion para buscar, filtrar, selecionar e navegar.
- Permitir importar/exportar o elenco em formatos documentados e fazer backup local.
- Evoluir por versões: consultar atualizações disponíveis, mostrar notas da versão e pedir confirmação do usuário antes de aplicar a atualização.
- Consultar rapidamente a página de cada jogador no FUTBIN e FUT.GG e registrar manualmente cotações com fonte, plataforma e horário.
- Planejar SBCs tradicionais e simplificados de FC 27, além de Sets da Gallery, sem enviar itens ou confirmar alterações no jogo.

## Fora de escopo

- Injetar código na EA Web App ou no Companion oficial, acessar a sessão, cookies, endpoints privados ou credenciais.
- Clicar, submeter SBCs, enviar itens ao clube, vender/descartar cartas, abrir pacotes ou pular animações.
- Fazer sniping, autobuy, farming ou transações no mercado.
- Incorporar, ofuscar, empacotar ou redistribuir código de FUTGenie, AutoSBC ou Paletools. São referências funcionais, não dependências.
- Prometer sincronização automática com o clube. A atualização do inventário dependerá de importação ou registro manual.
- Prometer preços sincronizados ou em tempo real do FUTBIN/FUT.GG. O companion não coletará dados automaticamente desses sites.

## Restrições

- A EA orienta evitar extensões de terceiros e proíbe bots/automação; portanto, a ferramenta não terá integração com a conta ou a Web App.
- A pasta atual do projeto não contém uma implementação existente.
- O AutoSBC entregue é um userscript minificado/ofuscado; o primeiro link identifica FUTGenie, e Paletools é um conjunto de plugins independente. Não há base técnica/licença verificada para combinar seus códigos.
- Os dados pessoais do elenco ficam no dispositivo. A aplicação não pede login EA nem envia o inventário para um servidor.
- Os termos consultados do FUTBIN proíbem scraping/data mining sem autorização escrita, com exceção para estudantes e criadores de conteúdo que creditem o site; os termos do Stormstrike, operador do FUT.GG, proíbem meios automatizados como bots e scrapers. Não há autorização ou contrato de API de preço fornecido para este projeto.
- A EA informa que o FC Community API é para sites parceiros aprovados, incluindo FUTBIN e FUT.GG. Isso não dá ao companion independente acesso à API nem autorização para coletar os dados desses serviços.

## Plataforma e dados

Implementar como aplicação web instalável (PWA), sem permissões de extensão e sem integração com domínios EA. Persistir elenco e histórico localmente no navegador, com exportação/importação de backup. Usar publicação estática e atualizações versionadas com changelog e confirmação explícita do usuário; atualizações de código não podem substituir os dados locais.

## Abordagens consideradas

1. **Mesclar os três produtos em uma extensão injetada.** Rejeitada: risco para a conta conforme as regras da EA, sobreposição de alterações na página e ausência de autorização/código reutilizável verificados.
2. **Criar uma extensão própria que só sugere ações na Web App.** Rejeitada: ainda modifica/estende a aplicação oficial e mantém o risco e a dependência de mudanças internas da EA.
3. **Criar um companion local independente.** Recomendada: não controla a Web App, mantém dados localmente e transforma a automação solicitada em planejamento e recomendações que o usuário revisa e executa. Sacrifica sincronização e execução em um clique, mas reduz exposição da conta e falhas por mudanças da EA.
4. **Consumir preços do FUTBIN e FUT.GG diretamente.** Não fazer sem API documentada/licenciada ou autorização escrita dos dois serviços; os termos atuais restringem coleta automatizada.
5. **Usar links e captura manual de preços.** Escolhida: oferece acesso às duas fontes sem scraping. Não equivale a preço em tempo real dentro do companion. Uma API licenciada pode ser avaliada depois como mudança de escopo, com custo, frequência e licença analisados antes.

## Desenho funcional proposto

### Clube e galeria

Cada item contém identificador/título, overall, posição, liga, nacionalidade, clube, raridade, status holográfico, negociável ou não, duplicado, proteção e notas. O usuário pode importar ou editar esses dados, filtrar/ordenar a galeria e registrar eventos como adicionado, marcado duplicado, protegido ou usado em SBC. O companion não infere eventos da conta. Cartas protegidas ficam sempre fora das sugestões de SBC; apenas o próprio usuário pode alterar esse estado manualmente.

### Planejador SBC

O usuário seleciona o modo de SBC e informa os requisitos nos campos suportados. No modo simplificado, o solver escolhe itens elegíveis até atingir um Item Score-alvo. A tabela-base oficial por OVR/qualidade é versionada. A EA informa que raridade e holografia adicionam bônus, mas não publica seus valores numéricos; para itens especiais/holográficos o usuário pode registrar o Item Score final exibido no jogo. Sem esse dado, a ferramenta usa a pontuação-base e marca o resultado como estimativa. No modo tradicional, o usuário informa 11 jogadores e restrições por atributos (ligas, nações, clubes, posição ou raridade) e OVR mínimo; não há cálculo de química. O rating da escalação é calculado como estimativa usando uma fórmula comunitária, com aviso de que a EA não publica a fórmula e de que o resultado final do jogo prevalece.

Entre soluções viáveis, o solver prioriza duplicadas primeiro e depois menor OVR; evita cartas protegidas por completo. Para SBCs por Item Score, também reduz pontuação excedente quando isso não quebra a prioridade acima. O companion exibe itens escolhidos, score/estimativa, validações e motivos. O usuário registra manualmente o que submeteu; nada é removido automaticamente da galeria ou do elenco.

Se não houver solução com os dados disponíveis, mostrar quais requisitos não fecharam e permitir revisar a entrada. Nunca remover cartas da galeria nem atualizar seu estado automaticamente.

### Gallery

Manter um registro manual de itens que passaram pelo clube, mesmo depois de vendidos ou usados, e deixar o usuário marcar se já fazem parte do histórico da Gallery. O usuário pode cadastrar Sets e seus critérios, selecionar itens elegíveis do registro e calcular o Item Score para planejar o grau, usando a mesma tabela versionada do modo SBC simplificado. Se o limite de cada grau não estiver informado, o usuário o registra manualmente. O app só recomenda itens para um Set; o usuário confirma a alteração diretamente no jogo.

### Preços

Na página do jogador, exibir links externos para buscar a carta no FUTBIN e no FUT.GG. O usuário pode registrar manualmente o preço visto, a fonte, a plataforma (console ou PC) e a hora da consulta; a galeria mostra o valor e sua idade como cotação manual, sem rótulo de “tempo real”. Não buscar, raspar ou sincronizar automaticamente preços desses sites. FUTBIN afirma que não garante que o conteúdo esteja atualizado; cotação registrada deve ser tratada como referência sujeita a mudança.

### Atalhos

Os atalhos operam apenas a interface local do companion, são visíveis em uma tela de ajuda e podem ser desativados/remapeados. Nenhum atalho envia comandos à EA.

### Atualizações

Separar atualização do aplicativo e dos dados do clube. O companion pode consultar uma versão publicada, exibir changelog e solicitar confirmação para atualizar. Atualizações não alteram o inventário local. A ferramenta não se modifica a partir do comportamento do usuário; melhorias vêm em versões explícitas e revisáveis.

## Decisões deixadas ao builder

- Escolher a implementação mais simples para a PWA estática instalável, sem permissões de extensão e sem servidor de conta; hospedar os arquivos do app sem transmitir dados do elenco.
- Definir um esquema importável/exportável com versão e mensagens claras para colunas inválidas.
- Implementar otimização separada para os modos Item Score e SBC tradicional; tornar validações e prioridades transparentes e não prometer ótimo se limites de cálculo levarem a heurística.
- Criar proteção contra perda de dados: confirmação antes de substituir importação, backup e migração versionada.
- Tratar nomes, limites, regras de rating estimado e requisitos como dados configuráveis/versionados, pois o jogo muda por temporada. Não incluir cálculo de química na primeira versão.
- Começar com dados de jogadores inseridos/importados pelo usuário; integração com preços externos fica para uma fase futura, após verificar fonte, licença e disponibilidade.
- Manter preços manuais como registros com origem e horário. Só substituir isso por feed automático depois de verificar API oficial/licenciada, termos, limites, frequência e eventual custo.
- Registrar o Item Score final no item quando informado manualmente; preservar a tabela-base oficial como fallback explicitamente estimado, sem inventar bônus de raridade/holografia.

## Critério de sucesso

O usuário consegue manter um inventário e histórico local, informar requisitos de SBC tradicional ou simplificado, obter recomendações explicáveis (com rating tradicional identificado como estimativa), planejar Sets da Gallery, registrar manualmente usos e preços consultados no FUTBIN/FUT.GG com fonte e horário, e exportar/recuperar os próprios dados — sem que o companion acesse ou controle a conta EA ou extraia dados dos sites de mercado.

## Fontes verificadas

- [Regras da EA SPORTS FC](https://help.ea.com/en/articles/ea-sports-fc/fc-rules/)
- [Community API da EA](https://help.ea.com/en/articles/ea-sports-fc/community-api/)
- [Termos do FUTBIN](https://www.futbin.com/tos)
- [Termos do Stormstrike (operador do FUT.GG)](https://stormstrike.gg/terms)
- [Guia oficial de SBCs em FC 27](https://help.ea.com/en/articles/ea-sports-fc/sbcs/)
- [Mudanças oficiais em SBCs e Item Score de FC 27](https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-launch-update)
- [Calculadora comunitária de rating SBC FC 27; fórmula não oficial para 11 itens](https://kalunbot.com/herramientas/calculadora-media-sbc)
- [Guia oficial de Gallery Sets](https://help.ea.com/en/articles/ea-sports-fc/gallery-hub/)
