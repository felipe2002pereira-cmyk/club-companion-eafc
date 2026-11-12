import { captureClubCards, isEaWebApp, toPlayerItems } from './web-app.js';
import { importObservedPlayers } from './src/storage/database.js';

const importButton = document.querySelector('#import-club');
const openButton = document.querySelector('#open-panel');
const status = document.querySelector('#import-status');

openButton.addEventListener('click', async () => {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('index.html#clube') });
  } catch {
    status.textContent = 'Não foi possível abrir o painel. Tente novamente.';
  }
});

importButton.addEventListener('click', async () => {
  importButton.disabled = true;
  status.textContent = 'Lendo cartas visíveis…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!Number.isInteger(tab?.id) || !isEaWebApp(tab.url)) {
      status.textContent = 'Abra o Clube na Web App oficial e clique na extensão novamente.';
      return;
    }

    const [capture] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureClubCards,
    });
    if (!capture?.result?.club) {
      status.textContent = 'A tela do Clube não foi reconhecida. Abra a lista de jogadores do Clube ou importe um CSV pelo painel.';
      return;
    }

    const players = toPlayerItems(capture.result.cards);
    if (!players.length) {
      status.textContent = 'Nenhuma carta reconhecida nesta tela.';
      return;
    }
    const added = await importObservedPlayers(players);
    status.textContent = `${added} carta(s) nova(s) de ${players.length} reconhecida(s). Abra ou recarregue o painel para ver o elenco.`;
  } catch {
    status.textContent = 'Não foi possível concluir a importação. Confira se a aba está aberta e tente novamente.';
  } finally {
    importButton.disabled = false;
  }
});
