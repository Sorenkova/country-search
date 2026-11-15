import { createSearchController } from './core/searchController.js';
import { searchCountries } from './core/searchCountries.js';
import type { Country } from './core/types.js';
import { el } from './ui/dom.js';
import { renderDetail, renderState } from './ui/view.js';

const controller = createSearchController({
  search: (query, signal) => searchCountries(query, signal),
});

let open: { name: string; panel: HTMLElement } | null = null;

const input = el('input', 'search-input');
input.type = 'search';
input.placeholder = 'For example, spain';
input.autocomplete = 'off';
input.setAttribute('aria-label', 'Country name');

const results = el('div', 'results');
results.setAttribute('aria-live', 'polite');

const app = el('main', 'app');
app.append(el('h1', '', 'Country Search'), input, results);
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

function render(): void {
  results.replaceChildren(
    ...renderState(controller.getState(), {
      onRetry: () => controller.retry(),
      onSelect: toggleDetail,
    }),
  );
}

controller.subscribe(() => {
  open = null;
  render();
});

input.addEventListener('input', () => controller.input(input.value));

render();
