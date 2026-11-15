import { createSearchController } from './core/searchController.js';
import { searchCountries } from './core/searchCountries.js';
import type { Country } from './core/types.js';
import { el } from './ui/dom.js';
import { renderDetail, renderState } from './ui/view.js';

const controller = createSearchController({
  search: (query, signal) => searchCountries(query, signal),
});

let selected: Country | null = null;

const input = el('input', 'search-input');
input.type = 'search';
input.placeholder = 'Например, spain';
input.autocomplete = 'off';
input.setAttribute('aria-label', 'Название страны');

const results = el('div', 'results');
results.setAttribute('aria-live', 'polite');

const detail = el('aside', 'detail');

const app = el('main', 'app');
app.append(el('h1', '', 'Поиск стран'), input, results, detail);
document.body.append(app);

function render(): void {
  results.replaceChildren(
    ...renderState(controller.getState(), {
      onRetry: () => controller.retry(),
      onSelect: (country) => {
        selected = country;
        render();
      },
    }),
  );

  detail.replaceChildren(
    ...(selected
      ? [
          renderDetail(selected, () => {
            selected = null;
            render();
          }),
        ]
      : []),
  );
}

controller.subscribe(() => {
  selected = null;
  render();
});

input.addEventListener('input', () => controller.input(input.value));

render();
