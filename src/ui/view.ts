import type { SearchState } from '../core/searchController.js';
import type { Country } from '../core/types.js';
import { el } from './dom.js';

export interface ViewHandlers {
  onRetry: () => void;
  onSelect: (country: Country) => void;
}

const numberFormat = new Intl.NumberFormat('ru-RU');

const ERROR_TEXT = {
  http: 'Сервер вернул ошибку.',
  timeout: 'Сервер слишком долго не отвечает.',
  network: 'Не удалось связаться с сервером. Проверьте соединение.',
} as const;

function renderFlag(country: Country): HTMLElement {
  if (country.flag.startsWith('http')) {
    const image = el('img', 'flag');
    image.src = country.flag;
    image.alt = `Флаг: ${country.name}`;
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
    el('span', '', `Столица: ${country.capital}`),
    el('span', '', `Регион: ${country.region || '—'}`),
    el('span', '', `Население: ${numberFormat.format(country.population)}`),
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
      return [
        el('p', 'status status-idle', 'Начните вводить название страны.'),
      ];

    case 'loading': {
      const status = el('div', 'status status-loading');
      status.setAttribute('role', 'status');
      status.append(el('span', 'spinner'), el('span', '', 'Ищем страны…'));
      return [status];
    }

    case 'empty':
      return [
        el(
          'p',
          'status status-empty',
          `По запросу «${state.query}» ничего не найдено. Попробуйте другое название.`,
        ),
      ];

    case 'error': {
      const status = el('div', 'status status-error');
      status.setAttribute('role', 'alert');
      const retry = el('button', 'retry', 'Повторить');
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

  const close = el('button', 'detail-close', 'Закрыть');
  close.type = 'button';
  close.addEventListener('click', onClose);

  const rows: [string, string][] = [
    ['Родное название', country.nativeName || '—'],
    ['Жители', country.demonym || '—'],
    ['Столица', country.capital],
    [
      'Регион',
      [country.subregion, country.region].filter(Boolean).join(', ') || '—',
    ],
    ['Население', numberFormat.format(country.population)],
    ['Площадь', `${numberFormat.format(country.area)} км²`],
    ['Границы', country.borders.join(', ') || '—'],
    ['Языки', country.languages.join(', ') || '—'],
    ['Валюта', country.currencies.join(', ') || '—'],
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
