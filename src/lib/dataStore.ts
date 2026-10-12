// @ts-nocheck
// Auto-converted from .js — user's actual data

// ═══════════════════════════════════════════════════════════════
//  dataStore — localStorage-backed editable data layer.
//
//  All site data (items, charms, characters, news, auction lots…)
//  can be edited at runtime via the Admin page and persists in
//  the browser. Falls back to the static gameData defaults.
//
//  Put this file at:  utils/dataStore.js
//  (next to your existing utils/gameUtils.js)
// ═══════════════════════════════════════════════════════════════
import {
  DB_ITEMS, DB_CHARMS, DB_REGULAR_ITEMS, DB_SPELLS,
  DB_RACIAL_SPELLS, DB_NPCS, INITIAL_AUCTION, MOCK_CHARACTERS, MOCK_NEWS,
  MOCK_RECIPES, INITIAL_TOPICS, INITIAL_POSTS, INITIAL_MAIN_CATEGORIES,
  INITIAL_SUBCATEGORIES, DEFAULT_SPELL_FORMULAS,
} from '@/data/gameData';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'mmoportal:data:v1';

export const COLLECTIONS = [
  { name: 'DB_ITEMS', label: 'Аксессуары (предметы)' },
  { name: 'DB_CHARMS', label: 'Чармы' },
  { name: 'DB_REGULAR_ITEMS', label: 'Обычные предметы' },
  { name: 'DB_SPELLS', label: 'Базовые заклинания' },
  // DB_COMBO_SPELLS removed — all spells in DB_SPELLS now
  { name: 'SPELL_FORMULAS', label: 'Формулы стихий' },
  { name: 'DB_RACIAL_SPELLS', label: 'Расовые способности' },
  { name: 'DB_NPCS', label: 'Бестиарий' },
  { name: 'INITIAL_AUCTION', label: 'Лоты аукциона' },
  { name: 'MOCK_CHARACTERS', label: 'Персонажи' },
  { name: 'MOCK_NEWS', label: 'Новости' },
  { name: 'MOCK_RECIPES', label: 'Рецепты профессий' },
  { name: 'CONSUMABLES', label: 'Расходники' },
  { name: 'INITIAL_TOPICS', label: 'Темы форума' },
  { name: 'INITIAL_POSTS', label: 'Сообщения форума' },
  { name: 'INITIAL_MAIN_CATEGORIES', label: 'Категории форума' },
  { name: 'INITIAL_SUBCATEGORIES', label: 'Подкатегории форума' },
];

const DEFAULTS = {
  DB_ITEMS, DB_CHARMS, DB_REGULAR_ITEMS, DB_SPELLS,
  DB_RACIAL_SPELLS, DB_NPCS, INITIAL_AUCTION, MOCK_CHARACTERS, MOCK_NEWS,
  MOCK_RECIPES, INITIAL_TOPICS, INITIAL_POSTS, INITIAL_MAIN_CATEGORIES,
  INITIAL_SUBCATEGORIES,
  SPELL_FORMULAS: DEFAULT_SPELL_FORMULAS,
};

const listeners = new Set();

function loadAll() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveAll(data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Иконки хранятся в IndexedDB (без лимита), но dataStore всё ещё может переполниться
    // если пользователь загрузил ОЧЕНЬ много записей. Показываем понятное сообщение.
    console.error('dataStore: не удалось сохранить — localStorage переполнен.', e);
    if (typeof window !== 'undefined') {
      alert('Не удалось сохранить: хранилище браузера переполнено.');
    }
    return;
  }
  listeners.forEach((l) => l());
}

export const dataStore = {
  /** Get a collection (edited version if present, else static default). */
  get(name) {
    const data = loadAll();
    return data[name] !== undefined ? data[name] : DEFAULTS[name];
  },
  /** Overwrite a collection. */
  set(name, value) {
    const data = loadAll();
    data[name] = value;
    saveAll(data);
  },
  /** Reset a single collection to its static default. */
  reset(name) {
    const data = loadAll();
    delete data[name];
    saveAll(data);
  },
  /** Reset ALL collections to defaults. */
  resetAll() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
    listeners.forEach((l) => l());
  },
  /** Export all overrides as a JSON string. */
  exportAll() {
    return JSON.stringify(loadAll(), null, 2);
  },
  /** Import overrides from a JSON string (merges). */
  importAll(json) {
    saveAll({ ...loadAll(), ...JSON.parse(json) });
  },
  /** Subscribe to any change. Returns an unsubscribe fn. */
  subscribe(l) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

/**
 * React hook: subscribe to a collection with useSyncExternalStore.
 * Returns the (parsed) collection value, re-rendering on any store change.
 * `fallback` is the static default used for SSR / before hydration.
 */
export function useCollection(name, fallback) {
  const serialized = useSyncExternalStore(
    dataStore.subscribe,
    () => JSON.stringify(dataStore.get(name)),
    () => JSON.stringify(fallback),
  );
  try { return JSON.parse(serialized); } catch { return fallback; }
}
