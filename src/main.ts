import { createSearchController } from './core/searchController.js';
import { searchCountries } from './core/searchCountries.js';
import type { Country } from './core/types.js';
import { el } from './ui/dom.js';
import { renderState } from './ui/view.js';

const controller = createSearchController({
  search: (query, signal) => searchCountries(query, signal),
});

let selected: Country | null = null;

const input = el('input', 'search-input');
input.type = 'search';
input.placeholder = 'For example, spain';
input.autocomplete = 'off';
input.setAttribute('aria-label', 'Country name');

const results = el('div', 'results');
results.setAttribute('aria-live', 'polite');

const app = el('main', 'app');
app.append(el('h1', '', 'Country search'), input, results);
document.body.append(app);

function render(): void {
  results.replaceChildren(
    ...renderState(controller.getState(), {
      selected,
      onRetry: () => controller.retry(),
      onSelect: (country) => {
        selected = selected?.name === country.name ? null : country;
        render();
      },
      onClose: () => {
        selected = null;
        render();
      },
    }),
  );
}

controller.subscribe(() => {
  selected = null;
  render();
});

input.addEventListener('input', () => controller.input(input.value));

render();
