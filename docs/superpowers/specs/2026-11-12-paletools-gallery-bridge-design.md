# Paletools Gallery bridge — design

Data: 2026-11-12

## Objetivo e decisão

Adicionar ao Club Companion um atalho `Alt+G` e um botão que abrem a Gallery do Paletools v27.2.1 quando ela estiver instalada e visível na EA Web App. O Companion detecta a versão renderizada e mostra um link para a página oficial. Depois de o usuário iniciar uma compra diretamente no Paletools, o Companion poderá apresentar as opções visíveis Clube/Lista de Transferências apenas quando ambas aparecem juntas no mesmo diálogo de item comprado; a escolha requer confirmação.

## Abordagens

1. Embutir o userscript minificado de terceiros: rejeitada; o arquivo oficial tem cerca de 1,2 MB, usa APIs privilegiadas do userscript e se atualiza pelo caminho `dist/latest`, então não é uma dependência estável nem auditável.
2. Reimplementar compra ou lista de transferência no Companion: rejeitada; duplicaria o fluxo transacional do mercado e exigiria acoplamento frágil com a Gallery.
3. Criar uma ponte para a Gallery e um seletor de destino por controles visíveis: escolhida; usa `Paletools`, `Open Gallery` e os dois botões de destino no mesmo diálogo de compra concluída. Sem diálogo reconhecível, não oferece ações. A compra permanece fora do Companion.

## Limites

- Não iniciar compra, vender/listar, abrir pacote ou escolher destino sem clique e confirmação explícitos.
- Não copiar nem executar o userscript Paletools dentro do Companion.
- Permitir o seletor de destino somente se a interface renderizar exatamente `v27.2.1`.
- Se os controles ou a versão não forem encontrados, informar que Paletools precisa estar carregado; não tentar endpoints alternativos.
- A ponte depende dos nomes visíveis e do agrupamento do diálogo; se a interface mudar, não pode acionar uma opção ambígua.
