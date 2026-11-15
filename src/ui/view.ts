import type { SearchState } from '../core/searchController.js';
import type { Country } from '../core/types.js';
import { el } from './dom.js';

export interface ViewHandlers {
  onRetry: () => void;
  onSelect: (country: Country) => void;
  onClose: () => void;
  selected: Country | null;
}

const numberFormat = new Intl.NumberFormat('en-US');

const ERROR_TEXT = {
  http: 'The server returned an error.',
  timeout: 'The server is taking too long to respond.',
  network: 'Could not reach the server. Check your connection.',
} as const;

function renderFlag(country: Country): HTMLElement {
  if (country.flag.startsWith('http')) {
    const image = el('img', 'flag');
    image.src = country.flag;
    image.alt = `Flag of ${country.name}`;
    image.loading = 'lazy';
    return image;
  }
  return el('span', 'flag flag-emoji', country.flag);
}

function renderCard(country: Country, handlers: ViewHandlers): HTMLElement {
  const card = el('button', 'card');
  card.type = 'button';
  card.addEventListener('click', () => handlers.onSelect(country));

  const info = el('span', 'card-info');
  info.append(
    el('strong', 'card-name', country.name),
    el('span', '', `Capital: ${country.capital}`),
    el('span', '', `Region: ${country.region || '—'}`),
    el('span', '', `Population: ${numberFormat.format(country.population)}`),
  );

  card.append(renderFlag(country), info);
  return card;
}

export function renderState(
  state: SearchState,
  handlers: ViewHandlers,
): HTMLElement[] {
  switch (state.status) {
    case 'idle':
      return [el('p', 'status status-idle', 'Start typing a country name.')];

    case 'loading': {
      const status = el('div', 'status status-loading');
      status.setAttribute('role', 'status');
      status.append(el('span', 'spinner'), el('span', '', 'Searching…'));
      return [status];
    }

    case 'empty':
      return [
        el(
          'p',
          'status status-empty',
          `Nothing found for “${state.query}”. Try another name.`,
        ),
      ];

    case 'error': {
      const status = el('div', 'status status-error');
      status.setAttribute('role', 'alert');
      const retry = el('button', 'retry', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', handlers.onRetry);
      status.append(el('span', '', ERROR_TEXT[state.kind]), retry);
      return [status];
    }

    case 'success': {
      const list = el('ul', 'cards');
      state.countries.forEach((country) => {
        const item = el('li');
        item.append(renderCard(country, handlers));
        if (handlers.selected?.name === country.name) {
          item.append(renderDetail(country, handlers.onClose));
        }
        list.append(item);
      });
      return [list];
    }
  }
}

export function renderDetail(
  country: Country,
  onClose: () => void,
): HTMLElement {
  const panel = el('section', 'detail-panel');

  const close = el('button', 'detail-close', 'Close');
  close.type = 'button';
  close.addEventListener('click', onClose);

  const rows: [string, string][] = [
    ['Native name', country.nativeName || '—'],
    ['Demonym', country.demonym || '—'],
    ['Capital', country.capital],
    [
      'Region',
      [country.subregion, country.region].filter(Boolean).join(', ') || '—',
    ],
    ['Population', numberFormat.format(country.population)],
    ['Area', `${numberFormat.format(country.area)} km²`],
    ['Borders', country.borders.join(', ') || '—'],
    ['Languages', country.languages.join(', ') || '—'],
    ['Currencies', country.currencies.join(', ') || '—'],
  ];

  const list = el('dl', 'detail-list');
  rows.forEach(([label, value]) => {
    list.append(el('dt', '', label), el('dd', '', value));
  });

  panel.append(
    close,
    renderFlag(country),
    el('h2', '', country.name),
    el('p', 'detail-description', country.description),
    list,
  );
  return panel;
}
