# Alertas de preço manual — design

## Intenção

Deixar o usuário acompanhar um preço-alvo por jogador no Club Companion FC. Quando ele registrar manualmente uma cotação do FUTBIN ou FUT.GG que atingir o alvo, a extensão mostra um aviso para que ele avalie a ação por conta própria.

## Objetivos

- Configurar um valor máximo desejado por jogador, fonte e plataforma.
- Comparar esse limite com cada nova cotação manual registrada.
- Exibir um aviso claro quando a cotação registrada for igual ou inferior ao alvo.
- Manter os dados locais na extensão, sem permissão adicional do Chrome.

## Fora de escopo

- Consultar preços automaticamente, fazer scraping ou sincronizar com FUTBIN/FUT.GG.
- Ler ou consultar o mercado de transferências da EA.
- Enviar lances, compras, relistagens ou qualquer ordem.
- Notificação em segundo plano enquanto a extensão estiver fechada.

## Restrições e casos de falha

- FUTBIN/FUT.GG continuam sendo abertos pelo usuário; preço e horário são informados manualmente.
- O alerta só pode ocorrer após registrar uma nova cotação. Não representa preço ao vivo.
- O alvo deve ser separado por fonte e plataforma, pois as cotações podem diferir.
- Um preço ausente, negativo, fracionário ou inválido não pode disparar alerta.
- O alerta deve identificar o jogador, a cotação, a fonte, a plataforma e o alvo.

## Abordagens consideradas

1. Buscar e sincronizar dados automaticamente nos provedores. Rejeitada: a extensão atual não tem integração autorizada com esses serviços; isso exigiria scraping ou API e deixaria de respeitar o acordo anterior de links e registro manual.
2. Monitorar consultas no mercado da Web App. Rejeitada: a EA proíbe automação no mercado e isso colocaria a conta em risco.
3. Alertar após registro de cotação manual. Escolhida pelo usuário ao selecionar “Monitorar e alertar; confirmar cada ação”. O usuário informa a cotação, e o companion apenas compara com o alvo.

## Interface e comportamento

- Na aba **Preços** da extensão, cada jogador terá campos para alvo em moedas, fonte e plataforma.
- O alvo é local e associado à cópia física da carta, fonte e plataforma.
- Ao registrar uma cotação, comparar somente com o alvo da mesma carta, fonte e plataforma.
- Quando `cotação <= alvo`, exibir aviso dentro do painel da extensão. O registro continua visível no histórico.
- Nenhuma ação da Web App será executada pelo alerta; qualquer decisão e operação continuam manuais.

## Decisões deixadas ao implementador

- Armazenar alvos em uma nova lista local `priceAlerts`, sem alterar dados ou snapshots existentes.
- Mostrar o aviso imediatamente no painel após o salvamento bem-sucedido da cotação.
- Não adicionar permissão de notificações do Chrome nem polling em segundo plano.
