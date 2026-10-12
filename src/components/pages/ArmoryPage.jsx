'use client';
import { evaluateFormula } from '@/lib/formula.mjs';
import { encodeBuild, decodeBuild } from '@/lib/buildShare.mjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Archive, CheckCircle, ChevronRight, Clipboard, FlaskConical, Gem, Hammer, Lock, Plus, Save, Search, Shield, Sliders, Sparkles, Target, User, Wind, X, Zap, ScrollText, BookOpen, } from 'lucide-react';
import { useIcon } from '@/lib/iconStore';
import { CHARM_BASE_STATS, DB_CHARMS, DB_ITEMS, DB_REGULAR_ITEMS, DB_SPELLS, MOCK_CHARACTERS, MOCK_RECIPES, STAT_DEF, DEFAULT_SPELL_FORMULAS, } from '@/data/gameData';
import { getBonusLevelsCount, evalDescription } from '@/lib/gameUtils';
import { dataStore, useCollection } from '@/lib/dataStore';
import { authStore, useCurrentUser } from '@/lib/authStore';
import { useParams, useNavigate, useSearchParams } from '@/lib/router';
import { NeoButton, NeoInput, NeoBadge, NeoPageHeader, NEO, } from '@/components/Neo';
/* ════════════════ Inline color maps (replace Tailwind classes) ════════════════ */
const RARITY_COLOR = {
    legendary: '#f59e0b',
    epic: '#ec4899',
    rare: '#06b6d4',
    uncommon: '#84cc16',
    common: '#737373',
};
const rarityColor = (rarity) => RARITY_COLOR[rarity] || '#525252';
const STAT_COLOR = {
    strength: '#ef4444',
    agility: '#84cc16',
    intellect: '#06b6d4',
    vitality: '#ec4899',
    defense: '#737373',
    crit: '#fbbf24',
    haste: '#06b6d4',
    luck: '#ec4899',
    str: '#ef4444',
    agi: '#84cc16',
    int: '#06b6d4',
    manaPool: '#06b6d4',
    stamina: '#f97316',
    speed: '#06b6d4',
    mastery: '#fbbf24',
    moveSpeed: '#14b8a6',
    hpRegen: '#84cc16',
    mpRegen: '#06b6d4',
    staminaRegen: '#f97316',
    energyRegen: '#fbbf24',
    armor: '#737373',
    magicResist: '#a855f7',
    physVamp: '#ef4444',
    magicVamp: '#ec4899',
    critDmg: '#ef4444',
    hp: '#84cc16',
    physDmg: '#ef4444',
    magicDmg: '#ec4899',
};
const statColor = (k) => STAT_COLOR[k] || '#525252';
const statLabel = (k) => STAT_DEF[k]?.label || k;
const ARMOR_COLOR = {
    plates: '#ef4444',
    mail: '#06b6d4',
    leather: '#fbbf24',
    cloth: '#84cc16',
};
/* ════════════════ Small Neo helpers (inline-styled) ════════════════ */
const PanelTitle = ({ icon: Icon, children, accent }) => (<h4 style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 0',
        marginBottom: '16px',
        borderBottom: `3px solid ${NEO.ink}`,
        fontFamily: '"Archivo Black", sans-serif',
        fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em',
        color: NEO.ink,
    }}>
    {Icon && <Icon size={16} strokeWidth={3} style={{ color: accent || NEO.ink }}/>}
    {children}
  </h4>);
const FieldLabel = ({ children, color, style }) => (<label style={{
        display: 'block', marginBottom: '6px',
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        color: color || NEO.muted,
        ...(style || {}),
    }}>
    {children}
  </label>);
