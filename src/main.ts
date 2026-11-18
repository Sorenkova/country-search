import { createCachedSearch } from './core/cachedSearch.js';
import { createSearchController } from './core/searchController.js';
import { searchCountries } from './core/searchCountries.js';
import { createSearchHistory, type StorageLike } from './core/searchHistory.js';
import type { Country } from './core/types.js';
import { el } from './ui/dom.js';
import { renderDetail, renderHistory, renderState } from './ui/view.js';

const controller = createSearchController({
  search: createCachedSearch((query, signal) => searchCountries(query, signal)),
});

function getStorage(): StorageLike {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => undefined };
  }
}

const history = createSearchHistory(getStorage());

let open: { name: string; panel: HTMLElement } | null = null;

const input = el('input', 'search-input');
input.type = 'search';
input.placeholder = 'For example, spain';
input.autocomplete = 'off';
input.setAttribute('aria-label', 'Country name');

const historyBox = el('div', 'history');

const results = el('div', 'results');
results.setAttribute('aria-live', 'polite');

const app = el('main', 'app');
app.append(el('h1', '', 'Country Search'), input, historyBox, results);
document.body.append(app);

function collapse(panel: HTMLElement): void {
  panel.classList.add('closing');
  panel.addEventListener('animationend', () => panel.remove(), { once: true });
}

function closeDetail(): void {
  if (open) collapse(open.panel);
  open = null;
}

function toggleDetail(country: Country, item: HTMLElement): void {
  const isSame = open?.name === country.name;
  closeDetail();
  if (isSame) return;

  const panel = renderDetail(country, closeDetail);
  item.append(panel);
  open = { name: country.name, panel };
}

function pickFromHistory(query: string): void {
  input.value = query;
  controller.input(query);
  input.focus();
}

function renderHistoryBox(): void {
  const items = controller.getState().status === 'idle' ? history.get() : [];

  historyBox.replaceChildren(
    ...(items.length > 0 ? [renderHistory(items, pickFromHistory)] : []),
  );
}

function render(): void {
  renderHistoryBox();
  results.replaceChildren(
    ...renderState(controller.getState(), {
      onRetry: () => controller.retry(),
      onSelect: toggleDetail,
    }),
  );
}

controller.subscribe((state) => {
  if (state.status === 'success') history.add(state.query);
  open = null;
  render();
});

input.addEventListener('input', () => controller.input(input.value));

render();
