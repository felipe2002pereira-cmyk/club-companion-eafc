# Análise do clube e referências — design

Data: 2026-11-12

## Objetivo

Adicionar ao companion uma aba de análise do elenco local, com totais por liga, clube, posição e raridade, e uma aba de links para projetos de referência. O FUTClubAnalyzer serve como referência de funcionalidade; sua implementação será reescrita no projeto, sem copiar seu código. EasyFUT e FUT-Trader entram apenas como links externos.

## Abordagens

1. **Incorporar scripts de terceiros:** rejeitada porque o FUTClubAnalyzer não declara licença e os projetos de trading incluem automação de mercado.
2. **Análise própria sobre dados locais já cadastrados:** escolhida; simples, sem permissões novas ou tráfego externo, mas reflete somente cartas escaneadas/importadas/manual.
3. **Coletar todo o clube ou sincronizar serviços automaticamente:** rejeitada por exigir leitura incompleta da Web App ou scraping/sessão de terceiros.

## Restrições

- Proteger o escopo da extensão e seus dados locais; nenhuma nova permissão.
- Rotular com clareza campos ausentes e não insinuar análise do clube completo quando só parte foi cadastrada.
- Agregar apenas cartas em estado `club`; ignorar cartas `past` e `used`.
- FUT-Trader permanece um link informativo. Não integrar compras, lances, relistagem ou resolução de CAPTCHA.

## Resultado esperado

Nova aba **Análise** exibe cartas registradas, posições agrupadas e distribuição por liga, clube e raridade, incluindo “Sem informação” quando os dados não existem. Nova aba **Links** abre os repositórios em abas externas. A documentação explica cobertura limitada e escopo dos links.
