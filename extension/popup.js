import { captureClubCards, isEaWebApp, toPlayerItems } from './web-app.js';
import { importObservedPlayers } from './src/storage/database.js';

const importButton = document.querySelector('#import-club');
const openButton = document.querySelector('#open-panel');
const liveButton = document.querySelector('#live-club');
const status = document.querySelector('#import-status');

openButton.addEventListener('click', async () => {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('index.html#clube') });
  } catch {
    status.textContent = 'Não foi possível abrir o painel. Tente novamente.';
  }
});

liveButton.addEventListener('click', async () => {
  liveButton.disabled = true;
  try {
    const tabId = await getWebAppTabId();
    if (tabId === null) return;
    const [activation] = await chrome.scripting.executeScript({
      target: { tabId },
      func: captureClubCards,
      args: [true],
    });
    status.textContent = activation?.result?.live
      ? 'Painel ao vivo aberto na Web App.'
      : 'A aba mudou. Abra a Web App oficial e tente novamente.';
  } catch {
    status.textContent = 'Não foi possível abrir o painel ao vivo. Recarregue a Web App e tente novamente.';
  } finally {
    liveButton.disabled = false;
  }
});

importButton.addEventListener('click', async () => {
  importButton.disabled = true;
  status.textContent = 'Lendo cartas visíveis…';
  try {
    const tabId = await getWebAppTabId();
    if (tabId === null) return;

    const [capture] = await chrome.scripting.executeScript({
      target: { tabId },
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

async function getWebAppTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (Number.isInteger(tab?.id) && isEaWebApp(tab.url)) return tab.id;
  status.textContent = 'Abra a Web App oficial e clique na extensão novamente.';
  return null;
}
