# Club Companion FC

## Instalar no Chrome

1. Baixe e extraia o [ZIP 0.7.0](../dist/Club-Companion-FC-v0.7.0-chrome.zip).
2. Abra `chrome://extensions`, ative **Modo do desenvolvedor** e clique em **Carregar sem compactação**.
3. Selecione a pasta extraída que contém `manifest.json`. Abra **Club Companion FC** no menu de extensões do Chrome e clique em **Abrir painel**.

Mantenha as versões 0.6.2 e 0.6.3 desativadas. O Microsoft Defender sinalizou o script compartilhado por esses pacotes como `Trojan:Script/Ulthar.A!ml`. A 0.7.0 usa um painel em aba própria e começa com uma base nova. Importe um CSV ou um backup JSON do companion em **Configurações**.

## Importar cartas e planejar

- Na Web App oficial, abra o **Clube** e deixe a lista de cartas carregada. Clique no ícone da extensão e em **Importar cartas desta tela**. Repita nas outras páginas que quiser registrar. Se a tela não for reconhecida, use o CSV ou o cadastro manual.
- A leitura captura nome, OVR, posição e raridade quando disponíveis. Clube, liga, nação e cópias idênticas que apareçam em páginas diferentes podem exigir cadastro ou correção manual. Repetir a mesma leitura preserva os registros existentes.
- No painel, use **Clube** para análise e proteção, **SBCs** para planejar, **Gallery** para organizar sets e **Preços** para definir alvos e registrar cotações manuais. Confira e execute as ações na interface da EA.
- A leitura usa acesso temporário à aba quando você aciona a extensão e roda apenas na Web App oficial. O painel e os dados ficam no navegador.

Referências: [Paletools](https://pale.tools/fifa/paletools.html), [FUTClubAnalyzer](https://github.com/jsbsantos/FUTClubAnalyzer), [EasyFUT](https://github.com/Kava4/EasyFUT) e [FUT-Trader](https://github.com/ckalgos/FUT-Trader).

## Gerar o ZIP

Na raiz do repositório, execute `pwsh -File scripts/package-extension.ps1`. O arquivo sai em `dist/` com os recursos da extensão e do painel.