/* ════════════════ Professions view (DB-bound) ════════════════ */
const PROFESSION_CATEGORIES = [
    { id: 'accessories', label: 'Аксессуары', icon: Hammer, bg: NEO.lime },
    { id: 'charms', label: 'Чармы', icon: Sparkles, bg: NEO.pink },
    { id: 'chemistry', label: 'Химия', icon: FlaskConical, bg: NEO.cyan },
    { id: 'gems', label: 'Камни', icon: Gem, bg: NEO.yellow },
    { id: 'scrolls', label: 'Свитки комплектов', icon: ScrollText, bg: NEO.violet },
    { id: 'assembly', label: 'Сборка артефактов', icon: CheckCircle, bg: NEO.lime },
];
// Map recipe.id → resulting item key (DB_KIND:ID).
// Recipes themselves don't carry a result item id, so we resolve to the
// closest matching item in DB_ITEMS / DB_CHARMS / DB_REGULAR_ITEMS.
const RECIPE_RESULT_MAP = {
    1: 'DB_ITEMS:1', // Shard of Balance
    2: 'DB_ITEMS:2', // Ring of Power
    3: 'DB_ITEMS:3', // Swift Band
    4: 'DB_ITEMS:4', // Mindstone
    5: 'DB_ITEMS:5', // Crest of Fortitude
    6: 'DB_ITEMS:6', // Band of Agility
    7: 'DB_CHARMS:1', // Чарм Убийцы
    8: 'DB_CHARMS:2', // Чарм Испепеления
    9: 'DB_CHARMS:3', // Чарм Вдохновения
    10: 'DB_CHARMS:4', // Чарм Палача
    11: 'DB_REGULAR_ITEMS:47', // Зелье Маны
    12: 'DB_REGULAR_ITEMS:50', // Малый эликсир здоровья
    13: 'DB_REGULAR_ITEMS:53', // Эликсир регенерации
    14: 'DB_REGULAR_ITEMS:56', // Эликсир могущества
    15: 'DB_REGULAR_ITEMS:35', // Малахит
    16: 'DB_REGULAR_ITEMS:37', // Кровавый рубин
    17: 'DB_REGULAR_ITEMS:38', // Звездный сапфир
    18: 'DB_REGULAR_ITEMS:39', // Изумруд жизни
    19: 'DB_REGULAR_ITEMS:42', // Безупречный алмаз
    20: 'DB_REGULAR_ITEMS:54', // Свиток портала
    21: 'DB_REGULAR_ITEMS:48', // Пыльца Иллюзий
    22: 'DB_REGULAR_ITEMS:51', // Пыль прозрения
};
const ProfessionsView = ({ inventoryItems, onAddCraftedItem, inventoryKeyCounts, onAssemble }) => {
    const [activeCategory, setActiveCategory] = useState('accessories');
    const [craftMessage, setCraftMessage] = useState(null);
    const allRecipes = useCollection('MOCK_RECIPES', MOCK_RECIPES);
    const dbRegular = useCollection('DB_REGULAR_ITEMS', DB_REGULAR_ITEMS);
    const dbItems = useCollection('DB_ITEMS', DB_ITEMS);
    // Build material counts from the current inventory items (by name).
    const materialCounts = useMemo(() => {
        const counts = {};
        (inventoryItems || []).forEach((it) => {
            if (!it || !it.name)
                return;
            counts[it.name] = (counts[it.name] || 0) + 1;
        });
        return counts;
    }, [inventoryItems]);
    // Try to match a recipe mat to a DB_REGULAR_ITEMS entry by name.
    const resolveMaterial = (matName) => {
        if (!matName)
            return null;
        const lower = matName.toLowerCase();
        return ((dbRegular || []).find(i => i.name.toLowerCase() === lower) ||
            (dbRegular || []).find(i => i.name.toLowerCase().includes(lower)) ||
            (dbRegular || []).find(i => lower.includes(i.name.toLowerCase())) ||
            null);
    };
    // Parse a "Сборный артефакт" recipe like "2 + 5", "33 + 20 + 5", "20 + 11 + 12 + 13"
    // into a list of integer item IDs (referring to DB_ITEMS IDs).
    const parseRecipeIds = (recipe) => {
        if (!recipe)
            return [];
        return String(recipe)
            .split('+')
            .map(s => Number(String(s).trim()))
            .filter(n => Number.isFinite(n) && n > 0);
    };
    // All сборные артефакты from DB_ITEMS.
    const assemblyArtifacts = useMemo(() => {
        return (dbItems || []).filter(i => i.type === 'Сборный артефакт');
    }, [dbItems]);
    // Per-artifact assembly info: parsed recipe, components, availability.
    const assemblyInfos = useMemo(() => {
        return assemblyArtifacts.map(art => {
            const ids = parseRecipeIds(art.recipe);
            // Aggregate required count per unique ID (some recipes repeat IDs,
            // e.g. "1 + 1 + 30" → id 1 needed twice).
            const requiredCounts = {};
            ids.forEach(id => { requiredCounts[id] = (requiredCounts[id] || 0) + 1; });
            const requiredComponents = Object.keys(requiredCounts).map(idStr => {
                const id = Number(idStr);
                const need = requiredCounts[id];
                const have = (inventoryKeyCounts || {})[`DB_ITEMS:${id}`] || 0;
                const item = (dbItems || []).find(i => i.id === id) || null;
                return { id, item, need, have, enough: have >= need };
            });
            const canAssemble = requiredComponents.length > 0 && requiredComponents.every(c => c.enough);
            return { artifact: art, requiredComponents, canAssemble };
        });
    }, [assemblyArtifacts, dbItems, inventoryKeyCounts]);
    const handleCraft = (recipe) => {
        const missing = (recipe.mats || []).filter(m => (materialCounts[m.name] || 0) < m.qty);
        if (missing.length > 0) {
            setCraftMessage({
                type: 'error',
                text: `Не хватает: ${missing.map(m => `${m.name} ×${m.qty - (materialCounts[m.name] || 0)}`).join(', ')}`,
            });
            setTimeout(() => setCraftMessage(null), 4000);
            return;
        }
        const resultKey = RECIPE_RESULT_MAP[recipe.id];
        if (!resultKey) {
            setCraftMessage({ type: 'error', text: `Результат крафта не определён для рецепта «${recipe.name}».` });
            setTimeout(() => setCraftMessage(null), 4000);
            return;
        }
        const ok = onAddCraftedItem(resultKey);
        if (!ok) {
            setCraftMessage({ type: 'error', text: 'В сумке нет свободных слотов!' });
            setTimeout(() => setCraftMessage(null), 4000);
            return;
        }
        setCraftMessage({ type: 'success', text: `Создано: ${recipe.name}` });
        setTimeout(() => setCraftMessage(null), 3000);
    };
    const handleAssemble = (info) => {
        if (!info.canAssemble || typeof onAssemble !== 'function')
            return;
        // Build list of base item keys to consume (one entry per recipe ID,
        // so duplicate IDs in the recipe consume multiple stacks).
        const ids = parseRecipeIds(info.artifact.recipe);
        const baseKeys = ids.map(id => `DB_ITEMS:${id}`);
        const ok = onAssemble(baseKeys, `DB_ITEMS:${info.artifact.id}`);
        if (!ok) {
            setCraftMessage({ type: 'error', text: 'Не удалось собрать — нет места в сумке для результата.' });
            setTimeout(() => setCraftMessage(null), 4000);
            return;
        }
        setCraftMessage({ type: 'success', text: `Собрано: ${info.artifact.name}` });
        setTimeout(() => setCraftMessage(null), 3000);
    };
    const activeRecipes = (allRecipes[activeCategory]) || [];
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {craftMessage && (<div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 18px',
                backgroundColor: craftMessage.type === 'success' ? NEO.lime : NEO.red,
                color: craftMessage.type === 'success' ? NEO.ink : '#fff',
                border: `3px solid ${NEO.ink}`,
                boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700, fontSize: '14px',
            }}>
          {craftMessage.type === 'success'
                ? <Sparkles size={22} strokeWidth={3}/>
                : <X size={22} strokeWidth={3}/>}
          {craftMessage.text}
        </div>)}

      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', flexWrap: 'wrap' }}>
        {/* Categories sidebar */}
        <aside style={{
            width: '100%', maxWidth: '256px', flexShrink: 0, alignSelf: 'flex-start',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            padding: '14px',
        }}>
          <h3 style={{
            marginBottom: '12px', padding: '0 8px 10px',
            borderBottom: `3px solid ${NEO.ink}`,
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.06em',
            color: NEO.ink,
        }}>
            Специализации
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {PROFESSION_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (<button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: '10px',
                    padding: '12px 14px',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '13px', fontWeight: 700,
                    color: NEO.ink,
                    backgroundColor: isActive ? cat.bg : NEO.surface,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: isActive ? `4px 4px 0px 0px ${NEO.ink}` : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    textAlign: 'left',
                }} onMouseEnter={(e) => {
                    if (isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
                }} onMouseLeave={(e) => {
                    if (isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                  <Icon size={18} strokeWidth={3}/>
                  {cat.label}
                </button>);
        })}
          </div>
        </aside>

        {/* Recipe list OR assembly list (depending on activeCategory) */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeCategory === 'assembly' ? (
        // ── Assembly UI ──────────────────────────────────────
        assemblyInfos.length === 0 ? (<div style={{ padding: '24px', textAlign: 'center', color: NEO.muted, fontWeight: 600, backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}` }}>
                Сборные артефакты не найдены в БД.
              </div>) : (assemblyInfos.map(info => {
            const art = info.artifact;
            return (<div key={art.id} style={{
                    display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    padding: '20px',
                    backgroundColor: NEO.surface,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                }}>
                    <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Artifact header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{
                    fontFamily: '"Archivo Black", sans-serif',
                    fontSize: '1.2rem', color: NEO.ink, margin: 0,
                }}>
                          {art.name}
                        </h3>
                        <NeoBadge bg={NEO.pink} fg="#fff">ID: {art.id}</NeoBadge>
                        <NeoBadge bg={NEO.yellow} fg={NEO.ink}>{art.type}</NeoBadge>
                      </div>
                      {/* Stats of the assembled artifact */}
                      {art.stats && Object.keys(art.stats).length > 0 ? (<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {Object.entries(art.stats).map(([key, value]) => {
                        if (!value || parseFloat(String(value).replace(',', '.')) <= 0)
                            return null;
                        const def = STAT_DEF[key];
                        if (!def)
                            return null;
                        const Icon = def.icon || Activity;
                        const col = statColor(key);
                        return (<span key={key} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px',
                                backgroundColor: col, color: NEO.ink,
                                border: `2px solid ${NEO.ink}`,
                                fontSize: '10px', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                                <Icon size={10} strokeWidth={3}/>
                                {def.label}:
                                <span style={{ fontFamily: '"Archivo Black", sans-serif' }}>{def.prefix}{value}{def.suffix}</span>
                              </span>);
                    })}
                        </div>) : null}
                      {art.desc && (<p style={{ margin: 0, fontSize: '12px', color: NEO.muted, fontWeight: 500, lineHeight: 1.5 }}>
                          {art.desc}
                        </p>)}
                      {/* Recipe string */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                    padding: '2px 8px',
                    backgroundColor: NEO.ink, color: NEO.yellow,
                    border: `2px solid ${NEO.ink}`,
                    fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
                }}>
                          Рецепт: {art.recipe || '—'}
                        </span>
                      </div>
                      {/* Required components (deduped by ID) */}
                      <div>
                        <h4 style={{
                    marginBottom: '8px',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '11px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: NEO.muted,
                }}>
                          Компоненты (базовые аксессуары):
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {info.requiredComponents.map(comp => {
                    const enough = comp.enough;
                    const MatIcon = comp.item ? Gem : Archive;
                    return (<span key={comp.id} title={comp.item ? `${comp.item.name} — ID:${comp.id} (найдено в БД)` : `ID:${comp.id} (нет в БД)`} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 10px',
                            backgroundColor: enough ? NEO.lime : NEO.bg,
                            color: NEO.ink,
                            border: `2px solid ${NEO.ink}`,
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontSize: '12px', fontWeight: 600,
                            opacity: comp.item ? 1 : 0.7,
                        }}>
                                <MatIcon size={12} strokeWidth={3} style={{ color: NEO.ink }}/>
                                {comp.item ? comp.item.name : `ID:${comp.id}`}{' '}
                                <span style={{ fontFamily: '"Archivo Black", sans-serif', color: enough ? NEO.ink : NEO.redDark }}>
                                  {comp.have}/{comp.need}
                                </span>
                              </span>);
                })}
                        </div>
                      </div>
                    </div>
                    {/* Assemble button */}
                    <div style={{ flexShrink: 0 }}>
                      <NeoButton variant={info.canAssemble ? 'lime' : 'white'} size="lg" onClick={() => handleAssemble(info)}>
                        <CheckCircle size={18} strokeWidth={3}/> Собрать
                      </NeoButton>
                    </div>
                  </div>);
        }))) : (
        // ── Existing recipe-based UI ─────────────────────────
        <>
              {activeRecipes.length === 0 && (<div style={{ padding: '24px', textAlign: 'center', color: NEO.muted, fontWeight: 600, backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}` }}>
                  Нет рецептов в этой специализации.
                </div>)}
              {activeRecipes.map(recipe => {
                // Per-recipe material check (name-based count).
                const canCraft = (recipe.mats || []).every(m => (materialCounts[m.name] || 0) >= m.qty);
                return (<div key={recipe.id} style={{
                        display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '20px',
                        backgroundColor: NEO.surface,
                        border: `3px solid ${NEO.ink}`,
                        boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                    }}>
                  <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{
                        fontFamily: '"Archivo Black", sans-serif',
                        fontSize: '1.25rem',
                        color: rarityColor(recipe.rarity),
                        margin: 0,
                    }}>
                        {recipe.name}
                      </h3>
                      <span style={{
                        padding: '3px 10px',
                        backgroundColor: NEO.ink, color: NEO.yellow,
                        border: `2px solid ${NEO.ink}`,
                        fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
                    }}>
                        Навык: {recipe.skill}
                      </span>
                      <NeoBadge bg={NEO.yellow} fg={NEO.ink}>{recipe.rarity}</NeoBadge>
                    </div>
                    <p style={{ fontSize: '13px', color: NEO.muted, fontWeight: 500, margin: 0 }}>{recipe.desc}</p>

                    <div style={{ paddingTop: '8px' }}>
                      <h4 style={{
                        marginBottom: '8px',
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontSize: '11px', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: NEO.muted,
                    }}>
                        Реагенты:
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {recipe.mats.map((mat, idx) => {
                        const dbMatch = resolveMaterial(mat.name);
                        const have = materialCounts[mat.name] || 0;
                        const enough = have >= mat.qty;
                        const MatIcon = dbMatch && dbMatch.type && MATERIAL_ICON[dbMatch.type]
                            ? MATERIAL_ICON[dbMatch.type]
                            : Archive;
                        return (<span key={idx} title={dbMatch ? `${dbMatch.name} — ${dbMatch.type} (найдено в БД)` : `${mat.name} (нет в БД материалов)`} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 10px',
                                backgroundColor: enough ? NEO.lime : NEO.bg,
                                color: NEO.ink,
                                border: `2px solid ${NEO.ink}`,
                                fontFamily: '"Space Grotesk", sans-serif',
                                fontSize: '12px', fontWeight: 600,
                                opacity: dbMatch ? 1 : 0.7,
                            }}>
                              <MatIcon size={12} strokeWidth={3} style={{ color: NEO.ink }}/>
                              {mat.name}{' '}
                              <span style={{ fontFamily: '"Archivo Black", sans-serif', color: enough ? NEO.ink : NEO.redDark }}>
                                {have}/{mat.qty}
                              </span>
                            </span>);
                    })}
                      </div>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <NeoButton variant={canCraft ? 'lime' : 'white'} size="lg" onClick={() => handleCraft(recipe)}>
                      <Hammer size={18} strokeWidth={3}/> Создать
                    </NeoButton>
                  </div>
                </div>);
            })}
            </>)}
        </div>
      </div>
    </div>);
};
/* ════════════════ Inventory helpers ════════════════ */
const INVENTORY_SIZE = 40;
const MAX_STACK = 64;
// Normalize any legacy inventory value into the new { key, count } slot shape.
//   - null/undefined                          → null
//   - "DB_ITEMS:5" (string with colon)        → { key: "DB_ITEMS:5", count: 1 }
//   - 5 / "5"          (legacy plain number)  → { key: "DB_ITEMS:5", count: 1 }
//   - { key, count }   (new shape)            → { key, count } (with key normalised & count clamped)
const normalizeSlot = (val) => {
    if (!val)
        return null;
    if (typeof val === 'string') {
        if (val.includes(':'))
            return { key: val, count: 1 };
        if (/^\d+$/.test(val))
            return { key: `DB_ITEMS:${val}`, count: 1 };
        return null;
    }
    if (typeof val === 'number' && Number.isFinite(val)) {
        return { key: `DB_ITEMS:${val}`, count: 1 };
    }
    if (typeof val === 'object' && val.key) {
        const k = typeof val.key === 'string' && val.key.includes(':')
            ? val.key
            : (typeof val.key === 'number' ? `DB_ITEMS:${val.key}` : null);
        if (!k)
            return null;
        const c = Math.max(1, Math.min(MAX_STACK, Number(val.count) || 1));
        return { key: k, count: c };
    }
    return null;
};
// Per-source visual metadata for inventory tiles.
const SOURCE_META = {
    DB_ITEMS: { icon: Gem, bg: NEO.lime, fg: NEO.ink, shadow: NEO.limeDark, label: 'Аксессуар' },
    DB_CHARMS: { icon: Sparkles, bg: NEO.pink, fg: NEO.ink, shadow: NEO.pinkDark, label: 'Чарм' },
    DB_REGULAR_ITEMS: { icon: Archive, bg: NEO.cyan, fg: NEO.ink, shadow: NEO.cyanDark, label: 'Материал' },
};
// Icon per DB_REGULAR_ITEMS `type` field (материалы по типу).
const MATERIAL_ICON = {
    'Ткань': BookOpen,
    'Трава': FlaskConical,
    'Дерево': Hammer,
    'Руда': Shield,
    'Драгоценный камень': Gem,
    'Расходник': Activity,
};
// Parse an inventory key like "DB_ITEMS:5" into { db, id }.
const parseItemKey = (key) => {
    if (!key || typeof key !== 'string')
        return null;
    const idx = key.indexOf(':');
    if (idx < 0)
        return null;
    const db = key.slice(0, idx);
    const id = Number(key.slice(idx + 1));
    if (!Number.isFinite(id))
        return null;
    return { db, id };
};
// Normalize legacy inventory values (plain numbers) into "DB_ITEMS:N" keys.
const normalizeKey = (val) => {
    if (!val)
        return null;
    if (typeof val === 'string' && val.includes(':'))
        return val;
    if (typeof val === 'number' && Number.isFinite(val))
        return `DB_ITEMS:${val}`;
    if (typeof val === 'string' && /^\d+$/.test(val))
        return `DB_ITEMS:${val}`;
    return null;
};
// Resolve a key into the actual item object using the provided collections.
const resolveItem = (key, dbItems, dbCharms, dbRegular) => {
    const parsed = parseItemKey(key);
    if (!parsed)
        return null;
    if (parsed.db === 'DB_ITEMS')
        return (dbItems || []).find(i => i.id === parsed.id) || null;
    if (parsed.db === 'DB_CHARMS')
        return (dbCharms || []).find(i => i.id === parsed.id) || null;
    if (parsed.db === 'DB_REGULAR_ITEMS')
        return (dbRegular || []).find(i => i.id === parsed.id) || null;
    return null;
};
/* ════════════════ Inventory slot (interactive) ════════════════ */
const InventorySlot = ({ item, source, index, count, onClick, isSelf }) => {
    const stackCount = Math.max(1, Number(count) || 1);
    const [tooltipPos, setTooltipPos] = useState(null);
    const handleMouseEnter = (e) => {
        if (isSelf) {
            e.currentTarget.style.transform = 'translate(2px, 2px)';
            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${meta.shadow}`;
        }
        if (item) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPos({ top: rect.top - 12, left: rect.left + rect.width / 2 });
        }
    };
    const handleMouseLeave = (e) => {
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${meta.shadow}`;
        setTooltipPos(null);
    };
    if (!item) {
        return (<button onClick={() => { if (isSelf)
            onClick(); }} disabled={!isSelf} title={isSelf ? 'Клик чтобы добавить предмет' : ''} style={{
                aspectRatio: '1 / 1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.bg,
                border: `2px dashed ${NEO.faint}`,
                cursor: isSelf ? 'pointer' : 'default',
                opacity: isSelf ? 1 : 0.5,
                fontFamily: 'monospace', fontSize: '12px',
                color: NEO.faint, fontWeight: 700,
                userSelect: 'none',
                transition: 'transform 0.1s, background 0.1s',
            }} onMouseEnter={(e) => { if (isSelf) {
            e.currentTarget.style.transform = 'translate(2px, 2px)';
            e.currentTarget.style.backgroundColor = NEO.lime;
        } }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.backgroundColor = NEO.bg; }}>
        {isSelf ? '+' : (index + 1)}
      </button>);
    }
    const meta = SOURCE_META[source] || SOURCE_META.DB_REGULAR_ITEMS;
    let FinalIcon = meta.icon;
    if (source === 'DB_REGULAR_ITEMS' && item.type && MATERIAL_ICON[item.type]) {
        FinalIcon = MATERIAL_ICON[item.type];
    }
    const removeTitle = isSelf
        ? (stackCount > 1
            ? `${item.name} (×${stackCount}) — клик чтобы убрать 1 шт (останется ${stackCount - 1})`
            : `${item.name} — клик чтобы убрать`)
        : `${item.name}${stackCount > 1 ? ` (×${stackCount})` : ''}`;
    return (<div className="neo-inv-slot" style={{ position: 'relative' }}>
      <div onClick={() => { if (isSelf)
        onClick(); }} title={removeTitle} style={{
            position: 'relative',
            aspectRatio: '1 / 1',
            cursor: isSelf ? 'pointer' : 'default',
            backgroundColor: meta.bg,
            border: `2px solid ${NEO.ink}`,
            boxShadow: `3px 3px 0px 0px ${meta.shadow}`,
            transition: 'transform 0.1s, box-shadow 0.1s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'visible',
        }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <FinalIcon size={22} strokeWidth={2.5} style={{ color: meta.fg }}/>
        {/* Stack count badge (visible for everyone when > 1) */}
        {stackCount > 1 && (<div style={{
                position: 'absolute', top: 2, right: 2,
                minWidth: '16px', padding: '0 3px', textAlign: 'center',
                backgroundColor: NEO.yellow, color: NEO.ink,
                border: `1px solid ${NEO.ink}`,
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: '10px', fontWeight: 800,
                lineHeight: '14px',
            }}>
            {stackCount}
          </div>)}
        {/* Remove indicator (only when count === 1 and owner) */}
        {isSelf && stackCount === 1 && (<div style={{
                position: 'absolute', top: 2, right: 2,
                padding: '1px',
                backgroundColor: NEO.red, color: '#fff',
                border: `1px solid ${NEO.ink}`,
                lineHeight: 0,
            }}>
            <X size={9} strokeWidth={3}/>
          </div>)}
        <div style={{
            position: 'absolute', bottom: 1, left: 2,
            fontFamily: 'monospace', fontSize: '8px',
            color: NEO.ink, fontWeight: 800,
            opacity: 0.7, lineHeight: 1,
        }}>
          {index + 1}
        </div>
      </div>
      {/* Hover tooltip — portal to body, position: fixed, never clipped */}
      {tooltipPos && typeof document !== 'undefined' && createPortal(<div style={{
                position: 'fixed',
                top: tooltipPos.top,
                left: tooltipPos.left,
                transform: 'translate(-50%, -100%)',
                zIndex: 9000,
                width: '300px',
                backgroundColor: NEO.surface,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                padding: '14px',
                textAlign: 'left',
                fontFamily: '"Space Grotesk", sans-serif',
                pointerEvents: 'none',
            }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: `2px solid ${NEO.ink}` }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: NEO.ink, margin: 0, fontFamily: '"Archivo Black", sans-serif' }}>{item.name}</h4>
            <span style={{ padding: '2px 6px', backgroundColor: meta.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, fontFamily: 'monospace', fontSize: '9px', fontWeight: 800 }}>
              {meta.label}{stackCount > 1 ? ` ×${stackCount}` : ''}
            </span>
          </div>
          {item.type && (<p style={{ margin: '0 0 8px', fontSize: '11px', color: NEO.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {item.type}
            </p>)}
          {item.desc && <p style={{ marginBottom: '10px', fontSize: '12px', lineHeight: 1.5, color: NEO.ink, fontWeight: 500, whiteSpace: 'pre-line' }}>{item.desc}</p>}
          {item.stats && Object.keys(item.stats).length > 0 ? (<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(item.stats).map(([key, value]) => {
                    if (!value || parseFloat(String(value).replace(',', '.')) <= 0)
                        return null;
                    const def = STAT_DEF[key];
                    if (!def)
                        return null;
                    const Icon = def.icon || Activity;
                    const col = statColor(key);
                    return (<span key={key} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 8px',
                            backgroundColor: col, color: NEO.ink,
                            border: `2px solid ${NEO.ink}`,
                            fontSize: '10px', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                    <Icon size={10} strokeWidth={3}/>
                    {def.label}:
                    <span style={{ fontFamily: '"Archivo Black", sans-serif' }}>{def.prefix}{value}{def.suffix}</span>
                  </span>);
                })}
            </div>) : null}
        </div>, document.body)}
    </div>);
};
/* ════════════════ Item picker modal ════════════════ */
const ItemPickerModal = ({ open, onClose, onPick, excludeKeys }) => {
    const dbItems = useCollection('DB_ITEMS', DB_ITEMS);
    const dbCharms = useCollection('DB_CHARMS', DB_CHARMS);
    const dbRegular = useCollection('DB_REGULAR_ITEMS', DB_REGULAR_ITEMS);
    const [query, setQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset picker filters when the dialog opens.
            setQuery('');
            setSourceFilter('all');
        }
    }, [open]);
    const allOptions = useMemo(() => {
        const items = (dbItems || []).map(i => ({ ...i, _key: `DB_ITEMS:${i.id}`, _source: 'DB_ITEMS' }));
        const charms = (dbCharms || []).map(i => ({ ...i, _key: `DB_CHARMS:${i.id}`, _source: 'DB_CHARMS' }));
        const regular = (dbRegular || []).map(i => ({ ...i, _key: `DB_REGULAR_ITEMS:${i.id}`, _source: 'DB_REGULAR_ITEMS' }));
        return [...items, ...charms, ...regular];
    }, [dbItems, dbCharms, dbRegular]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return allOptions.filter(o => {
            if ((excludeKeys || []).includes(o._key))
                return false;
            if (sourceFilter !== 'all' && o._source !== sourceFilter)
                return false;
            if (!q)
                return true;
            if (String(o.name).toLowerCase().includes(q))
                return true;
            if (o.type && String(o.type).toLowerCase().includes(q))
                return true;
            if (o.desc && String(o.desc).toLowerCase().includes(q))
                return true;
            return false;
        });
    }, [allOptions, query, sourceFilter, excludeKeys]);
    if (!open || typeof document === 'undefined')
        return null;
    return createPortal(<div onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 9000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
        }}>
      <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '760px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
        }}>
        {/* Header */}
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: NEO.lime,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Archive size={20} strokeWidth={3} style={{ color: NEO.ink }}/>
            <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.125rem', color: NEO.ink, margin: 0 }}>
              Выбор предмета
            </h3>
          </div>
          <button onClick={onClose} style={{
            display: 'inline-flex', padding: '4px',
            backgroundColor: NEO.red, color: '#fff',
            border: `2px solid ${NEO.ink}`, cursor: 'pointer',
        }}>
            <X size={16} strokeWidth={3}/>
          </button>
        </div>

        {/* Filters */}
        <div style={{
            display: 'flex', gap: '10px', padding: '14px 18px',
            borderBottom: `2px solid ${NEO.ink}`,
            flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={16} strokeWidth={2.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
            <NeoInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию, типу, описанию…" style={{ paddingLeft: '36px' }}/>
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{
            padding: '10px 14px',
            backgroundColor: NEO.surface, color: NEO.ink,
            border: `3px solid ${NEO.ink}`,
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', outline: 'none',
        }}>
            <option value="all">Все категории</option>
            <option value="DB_ITEMS">Аксессуары</option>
            <option value="DB_CHARMS">Чармы</option>
            <option value="DB_REGULAR_ITEMS">Материалы</option>
          </select>
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (<p style={{ textAlign: 'center', padding: '32px', color: NEO.muted, fontSize: '14px', fontWeight: 600 }}>
              Ничего не найдено.
            </p>) : (filtered.map(o => {
            const meta = SOURCE_META[o._source];
            const Icon = (o._source === 'DB_REGULAR_ITEMS' && o.type && MATERIAL_ICON[o.type]) || meta.icon;
            return (<button key={o._key} onClick={() => onPick(o._key)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '10px 14px', marginBottom: '6px',
                    backgroundColor: NEO.bg,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${NEO.ink}`; }}>
                  <div style={{
                    width: 36, height: 36, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: meta.bg, color: NEO.ink,
                    border: `2px solid ${NEO.ink}`,
                }}>
                    <Icon size={18} strokeWidth={2.5}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '13px', color: NEO.ink }}>
                        {o.name}
                      </span>
                      <span style={{
                    padding: '2px 6px',
                    backgroundColor: meta.bg, color: NEO.ink,
                    border: `2px solid ${NEO.ink}`,
                    fontSize: '9px', fontWeight: 800, textTransform: 'uppercase',
                }}>
                        {meta.label}
                      </span>
                      {o.type && (<span style={{
                        padding: '2px 6px',
                        backgroundColor: NEO.surface, color: NEO.muted,
                        border: `2px solid ${NEO.ink}`,
                        fontSize: '9px', fontWeight: 800,
                    }}>
                          {o.type}
                        </span>)}
                    </div>
                    {o.desc && (<p style={{
                        margin: '4px 0 0', fontSize: '11px', color: NEO.muted, fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {String(o.desc).split('\n')[0]}
                      </p>)}
                  </div>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '10px', fontWeight: 800,
                    color: NEO.muted, flexShrink: 0,
                }}>
                    ID: {o.id}
                  </span>
                </button>);
        }))}
        </div>
      </div>
    </div>, document.body);
};
/* ════════════════ Inventory grid (40 slots + picker) ════════════════ */
const InventoryGrid = ({ inventory, setInventory, isSelf }) => {
    const dbItems = useCollection('DB_ITEMS', DB_ITEMS);
    const dbCharms = useCollection('DB_CHARMS', DB_CHARMS);
    const dbRegular = useCollection('DB_REGULAR_ITEMS', DB_REGULAR_ITEMS);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSlot, setPickerSlot] = useState(null);
    // Resolve each slot into { item, source, key, count }.
    const resolved = useMemo(() => {
        return Array.from({ length: INVENTORY_SIZE }, (_, i) => {
            const slot = inventory[i] || null;
            if (!slot)
                return { item: null, source: null, key: null, count: 0 };
            const parsed = parseItemKey(slot.key);
            const source = parsed ? parsed.db : null;
            const item = resolveItem(slot.key, dbItems, dbCharms, dbRegular);
            return { item, source, key: slot.key, count: slot.count || 1 };
        });
    }, [inventory, dbItems, dbCharms, dbRegular]);
    // Click handler:
    //   - empty slot → open picker
    //   - slot with count > 1 → decrement count by 1
    //   - slot with count === 1 → null (remove entire stack)
    const handleSlotClick = (i) => {
        if (!isSelf)
            return;
        const slot = inventory[i];
        if (!slot) {
            setPickerSlot(i);
            setPickerOpen(true);
            return;
        }
        const next = [...inventory];
        if (slot.count > 1) {
            next[i] = { ...slot, count: slot.count - 1 };
        }
        else {
            next[i] = null;
        }
        setInventory(next);
    };
    // Pick handler: stack onto existing slot if possible (count < MAX_STACK),
    // otherwise place as a new stack in the chosen picker slot.
    const handlePick = (key) => {
        if (pickerSlot === null)
            return;
        const next = [...inventory];
        // Try to find an existing slot (not the picker slot, which is empty)
        // with the same key and a stack that's not full.
        const stackIdx = next.findIndex((s, idx) => idx !== pickerSlot && s && s.key === key && s.count < MAX_STACK);
        if (stackIdx >= 0) {
            next[stackIdx] = { ...next[stackIdx], count: next[stackIdx].count + 1 };
            // picker slot stays empty
        }
        else {
            next[pickerSlot] = { key, count: 1 };
        }
        setInventory(next);
        setPickerOpen(false);
        setPickerSlot(null);
    };
    const filledCount = inventory.filter(Boolean).length;
    // Total items (accounting for stack counts) — informational.
    const totalItems = inventory.reduce((sum, s) => sum + (s ? s.count : 0), 0);
    return (<div>
      <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: '16px', marginBottom: '12px',
            borderBottom: `3px solid ${NEO.ink}`,
            flexWrap: 'wrap', gap: '12px',
        }}>
        <h3 style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '1.5rem', color: NEO.ink, margin: 0,
        }}>
          <Archive size={24} strokeWidth={3} style={{ color: NEO.lime }}/> Рюкзак
        </h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            padding: '6px 12px',
            backgroundColor: NEO.ink, color: NEO.lime,
            border: `2px solid ${NEO.ink}`,
            fontFamily: 'monospace', fontSize: '13px', fontWeight: 800,
        }}>
            {filledCount} / {INVENTORY_SIZE}
          </span>
          <span style={{
            padding: '6px 12px',
            backgroundColor: NEO.yellow, color: NEO.ink,
            border: `2px solid ${NEO.ink}`,
            fontFamily: 'monospace', fontSize: '13px', fontWeight: 800,
        }}>
            предметов: {totalItems}
          </span>
          {isSelf && filledCount > 0 && (<NeoButton variant="red" size="sm" onClick={() => {
                if (typeof window !== 'undefined' && window.confirm('Очистить все 40 слотов сумки?')) {
                    setInventory(Array(INVENTORY_SIZE).fill(null));
                }
            }}>
              <X size={14} strokeWidth={3}/> Очистить
            </NeoButton>)}
        </div>
      </div>
      <p style={{ marginTop: '-4px', marginBottom: '14px', fontSize: '12px', color: NEO.muted, fontWeight: 600 }}>
        Клик по пустому слоту — выбрать предмет из БД. Клик по заполненному — убрать 1 шт (если стак &gt; 1, он уменьшается; если 1 — слот очищается). Предметы стакаются до {MAX_STACK} в одном слоте. Наведение — подробный тултип.
      </p>
      <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            padding: '16px',
            backgroundColor: NEO.bg,
            border: `3px solid ${NEO.ink}`,
        }} className="neo-inv-grid">
        <style>{`
          @media (min-width: 640px) { .neo-inv-grid { grid-template-columns: repeat(8, 1fr) !important; } }
          @media (min-width: 768px) { .neo-inv-grid { grid-template-columns: repeat(10, 1fr) !important; } }
        `}</style>
        {resolved.map((slot, i) => (<InventorySlot key={i} item={slot.item} source={slot.source} index={i} count={slot.count} onClick={() => handleSlotClick(i)} isSelf={isSelf}/>))}
      </div>
      <ItemPickerModal open={pickerOpen} onClose={() => { setPickerOpen(false); setPickerSlot(null); }} onPick={handlePick} excludeKeys={[]}/>
    </div>);
};
/* ════════════════ Armor types ════════════════ */
const ARMOR_TYPES = {
    plates: { name: 'Латы', armorMult: 30, armorDivisor: 40, mrMult: 5, mrDivisor: 100, speed: 0, icon: Shield },
    mail: { name: 'Кольчуга', armorMult: 20, armorDivisor: 60, mrMult: 10, mrDivisor: 80, speed: 20, icon: Activity },
    leather: { name: 'Кожа', armorMult: 10, armorDivisor: 80, mrMult: 20, mrDivisor: 60, speed: 40, icon: Wind },
    cloth: { name: 'Ткань', armorMult: 5, armorDivisor: 100, mrMult: 30, mrDivisor: 40, speed: 60, icon: Zap },
};
/* ════════════════ Custom select (neobrutalism) ════════════════ */
const CustomSelect = ({ value, onChange, options, emptyLabel, disabled, onHoverItem, variant = 'default', index }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const handleOutside = (e) => { if (ref.current && !ref.current.contains(e.target))
            setIsOpen(false); };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);
    const selected = options.find(o => o.id.toString() === value?.toString());
    const triggerProps = {
        onMouseEnter: (e) => { if (selected && !isOpen)
            onHoverItem(selected.id, e); },
        onMouseLeave: (e) => { onHoverItem(null, e); },
        onMouseMove: (e) => { if (selected && !isOpen)
            onHoverItem(selected.id, e); },
        onClick: () => { if (!disabled) {
            setIsOpen(!isOpen);
            onHoverItem(null);
        } },
    };
    if (variant === 'square') {
        return (<div ref={ref} style={{ position: 'relative', width: '100%' }}>
        <div {...triggerProps} style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                backgroundColor: selected ? NEO.yellow : NEO.bg,
                border: `3px solid ${NEO.ink}`,
                boxShadow: selected ? `3px 3px 0px 0px ${NEO.ink}` : 'none',
                transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
          {selected ? (<>
              <Gem size={22} strokeWidth={2.5} style={{ color: NEO.ink, marginBottom: '4px' }}/>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, color: NEO.ink }}>{selected.id}</span>
            </>) : disabled ? (<Lock size={18} strokeWidth={2.5} style={{ color: NEO.faint }}/>) : (<span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: NEO.muted }}>+{index}</span>)}
        </div>
        {isOpen && !disabled && (<div style={{
                    position: 'absolute', zIndex: 60,
                    marginTop: '4px', width: '100%', minWidth: '200px',
                    maxHeight: '240px', overflowY: 'auto',
                    backgroundColor: NEO.surface,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                    padding: '4px 0',
                }}>
            <div onClick={() => { onChange(''); setIsOpen(false); onHoverItem(null); }} onMouseEnter={(e) => onHoverItem(null, e)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', color: NEO.muted, fontWeight: 600 }}>
              {emptyLabel}
            </div>
            {options.map(opt => (<div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); onHoverItem(null); }} onMouseEnter={(e) => onHoverItem(opt.id, e)} onMouseLeave={(e) => onHoverItem(null, e)} onMouseMove={(e) => onHoverItem(opt.id, e)} style={{
                        padding: '8px 12px', cursor: 'pointer',
                        borderTop: `1px solid ${NEO.ink}`,
                        fontSize: '12px', color: NEO.ink, fontWeight: 600,
                    }}>
                <span style={{ marginRight: '6px', fontFamily: 'monospace', color: NEO.muted }}>[{opt.id}]</span> {opt.name}
              </div>))}
          </div>)}
      </div>);
    }
    return (<div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div {...triggerProps} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: NEO.bg,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            fontSize: '12px', color: NEO.ink, fontWeight: 600,
            fontFamily: '"Space Grotesk", sans-serif',
            transition: 'transform 0.1s, box-shadow 0.1s',
        }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? `[ID: ${selected.id}] ${selected.name}` : emptyLabel}
        </span>
        <ChevronRight size={14} strokeWidth={3} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}/>
      </div>
      {isOpen && !disabled && (<div style={{
                position: 'absolute', zIndex: 60,
                marginTop: '4px', width: '100%', minWidth: '200px',
                maxHeight: '240px', overflowY: 'auto',
                backgroundColor: NEO.surface,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                padding: '4px 0',
            }}>
          <div onClick={() => { onChange(''); setIsOpen(false); onHoverItem(null); }} onMouseEnter={(e) => onHoverItem(null, e)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', color: NEO.muted, fontWeight: 600 }}>
            {emptyLabel}
          </div>
          {options.map(opt => (<div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); onHoverItem(null); }} onMouseEnter={(e) => onHoverItem(opt.id, e)} onMouseLeave={(e) => onHoverItem(null, e)} onMouseMove={(e) => onHoverItem(opt.id, e)} style={{
                    padding: '8px 12px', cursor: 'pointer',
                    borderTop: `1px solid ${NEO.ink}`,
                    fontSize: '12px', color: NEO.ink, fontWeight: 600,
                }}>
              <span style={{ marginRight: '6px', fontFamily: 'monospace', color: NEO.muted }}>[{opt.id}]</span> {opt.name}
            </div>))}
        </div>)}
    </div>);
};
/* ════════════════ Floating tooltip ════════════════ */
const FloatingTooltip = ({ tooltipData }) => {
    if (!tooltipData || !tooltipData.id)
        return null;
    const allItems = [...dataStore.get('DB_ITEMS'), ...dataStore.get('DB_REGULAR_ITEMS'), ...dataStore.get('DB_CHARMS')];
    const item = allItems.find(i => i.id.toString() === tooltipData.id.toString());
    if (!item)
        return null;
    // Position right next to cursor, flip if near screen edges
    const tw = 320, th = 200;
    const left = tooltipData.x + 16 + tw > window.innerWidth ? tooltipData.x - tw - 16 : tooltipData.x + 16;
    const top = tooltipData.y + 16 + th > window.innerHeight ? tooltipData.y - th - 16 : tooltipData.y + 16;
    return (<div style={{
            position: 'fixed', top, left, zIndex: 9999, width: '320px',
            padding: '14px',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            pointerEvents: 'none',
            fontFamily: '"Space Grotesk", sans-serif',
            textAlign: 'left',
        }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: `2px solid ${NEO.ink}` }}>
        <h4 style={{ fontSize: '13px', fontWeight: 800, color: rarityColor(item.rarity), margin: 0, fontFamily: '"Archivo Black", sans-serif' }}>{item.name}</h4>
        <span style={{ padding: '2px 6px', backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}`, fontFamily: 'monospace', fontSize: '10px' }}>
          ID: {item.id}
        </span>
      </div>
      {item.desc && <p style={{ marginBottom: '10px', fontSize: '12px', lineHeight: 1.5, color: NEO.ink, fontWeight: 500, whiteSpace: 'pre-line' }}>{item.desc}</p>}
      {item.stats && Object.keys(item.stats).length > 0 ? (<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {Object.entries(item.stats).map(([key, value]) => {
                if (!value || parseFloat(String(value).replace(',', '.')) <= 0)
                    return null;
                const def = STAT_DEF[key];
                if (!def)
                    return null;
                const Icon = def.icon || Activity;
                const col = statColor(key);
                return (<span key={key} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px',
                        backgroundColor: col, color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        fontSize: '10px', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                <Icon size={10} strokeWidth={3}/>
                {def.label}:
                <span style={{ fontFamily: '"Archivo Black", sans-serif' }}>{def.prefix}{value}{def.suffix}</span>
              </span>);
            })}
        </div>) : item.rawStats ? (<span style={{
                display: 'block', padding: '6px 8px',
                backgroundColor: NEO.bg,
                border: `2px solid ${NEO.ink}`,
                fontFamily: 'monospace', fontSize: '10px',
                color: NEO.muted, wordBreak: 'break-word',
            }}>
          {item.rawStats}
        </span>) : null}
    </div>);
};
const STAT_LIMIT = 3000;
/* ════════════════ Spell formula helpers ════════════════ */
// Rank → multiplier (D=1, DD=2, C=3, CC=4, B=5, BB=6, A=7, AA=8, S=9, SS=10)
const RANK_MULTIPLIER = {
    D: 1, DD: 2, C: 3, CC: 4, B: 5, BB: 6, A: 7, AA: 8, S: 9, SS: 10,
};
// Element → accent color (matches element emojis used in DB_SPELLS).
const ELEMENT_COLOR = {
    '🔥 Огонь': NEO.red,
    '🌊 Вода': NEO.cyan,
    '🌪️ Воздух': NEO.lime,
    '🗿 Земля': '#a16207',
    '🌞 Свет': NEO.yellowDark,
    '🌑 Тьма': NEO.violet,
    '⚡ Молния': '#facc15',
    '❄️ Лёд': '#7dd3fc',
    '🩸 Кровь': '#dc2626',
    '🧿 Природа': '#65a30d',
};
const elementColor = (el) => ELEMENT_COLOR[el] || NEO.muted;
/**
 * Calculate the per-hit damage for a spell given the current character stats.
 *
 *  - M = magic damage, P = physical damage
 *  - x = rank multiplier
 *  - crit_chance → finalCrit (%)
 *  - crit_damage → finalCritDmg (%)
 *  - haste → capped spell speed (%)
 *  - resistance → total magic resist (flat)
 *  - mana_regen → finalMpRegen
 *  - energy_amount / energy_recovery → energyRegen
 *  - lifesteal → physVamp (%)
 *  - speed → capped spell speed (%)
 *  - armor → total armor (flat)
 *  - stamina → finalStamina
 *  - current_energy → energyRegen * 100
 *  - Agility → finalAgi
 *
 * Commas in numbers are replaced with dots (0,15 → 0.15) before eval.
 */
function calcSpellDamage(spell, s, spellFormulas) {
    if (!spell || !spell.rank)
        return null;
    const x = RANK_MULTIPLIER[spell.rank];
    if (!x)
        return null;
    // Получаем формулу: точечную (spell.formula) или вычисленную из стихийной базовой.
    // computeSpellFormula возвращает строку вида "M*0,12*((crit*0,12))" или
    // "base × 1,20 (+20%)" для стихийной с рангом. Для вычисления берём только
    // точечную formula, иначе — baseFormula из стихийной (без × множителя, т.к.
    // множитель ранга уже учтён в RANK_MULTIPLIER).
    let formula = '';
    if (spell.formula && String(spell.formula).trim()) {
        formula = String(spell.formula);
    }
    else if (spellFormulas && spell.element && spellFormulas[spell.element]) {
        formula = spellFormulas[spell.element].baseFormula || '';
    }
    // Если формула всё ещё пустая — используем дефолтную
    if (!formula)
        formula = 'M*0,12*((crit*0,12))';
    formula = formula.replace(/,/g, '.');
    // Получаем процент надбавки ранга из стихийной формулы
    let rankPercent = 0;
    if (!spell.formula && spellFormulas && spell.element && spellFormulas[spell.element]?.rankPercents) {
        rankPercent = spellFormulas[spell.element].rankPercents[spell.rank] ?? 0;
    }
    const vars = {
        M: s.magicDmg ?? 0,
        P: s.physDmg ?? 0,
        x,
        str: s.str ?? 0,
        agi: s.agility ?? 0,
        int: s.intellect ?? 0,
        topStat: Math.max(s.str ?? 0, s.agility ?? 0, s.intellect ?? 0),
        armor: s.armor ?? 0,
        speed: s.haste ?? 0,
        mastery: s.mastery ?? 0,
        crit: s.crit ?? 0,
        critDmg: s.critDmg ?? 0,
        crit_chance: s.crit ?? 0,
        crit_damage: s.critDmg ?? 0,
        hp: s.hp ?? 0,
        maxHp: s.maxHp ?? s.hp ?? 0,
        hpRegen: s.hpRegen ?? 0,
        mp: s.manaPool ?? 0,
        mpRegen: s.mpRegen ?? 0,
        stamina: s.stamina ?? 0,
        staminaRegen: s.staminaRegen ?? 0,
        energyRegen: s.energyRegen ?? 0,
        moveSpeed: s.moveSpeed ?? 0,
        magicResist: s.magicResist ?? 0,
        physVamp: s.physVamp ?? 0,
        magicVamp: s.magicVamp ?? 0,
        manaPool: s.manaPool ?? 0,
        cooldown: s.cooldown ?? 0,
        spellRadius: s.spellRadius ?? 100,
        haste: s.haste ?? 0,
        resistance: s.magicResist ?? 0,
        mana_regen: s.mpRegen ?? 0,
        energy_amount: s.energyRegen ?? 0,
        energy_recovery: s.energyRegen ?? 0,
        lifesteal: s.physVamp ?? 0,
        current_energy: (s.energyRegen ?? 0) * 100,
        Agility: s.agility ?? 0,
    };
    // Substitute identifiers with their numeric values.
    // Replace longer names first to avoid partial overlaps (e.g. crit_chance vs crit).
    let expr = formula;
    const names = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const name of names) {
        const re = new RegExp(`\\b${name}\\b`, 'g');
        expr = expr.replace(re, `(${vars[name]})`);
    }
    try {
        const val = evaluateFormula(expr);
        if (typeof val === 'number' && isFinite(val)) {
            // Применяем процент надбавки ранга: итог = базовая × (1 + процент/100)
            return val * (1 + rankPercent / 100);
        }
        return null;
    }
    catch {
        return null;
    }
}
/* ════════════════ Accessory icon helper ════════════════ */
// IconImg-like helper for ArmoryPage — handles dataURL or 'indexeddb:KEY' icons.
const AccessoryIconImg = ({ icon, fallback, alt, style }) => {
    const isIndexedDb = icon && typeof icon === 'string' && icon.startsWith('indexeddb:');
    const key = isIndexedDb ? icon.slice('indexeddb:'.length) : null;
    const dbIcon = useIcon(key);
    const src = isIndexedDb ? dbIcon : icon;
    if (src)
        return <img src={src} alt={alt || ''} style={style}/>;
    return fallback || null;
};
/* ════════════════ Accessory picker modal (reusable) ════════════════ */
// Props: open, onClose, onPick, options, title, excludeIds
// Renders a modal via createPortal with search + grid of items/charms.
const AccessoryPickerModal = ({ open, onClose, onPick, options, title, excludeIds = [] }) => {
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statFilter, setStatFilter] = useState('all');
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset picker filters when the dialog opens.
            setQuery('');
            setTypeFilter('all');
            setStatFilter('all');
        }
    }, [open]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const excl = excludeIds.map((x) => String(x));
        return (options || []).filter((o) => {
            if (excl.includes(String(o.id)))
                return false;
            if (typeFilter !== 'all' && o.type !== typeFilter)
                return false;
            if (statFilter !== 'all') {
                const sv = o.stats?.[statFilter];
                if (!sv || parseFloat(String(sv).replace(',', '.')) <= 0)
                    return false;
            }
            if (!q)
                return true;
            return (String(o.name).toLowerCase().includes(q) ||
                String(o.id).includes(q) ||
                (o.desc ? String(o.desc).toLowerCase().includes(q) : false) ||
                (o.type ? String(o.type).toLowerCase().includes(q) : false));
        });
    }, [options, query, excludeIds, typeFilter, statFilter]);
    if (!open || typeof document === 'undefined')
        return null;
    return createPortal(<div onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 9000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
        }}>
      <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '760px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
        }}>
        {/* Header */}
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: NEO.yellow,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gem size={20} strokeWidth={3} style={{ color: NEO.ink }}/>
            <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.125rem', color: NEO.ink, margin: 0 }}>
              {title || 'Выбор предмета'}
            </h3>
          </div>
          <button onClick={onClose} style={{
            display: 'inline-flex', padding: '4px',
            backgroundColor: NEO.red, color: '#fff',
            border: `2px solid ${NEO.ink}`, cursor: 'pointer',
        }}>
            <X size={16} strokeWidth={3}/>
          </button>
        </div>

        {/* Search + Clear + result count */}
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '10px',
            padding: '14px 18px',
            borderBottom: `2px solid ${NEO.ink}`,
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <Search size={16} strokeWidth={2.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
              <NeoInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию, ID, описанию, типу…" style={{ paddingLeft: '36px' }}/>
            </div>
            <button onClick={() => { onPick(''); }} style={{
            padding: '10px 14px',
            backgroundColor: NEO.bg, color: NEO.ink,
            border: `3px solid ${NEO.ink}`,
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '12px', fontWeight: 800, cursor: 'pointer',
            boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
        }}>
              Очистить слот
            </button>
            <span style={{
            padding: '6px 10px',
            backgroundColor: NEO.ink, color: NEO.yellow,
            border: `2px solid ${NEO.ink}`,
            fontFamily: 'monospace', fontSize: '11px', fontWeight: 800,
            flexShrink: 0,
        }}>
              {filtered.length}
            </span>
          </div>

          {/* Type filter chips */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: '6px' }}>Тип</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {['all', 'Базовый аксессуар', 'Сборный артефакт'].map(t => (<button key={t} onClick={() => setTypeFilter(t)} style={{
                padding: '4px 10px', fontSize: '10px', fontWeight: 700,
                backgroundColor: typeFilter === t ? NEO.lime : NEO.bg,
                color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer',
            }}>
                  {t === 'all' ? 'Все' : t === 'Базовый аксессуар' ? 'Базовые' : 'Артефакты'}
                </button>))}
            </div>
          </div>

          {/* Stat filter chips */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: '6px' }}>Характеристика</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => setStatFilter('all')} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, backgroundColor: statFilter === 'all' ? NEO.ink : NEO.bg, color: statFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
              {Object.keys(STAT_DEF).filter(k => !['magicDmg', 'physDmg', 'hp'].includes(k)).map(key => {
            const def = STAT_DEF[key];
            return (<button key={key} onClick={() => setStatFilter(statFilter === key ? 'all' : key)} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, backgroundColor: statFilter === key ? NEO.lime : NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>
                    {def.label}
                  </button>);
        })}
            </div>
          </div>
        </div>

        {/* Items grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {filtered.length === 0 ? (<p style={{ textAlign: 'center', padding: '32px', color: NEO.muted, fontSize: '14px', fontWeight: 600 }}>
              Ничего не найдено.
            </p>) : (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {filtered.map((o) => (<button key={o.id} onClick={() => onPick(o.id)} style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    padding: '10px',
                    backgroundColor: NEO.bg,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${NEO.ink}`; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, overflow: 'hidden' }}>
                      <AccessoryIconImg icon={o.icon} alt={o.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Gem size={20} strokeWidth={2.5} style={{ color: NEO.lime }}/>}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '9px', color: NEO.muted, fontWeight: 700 }}>#{o.id}</div>
                      <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '12px', color: NEO.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</div>
                    </div>
                  </div>
                  {o.stats && Object.keys(o.stats).length > 0 ? (<div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {Object.entries(o.stats).slice(0, 4).map(([k, v]) => {
                        const num = parseFloat(String(v).replace(',', '.')) || 0;
                        if (!v || num <= 0)
                            return null;
                        const def = STAT_DEF[k];
                        const Icon = def?.icon || Activity;
                        const col = statColor(k);
                        return (<span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '1px 5px', fontSize: '9px', fontWeight: 700, backgroundColor: col, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>
                            <Icon size={9} strokeWidth={2.5}/>
                            {def?.label || k}
                          </span>);
                    })}
                    </div>) : o.desc ? (<p style={{ margin: 0, fontSize: '10px', color: NEO.muted, fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {o.desc}
                    </p>) : null}
                </button>))}
            </div>)}
        </div>
      </div>
    </div>, document.body);
};
/* ════════════════ AccessoryCell — square or row cell that opens picker modal ════════════════ */
// Replaces CustomSelect for accessory / charm selection. Clicking opens a modal picker.
const AccessoryCell = ({ variant = 'default', index, value, onChange, options, emptyLabel, disabled, title, accent, onHoverItem, excludeIds }) => {
    const [open, setOpen] = useState(false);
    const selected = (options || []).find((o) => String(o.id) === String(value));
    const handleEnter = (e) => {
        if (selected && onHoverItem)
            onHoverItem(selected.id, e);
        if (!disabled) {
            e.currentTarget.style.transform = 'translate(2px, 2px)';
            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`;
        }
    };
    const handleLeave = (e) => {
        if (onHoverItem)
            onHoverItem(null, e);
        if (!disabled) {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = selected ? `3px 3px 0px 0px ${NEO.ink}` : 'none';
        }
    };
    const handleMove = (e) => {
        if (selected && !open && onHoverItem)
            onHoverItem(selected.id, e);
    };
    const handleClick = () => {
        if (disabled)
            return;
        setOpen(true);
        if (onHoverItem)
            onHoverItem(null);
    };
    const handlePick = (id) => {
        onChange(id);
        setOpen(false);
    };
    if (variant === 'square') {
        return (<div style={{ position: 'relative', width: '100%' }}>
        <div onMouseEnter={handleEnter} onMouseLeave={handleLeave} onMouseMove={handleMove} onClick={handleClick} style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                backgroundColor: selected ? (accent || NEO.yellow) : NEO.bg,
                border: `3px solid ${NEO.ink}`,
                boxShadow: selected ? `3px 3px 0px 0px ${NEO.ink}` : 'none',
                transition: 'transform 0.1s, box-shadow 0.1s',
                overflow: 'hidden',
            }}>
          {selected ? (<>
              <div style={{ width: '60%', height: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AccessoryIconImg icon={selected.icon} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', boxSizing: 'border-box' }} fallback={<Gem size={22} strokeWidth={2.5} style={{ color: NEO.ink }}/>}/>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 800, color: NEO.ink }}>#{selected.id}</span>
            </>) : disabled ? (<Lock size={18} strokeWidth={2.5} style={{ color: NEO.faint }}/>) : (<span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: NEO.muted }}>+{index}</span>)}
        </div>
        <AccessoryPickerModal open={open} onClose={() => setOpen(false)} onPick={handlePick} options={options} title={title} excludeIds={excludeIds}/>
      </div>);
    }
    // variant === 'default' (rectangle row)
    return (<div style={{ position: 'relative', width: '100%' }}>
      <div onMouseEnter={handleEnter} onMouseLeave={handleLeave} onMouseMove={handleMove} onClick={handleClick} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px',
            backgroundColor: NEO.bg,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            fontSize: '12px', color: NEO.ink, fontWeight: 600,
            fontFamily: '"Space Grotesk", sans-serif',
            transition: 'transform 0.1s, box-shadow 0.1s',
        }}>
        <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? (accent || NEO.lime) : NEO.surface, border: `2px solid ${NEO.ink}`, overflow: 'hidden' }}>
          {selected ? (<AccessoryIconImg icon={selected.icon} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', boxSizing: 'border-box' }} fallback={accent === NEO.pink
                ? <Sparkles size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                : <Gem size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/>}/>) : accent === NEO.pink ? (<Sparkles size={14} strokeWidth={2.5} style={{ color: NEO.faint }}/>) : (<Gem size={14} strokeWidth={2.5} style={{ color: NEO.faint }}/>)}
        </div>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? `[ID: ${selected.id}] ${selected.name}` : emptyLabel}
        </span>
        <ChevronRight size={14} strokeWidth={3} style={{ color: NEO.muted }}/>
      </div>
      <AccessoryPickerModal open={open} onClose={() => setOpen(false)} onPick={handlePick} options={options} title={title} excludeIds={excludeIds}/>
    </div>);
};
/* ════════════════ Accessory detail modal (read-only) ════════════════ */
// Used by AccessoryDisplaySection (Task 3) — shows accessory stats/desc, no delete button.
const AccessoryDetailModal = ({ item, onClose, stats }) => {
    if (!item)
        return null;
    if (typeof document === 'undefined')
        return null;
    const isArtifact = item.type === 'Сборный артефакт';
    const headerCol = isArtifact ? NEO.yellow : NEO.lime;
    const desc = stats ? evalDescription(item.desc, stats) : item.desc;
    return createPortal(<div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: NEO.surface, border: `4px solid ${NEO.ink}`,
            boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            width: 'calc(100% - 32px)', maxWidth: 560, maxHeight: '85vh',
            overflow: 'auto', position: 'relative', margin: 'auto', marginTop: '7vh',
        }}>
        {/* Sticky header with item color */}
        <div style={{
            backgroundColor: headerCol, color: NEO.ink,
            padding: '16px 20px', borderBottom: `3px solid ${NEO.ink}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
            position: 'sticky', top: 0, zIndex: 2,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', opacity: 0.7 }}>#{item.id}</span>
              {item.type && (<span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{item.type}</span>)}
              {item.rarity && (<span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', backgroundColor: rarityColor(item.rarity), color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{item.rarity}</span>)}
            </div>
            <h2 style={{ margin: 0, fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1.1 }}>{item.name}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, flexShrink: 0, backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} strokeWidth={2.5}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Icon */}
          <div style={{ width: 80, height: 80, backgroundColor: NEO.bg, border: `3px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <AccessoryIconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', boxSizing: 'border-box' }} fallback={<Gem size={40} strokeWidth={2.5} style={{ color: headerCol }}/>}/>
          </div>

          {/* Description */}
          {item.desc && (<div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Описание</div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: NEO.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{desc}</p>
            </div>)}

          {/* Stats */}
          {item.stats && Object.keys(item.stats).length > 0 && (<div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 8 }}>Характеристики</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(item.stats).filter(([k, v]) => v !== 0 && v !== '' && v != null).map(([key, value]) => {
                const def = STAT_DEF[key];
                const Icon = def?.icon || Activity;
                const col = statColor(key);
                return (<span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, backgroundColor: col, color: NEO.ink, border: `2px solid ${NEO.ink}` }}>
                      <Icon size={11} strokeWidth={2.5}/>
                      {def?.label || key}: <span style={{ fontFamily: '"Archivo Black", sans-serif' }}>{def?.prefix || '+'}{value}{def?.suffix || ''}</span>
                    </span>);
            })}
              </div>
            </div>)}

          {/* Raw stats (fallback for items without parsed stats) */}
          {!item.stats && item.rawStats && (<div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Характеристики</div>
              <span style={{ display: 'block', padding: '6px 8px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontFamily: 'monospace', fontSize: '10px', color: NEO.muted, wordBreak: 'break-word' }}>{item.rawStats}</span>
            </div>)}

          {/* Recipe (artifact) */}
          {isArtifact && item.recipe && (<div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Рецепт</div>
              <div style={{ padding: '8px 12px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: NEO.ink }}>{item.recipe}</div>
            </div>)}

          {/* Read-only notice */}
          <div style={{ padding: '10px 12px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontSize: '11px', fontWeight: 700, color: NEO.muted, textAlign: 'center' }}>
            🔧 Аксессуар настраивается в блоке «Сборка Экипировки» ниже
          </div>
        </div>
      </div>
    </div>, document.body);
};
/* ════════════════ AccessoryDisplaySection (6 read-only cells, Task 3) ════════════════ */
// Renders 6 cells (acc1, acc2, gemAcc1-4) with read-only detail modals.
const AccessoryDisplaySection = ({ items, gemLevel, compact }) => {
    const [detailAcc, setDetailAcc] = useState(null);
    // items: [acc1, acc2, gAcc1, gAcc2, gAcc3, gAcc4]
    const filledCount = (items || []).filter(Boolean).length;
    return (<div style={compact ? { flex: '0 0 auto' } : undefined}>
      {!compact && (<>
          <PanelTitle icon={Gem} accent={NEO.lime}>
            Аксессуары ({filledCount} / 6)
          </PanelTitle>
          <p style={{ marginTop: '-8px', marginBottom: '14px', fontSize: '12px', color: NEO.muted, fontWeight: 600 }}>
            Клик по заполненной ячейке — открыть описание предмета. Сами аксессуары настраиваются в блоке «Сборка Экипировки» ниже.
          </p>
        </>)}

      <div style={compact ? {
            display: 'flex', flexDirection: 'row', gap: '8px',
            flexWrap: 'nowrap',
            alignItems: 'center',
        } : {
            display: 'flex', flexDirection: 'row', gap: '8px',
            padding: '12px',
            backgroundColor: NEO.bg,
            border: `3px solid ${NEO.ink}`,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            alignItems: 'flex-start',
        }}>
        {(items || []).map((item, idx) => {
            const isGem = idx >= 2;
            const gemLocked = isGem && gemLevel < 9;
            const cellLabel = isGem ? `К${idx - 1}` : `А${idx + 1}`;
            const cellCol = isGem ? NEO.cyan : NEO.lime;
            return (<div key={`acc-cell-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 64 }}>
              {item ? (<>
                  {/* Filled cell */}
                  <div onClick={() => setDetailAcc({ item, idx })} title={`${item.name} — клик для описания`} style={{
                        position: 'relative',
                        width: 64, height: 64,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: NEO.surface,
                        border: `3px solid ${NEO.ink}`,
                        boxShadow: `3px 3px 0px 0px ${cellCol}`,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        transition: 'transform 0.1s',
                    }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; }}>
                    {/* Slot label badge */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0,
                        padding: '1px 4px',
                        backgroundColor: cellCol, color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        fontFamily: '"Archivo Black", sans-serif', fontSize: '9px',
                        lineHeight: 1,
                    }}>
                      {cellLabel}
                    </div>
                    <AccessoryIconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', boxSizing: 'border-box' }} fallback={<Gem size={26} strokeWidth={2.5} style={{ color: cellCol }}/>}/>
                  </div>
                  {/* ID badge */}
                  <div style={{
                        marginTop: '4px',
                        padding: '1px 4px',
                        backgroundColor: NEO.ink,
                        color: NEO.yellow,
                        border: `2px solid ${NEO.ink}`,
                        fontFamily: 'monospace', fontSize: '10px', fontWeight: 800,
                        minWidth: 56, textAlign: 'center', lineHeight: 1.2,
                    }}>
                    #{item.id}
                  </div>
                  {/* Name */}
                  <div style={{
                        marginTop: '3px',
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontSize: '9px', color: NEO.muted, fontWeight: 700,
                        textAlign: 'center', lineHeight: 1.1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        width: '100%',
                    }} title={item.name}>
                    {item.name}
                  </div>
                </>) : (<>
                  {/* Empty cell */}
                  <div style={{
                        width: 64, height: 64,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                        backgroundColor: NEO.bg,
                        border: `3px dashed ${gemLocked ? NEO.faint : NEO.ink}`,
                        opacity: gemLocked ? 0.5 : 1,
                        position: 'relative',
                    }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0,
                        padding: '1px 4px',
                        backgroundColor: gemLocked ? NEO.faint : cellCol, color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        fontFamily: '"Archivo Black", sans-serif', fontSize: '9px',
                        lineHeight: 1,
                    }}>
                      {cellLabel}
                    </div>
                    {gemLocked ? (<Lock size={14} strokeWidth={2.5} style={{ color: NEO.faint }}/>) : (<Plus size={14} strokeWidth={2.5} style={{ color: NEO.muted }}/>)}
                  </div>
                  <div style={{
                        marginTop: '4px',
                        padding: '1px 4px',
                        backgroundColor: NEO.bg,
                        color: NEO.faint,
                        border: `2px solid ${NEO.faint}`,
                        fontFamily: 'monospace', fontSize: '10px', fontWeight: 800,
                        minWidth: 56, textAlign: 'center', lineHeight: 1.2,
                    }}>
                    —
                  </div>
                  <div style={{ marginTop: '3px', height: '11px', width: '100%' }}/>
                </>)}
            </div>);
        })}
      </div>

      {/* Read-only detail modal */}
      {detailAcc && (<AccessoryDetailModal item={detailAcc.item} onClose={() => setDetailAcc(null)} stats={null}/>)}
    </div>);
};
/* ════════════════ Abilities picker modal ════════════════ */
const SpellPickerModal = ({ open, onClose, onPick, excludeIds, stats }) => {
    const spells = useCollection('DB_SPELLS', DB_SPELLS);
    const spellFormulas = useCollection('SPELL_FORMULAS', DEFAULT_SPELL_FORMULAS);
    const [query, setQuery] = useState('');
    const [elemFilter, setElemFilter] = useState('all');
    const [rankFilter, setRankFilter] = useState('all');
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset picker filters when the dialog opens.
            setQuery('');
            setElemFilter('all');
            setRankFilter('all');
        }
    }, [open]);
    const elements = useMemo(() => {
        const set = new Set();
        spells.forEach((sp) => { if (sp.element)
            set.add(sp.element); });
        return Array.from(set);
    }, [spells]);
    const ranks = ['D', 'DD', 'C', 'CC', 'B', 'BB', 'A', 'AA', 'S', 'SS'];
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return spells.filter((sp) => {
            if (!sp.rank)
                return false;
            if (excludeIds.includes(sp.id))
                return false;
            if (elemFilter !== 'all' && sp.element !== elemFilter)
                return false;
            if (rankFilter !== 'all' && sp.rank !== rankFilter)
                return false;
            if (q) {
                const name = String(sp.name).toLowerCase();
                const desc = String(sp.desc || '').toLowerCase();
                const elem = String(sp.element || '').toLowerCase();
                const rank = String(sp.rank || '').toLowerCase();
                if (!name.includes(q) && !desc.includes(q) && !elem.includes(q) && !rank.includes(q))
                    return false;
            }
            return true;
        });
    }, [spells, query, elemFilter, rankFilter, excludeIds]);
    if (!open || typeof document === 'undefined')
        return null;
    return createPortal(<div onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            zIndex: 9000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
        }}>
      <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '720px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
        }}>
        {/* Modal header */}
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: NEO.yellow,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} strokeWidth={3} style={{ color: NEO.ink }}/>
            <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.125rem', color: NEO.ink, margin: 0 }}>
              Выбор заклинания
            </h3>
          </div>
          <button onClick={onClose} style={{
            display: 'inline-flex', padding: '4px',
            backgroundColor: NEO.red, color: '#fff',
            border: `2px solid ${NEO.ink}`, cursor: 'pointer',
        }}>
            <X size={16} strokeWidth={3}/>
          </button>
        </div>

        {/* Filters */}
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '10px',
            padding: '14px 18px',
            borderBottom: `2px solid ${NEO.ink}`,
        }}>
          {/* Search row + result count */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <Search size={16} strokeWidth={2.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
              <NeoInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по названию, описанию, стихии, рангу…" style={{ paddingLeft: '36px' }}/>
            </div>
            <span style={{
            padding: '6px 10px',
            backgroundColor: NEO.ink, color: NEO.yellow,
            border: `2px solid ${NEO.ink}`,
            fontFamily: 'monospace', fontSize: '11px', fontWeight: 800,
            flexShrink: 0,
        }}>
              {filtered.length}
            </span>
          </div>

          {/* Element chips */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: '6px' }}>Стихия / Оружие</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => setElemFilter('all')} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, backgroundColor: elemFilter === 'all' ? NEO.ink : NEO.bg, color: elemFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
              {elements.map(el => (<button key={el} onClick={() => setElemFilter(elemFilter === el ? 'all' : el)} style={{
                padding: '4px 10px', fontSize: '10px', fontWeight: 700,
                backgroundColor: elemFilter === el ? (ELEMENT_COLOR[el] || NEO.cyan) : NEO.bg,
                color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer',
            }}>
                  {el}
                </button>))}
            </div>
          </div>

          {/* Rank chips */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: '6px' }}>Ранг</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => setRankFilter('all')} style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, backgroundColor: rankFilter === 'all' ? NEO.ink : NEO.bg, color: rankFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
              {ranks.map(r => (<button key={r} onClick={() => setRankFilter(rankFilter === r ? 'all' : r)} style={{
                padding: '4px 10px', fontSize: '10px', fontWeight: 700,
                backgroundColor: rankFilter === r ? NEO.yellow : NEO.bg,
                color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer',
            }}>
                  {r}
                </button>))}
            </div>
          </div>

          {/* Reset all */}
          {(elemFilter !== 'all' || rankFilter !== 'all') && (<button onClick={() => { setElemFilter('all'); setRankFilter('all'); }} style={{
                padding: '4px 12px', fontSize: '10px', fontWeight: 700,
                backgroundColor: NEO.ink, color: NEO.yellow,
                border: `2px solid ${NEO.ink}`, cursor: 'pointer',
                alignSelf: 'flex-start',
            }}>
              Сбросить фильтры
            </button>)}
        </div>

        {/* Spell list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (<p style={{ textAlign: 'center', padding: '32px', color: NEO.muted, fontSize: '14px', fontWeight: 600 }}>
              Ничего не найдено.
            </p>) : (filtered.map((sp) => {
            const dmg = calcSpellDamage(sp, stats, spellFormulas);
            const col = elementColor(sp.element);
            return (<button key={sp.id} onClick={() => onPick(sp.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '12px 14px', marginBottom: '6px',
                    backgroundColor: NEO.bg,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(2px, 2px)'; e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${NEO.ink}`; }}>
                  {/* Rank badge */}
                  <div style={{
                    width: 36, height: 36, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: col, color: NEO.ink,
                    border: `2px solid ${NEO.ink}`,
                    fontFamily: '"Archivo Black", sans-serif', fontSize: '12px',
                }}>
                    {sp.rank}
                  </div>
                  {/* Name + element */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '13px', color: NEO.ink }}>
                        {sp.name}
                      </span>
                      {sp.element && (<span style={{
                        padding: '2px 6px',
                        backgroundColor: col, color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        fontSize: '10px', fontWeight: 800,
                    }}>
                          {sp.element}
                        </span>)}
                      {sp.manaCost && (<span style={{ fontFamily: 'monospace', fontSize: '10px', color: NEO.cyanDark, fontWeight: 800 }}>
                          💧 {sp.manaCost}
                        </span>)}
                    </div>
                    <p style={{
                    margin: '4px 0 0', fontSize: '11px', color: NEO.muted, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                      {evalDescription(sp.desc, stats)}
                    </p>
                  </div>
                  {/* Damage preview */}
                  <div style={{
                    flexShrink: 0, textAlign: 'right',
                    padding: '4px 10px',
                    backgroundColor: NEO.ink, color: NEO.lime,
                    border: `2px solid ${NEO.ink}`,
                    fontFamily: 'monospace', fontSize: '12px', fontWeight: 800,
                    minWidth: 80,
                }}>
                    {dmg !== null ? `≈ ${dmg.toFixed(0)}` : '—'}
                  </div>
                </button>);
        }))}
        </div>
      </div>
    </div>, document.body);
};
/* ════════════════ Abilities section (1 row × 9 small slots) ════════════════ */
const AbilitiesSection = ({ abilities, onChange, stats, isSelf, compact }) => {
    const spells = useCollection('DB_SPELLS', DB_SPELLS);
    const spellFormulas = useCollection('SPELL_FORMULAS', DEFAULT_SPELL_FORMULAS);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSlot, setPickerSlot] = useState(null);
    const [detailSpell, setDetailSpell] = useState(null); // спелл для показа в окне описания
    // Always render 9 slots — empty slots are null in the array.
    const slots = Array.from({ length: 9 }, (_, i) => {
        const id = abilities[i];
        if (!id)
            return null;
        return spells.find((sp) => sp.id === id) || null;
    });
    const openPicker = (idx) => {
        if (!isSelf)
            return;
        setPickerSlot(idx);
        setPickerOpen(true);
    };
    const handlePick = (spellId) => {
        if (pickerSlot === null)
            return;
        const next = [...abilities];
        // Place spell into the chosen slot (overwrite if filled).
        next[pickerSlot] = spellId;
        // Trim trailing empties, keep array length ≤ 9.
        const cleaned = Array.from({ length: 9 }, (_, i) => next[i] ?? null);
        onChange(cleaned);
        setPickerOpen(false);
        setPickerSlot(null);
    };
    const handleRemove = (idx) => {
        if (!isSelf)
            return;
        const next = [...abilities];
        next[idx] = null;
        onChange(next);
    };
    const filledCount = abilities.filter(Boolean).length;
    return (<div style={compact ? { flex: '0 0 auto' } : undefined}>
      {!compact && (<>
          <PanelTitle icon={BookOpen} accent={NEO.yellow}>
            Способности ({filledCount} / 9)
          </PanelTitle>
          <p style={{ marginTop: '-8px', marginBottom: '14px', fontSize: '12px', color: NEO.muted, fontWeight: 600 }}>
            Клик по пустому слоту — выбрать заклинание. Клик по заполненному — открыть описание. Расчёт урона по формулам заклинаний (M = маг. урон, P = физ. урон, x = множитель ранга).
          </p>
        </>)}

      <div style={compact ? {
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            flexWrap: 'nowrap',
            alignItems: 'center',
        } : {
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            padding: '12px',
            backgroundColor: NEO.bg,
            border: `3px solid ${NEO.ink}`,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            alignItems: 'center',
        }}>
        {slots.map((spell, idx) => {
            if (spell) {
                const dmg = calcSpellDamage(spell, stats, spellFormulas);
                const col = elementColor(spell.element);
                return (<div key={`ab-${idx}`} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        flexShrink: 0, width: 64,
                    }}>
                {/* Square cell */}
                <div onClick={() => setDetailSpell({ spell, idx })} title={isSelf ? `${spell.name} — клик для описания` : spell.name} style={{
                        position: 'relative',
                        width: 64, height: 64,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: NEO.surface,
                        border: `3px solid ${NEO.ink}`,
                        boxShadow: `3px 3px 0px 0px ${col}`,
                        cursor: isSelf ? 'pointer' : 'default',
                        overflow: 'hidden',
                        transition: 'transform 0.1s',
                    }} onMouseEnter={(e) => { if (isSelf)
                    e.currentTarget.style.transform = 'translate(2px, 2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; }}>
                  {/* Rank badge */}
                  <div style={{
                        position: 'absolute', top: 0, left: 0,
                        padding: '1px 4px',
                        backgroundColor: col, color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        fontFamily: '"Archivo Black", sans-serif', fontSize: '9px',
                        lineHeight: 1,
                    }}>
                    {spell.rank}
                  </div>
                  {/* Remove hint */}
                  {isSelf && (<div style={{
                            position: 'absolute', top: 2, right: 2,
                            padding: '1px',
                            backgroundColor: NEO.red, color: '#fff',
                            border: `1px solid ${NEO.ink}`,
                        }}>
                      <X size={9} strokeWidth={3}/>
                    </div>)}
                  {/* Spell icon / element emoji fallback */}
                  <AccessoryIconImg icon={spell.icon} alt={spell.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<span style={{ fontSize: '24px', lineHeight: 1, userSelect: 'none' }}>{(spell.element || '✦').slice(0, 2)}</span>}/>
                </div>
                {/* Damage number under cell */}
                <div style={{
                        marginTop: '4px',
                        padding: '1px 4px',
                        backgroundColor: NEO.ink,
                        color: dmg !== null ? NEO.lime : NEO.faint,
                        border: `2px solid ${NEO.ink}`,
                        fontFamily: 'monospace', fontSize: '10px', fontWeight: 800,
                        minWidth: 56, textAlign: 'center',
                        lineHeight: 1.2,
                    }}>
                  {dmg !== null ? `≈ ${dmg.toFixed(0)}` : '—'}
                </div>
                {/* Spell name (small, ellipsis) */}
                <div style={{
                        marginTop: '3px',
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontSize: '9px', color: NEO.muted, fontWeight: 700,
                        textAlign: 'center', lineHeight: 1.1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        width: '100%',
                    }} title={spell.name}>
                  {spell.name}
                </div>
              </div>);
            }
            // Empty slot
            return (<div key={`ab-empty-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 64 }}>
              <button onClick={() => openPicker(idx)} disabled={!isSelf} style={{
                    width: 64, height: 64,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '2px',
                    backgroundColor: NEO.bg,
                    border: `3px dashed ${NEO.ink}`,
                    cursor: isSelf ? 'pointer' : 'not-allowed',
                    opacity: isSelf ? 1 : 0.5,
                    transition: 'transform 0.1s, background 0.1s',
                }} onMouseEnter={(e) => { if (isSelf) {
                e.currentTarget.style.transform = 'translate(2px, 2px)';
                e.currentTarget.style.backgroundColor = NEO.lime;
            } }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translate(0, 0)'; e.currentTarget.style.backgroundColor = NEO.bg; }}>
                <BookOpen size={14} strokeWidth={2.5} style={{ color: NEO.muted }}/>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: NEO.muted, fontWeight: 800 }}>
                  +{idx + 1}
                </span>
              </button>
              {/* Damage placeholder (keeps row aligned) */}
              <div style={{
                    marginTop: '4px',
                    padding: '1px 4px',
                    backgroundColor: NEO.bg,
                    color: NEO.faint,
                    border: `2px solid ${NEO.faint}`,
                    fontFamily: 'monospace', fontSize: '10px', fontWeight: 800,
                    minWidth: 56, textAlign: 'center',
                    lineHeight: 1.2,
                }}>
                —
              </div>
              {/* Spacer to match filled-cell name row */}
              <div style={{ marginTop: '3px', height: '11px', width: '100%' }}/>
            </div>);
        })}
      </div>

      <SpellPickerModal open={pickerOpen} onClose={() => { setPickerOpen(false); setPickerSlot(null); }} onPick={handlePick} excludeIds={abilities} stats={stats}/>

      {/* Модалка описания заклинания (как в Базе знаний + кнопка удаления) */}
      {detailSpell && typeof document !== 'undefined' && createPortal(<div onClick={() => setDetailSpell(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: NEO.surface, border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`, width: 'calc(100% - 32px)', maxWidth: 560, maxHeight: '85vh', overflow: 'auto', position: 'relative', margin: 'auto', marginTop: '7vh' }}>
            {(() => {
                const sp = detailSpell.spell;
                const elemCol = elementColor(sp.element);
                const dmg = calcSpellDamage(sp, stats, spellFormulas);
                const desc = stats ? evalDescription(sp.desc, stats) : sp.desc;
                return (<>
                  <div style={{ backgroundColor: elemCol, color: NEO.ink, padding: '16px 20px', borderBottom: `3px solid ${NEO.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'sticky', top: 0, zIndex: 2 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', opacity: 0.7 }}>#{sp.id}</span>
                        {sp.rank && <span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{sp.rank}</span>}
                        {sp.element && <span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{sp.element}</span>}
                      </div>
                      <h2 style={{ margin: 0, fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1.1 }}>{sp.name}</h2>
                    </div>
                    <button onClick={() => setDetailSpell(null)} style={{ width: 32, height: 32, flexShrink: 0, backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} strokeWidth={2.5}/></button>
                  </div>
                  <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {sp.desc && <div><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Описание</div><p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: NEO.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{desc}</p></div>}
                    {dmg !== null && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Урон за удар</div><div style={{ fontSize: 20, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif', color: NEO.limeDark }}>≈ {dmg.toFixed(0)}</div></div>
                      <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Стихия</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{sp.element || '—'}</div></div>
                    </div>}
                    {(sp.manaCost || sp.castTime || sp.cd || sp.crystalGen || sp.crystalReq) && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                      {sp.manaCost && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Мана</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif', color: NEO.ink }}>{sp.manaCost}</div></div>}
                      {sp.castTime && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Каст</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{sp.castTime}</div></div>}
                      {sp.cd && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>КД</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{sp.cd}</div></div>}
                      {sp.crystalGen && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Генерация кристаллов</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.limeDark }}>{sp.crystalGen}</div></div>}
                      {sp.crystalReq && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Требует кристаллов</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.red }}>{sp.crystalReq}</div></div>}
                    </div>}
                    {isSelf && (<NeoButton variant="red" onClick={() => { handleRemove(detailSpell.idx); setDetailSpell(null); }}>
                        <X size={16} strokeWidth={3}/> Удалить из ячейки
                      </NeoButton>)}
                  </div>
                </>);
            })()}
          </div>
        </div>, document.body)}
    </div>);
};
/* ════════════════ Calculator tab ════════════════ */
const CalculatorTab = ({ initialData, isSelf, armory: armoryProp }) => {
    // Per-user armory: load saved state from the currently logged in user (for self)
    // OR from the searched user's savedArmory (for non-self view-only).
    const currentUser = useCurrentUser();
    const [search] = useSearchParams();
    const sharedBuild = useMemo(() => isSelf ? decodeBuild(search.get('build')) : null, [isSelf, search]);
    const savedArmory = sharedBuild || (isSelf ? currentUser?.savedArmory : armoryProp) || null;
    const [armorType, setArmorType] = useState(savedArmory?.armorType ?? initialData?.armorType ?? 'plates');
    const [gemLevel, setGemLevel] = useState(savedArmory?.gemLevel ?? initialData?.gemLevel ?? 0);
    const [stats, setStats] = useState(savedArmory?.stats ?? initialData?.stats ?? { str: 0, agi: 0, int: 0, speedPoints: 0 });
    // savedArmory.accessories is a flat array: [acc1, acc2, gemAcc1, gemAcc2, gemAcc3, gemAcc4]
    // Use `??` so empty strings saved by the user are preserved (don't fall back to initialData).
    const [acc1Id, setAcc1Id] = useState(savedArmory?.accessories?.[0] ?? initialData?.acc1Id ?? '');
    const [acc2Id, setAcc2Id] = useState(savedArmory?.accessories?.[1] ?? initialData?.acc2Id ?? '');
    const [gemAcc1Id, setGemAcc1Id] = useState(savedArmory?.accessories?.[2] ?? initialData?.gemAcc1Id ?? '');
    const [gemAcc2Id, setGemAcc2Id] = useState(savedArmory?.accessories?.[3] ?? initialData?.gemAcc2Id ?? '');
    const [gemAcc3Id, setGemAcc3Id] = useState(savedArmory?.accessories?.[4] ?? initialData?.gemAcc3Id ?? '');
    const [gemAcc4Id, setGemAcc4Id] = useState(savedArmory?.accessories?.[5] ?? initialData?.gemAcc4Id ?? '');
    const [charmId, setCharmId] = useState(savedArmory?.charms?.[0]?.id ?? initialData?.charmId ?? '');
    const [charmLevel, setCharmLevel] = useState(savedArmory?.charms?.[0]?.level ?? initialData?.charmLevel ?? 1);
    const [charmSlots, setCharmSlots] = useState(savedArmory?.charms?.[0]?.slots ?? initialData?.charmSlots ?? ['energyRegen', 'magicDmg', 'physDmg', 'hp']);
    // Modal state for charm: picker (when empty + clicked) and detail (when filled + clicked).
    const [charmPickerOpen, setCharmPickerOpen] = useState(false);
    const [charmDetailOpen, setCharmDetailOpen] = useState(false);
    // Abilities: up to 9 spell IDs, persisted in user.savedArmory.abilities.
    const [abilities, setAbilities] = useState(Array.isArray(savedArmory?.abilities) ? savedArmory.abilities.slice(0, 9) : []);
    const [buildNotice, setBuildNotice] = useState(null);
    const maxPoints = gemLevel * 400;
    const usedPoints = stats.str + stats.agi + stats.int + stats.speedPoints;
    const availPoints = maxPoints - usedPoints;
    const handleGemLevelChange = (nextLevel) => {
        const nextMaxPoints = nextLevel * 400;
        const currentTotal = stats.str + stats.agi + stats.int + stats.speedPoints;
        setGemLevel(nextLevel);
        if (currentTotal > nextMaxPoints) {
            setStats({ str: 0, agi: 0, int: 0, speedPoints: 0 });
        }
        else if (nextLevel < 12 && stats.speedPoints > 0) {
            setStats(prev => ({ ...prev, speedPoints: 0 }));
        }
        if (nextLevel < 9) {
            setGemAcc1Id('');
            setGemAcc2Id('');
            setGemAcc3Id('');
            setGemAcc4Id('');
        }
    };
    const handleStatChange = (statName, newValue) => {
        if (!isSelf)
            return;
        let val = parseInt(newValue) || 0;
        if (val < 0)
            val = 0;
        if (statName === 'speedPoints') {
            val = Math.floor(val / 100) * 100;
        }
        else if (val > STAT_LIMIT) {
            val = STAT_LIMIT;
        }
        const diff = val - stats[statName];
        if (diff > availPoints) {
            val = stats[statName] + availPoints;
            if (statName === 'speedPoints')
                val = Math.floor(val / 100) * 100;
        }
        setStats({ ...stats, [statName]: val });
    };
    const acc1 = dataStore.get('DB_ITEMS').find(i => i.id == acc1Id);
    const acc2 = dataStore.get('DB_ITEMS').find(i => i.id == acc2Id);
    const gAcc1 = dataStore.get('DB_ITEMS').find(i => i.id == gemAcc1Id);
    const gAcc2 = dataStore.get('DB_ITEMS').find(i => i.id == gemAcc2Id);
    const gAcc3 = dataStore.get('DB_ITEMS').find(i => i.id == gemAcc3Id);
    const gAcc4 = dataStore.get('DB_ITEMS').find(i => i.id == gemAcc4Id);
    let accStrPct = 0, accAgiPct = 0, accIntPct = 0, accMana = 0, accStamina = 0;
    let accSpellSpeed = 0, accMastery = 0, accMoveSpeed = 0, accSpellRadius = 0;
    let accHpRegenPct = 0, accMpRegen = 0, accStaminaRegen = 0, accEnergyRegen = 0;
    let accArmorFlat = 0, accMagicResistFlat = 0;
    let accPhysVamp = 0, accMagicVamp = 0, accCrit = 0, accCritDmg = 0;
    let accHpFlat = 0, accPhysDmgFlat = 0, accMagicDmgFlat = 0;
    const activeAccessories = [acc1, acc2];
    if (gemLevel >= 9)
        activeAccessories.push(gAcc1, gAcc2, gAcc3, gAcc4);
    const parseStat = (val) => parseFloat(String(val).replace(',', '.')) || 0;
    activeAccessories.forEach(acc => {
        if (acc && acc.stats) {
            accStrPct += parseStat(acc.stats.str);
            accAgiPct += parseStat(acc.stats.agi);
            accIntPct += parseStat(acc.stats.int);
            accMana += parseStat(acc.stats.manaPool);
            accStamina += parseStat(acc.stats.stamina);
            accSpellSpeed += parseStat(acc.stats.speed);
            accMastery += parseStat(acc.stats.mastery);
            accMoveSpeed += parseStat(acc.stats.moveSpeed);
            accSpellRadius += parseStat(acc.stats.spellRadius);
            accHpRegenPct += parseStat(acc.stats.hpRegen);
            accMpRegen += parseStat(acc.stats.mpRegen);
            accStaminaRegen += parseStat(acc.stats.staminaRegen);
            accEnergyRegen += parseStat(acc.stats.energyRegen);
            accArmorFlat += parseStat(acc.stats.armor);
            accMagicResistFlat += parseStat(acc.stats.magicResist);
            accPhysVamp += parseStat(acc.stats.physVamp);
            accMagicVamp += parseStat(acc.stats.magicVamp);
            accCrit += parseStat(acc.stats.crit);
            accCritDmg += parseStat(acc.stats.critDmg);
            accHpFlat += parseStat(acc.stats.hp);
            accPhysDmgFlat += parseStat(acc.stats.physDmg);
            accMagicDmgFlat += parseStat(acc.stats.magicDmg);
        }
    });
    const selectedCharm = dataStore.get('DB_CHARMS').find(c => c.id.toString() === charmId.toString());
    if (selectedCharm) {
        let tier = 0;
        if (charmLevel >= 15)
            tier = 3;
        else if (charmLevel >= 10)
            tier = 2;
        else if (charmLevel >= 5)
            tier = 1;
        const activeSlots = charmSlots.slice(0, tier + 1);
        activeSlots.forEach(statKey => {
            if (!statKey)
                return;
            const baseVal = parseStat(selectedCharm.stats?.[statKey] ?? CHARM_BASE_STATS[statKey]);
            const totalVal = baseVal * charmLevel;
            if (statKey === 'str')
                accStrPct += totalVal;
            if (statKey === 'agi')
                accAgiPct += totalVal;
            if (statKey === 'int')
                accIntPct += totalVal;
            if (statKey === 'manaPool')
                accMana += totalVal;
            if (statKey === 'stamina')
                accStamina += totalVal;
            if (statKey === 'speed')
                accSpellSpeed += totalVal;
            if (statKey === 'mastery')
                accMastery += totalVal;
            if (statKey === 'moveSpeed')
                accMoveSpeed += totalVal;
            if (statKey === 'spellRadius')
                accSpellRadius += totalVal;
            if (statKey === 'hpRegen')
                accHpRegenPct += totalVal;
            if (statKey === 'mpRegen')
                accMpRegen += totalVal;
            if (statKey === 'staminaRegen')
                accStaminaRegen += totalVal;
            if (statKey === 'energyRegen')
                accEnergyRegen += totalVal;
            if (statKey === 'armor')
                accArmorFlat += totalVal;
            if (statKey === 'magicResist')
                accMagicResistFlat += totalVal;
            if (statKey === 'physVamp')
                accPhysVamp += totalVal;
            if (statKey === 'magicVamp')
                accMagicVamp += totalVal;
            if (statKey === 'crit')
                accCrit += totalVal;
            if (statKey === 'critDmg')
                accCritDmg += totalVal;
            if (statKey === 'hp')
                accHpFlat += totalVal;
            if (statKey === 'physDmg')
                accPhysDmgFlat += totalVal;
            if (statKey === 'magicDmg')
                accMagicDmgFlat += totalVal;
        });
    }
    const baseStr = 10 + stats.str;
    const baseAgi = 10 + stats.agi;
    const baseInt = 10 + stats.int;
    const finalStr = Math.floor(baseStr * (1 + accStrPct / 100));
    const finalAgi = Math.floor(baseAgi * (1 + accAgiPct / 100));
    const finalInt = Math.floor(baseInt * (1 + accIntPct / 100));
    const bonusLevelSum = getBonusLevelsCount(gemLevel) * 10;
    const finalMana = 100 + bonusLevelSum + accMana;
    const finalStamina = 100 + bonusLevelSum + accStamina;
    const finalEnergy = 1000;
    const physDmg = finalStr * (1 + finalAgi * 0.00006 + finalStr * 0.00009) + 9 + accPhysDmgFlat;
    const magicDmg = finalInt * (1 + finalAgi * 0.00006 + finalInt * 0.00009) + 9 + accMagicDmgFlat;
    const spellSpeedFromPoints = (stats.speedPoints / 100) * 4;
    const totalSpellSpeed = spellSpeedFromPoints + accSpellSpeed;
    const cappedSpellSpeed = Math.min(100, totalSpellSpeed);
    const excessSpellSpeed = Math.max(0, totalSpellSpeed - 100);
    const finalMastery = ((finalStr + finalAgi + finalInt) / 1000) + excessSpellSpeed + accMastery;
    const finalGcd = Math.max(0.5, 1.5 - (cappedSpellSpeed * 0.01));
    const sumOfAllStats = finalStr + finalAgi + finalInt;
    const oldHpFormula = 1 + (finalStr / 6) * (1 + finalStamina / 20);
    const finalHp = Math.floor(oldHpFormula + (sumOfAllStats * 0.69)) + accHpFlat;
    const energyRegen = Math.min(finalEnergy * 1, 10 + ((finalAgi * 0.5) * (finalEnergy * 0.01)) / 70) + accEnergyRegen;
    const finalHpRegen = 10 + (finalStr * 0.08) + (finalStamina * 0.15) + accHpRegenPct;
    const finalStaminaRegen = 10 + ((finalHpRegen + ((finalStr * 0.5) * (1 + finalStamina * 0.002))) / 20) + accStaminaRegen;
    const finalMpRegen = 10 + ((finalStaminaRegen * 16 + ((finalInt * 0.5) * (1 + finalMana * 0.002))) / 20) + accMpRegen;
    const finalCrit = 5 + (finalAgi / 32) + accCrit;
    const finalCritDmg = 50 + (finalInt / 14.6) + finalCrit + accCritDmg;
    const selectedArmor = ARMOR_TYPES[armorType];
    const baseArmor = (10 + finalAgi * 0.063) + accArmorFlat;
    const totalArmor = baseArmor * (1 + selectedArmor.armorMult / selectedArmor.armorDivisor);
    const physResistPct = totalArmor <= 350 ? 0.2 * totalArmor : 100 - 30 * Math.pow(0.999235, totalArmor - 350);
    const baseMagicResist = (10 + finalInt * 0.063) + accMagicResistFlat;
    const totalMagicResist = baseMagicResist * (1 + selectedArmor.mrMult / selectedArmor.mrDivisor);
    const magicResistPct = totalMagicResist <= 350 ? 0.2 * totalMagicResist : 100 - 30 * Math.pow(0.999235, totalMagicResist - 350);
    const baseMoveSpeed = 100 + selectedArmor.speed;
    const finalMoveSpeed = Math.floor(baseMoveSpeed + accMoveSpeed + (finalAgi / 30));
    // Радиус заклинаний — базовое значение (позже может быть увеличено аксессуарами).
    const spellRadius = 100 + accSpellRadius;
    const availableAccessories = dataStore.get('DB_ITEMS').filter(i => i.stats);
    const buildPayload = {
        armorType, gemLevel, stats, acc1Id, acc2Id, gemAcc1Id, gemAcc2Id, gemAcc3Id, gemAcc4Id,
        charmId, charmLevel, charmSlots, abilities,
    };
    // Bundle of stats consumed by the spell-formula calculator.
    const spellStats = {
        magicDmg,
        physDmg,
        str: finalStr,
        agi: finalAgi,
        int: finalInt,
        armor: totalArmor,
        speed: cappedSpellSpeed,
        mastery: finalMastery,
        crit: finalCrit,
        critDmg: finalCritDmg,
        hp: finalHp,
        maxHp: finalHp,
        hpRegen: finalHpRegen,
        mp: finalMana,
        mpRegen: finalMpRegen,
        stamina: finalStamina,
        staminaRegen: finalStaminaRegen,
        energyRegen,
        moveSpeed: finalMoveSpeed,
        magicResist: totalMagicResist,
        physVamp: accPhysVamp,
        magicVamp: accMagicVamp,
        manaPool: finalMana,
        cooldown: 0,
        spellRadius: spellRadius,
        haste: cappedSpellSpeed,
        agility: finalAgi,
        intellect: finalInt,
    };
    const showBuildNotice = (message) => { setBuildNotice(message); setTimeout(() => setBuildNotice(null), 2500); };
    // ── Auto-persist per-user armory ───────────────────────────────────
    // Whenever ANY of accessories / charms / abilities / armorType / gemLevel / stats
    // changes for the SELF (logged-in) user, push the full snapshot to authStore.
    // The saveArmory() method merges with any previously saved armory, so partial
    // updates work correctly. For non-self (view-only) we skip persistence entirely.
    const abilitiesKey = JSON.stringify(abilities);
    const statsKey = JSON.stringify(stats);
    const charmSlotsKey = JSON.stringify(charmSlots);
    useEffect(() => {
        if (!isSelf || !currentUser?.id || sharedBuild)
            return;
        const accessories = [acc1Id, acc2Id, gemAcc1Id, gemAcc2Id, gemAcc3Id, gemAcc4Id];
        const charms = charmId
            ? [{ id: charmId, level: charmLevel, slots: charmSlots }]
            : [];
        authStore.saveArmory(currentUser.id, {
            accessories,
            charms,
            abilities,
            armorType,
            gemLevel,
            stats,
            spellStats, // финальные характеристики для вычисления формул в описаниях
        });
    }, [
        isSelf, currentUser?.id, sharedBuild,
        acc1Id, acc2Id, gemAcc1Id, gemAcc2Id, gemAcc3Id, gemAcc4Id,
        charmId, charmLevel, charmSlotsKey,
        abilitiesKey,
        armorType, gemLevel, statsKey,
    ]);
    const saveBuildLocally = () => {
        localStorage.setItem('mmoportal:lastBuild', JSON.stringify(buildPayload));
        if (isSelf && currentUser?.id) authStore.saveArmory(currentUser.id, {
            armorType, gemLevel, stats, spellStats, abilities,
            accessories: [acc1Id, acc2Id, gemAcc1Id, gemAcc2Id, gemAcc3Id, gemAcc4Id],
            charms: charmId ? [{ id: charmId, level: charmLevel, slots: charmSlots }] : [],
        });
        // Persistence to user account is already handled by the useEffect above.
        showBuildNotice(isSelf && currentUser?.id ? 'Билд сохранён в аккаунт' : 'Билд сохранён в браузере');
    };
    // Abilities change handler — just updates local state; useEffect auto-persists.
    const handleAbilitiesChange = (next) => {
        setAbilities(next);
    };
    const copyBuild = async () => {
        const encoded = encodeBuild(buildPayload);
        const shareText = `${window.location.origin}${window.location.pathname}#!/armory?build=${encodeURIComponent(encoded)}`;
        try {
            await navigator.clipboard.writeText(shareText);
            showBuildNotice('Ссылка на билд скопирована');
        }
        catch {
            localStorage.setItem('mmoportal:lastSharedBuild', shareText);
            showBuildNotice('Ссылка сохранена локально');
        }
    };
    const charmTierCount = (charmLevel >= 15 ? 4 : charmLevel >= 10 ? 3 : charmLevel >= 5 ? 2 : 1);
    return (<>
      {/* Floating build-notice toast — does NOT take layout space (portal to body) */}
      {buildNotice && typeof document !== 'undefined' && createPortal(<div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px',
                backgroundColor: NEO.lime, color: NEO.ink,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                fontSize: '12px', fontWeight: 800,
                pointerEvents: 'none',
            }}>
          <CheckCircle size={14} strokeWidth={3}/> {buildNotice}
        </div>, document.body)}

      {/* Minimal save/share bar — just 2 small buttons, right-aligned */}
      <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '4px',
            marginBottom: '4px',
        }}>
        <NeoButton variant="white" size="sm" disabled={!isSelf} onClick={saveBuildLocally} style={{ margin: 0 }}>
          <Save size={14} strokeWidth={3}/> Сохранить
        </NeoButton>
        <NeoButton variant="lime" size="sm" onClick={copyBuild} style={{ margin: 0 }}>
          <Clipboard size={14} strokeWidth={3}/> Поделиться
        </NeoButton>
      </div>

    <div className="neo-calc-grid" style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px', fontVariantNumeric: 'tabular-nums' }}>
      <style>{`
        .neo-calc-left, .neo-calc-center, .neo-calc-right, .neo-calc-bar { min-width: 0; }
        @media (min-width: 1024px) {
          .neo-calc-grid { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
          .neo-calc-left, .neo-calc-center, .neo-calc-right { min-width: 0; }
          .neo-calc-left   { grid-column: span 4 / span 4; }
          .neo-calc-center { grid-column: span 4 / span 4; }
          .neo-calc-right  { grid-column: span 4 / span 4; }
          .neo-calc-bar    { grid-column: span 12 / span 12; }
          .neo-calc-right  { position: sticky; top: 20px; }
        }
      `}</style>

      {/* Abilities + Accessories display row (combined into ONE horizontal row) */}
      <div className="neo-calc-bar" style={{
            padding: '20px',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
        }}>
        <div style={{ width: '100%' }}>
          <h3 style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            margin: 0, padding: '8px 0',
            borderBottom: `3px solid ${NEO.ink}`,
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em',
            color: NEO.ink,
        }}>
            <BookOpen size={16} strokeWidth={3} style={{ color: NEO.yellow }}/>
            Способности ({abilities.filter(Boolean).length} / 9) и Аксессуары ({[acc1, acc2, gAcc1, gAcc2, gAcc3, gAcc4].filter(Boolean).length} / 6)
          </h3>
        </div>
        {/* Single horizontal row: abilities | divider | accessories (scrolls if too wide) */}
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: '12px',
            overflowX: 'auto',
            width: '100%',
            paddingBottom: '4px',
        }}>
          <AbilitiesSection compact abilities={abilities} onChange={handleAbilitiesChange} stats={spellStats} isSelf={isSelf}/>
          <div style={{ width: '2px', height: '64px', backgroundColor: NEO.ink, opacity: 0.3, flexShrink: 0 }}/>
          <AccessoryDisplaySection compact items={[acc1, acc2, gAcc1, gAcc2, gAcc3, gAcc4]} gemLevel={gemLevel}/>
        </div>
      </div>

      {/* Left column: equipment + gem level */}
      <div className="neo-calc-left" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Gem level */}
        <div style={{
            padding: '20px',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <PanelTitle icon={Gem} accent={NEO.lime}>Уровень Камней</PanelTitle>
            <span style={{
            padding: '4px 10px',
            backgroundColor: NEO.lime, color: NEO.ink,
            border: `2px solid ${NEO.ink}`,
            fontFamily: '"Archivo Black", sans-serif', fontSize: '12px',
        }}>
              {gemLevel} / 12
            </span>
          </div>
          <input type="range" min="0" max="12" value={gemLevel} disabled={!isSelf} onChange={(e) => handleGemLevelChange(parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer', accentColor: NEO.lime, opacity: !isSelf ? 0.5 : 1 }}/>
          <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '10px', color: NEO.muted, fontWeight: 700 }}>
            <span>0</span><span>3</span><span>6</span><span>9</span><span>12</span>
          </div>
        </div>

        <div style={{
            position: 'relative', zIndex: 30,
            flex: 1,
            padding: '20px',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <PanelTitle icon={Shield} accent={NEO.lime}>Сборка Экипировки</PanelTitle>
            {gemLevel < 9 && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: NEO.red, color: '#fff', border: `2px solid ${NEO.ink}`, fontSize: '11px', fontWeight: 800 }}>
                <Lock size={11} strokeWidth={3}/> Камни с 9 ур.
              </span>)}
          </div>

          <FieldLabel>Аксессуары (Базовые)</FieldLabel>
          <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AccessoryCell value={acc1Id} onChange={setAcc1Id} options={availableAccessories} emptyLabel="-- Пустой слот --" disabled={!isSelf} title="Базовый аксессуар — слот 1" accent={NEO.lime}/>
            <AccessoryCell value={acc2Id} onChange={setAcc2Id} options={availableAccessories} emptyLabel="-- Пустой слот --" disabled={!isSelf} title="Базовый аксессуар — слот 2" accent={NEO.lime}/>
          </div>

          <FieldLabel>Камни (Аксессуары)</FieldLabel>
          <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <AccessoryCell variant="square" index={1} value={gemAcc1Id} onChange={setGemAcc1Id} options={availableAccessories} disabled={!isSelf || gemLevel < 9} title="Камень (Аксессуар) — слот 1" accent={NEO.cyan}/>
            <AccessoryCell variant="square" index={2} value={gemAcc2Id} onChange={setGemAcc2Id} options={availableAccessories} disabled={!isSelf || gemLevel < 9} title="Камень (Аксессуар) — слот 2" accent={NEO.cyan}/>
            <AccessoryCell variant="square" index={3} value={gemAcc3Id} onChange={setGemAcc3Id} options={availableAccessories} disabled={!isSelf || gemLevel < 9} title="Камень (Аксессуар) — слот 3" accent={NEO.cyan}/>
            <AccessoryCell variant="square" index={4} value={gemAcc4Id} onChange={setGemAcc4Id} options={availableAccessories} disabled={!isSelf || gemLevel < 9} title="Камень (Аксессуар) — слот 4" accent={NEO.cyan}/>
          </div>

          <FieldLabel>Тип брони</FieldLabel>
          <div style={{ marginBottom: '8px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            {Object.entries(ARMOR_TYPES).map(([key, data]) => {
            const isActive = armorType === key;
            const col = ARMOR_COLOR[key];
            return (<button key={key} disabled={!isSelf} onClick={() => setArmorType(key)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '10px',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '12px', fontWeight: 800,
                    color: NEO.ink,
                    backgroundColor: isActive ? col : NEO.bg,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: isActive ? `4px 4px 0px 0px ${NEO.ink}` : 'none',
                    opacity: !isSelf ? 0.5 : 1,
                    cursor: !isSelf ? 'not-allowed' : 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }} onMouseEnter={(e) => {
                    if (!isSelf || isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
                }} onMouseLeave={(e) => {
                    if (!isSelf || isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                  <data.icon size={14} strokeWidth={3}/> {data.name}
                </button>);
        })}
          </div>
        </div>

      </div>

      {/* Center column: stat distribution */}
      <div className="neo-calc-center" style={{
            display: 'flex', flexDirection: 'column',
            padding: '20px',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
        }}>
        <div style={{ marginBottom: '16px' }}>
          <PanelTitle icon={Sliders} accent={NEO.lime}>
            Распределение <span style={{ marginLeft: '8px', fontSize: '12px', color: NEO.limeDark, fontFamily: 'monospace', fontWeight: 700, textTransform: 'none', letterSpacing: 'normal' }}>(осталось: {availPoints})</span>
          </PanelTitle>
        </div>

        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', minWidth: 0 }}>
          {/* СИЛА */}
          <div style={{ padding: '8px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, overflow: 'hidden', minWidth: 0 }}>
            <StatSlider label="Сила" statKey="str" value={stats.str} color={NEO.red} disabled={!isSelf} availPoints={availPoints} onChange={handleStatChange}/>
          </div>
          {/* ЛОВКОСТЬ */}
          <div style={{ padding: '8px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, overflow: 'hidden', minWidth: 0 }}>
            <StatSlider label="Ловкость" statKey="agi" value={stats.agi} color={NEO.lime} disabled={!isSelf} availPoints={availPoints} onChange={handleStatChange}/>
          </div>
          {/* ИНТЕЛЛЕКТ */}
          <div style={{ padding: '8px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, overflow: 'hidden', minWidth: 0 }}>
            <StatSlider label="Интеллект" statKey="int" value={stats.int} color={NEO.cyan} disabled={!isSelf} availPoints={availPoints} onChange={handleStatChange}/>
          </div>
          {/* СКОРОСТЬ ЗАКЛИНАНИЙ */}
          <div style={{
            padding: '8px',
            backgroundColor: gemLevel === 12 ? NEO.bg : NEO.faint,
            border: `2px solid ${NEO.ink}`,
            opacity: gemLevel === 12 ? 1 : 0.5,
            overflow: 'hidden',
            minWidth: 0,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: NEO.yellowDark, fontFamily: '"Space Grotesk", sans-serif', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Haste</label>
              <input type="number" value={spellSpeedFromPoints} step="4" min="0" disabled={!isSelf || gemLevel < 12} onChange={e => {
            const pct = Number(e.target.value) || 0;
            const points = Math.round(pct / 4) * 100;
            handleStatChange('speedPoints', String(points));
        }} style={{
            width: '60px', padding: '3px 4px',
            backgroundColor: NEO.surface, color: NEO.ink,
            border: `2px solid ${NEO.ink}`,
            fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
            textAlign: 'right', outline: 'none',
            boxSizing: 'border-box',
            flexShrink: 0,
            opacity: (!isSelf || gemLevel < 12) ? 0.5 : 1,
        }}/>
              <span style={{ fontSize: '11px', fontWeight: 800, color: NEO.yellowDark, fontFamily: 'monospace', flexShrink: 0 }}>%</span>
            </div>
            <input type="range" min="0" max={stats.speedPoints + availPoints} step="100" value={stats.speedPoints} disabled={!isSelf || gemLevel < 12} onChange={e => handleStatChange('speedPoints', e.target.value)} style={{ width: '100%', cursor: 'pointer', accentColor: NEO.yellow, boxSizing: 'border-box', opacity: (!isSelf || gemLevel < 12) ? 0.5 : 1 }}/>
          </div>
        </div>

        {/* Чарм — moved to bottom of "Распределение" section.
            Cell becomes clickable for opening a detail modal (with delete button)
            when a charm is selected; opens a picker modal when the slot is empty. */}
        <FieldLabel color={NEO.pink} style={{ marginTop: 'auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} strokeWidth={3} style={{ color: NEO.pink }}/> Чарм
          </span>
        </FieldLabel>
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '12px',
            padding: '12px',
            backgroundColor: NEO.bg,
            border: `3px solid ${NEO.ink}`,
        }}>
          {/* Custom charm cell — clickable row. Empty → picker; filled → detail modal. */}
          <div style={{ position: 'relative', width: '100%' }}>
            <div onMouseEnter={(e) => {
            if (!isSelf && !selectedCharm)
                return;
            e.currentTarget.style.transform = 'translate(2px, 2px)';
            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`;
        }} onMouseLeave={(e) => {
            if (!isSelf && !selectedCharm)
                return;
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = selectedCharm ? `3px 3px 0px 0px ${NEO.ink}` : 'none';
        }} onClick={() => {
            if (!isSelf && !selectedCharm)
                return;
            if (selectedCharm) {
                setCharmDetailOpen(true);
            }
            else {
                setCharmPickerOpen(true);
            }
        }} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px',
            backgroundColor: NEO.bg,
            border: `3px solid ${NEO.ink}`,
            boxShadow: selectedCharm ? `3px 3px 0px 0px ${NEO.ink}` : 'none',
            cursor: (!isSelf && !selectedCharm) ? 'not-allowed' : 'pointer',
            opacity: (!isSelf && !selectedCharm) ? 0.5 : 1,
            fontSize: '12px', color: NEO.ink, fontWeight: 600,
            fontFamily: '"Space Grotesk", sans-serif',
            transition: 'transform 0.1s, box-shadow 0.1s',
        }}>
              <div style={{
            width: 28, height: 28, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: selectedCharm ? NEO.pink : NEO.surface,
            border: `2px solid ${NEO.ink}`, overflow: 'hidden',
        }}>
                {selectedCharm ? (<AccessoryIconImg icon={selectedCharm.icon} alt={selectedCharm.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', boxSizing: 'border-box' }} fallback={<Sparkles size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/>}/>) : (<Sparkles size={14} strokeWidth={2.5} style={{ color: NEO.faint }}/>)}
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {selectedCharm ? `[ID: ${selectedCharm.id}] ${selectedCharm.name}` : '-- Выберите чарм --'}
              </span>
              <ChevronRight size={14} strokeWidth={3} style={{ color: NEO.muted }}/>
            </div>
          </div>

          {charmId && (<>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: NEO.muted, fontWeight: 600 }}>Уровень чарма:</span>
                <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '12px', color: NEO.pink }}>{charmLevel} / 100</span>
              </div>
              <input type="range" min="1" max="100" value={charmLevel} onChange={e => setCharmLevel(Number(e.target.value))} disabled={!isSelf} style={{ width: '100%', cursor: 'pointer', accentColor: NEO.pink, opacity: !isSelf ? 0.5 : 1 }}/>

              <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr', gap: '8px', borderTop: `2px solid ${NEO.ink}`, paddingTop: '12px' }}>
                {Array.from({ length: charmTierCount }).map((_, idx) => (<div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '48px', fontFamily: 'monospace', fontSize: '10px', color: NEO.muted, fontWeight: 700 }}>Слот {idx + 1}:</span>
                    <select value={charmSlots[idx]} onChange={(e) => { const newSlots = [...charmSlots]; newSlots[idx] = e.target.value; setCharmSlots(newSlots); }} disabled={!isSelf} style={{
                    flex: 1, padding: '6px 10px',
                    backgroundColor: NEO.surface, color: NEO.ink,
                    border: `2px solid ${NEO.ink}`,
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '12px', fontWeight: 600,
                    outline: 'none',
                    opacity: !isSelf ? 0.5 : 1,
                    cursor: 'pointer',
                }}>
                      {Object.keys(CHARM_BASE_STATS).map(k => {
                    const activeSlots = charmSlots.slice(0, charmTierCount);
                    const isSelectedElsewhere = activeSlots.includes(k) && charmSlots[idx] !== k;
                    return (<option key={k} value={k} disabled={isSelectedElsewhere}>
                            {STAT_DEF[k]?.label || k}
                          </option>);
                })}
                    </select>
                  </div>))}
              </div>
            </>)}
        </div>

        {/* Charm picker modal (only opens when slot is empty) */}
        <AccessoryPickerModal open={charmPickerOpen} onClose={() => setCharmPickerOpen(false)} onPick={(id) => { setCharmId(id); setCharmPickerOpen(false); }} options={dataStore.get('DB_CHARMS')} title="Выбор чарма"/>

        {/* Charm detail modal — opens when a filled charm cell is clicked. */}
        {charmDetailOpen && selectedCharm && typeof document !== 'undefined' && createPortal(<div onClick={() => setCharmDetailOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
            <div onClick={(e) => e.stopPropagation()} style={{
                backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`,
                boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
                width: 'calc(100% - 32px)', maxWidth: 560, maxHeight: '85vh',
                overflow: 'auto', position: 'relative', margin: 'auto', marginTop: '7vh',
            }}>
              {/* Pink header (NEO.pink) — charms use pink color */}
              <div style={{
                backgroundColor: NEO.pink, color: NEO.ink,
                padding: '16px 20px', borderBottom: `3px solid ${NEO.ink}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                position: 'sticky', top: 0, zIndex: 2,
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <Sparkles size={14} strokeWidth={3} style={{ color: NEO.ink }}/>
                    <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', opacity: 0.7 }}>#{selectedCharm.id}</span>
                    <span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', backgroundColor: NEO.ink, color: NEO.pink, border: `1px solid ${NEO.ink}` }}>Чарм</span>
                  </div>
                  <h2 style={{ margin: 0, fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1.1 }}>{selectedCharm.name}</h2>
                </div>
                <button onClick={() => setCharmDetailOpen(false)} style={{ width: 32, height: 32, flexShrink: 0, backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} strokeWidth={2.5}/>
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Icon */}
                <div style={{ width: 80, height: 80, backgroundColor: NEO.bg, border: `3px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <AccessoryIconImg icon={selectedCharm.icon} alt={selectedCharm.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px', boxSizing: 'border-box' }} fallback={<Sparkles size={40} strokeWidth={2.5} style={{ color: NEO.pink }}/>}/>
                </div>

                {/* Description (uses evalDescription with spellStats when available) */}
                {selectedCharm.desc && (<div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Описание</div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: NEO.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {evalDescription(selectedCharm.desc, spellStats)}
                    </p>
                  </div>)}

                {/* Active slots + Charm bonus SUM (base * level for each active slot) */}
                {(() => {
                const activeSlots = charmSlots.slice(0, charmTierCount);
                const tier = charmTierCount - 1;
                const bonusRows = activeSlots.map((slotKey) => {
                    const def = STAT_DEF[slotKey] || {};
                    const baseVal = parseStat(selectedCharm.stats?.[slotKey] ?? CHARM_BASE_STATS[slotKey]);
                    const totalVal = baseVal * charmLevel;
                    return { slotKey, def, baseVal, totalVal };
                });
                const totalSum = bonusRows.reduce((acc, r) => acc + r.totalVal, 0);
                return (<div>
                      {/* Active slots list */}
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>
                        Активные слоты ({activeSlots.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                        {activeSlots.map((slotKey, idx) => {
                        const def = STAT_DEF[slotKey] || {};
                        const col = statColor(slotKey);
                        const Icon = def.icon || Activity;
                        return (<span key={`active-slot-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 6px', fontSize: 10, fontWeight: 700, backgroundColor: col, color: NEO.ink, border: `2px solid ${NEO.ink}` }}>
                              <Icon size={10} strokeWidth={2.5}/>
                              {def.label || slotKey}
                            </span>);
                    })}
                      </div>

                      {/* Bonus table */}
                      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>
                        Бонусы чарма (уровень {charmLevel}, tier {tier})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {bonusRows.map((r, idx) => {
                        const col = statColor(r.slotKey);
                        const Icon = r.def.icon || Activity;
                        return (<div key={`bonus-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: NEO.ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Icon size={12} strokeWidth={2.5} style={{ color: col, flexShrink: 0 }}/>
                                {r.def.label || r.slotKey}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: col, flexShrink: 0 }}>
                                {r.def.prefix || '+'}{r.totalVal.toFixed(0)}{r.def.suffix || ''}
                                <span style={{ fontSize: 9, color: NEO.muted, fontWeight: 600 }}>({r.baseVal.toFixed(0)} × {charmLevel})</span>
                              </span>
                            </div>);
                    })}
                        {/* Total */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: NEO.ink, border: `2px solid ${NEO.ink}` }}>
                          <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: NEO.faint }}>Итого</span>
                          <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 14, color: NEO.lime }}>+{totalSum.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>);
            })()}

                {/* Current level + active slots summary */}
                <div style={{ padding: '10px 12px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: NEO.ink }}>
                    <span>Уровень чарма:</span>
                    <span style={{ fontFamily: '"Archivo Black", sans-serif', color: NEO.pink }}>{charmLevel} / 100</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: NEO.muted }}>
                    <span>Активных слотов:</span>
                    <span style={{ fontFamily: 'monospace' }}>{charmTierCount} / 4</span>
                  </div>
                </div>

                {/* Delete button — clears charmId. Only available for self (edit mode). */}
                {isSelf && (<NeoButton variant="red" onClick={() => {
                    setCharmId('');
                    setCharmDetailOpen(false);
                }}>
                    <X size={16} strokeWidth={3}/> Удалить чарм
                  </NeoButton>)}

                {/* Read-only notice for non-self view */}
                {!isSelf && (<div style={{ padding: '10px 12px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontSize: '11px', fontWeight: 700, color: NEO.muted, textAlign: 'center' }}>
                    🔧 Просмотр чужого билда — чарм нельзя изменить
                  </div>)}
              </div>
            </div>
          </div>, document.body)}
      </div>

      {/* Right column: final stats */}
      <div className="neo-calc-right" style={{
            padding: '16px',
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
        }}>
        <PanelTitle icon={Target} accent={NEO.lime}>Итоговые показатели</PanelTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Основные атрибуты */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            {[
            { label: 'Сила', val: finalStr, col: NEO.red },
            { label: 'Ловкость', val: finalAgi, col: NEO.lime },
            { label: 'Интеллект', val: finalInt, col: NEO.cyan },
        ].map(s => (<div key={s.label} style={{
                padding: '8px',
                backgroundColor: NEO.bg,
                border: `2px solid ${NEO.ink}`,
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: NEO.muted, fontWeight: 800, marginBottom: '2px' }}>{s.label}</div>
                <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '14px', color: s.col }}>{s.val.toLocaleString()}</div>
              </div>))}
          </div>

          {/* Ресурсы */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            {[
            { label: 'Здоровье', val: finalHp, regen: finalHpRegen, col: NEO.lime },
            { label: 'Мана', val: finalMana, regen: finalMpRegen, col: NEO.cyan },
            { label: 'Энергия', val: finalEnergy, regen: energyRegen, col: NEO.yellow },
            { label: 'Выносливость', val: finalStamina, regen: finalStaminaRegen, col: '#f97316' },
        ].map(s => (<div key={s.label} style={{
                padding: '8px',
                backgroundColor: NEO.bg,
                border: `2px solid ${NEO.ink}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: NEO.muted, fontWeight: 800 }}>{s.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: s.col, fontWeight: 800 }}>+{s.regen.toFixed(1)}/с</span>
                </div>
                <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '14px', color: s.col }}>{s.val.toLocaleString()}</div>
              </div>))}
          </div>

          {/* Урон, Крит, Мастерство */}
          <div style={{
            padding: '12px',
            backgroundColor: NEO.bg,
            border: `2px solid ${NEO.ink}`,
            display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
            <StatRow label="Физ. урон" val={physDmg.toFixed(0)} col={NEO.red}/>
            <StatRow label="Маг. урон" val={magicDmg.toFixed(0)} col={NEO.pink}/>
            <StatRow label="Крит / Урон" val={`${finalCrit.toFixed(1)}% / ${finalCritDmg.toFixed(1)}%`} col={NEO.pink}/>
            <div style={{ height: '2px', backgroundColor: NEO.ink, margin: '4px 0' }}/>
            <StatRow label="Мастерство" val={`${finalMastery.toFixed(2)}%`} col={NEO.yellowDark} bold/>
            <StatRow label="Скор. заклинаний" val={excessSpellSpeed > 0 ? `${cappedSpellSpeed.toFixed(1)}% (+${excessSpellSpeed.toFixed(1)}% изб)` : `${cappedSpellSpeed.toFixed(1)}%`} col={NEO.yellowDark} bold/>
            <StatRow label="ГКД" val={`${finalGcd.toFixed(2)} сек`} col={NEO.ink}/>
          </div>

          {/* Защита и Мобильность */}
          <div style={{
            padding: '12px',
            backgroundColor: NEO.bg,
            border: `2px solid ${NEO.ink}`,
            display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
            <StatRow label="Броня (Сниж.)" val={`${totalArmor.toFixed(0)} (${physResistPct.toFixed(1)}%)`} col={NEO.ink}/>
            <StatRow label="Сопр. Магии" val={`${totalMagicResist.toFixed(0)} (${magicResistPct.toFixed(1)}%)`} col={NEO.violet}/>
            <StatRow label="Скор. бега" val={String(finalMoveSpeed)} col="#14b8a6" bold/>
            <StatRow label="Радиус заклинаний" val={String(spellRadius)} col="#14b8a6" bold/>
          </div>

          {/* Вампиризм */}
          <div style={{
            padding: '12px',
            backgroundColor: NEO.bg,
            border: `2px solid ${NEO.ink}`,
            display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
            <StatRow label="Физ. Вамп" val={`${accPhysVamp.toFixed(1)}%`} col={NEO.red}/>
            <StatRow label="Маг. Вамп" val={`${accMagicVamp.toFixed(1)}%`} col={NEO.pink}/>
          </div>
        </div>
      </div>
    </div>
    </>);
};
/* ════════════════ Small slider component ════════════════ */
const StatSlider = ({ label, statKey, value, color, disabled, availPoints, onChange }) => (<div style={{ minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 800, color, fontFamily: '"Space Grotesk", sans-serif', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</label>
      <input type="number" value={value} disabled={disabled} onChange={e => onChange(statKey, e.target.value)} style={{
        width: '56px', padding: '3px 4px',
        backgroundColor: NEO.surface, color: NEO.ink,
        border: `2px solid ${NEO.ink}`,
        fontFamily: 'monospace', fontSize: '11px', fontWeight: 700,
        textAlign: 'right', outline: 'none',
        boxSizing: 'border-box',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
    }}/>
    </div>
    <input type="range" min="0" max={Math.min(STAT_LIMIT, value + availPoints)} value={value} disabled={disabled} onChange={e => onChange(statKey, e.target.value)} style={{ width: '100%', cursor: 'pointer', accentColor: color, boxSizing: 'border-box', opacity: disabled ? 0.5 : 1 }}/>
  </div>);
const StatRow = ({ label, val, col, bold }) => (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
    <span style={{ color: NEO.muted, fontWeight: bold ? 800 : 600 }}>{label}</span>
    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: col }}>{val}</span>
  </div>);
/* ════════════════ Main ArmoryPage ════════════════ */
export const ArmoryPage = () => {
    const currentUser = useCurrentUser();
    const myCharacter = dataStore.get('MOCK_CHARACTERS')[0];
    // The "self" tab reflects the logged-in user (or falls back to the first
    // MOCK_CHARACTER when nobody is logged in). We keep the tab's `data` field
    // pointing at the static character (so savedCalc + guild/race/class remain)
    // but display the user's actual username in the tab name + profile header.
    const selfDisplayName = currentUser?.username || myCharacter.name;
    const [openTabs, setOpenTabs] = useState([
        { id: 'self', name: `Мой профиль (${selfDisplayName})`, data: myCharacter, isSelf: true },
    ]);
    const [activeCharTabId, setActiveCharTabId] = useState('self');
    const armoryParams = useParams();
    const armoryNavigate = useNavigate();
    const validSubTabs = ['character', 'inventory', 'professions'];
    const [selfSubTab, setSelfSubTabState] = useState(armoryParams.subtab && validSubTabs.includes(armoryParams.subtab) ? armoryParams.subtab : 'character');
    useEffect(() => {
        if (armoryParams.subtab && validSubTabs.includes(armoryParams.subtab) && armoryParams.subtab !== selfSubTab) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this view after its route or browser-owned data changes.
            setSelfSubTabState(armoryParams.subtab);
        }
    }, [armoryParams.subtab]);
    const setSelfSubTab = (tab) => {
        setSelfSubTabState(tab);
        armoryNavigate('/armory/' + tab);
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [searchError, setSearchError] = useState('');
    // Keep the self-tab label in sync with the logged-in user. When user A logs
    // out and user B logs in, the tab name + (via the `key` prop on CalculatorTab
    // below) the entire calculator remounts and re-loads from user B's savedArmory.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this view after its route or browser-owned data changes.
        setOpenTabs(prev => prev.map(t => t.id === 'self'
            ? { ...t, name: `Мой профиль (${currentUser?.username || myCharacter.name})` }
            : t));
    }, [currentUser?.id, currentUser?.username, myCharacter.name]);
    // ── Per-user inventory state ──────────────────────────────────
    // Stored as a 40-slot array of either null or { key: "DB_KIND:ID", count: N }
    // objects (1 ≤ N ≤ MAX_STACK). Backward-compatible: legacy string/number
    // values are normalised via `normalizeSlot` into { key, count: 1 }.
    // Persisted into authStore.savedArmory.inventory.
    const buildInitialInventory = () => {
        const saved = currentUser?.savedArmory?.inventory;
        const padded = Array(INVENTORY_SIZE).fill(null);
        if (Array.isArray(saved)) {
            for (let i = 0; i < Math.min(saved.length, INVENTORY_SIZE); i++) {
                padded[i] = normalizeSlot(saved[i]);
            }
        }
        return padded;
    };
    const [inventory, setInventory] = useState(buildInitialInventory);
    // Reload inventory whenever the logged-in user changes.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Reload inventory when the local account changes.
        setInventory(buildInitialInventory());
    }, [currentUser?.id]);
    // Persist inventory on change (self-only).
    const inventoryKey = JSON.stringify(inventory);
    useEffect(() => {
        if (!currentUser?.id)
            return;
        authStore.saveArmory(currentUser.id, { inventory });
    }, [currentUser?.id, inventoryKey]);
    // Resolve inventory keys into actual item objects (used by professions).
    const dbItemsInv = useCollection('DB_ITEMS', DB_ITEMS);
    const dbCharmsInv = useCollection('DB_CHARMS', DB_CHARMS);
    const dbRegularInv = useCollection('DB_REGULAR_ITEMS', DB_REGULAR_ITEMS);
    // Flat list of resolved items (each stack slot is expanded into `count`
    // separate entries). Used by ProfessionsView for name-based material counts.
    const inventoryItems = useMemo(() => {
        const list = [];
        inventory.forEach(slot => {
            if (!slot)
                return;
            const item = resolveItem(slot.key, dbItemsInv, dbCharmsInv, dbRegularInv);
            if (!item)
                return;
            const n = Math.max(1, Math.min(MAX_STACK, Number(slot.count) || 1));
            for (let i = 0; i < n; i++)
                list.push(item);
        });
        return list;
    }, [inventory, dbItemsInv, dbCharmsInv, dbRegularInv]);
    // Map of `key → total count` across all inventory slots. Used by the
    // assembly feature to check whether all required base accessories are
    // present in sufficient quantity.
    const inventoryKeyCounts = useMemo(() => {
        const counts = {};
        inventory.forEach(slot => {
            if (!slot)
                return;
            counts[slot.key] = (counts[slot.key] || 0) + (slot.count || 1);
        });
        return counts;
    }, [inventory]);
    // Add a crafted item to inventory. Stacks onto an existing slot of the
    // same key if there's room (count < MAX_STACK); otherwise occupies the
    // first empty slot. Returns true on success, false if the bag is full.
    const addCraftedItem = (key) => {
        if (!key)
            return false;
        const stackIdx = inventory.findIndex(s => s && s.key === key && s.count < MAX_STACK);
        if (stackIdx >= 0) {
            const next = [...inventory];
            next[stackIdx] = { ...next[stackIdx], count: next[stackIdx].count + 1 };
            setInventory(next);
            return true;
        }
        const emptyIdx = inventory.findIndex(v => !v);
        if (emptyIdx < 0)
            return false;
        const next = [...inventory];
        next[emptyIdx] = { key, count: 1 };
        setInventory(next);
        return true;
    };
    // Atomically consume a list of base-item keys and add an assembly result.
    // Returns true on success, false if either (a) the bag doesn't contain
    // enough of any base item or (b) there's no room for the result.
    const assembleArtifact = (baseKeys, resultKey) => {
        if (!baseKeys || baseKeys.length === 0 || !resultKey)
            return false;
        // Validate synchronously against the current closure inventory.
        const need = {};
        baseKeys.forEach(k => { need[k] = (need[k] || 0) + 1; });
        const have = {};
        inventory.forEach(s => {
            if (!s)
                return;
            if (need[s.key] !== undefined)
                have[s.key] = (have[s.key] || 0) + s.count;
        });
        for (const k of Object.keys(need)) {
            if ((have[k] || 0) < need[k])
                return false;
        }
        // Check room for the result (existing non-full stack OR empty slot).
        const resultHasRoom = inventory.some(s => s && s.key === resultKey && s.count < MAX_STACK) ||
            inventory.some(s => !s);
        if (!resultHasRoom)
            return false;
        // Apply mutation.
        setInventory(prev => {
            const next = [...prev];
            // Consume base items.
            for (const k of Object.keys(need)) {
                let remaining = need[k];
                for (let i = 0; i < next.length && remaining > 0; i++) {
                    const s = next[i];
                    if (!s || s.key !== k)
                        continue;
                    if (s.count > remaining) {
                        next[i] = { ...s, count: s.count - remaining };
                        remaining = 0;
                    }
                    else {
                        remaining -= s.count;
                        next[i] = null;
                    }
                }
            }
            // Add result (stack if possible).
            const stackIdx = next.findIndex(s => s && s.key === resultKey && s.count < MAX_STACK);
            if (stackIdx >= 0) {
                next[stackIdx] = { ...next[stackIdx], count: next[stackIdx].count + 1 };
            }
            else {
                const emptyIdx = next.findIndex(v => !v);
                if (emptyIdx >= 0)
                    next[emptyIdx] = { key: resultKey, count: 1 };
            }
            return next;
        });
        return true;
    };
    // Legacy demo inventory slots (no longer used; kept as empty array for any
    // downstream references — ArmoryPage now uses the `inventory` state above).
    // Build a MOCK_CHARACTER-shaped object from an authStore user's savedArmory
    // so the existing CalculatorTab can consume it via initialData + armory prop.
    const buildCharDataFromUser = (user) => {
        const sa = user.savedArmory || {};
        const savedCalc = {
            armorType: sa.armorType || 'plates',
            gemLevel: sa.gemLevel ?? 0,
            stats: sa.stats || { str: 0, agi: 0, int: 0, speedPoints: 0 },
            acc1Id: sa.accessories?.[0] ?? null,
            acc2Id: sa.accessories?.[1] ?? null,
            gemAcc1Id: sa.accessories?.[2] ?? null,
            gemAcc2Id: sa.accessories?.[3] ?? null,
            gemAcc3Id: sa.accessories?.[4] ?? null,
            gemAcc4Id: sa.accessories?.[5] ?? null,
            charmId: sa.charms?.[0]?.id ?? null,
            charmLevel: sa.charms?.[0]?.level ?? 1,
            charmSlots: sa.charms?.[0]?.slots ?? ['energyRegen', 'magicDmg', 'physDmg', 'hp'],
        };
        return {
            name: user.username,
            guild: '<Игрок>',
            level: 80,
            race: 'Авантюрист',
            class: 'Авантюрист',
            savedCalc,
            savedArmory: sa,
        };
    };
    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim())
            return;
        setSearchError('');
        const q = searchQuery.trim().toLowerCase();
        // 1) Look up registered users via authStore (per-user savedArmory).
        const userMatch = authStore.getUserByName(searchQuery.trim());
        // 2) Fallback to MOCK_CHARACTERS (legacy demo characters).
        const mockMatch = MOCK_CHARACTERS.find(c => c.name.toLowerCase() === q);
        if (userMatch) {
            // Searching yourself → just focus the self tab.
            if (currentUser && userMatch.id === currentUser.id) {
                setActiveCharTabId('self');
                setSearchQuery('');
                return;
            }
            const charData = buildCharDataFromUser(userMatch);
            const existingTab = openTabs.find(t => t.data.name === userMatch.username);
            if (existingTab) {
                // Refresh the cached data (in case the user re-saved since the tab was opened).
                setOpenTabs(prev => prev.map(t => t.id === existingTab.id ? { ...t, data: charData } : t));
                setActiveCharTabId(existingTab.id);
            }
            else {
                const newTabId = `char-${Date.now()}`;
                setOpenTabs(prev => [...prev, { id: newTabId, name: userMatch.username, data: charData, isSelf: false }]);
                setActiveCharTabId(newTabId);
            }
            setSearchQuery('');
        }
        else if (mockMatch) {
            const existingTab = openTabs.find(t => t.data.name === mockMatch.name);
            if (existingTab) {
                setActiveCharTabId(existingTab.id);
            }
            else {
                const newTabId = `char-${Date.now()}`;
                setOpenTabs(prev => [...prev, { id: newTabId, name: mockMatch.name, data: mockMatch, isSelf: false }]);
                setActiveCharTabId(newTabId);
            }
            setSearchQuery('');
        }
        else {
            setSearchError(`Персонаж с именем "${searchQuery}" не найден.`);
        }
    };
    const closeTab = (e, idToClose) => {
        e.stopPropagation();
        const filteredTabs = openTabs.filter(t => t.id !== idToClose);
        setOpenTabs(filteredTabs);
        if (activeCharTabId === idToClose)
            setActiveCharTabId('self');
    };
    const activeCharData = openTabs.find(t => t.id === activeCharTabId);
    return (<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .neo-inv-slot:hover .neo-inv-tooltip { display: block !important; }
        @media (max-width: 640px) {
          .neo-subtab-label { display: none !important; }
        }
      `}</style>

      {/* Header (search moved into the active-tab character header) */}
      <NeoPageHeader icon={User} iconBg={NEO.yellow} title="Армори" subtitle="Профили персонажей, калькулятор билдов, профессии и инвентарь."/>

      {/* Character tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 8px' }}>
        {openTabs.map(tab => {
            const isActive = activeCharTabId === tab.id;
            return (<button key={tab.id} onClick={() => setActiveCharTabId(tab.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 18px',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '13px', fontWeight: 700,
                    color: NEO.ink,
                    backgroundColor: isActive ? NEO.yellow : NEO.surface,
                    border: `3px solid ${NEO.ink}`,
                    boxShadow: isActive ? `4px 4px 0px 0px ${NEO.ink}` : 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }} onMouseEnter={(e) => {
                    if (isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(2px, 2px)';
                    e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
                }} onMouseLeave={(e) => {
                    if (isActive)
                        return;
                    e.currentTarget.style.transform = 'translate(0, 0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
              <User size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/>
              {tab.name}
              {!tab.isSelf && (<div onClick={(e) => closeTab(e, tab.id)} title="Закрыть вкладку" style={{
                        marginLeft: '8px', padding: '2px', display: 'inline-flex',
                        backgroundColor: NEO.red, color: '#fff',
                        border: `2px solid ${NEO.ink}`,
                    }}>
                  <X size={12} strokeWidth={3}/>
                </div>)}
            </button>);
        })}
      </div>

      {/* Active tab content */}
      {activeCharData && (<div style={{
                minHeight: '500px',
                padding: '24px',
                backgroundColor: NEO.surface,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            }}>
          {/* Character header — compact horizontal row: LEFT (avatar + name + guild) | RIGHT (search + sub-tabs) */}
          <div style={{
                display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px',
                paddingBottom: '16px', marginBottom: '20px',
                borderBottom: `3px solid ${NEO.ink}`,
                flexWrap: 'wrap',
            }}>
            {/* LEFT: avatar + name + guild */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 auto', minWidth: 220 }}>
              <div style={{
                width: 80, height: 80,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.bg,
                border: `4px solid ${NEO.ink}`,
                boxShadow: activeCharData.isSelf ? `4px 4px 0px 0px ${NEO.lime}` : `4px 4px 0px 0px ${NEO.ink}`,
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                {activeCharData.isSelf && currentUser?.avatar
                ? <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <User size={40} strokeWidth={2.5} style={{ color: NEO.muted }}/>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', color: NEO.ink, margin: 0, lineHeight: 1.1 }}>
                    {activeCharData.isSelf
                ? (currentUser?.username || activeCharData.data.name)
                : activeCharData.data.name}
                  </h3>
                  {activeCharData.isSelf && <NeoBadge bg={NEO.lime} fg={NEO.ink} style={{ fontSize: '11px' }}>ВЫ</NeoBadge>}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: NEO.muted, fontWeight: 600 }}>
                  Гильдия:{' '}
                  <span style={{ color: NEO.cyanDark, fontWeight: 800, cursor: 'pointer' }}>
                    &lt;{activeCharData.data.guild}&gt;
                  </span>
                </p>
              </div>
            </div>

            {/* RIGHT: search (top) + sub-tabs (bottom, owner only) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch', flex: '1 1 280px', minWidth: 0, maxWidth: '460px' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                <div style={{ display: 'flex', width: '100%', gap: '6px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} strokeWidth={2.5} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
                    <NeoInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск персонажа (Артас)..." style={{ paddingLeft: '36px', height: '36px', fontSize: '13px' }}/>
                  </div>
                  <NeoButton variant="lime" type="submit" size="sm" style={{ height: '36px', margin: 0 }}>
                    <Search size={14} strokeWidth={3}/> Найти
                  </NeoButton>
                </div>
                {searchError && (<p style={{ textAlign: 'right', fontSize: '11px', color: NEO.red, fontWeight: 700, margin: 0 }}>{searchError}</p>)}
              </form>

              {/* Sub-tabs (owner only) — compact buttons inline */}
              {activeCharData.isSelf && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, justifyContent: 'flex-end' }}>
                  {[
                    { id: 'character', label: 'Экипировка', icon: Shield },
                    { id: 'inventory', label: 'Сумка', icon: Archive },
                    { id: 'professions', label: 'Профессии', icon: Hammer },
                ].map((sub, idx) => {
                    const Icon = sub.icon;
                    const isActive = selfSubTab === sub.id;
                    return (<button key={sub.id} onClick={() => setSelfSubTab(sub.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px',
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontSize: '11px', fontWeight: 700,
                            color: NEO.ink,
                            backgroundColor: isActive ? NEO.yellow : NEO.surface,
                            border: `3px solid ${NEO.ink}`,
                            boxShadow: isActive ? `3px 3px 0px 0px ${NEO.ink}` : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                            marginLeft: idx > 0 ? '-3px' : 0,
                            zIndex: isActive ? 2 : 1,
                            position: 'relative',
                        }} onMouseEnter={(e) => {
                            if (isActive)
                                return;
                            e.currentTarget.style.transform = 'translate(1px, 1px)';
                            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`;
                        }} onMouseLeave={(e) => {
                            if (isActive)
                                return;
                            e.currentTarget.style.transform = 'translate(0, 0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}>
                        <Icon size={14} strokeWidth={3}/>
                        <span className="neo-subtab-label">{sub.label}</span>
                      </button>);
                })}
                </div>)}
            </div>
          </div>

          {/* Calculator */}
          {(!activeCharData.isSelf || selfSubTab === 'character') && (<CalculatorTab 
            // `key` forces a full remount whenever the logged-in user changes
            // (so the new user's savedArmory is re-read on tab switch / login).
            key={activeCharData.isSelf
                    ? `self-${currentUser?.id || 'anon'}`
                    : `view-${activeCharData.id}`} initialData={activeCharData.data.savedCalc} isSelf={activeCharData.isSelf} armory={activeCharData.data.savedArmory}/>)}

          {/* Inventory */}
          {activeCharData.isSelf && selfSubTab === 'inventory' && (<InventoryGrid inventory={inventory} setInventory={setInventory} isSelf={!!currentUser?.id}/>)}

          {/* Professions */}
          {activeCharData.isSelf && selfSubTab === 'professions' && (<div style={{ marginTop: '8px', borderTop: `2px solid ${NEO.ink}`, paddingTop: '16px' }}>
              <ProfessionsView inventoryItems={inventoryItems} onAddCraftedItem={addCraftedItem} inventoryKeyCounts={inventoryKeyCounts} onAssemble={assembleArtifact}/>
            </div>)}
        </div>)}
    </div>);
};
