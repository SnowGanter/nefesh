// @ts-nocheck
// gameData.ts — re-exports all data from thematic files.
// This file exists for backward compatibility — all existing imports
// `from '@/data/gameData'` continue to work.

export { DB_NPCS } from './npcs';
export { DB_SPELLS, SPELL_ELEMENTS, SPELL_RANKS, DEFAULT_RANK_PERCENTS, DEFAULT_SPELL_FORMULAS } from './spells';
export { STAT_DEF, CHARM_BASE_STATS, DB_CHARMS, DB_REGULAR_ITEMS, MOCK_RECIPES, DB_ITEMS } from './items';
export { DB_RACIAL_SPELLS } from './racial';
export { INITIAL_MAIN_CATEGORIES, INITIAL_SUBCATEGORIES, INITIAL_TOPICS, INITIAL_POSTS } from './forum';
export { MOCK_NEWS, INITIAL_AUCTION, MOCK_CHARACTERS } from './misc';
