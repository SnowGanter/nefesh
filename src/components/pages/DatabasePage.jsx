'use client';
import { evaluateFormula } from '@/lib/formula.mjs';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Activity, BookOpen, ChevronRight, Copy, Search, Sparkles, X, Package, Gem, Zap, Sword, Users, ArrowUp, Filter, FlaskConical, Scroll as ScrollIcon, } from 'lucide-react';
import { CHARM_BASE_STATS, DB_CHARMS, DB_ITEMS, DB_NPCS, DB_RACIAL_SPELLS, DB_REGULAR_ITEMS, DB_SPELLS, STAT_DEF, DEFAULT_SPELL_FORMULAS, MOCK_RECIPES, } from '@/data/gameData';
import { useCollection } from '@/lib/dataStore';
import { useCurrentUser } from '@/lib/authStore';
import { useParams, useNavigate } from '@/lib/router';
import { getSpellFormulaDisplay, evalDescription, deriveFullStats } from '@/lib/gameUtils';
import { useIcon } from '@/lib/iconStore';
import { NEO, NeoButton, NeoEmpty } from '@/components/Neo';
// ═════ IconImg — показывает иконку из dataURL или IndexedDB ═════
// iconValue может быть:
//   - dataURL (начинается с 'data:') — старый формат, показываем напрямую
//   - 'indexeddb:KEY' — загружаем из IndexedDB через useIcon
//   - '' / undefined — показываем fallback (children)
function IconImg({ icon, fallback, alt, style }) {
    const isIndexedDb = icon && icon.startsWith && icon.startsWith('indexeddb:');
    const key = isIndexedDb ? icon.slice('indexeddb:'.length) : null;
    const dbIcon = useIcon(key);
    const src = isIndexedDb ? dbIcon : icon;
    if (src)
        return <img src={src} alt={alt || ''} style={style}/>;
    return fallback || null;
}
// ═════ Config ═════
const STAT_COLOR = {
    str: NEO.red, agi: NEO.lime, int: NEO.cyan, armor: NEO.muted,
    speed: NEO.yellow, mastery: NEO.pink, hpRegen: '#16a34a', mpRegen: '#0891b2',
    staminaRegen: '#ea580c', energyRegen: NEO.yellowDark, moveSpeed: '#14b8a6',
    magicResist: '#6366f1', physVamp: '#e11d48', manaPool: '#3b82f6',
    stamina: '#f97316', crit: '#dc2626', critDmg: '#be123c',
    magicVamp: '#c026d3', magicDmg: '#a855f7', physDmg: '#ef4444', hp: '#22c55e',
    cooldown: '#8b5cf6',
};
const TABS = [
    { id: 'items', label: 'Аксессуары', icon: Gem, bg: NEO.lime },
    { id: 'charms', label: 'Чармы', icon: Sparkles, bg: NEO.pink },
    { id: 'materials', label: 'Материалы', icon: Package, bg: NEO.yellow },
    { id: 'spells', label: 'Заклинания', icon: Zap, bg: NEO.cyan },
    { id: 'racial', label: 'Расовые', icon: Users, bg: NEO.violet },
    { id: 'npcs', label: 'Бестиарий', icon: Sword, bg: NEO.red },
    { id: 'recipes', label: 'Рецепты', icon: FlaskConical, bg: '#0891b2' },
    { id: 'consumables', label: 'Расходники', icon: ScrollIcon, bg: '#7c3aed' },
];
const ITEM_TYPES = ['all', 'Базовый аксессуар', 'Сборный артефакт'];
// Все характеристики для фильтра (из STAT_DEF), КРОМЕ: magicDmg, physDmg, hp
const EXCLUDED_STATS = ['magicDmg', 'physDmg', 'hp'];
const ALL_STAT_KEYS = Object.keys(STAT_DEF).filter(k => !EXCLUDED_STATS.includes(k));
// 3 состояния фильтра: null (не выбран) → 'include' (должен иметь) → 'exclude' (не должен иметь) → null
const STAT_STATES = [null, 'include', 'exclude'];
const RACIAL_ROLES = [
    { id: 'all', label: 'Все' },
    { id: 'урон', label: 'Урон' },
    { id: 'поддержка', label: 'Поддержка' },
    { id: 'танк', label: 'Танк' },
];
const ROLE_COLORS = { 'урон': NEO.red, 'поддержка': NEO.lime, 'танк': NEO.cyan };
// Spell elements and ranks for filter
const SPELL_ELEMENTS = ['🔥 Огонь', '🌊 Вода', '🌪️ Воздух', '🗿 Земля', '🌞 Свет', '🌑 Тьма', '🌌 Хаос', '🌀 Призыв', '🌐Телепортация', '✨Иллюзия', '⚔️Кинжалы', '🛡️🗡️Одноручное оружие + Щит', '🔱Копье', '🗡️Двуручное оружие', '🏹Лук', 'посох'];
const SPELL_RANKS = ['D', 'DD', 'C', 'CC', 'B', 'BB', 'A', 'AA', 'S', 'SS'];
const SPELL_ELEMENT_COLORS = {
    '🔥 Огонь': NEO.red, '🌊 Вода': NEO.cyan, '🌪️ Воздух': NEO.lime,
    '🗿 Земля': NEO.yellow, '🌞 Свет': '#fbbf24', '🌑 Тьма': '#a855f7',
    '🌌 Хаос': NEO.pink, '🌀 Призыв': '#10b981', '🌐Телепортация': NEO.cyan,
    '✨Иллюзия': NEO.pink,
    '⚔️Кинжалы': '#f97316',
    '🛡️🗡️Одноручное оружие + Щит': '#3b82f6', '🔱Копье': '#06b6d4',
    '🗡️Двуручное оружие': '#dc2626', '🏹Лук': '#22c55e', 'посох': '#8b5cf6',
};
// Типы оружия — для них лейбл "Оружие" вместо "Стихия"
const WEAPON_ELEMENTS = ['⚔️Кинжалы', '🛡️🗡️Одноручное оружие + Щит', '🔱Копье', '🗡️Двуручное оружие', '🏹Лук', 'посох'];
const isWeapon = (el) => WEAPON_ELEMENTS.includes(el);
const elementLabel = (el) => isWeapon(el) ? 'Оружие' : 'Стихия';
// Element → accent color (replicated from ArmoryPage.elementColor, merged with
// SPELL_ELEMENT_COLORS so all known elements get a sensible color).
// Used by DetailModal (for spells) to color the header by element.
const ELEMENT_COLOR_MAP = {
    // From SPELL_ELEMENT_COLORS (above)
    '🔥 Огонь': NEO.red,
    '🌊 Вода': NEO.cyan,
    '🌪️ Воздух': NEO.lime,
    '🗿 Земля': NEO.yellow,
    '🌞 Свет': '#fbbf24',
    '🌑 Тьма': '#a855f7',
    '🌌 Хаос': NEO.pink,
    '🌀 Призыв': '#10b981',
    '🌐Телепортация': NEO.cyan,
    '✨Иллюзия': NEO.pink,
    // Extra elements from ArmoryPage.elementColor
    '⚡ Молния': '#facc15',
    '❄️ Лёд': '#7dd3fc',
    '🩸 Кровь': '#dc2626',
    '🧿 Природа': '#65a30d',
    // Weapon types
    '⚔️Кинжалы': '#f97316',
    '🛡️🗡️Одноручное оружие + Щит': '#3b82f6',
    '🔱Копье': '#06b6d4',
    '🗡️Двуручное оружие': '#dc2626',
    '🏹Лук': '#22c55e',
    'посох': '#8b5cf6',
};
const elementColor = (el) => ELEMENT_COLOR_MAP[el] || NEO.muted;
// Material types for filter
const MATERIAL_TYPES = ['Дерево', 'Драгоценный камень', 'Монстр', 'Руда', 'Ткань', 'Торговец', 'Трава'];
const MATERIAL_TYPE_COLORS = {
    'Дерево': '#92400e', 'Драгоценный камень': NEO.cyan, 'Монстр': NEO.red,
    'Руда': NEO.muted, 'Ткань': NEO.lime, 'Торговец': NEO.yellow, 'Трава': '#16a34a',
};
// ═════ Bestiary (NPCs) filters ═════
const NPC_TYPES = [
    { id: 'all', label: 'Все', color: NEO.ink },
    { id: 'Босс', label: 'Босс', color: NEO.red },
    { id: 'Монстр', label: 'Монстр', color: NEO.yellow },
    { id: 'Торговец', label: 'Торговец', color: NEO.cyan },
];
// Статы для фильтра бестиария — все ключи из STAT_DEF (включая hp)
const NPC_STAT_KEYS = Object.keys(STAT_DEF);
// Множитель ранга для оценки урона (как в ArmoryPage)
const NPC_RANK_MULT = { D: 1, DD: 2, C: 3, CC: 4, B: 5, BB: 6, A: 7, AA: 8, S: 9, SS: 10 };
// ═════ Helpers ═════
function renderStats(stats, maxBadges = Infinity) {
    if (!stats || typeof stats !== 'object')
        return null;
    const entries = Object.entries(stats).filter(([k, v]) => v !== 0 && v !== '' && v != null);
    if (entries.length === 0)
        return null;
    return (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {entries.slice(0, maxBadges).map(([key, value]) => {
            const def = STAT_DEF[key];
            const color = STAT_COLOR[key] || NEO.muted;
            const Icon = def?.icon || Activity;
            const label = def?.label || key;
            const suffix = def?.suffix || '';
            const prefix = def?.prefix || '+';
            return (<span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', fontSize: 10, fontWeight: 700, backgroundColor: color, color: '#fff', border: `2px solid ${NEO.ink}` }}>
            <Icon size={9} strokeWidth={2.5}/>
            {label} {prefix}{value}{suffix}
          </span>);
        })}
    </div>);
}
function truncate(str, max = 80) {
    if (!str)
        return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
}
// ═════ NPC ability damage calculation ═════
// Адаптировано из ArmoryPage.calcSpellDamage — вычисляет ориентировочный
// урон заклинания по характеристикам NPC.
function deriveNpcSpellStats(stats) {
    // Используем deriveFullStats — те же формулы что в армори
    const derived = deriveFullStats(stats);
    // Добавляем синонимы для переменных из формул
    return {
        ...derived,
        agility: derived.agi,
        intellect: derived.int,
        crit_chance: derived.crit,
        crit_damage: derived.critDmg,
        lifesteal: derived.physVamp,
        mana_regen: derived.mpRegen,
        resistance: derived.magicResist,
        haste: derived.speed,
    };
}
function calcNpcSpellDamage(spell, npcStats, spellFormulas) {
    if (!spell || !spell.rank || !NPC_RANK_MULT[spell.rank])
        return null;
    const x = NPC_RANK_MULT[spell.rank];
    const s = deriveNpcSpellStats(npcStats);
    // Выбор формулы: точечная (spell.formula) или стихийная базовая
    let formula = '';
    let rankPercent = 0;
    if (spell.formula && String(spell.formula).trim()) {
        formula = String(spell.formula);
    }
    else if (spellFormulas && spell.element && spellFormulas[spell.element]) {
        formula = spellFormulas[spell.element].baseFormula || '';
        rankPercent = spellFormulas[spell.element].rankPercents?.[spell.rank] ?? 0;
    }
    if (!formula)
        formula = 'M*0,12*((crit*0,12))';
    formula = formula.replace(/,/g, '.');
    const vars = {
        M: s.magicDmg ?? 0,
        P: s.physDmg ?? 0,
        x,
        str: s.str ?? 0,
        agi: s.agi ?? 0,
        int: s.int ?? 0,
        topStat: Math.max(s.str ?? 0, s.agi ?? 0, s.int ?? 0),
        armor: s.armor ?? 0,
        speed: s.speed ?? 0,
        haste: s.haste ?? 0,
        mastery: s.mastery ?? 0,
        crit: s.crit ?? 0,
        critDmg: s.critDmg ?? 0,
        crit_chance: s.crit_chance ?? 0,
        crit_damage: s.crit_damage ?? 0,
        hp: s.hp ?? 0,
        maxHp: s.maxHp ?? s.hp ?? 0,
        hpRegen: s.hpRegen ?? 0,
        mp: s.manaPool ?? 0,
        mpRegen: s.mpRegen ?? 0,
        mana_regen: s.mana_regen ?? 0,
        stamina: s.stamina ?? 0,
        staminaRegen: s.staminaRegen ?? 0,
        energyRegen: s.energyRegen ?? 0,
        moveSpeed: s.moveSpeed ?? 0,
        magicResist: s.magicResist ?? 0,
        resistance: s.resistance ?? 0,
        physVamp: s.physVamp ?? 0,
        magicVamp: s.magicVamp ?? 0,
        lifesteal: s.lifesteal ?? 0,
        manaPool: s.manaPool ?? 0,
        cooldown: s.cooldown ?? 0,
        spellRadius: s.spellRadius ?? 100,
    };
    let expr = formula;
    const names = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const name of names) {
        const re = new RegExp(`\\b${name}\\b`, 'g');
        expr = expr.replace(re, `(${vars[name]})`);
    }
    try {
        const val = evaluateFormula(expr);
        if (typeof val === 'number' && isFinite(val)) {
            return val * (1 + rankPercent / 100);
        }
        return null;
    }
    catch {
        return null;
    }
}
// ═════ HoverTooltip — показывает полное описание при наведении ═════
const useHoverTooltip = (text) => {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const timerRef = useRef(null);
    const showRef = useRef(false);
    // Keep ref in sync
    useEffect(() => { showRef.current = show; }, [show]);
    const handlers = {
        onMouseEnter: (e) => {
            if (!text)
                return;
            if (timerRef.current)
                clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setPos({ x: e.clientX, y: e.clientY });
                setShow(true);
                showRef.current = true;
            }, 300);
        },
        onMouseMove: (e) => {
            if (showRef.current)
                setPos({ x: e.clientX, y: e.clientY });
        },
        onMouseLeave: () => {
            if (timerRef.current)
                clearTimeout(timerRef.current);
            setShow(false);
            showRef.current = false;
        },
    };
    const tooltip = show && text ? (<div style={{
            position: 'fixed',
            left: Math.min(pos.x + 14, window.innerWidth - 360),
            top: Math.min(pos.y + 14, window.innerHeight - 200),
            zIndex: 90, maxWidth: 340,
            backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.ink}`, padding: 12,
            fontSize: 12, fontWeight: 500, color: NEO.ink, lineHeight: 1.5,
            whiteSpace: 'pre-wrap', pointerEvents: 'none',
        }}>
      {text}
    </div>) : null;
    return { handlers, tooltip };
};
// ═════ CharmRow (с слайдером — полный функционал) ═════
function CharmRow({ charm }) {
    const tiers = ['Элита', 'Эпик', 'Лега', 'Мифик'];
    const [level, setLevel] = useState(1);
    const [slots, setSlots] = useState(['energyRegen', 'magicDmg', 'physDmg', 'hp']);
    const [expanded, setExpanded] = useState(false);
    let tier = 0;
    if (level >= 15)
        tier = 3;
    else if (level >= 10)
        tier = 2;
    else if (level >= 5)
        tier = 1;
    const descs = useMemo(() => {
        const d0 = charm.desc?.match(/\[Элита\]:\s*(.*?)(?=\n\[Эпик\]|$)/s)?.[1] || charm.desc || '';
        const d1 = charm.desc?.match(/\[Эпик\]:\s*(.*?)(?=\n\[Лега\]|$)/s)?.[1] || d0;
        const d2 = charm.desc?.match(/\[Лега\]:\s*(.*?)(?=\n\[Мифик\]|$)/s)?.[1] || d1;
        const d3 = charm.desc?.match(/\[Мифик\]:\s*(.*?)$/s)?.[1] || d2;
        return [d0, d1, d2, d3];
    }, [charm.desc]);
    const activeSlots = slots.slice(0, tier + 1);
    const aggregatedStats = {};
    activeSlots.forEach(statKey => {
        if (!statKey)
            return;
        const baseVal = charm.stats?.[statKey] || CHARM_BASE_STATS[statKey] || 0;
        aggregatedStats[statKey] = baseVal * level;
    });
    const dynamicId = `${charm.id}${tier}`;
    const tierColors = [NEO.lime, NEO.cyan, NEO.pink, NEO.yellow];
    return (<div style={{ backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}` }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', backgroundColor: NEO.bg, borderBottom: expanded ? `2px solid ${NEO.ink}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconImg icon={charm.icon} alt={charm.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Sparkles size={20} strokeWidth={2.5} style={{ color: NEO.pink }}/>}/>
          </div>
          <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 800, fontFamily: 'monospace', backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>#{dynamicId}</span>
          <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: NEO.ink }}>{charm.name}</span>
          <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', backgroundColor: tierColors[tier], color: NEO.ink, border: `1px solid ${NEO.ink}` }}>[{tiers[tier]}] · {tier + 1} стат{tier === 0 ? '' : 'а'}</span>
        </div>
        <ChevronRight size={18} strokeWidth={2.5} style={{ color: NEO.ink, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}/>
      </div>
      {expanded && (<div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted }}>Уровень</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: NEO.limeDark, fontFamily: 'monospace' }}>{level} / 100</span>
            </div>
            <input type="range" min="1" max="100" value={level} onChange={e => setLevel(Number(e.target.value))} style={{ width: '100%', height: 16, cursor: 'pointer', accentColor: NEO.lime }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 8 }}>Слоты статов ({tier + 1})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: tier + 1 }).map((_, idx) => (<div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: NEO.muted, minWidth: 50 }}>Слот {idx + 1}:</span>
                    <select value={slots[idx]} onChange={(e) => { const ns = [...slots]; ns[idx] = e.target.value; setSlots(ns); }} style={{ flex: 1, padding: '4px 8px', fontSize: 11, fontWeight: 600, backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', outline: 'none' }}>
                      {Object.keys(CHARM_BASE_STATS).map(k => {
                    const isElsewhere = activeSlots.includes(k) && slots[idx] !== k;
                    const baseVal = charm.stats?.[k] || CHARM_BASE_STATS[k] || 0;
                    return <option key={k} value={k} disabled={isElsewhere}>{STAT_DEF[k]?.label || k} (+{baseVal})</option>;
                })}
                    </select>
                  </div>))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 8 }}>Итоговые характеристики</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(aggregatedStats).map(([key, value]) => {
                const def = STAT_DEF[key];
                if (!def)
                    return null;
                const dv = Number(value).toFixed(2);
                const color = STAT_COLOR[key] || NEO.muted;
                return <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', backgroundColor: color, color: '#fff', border: `2px solid ${NEO.ink}`, fontSize: 11 }}><span style={{ fontWeight: 700 }}>{def.label}</span><span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{def.prefix}{dv}{def.suffix}</span></div>;
            })}
              </div>
            </div>
          </div>
          {descs[tier] && (<div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Описание ({tiers[tier]})</div>
              <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontSize: 13, fontWeight: 500, color: NEO.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{descs[tier]}</div>
            </div>)}
        </div>)}
    </div>);
}
// ═════ RacialSpellCard (сворачиваемая, показывает role вместо class) ═════
function RacialSpellCard({ race, stats }) {
    const [expanded, setExpanded] = useState(false);
    const role = race.role || 'урон';
    const roleColor = ROLE_COLORS[role] || NEO.muted;
    return (<div style={{ backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}` }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', backgroundColor: NEO.bg, borderBottom: expanded ? `2px solid ${NEO.ink}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconImg icon={race.icon} alt={race.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Users size={20} strokeWidth={2.5} style={{ color: NEO.violet }}/>}/>
          </div>
          <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: NEO.ink }}>{race.name}</span>
          {/* Role badge instead of class name */}
          <span style={{ padding: '2px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', backgroundColor: roleColor, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{role}</span>
        </div>
        <ChevronRight size={18} strokeWidth={2.5} style={{ color: NEO.ink, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}/>
      </div>
      {expanded && race.abilities && (<div style={{ overflowX: 'auto', borderTop: `2px solid ${NEO.ink}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead><tr style={{ backgroundColor: NEO.ink }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow }}>Описание</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow, width: 120 }}>Cost Energy</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow, width: 140 }}>Прокачка</th>
            </tr></thead>
            <tbody>
              {race.abilities.map((ab, idx) => (<tr key={idx} style={{ borderBottom: `1px solid ${NEO.ink}`, backgroundColor: idx % 2 === 0 ? NEO.surface : NEO.bg }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 500, color: NEO.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{stats ? evalDescription(ab.desc, stats) : ab.desc}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{ab.energy && ab.energy !== '-' ? <span style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, backgroundColor: NEO.cyan, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{ab.energy}</span> : <span style={{ color: NEO.muted, fontSize: 11 }}>-</span>}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{ab.upgrade && ab.upgrade !== '-' ? <span style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, backgroundColor: NEO.yellow, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{ab.upgrade}</span> : <span style={{ color: NEO.muted, fontSize: 11 }}>-</span>}</td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
    </div>);
}
// ═════ ItemCard (с hover tooltip для полного описания) ═════
function ItemCard({ item, onClick }) {
    const isArtifact = item.type === 'Сборный артефакт';
    const cardBg = isArtifact ? NEO.yellow : NEO.surface;
    const { handlers, tooltip } = useHoverTooltip(item.desc);
    return (<div onClick={() => onClick(item)} style={{ backgroundColor: cardBg, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, padding: 12, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 140 }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', color: NEO.muted }}>#{item.id}</span>
        <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', backgroundColor: isArtifact ? NEO.ink : NEO.bg, color: isArtifact ? NEO.yellow : NEO.ink, border: `1px solid ${NEO.ink}` }}>{isArtifact ? 'АРТЕФАКТ' : 'БАЗОВЫЙ'}</span>
      </div>
      <div style={{ width: 44, height: 44, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
        <IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Gem size={22} strokeWidth={2.5} style={{ color: isArtifact ? NEO.yellowDark : NEO.lime }}/>}/>
      </div>
      <div {...handlers} style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 13, lineHeight: 1.2, color: NEO.ink, cursor: 'help' }}>{item.name}</div>
      {tooltip}
      {isArtifact && item.recipe && <div style={{ fontSize: 9, fontWeight: 600, color: NEO.muted, fontFamily: 'monospace' }}>Рецепт: {item.recipe}</div>}
      <div style={{ marginTop: 'auto' }}>{renderStats(item.stats)}</div>
    </div>);
}
function MaterialCard({ item, onClick }) {
    const { handlers, tooltip } = useHoverTooltip(item.desc);
    return (<div onClick={() => onClick(item)} style={{ backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, padding: 12, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 100 }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', color: NEO.muted }}>#{item.id}</span>
        <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', backgroundColor: NEO.yellow, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{item.type}</span>
      </div>
      <div style={{ width: 40, height: 40, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
        <IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Package size={20} strokeWidth={2.5} style={{ color: NEO.yellowDark }}/>}/>
      </div>
      <div {...handlers} style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 13, lineHeight: 1.2, color: NEO.ink, cursor: 'help' }}>{item.name}</div>
      {tooltip}
      {item.desc && <div style={{ fontSize: 10, fontWeight: 500, color: NEO.muted, lineHeight: 1.3 }}>{truncate(item.desc, 60)}</div>}
    </div>);
}
function SpellCard({ spell, onClick, isCombo = false }) {
    const { handlers, tooltip } = useHoverTooltip(spell.desc);
    const elementColor = {
        '🔥 Огонь': NEO.red, '🌊 Вода': NEO.cyan, '🌪️ Воздух': NEO.lime,
        '🗿 Земля': NEO.yellow, '🌞 Свет': '#fbbf24', '🌑 Тьма': '#a855f7',
        '🌌 Хаос': NEO.pink, '🌀 Призыв': '#10b981', '🌐Телепортация': NEO.cyan,
        '✨Иллюзия': NEO.pink,
    };
    const elemBg = elementColor[spell.element] || NEO.cyan;
    return (<div onClick={() => onClick(spell)} style={{ backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, padding: 12, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 120 }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', color: NEO.muted }}>#{spell.id}</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {spell.rank && <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{spell.rank}</span>}
          {spell.element && <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, backgroundColor: elemBg, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{spell.element}</span>}
        </div>
      </div>
      <div style={{ width: 48, height: 48, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
        <IconImg icon={spell.icon} alt={spell.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Zap size={24} strokeWidth={2.5} style={{ color: elemBg }}/>}/>
      </div>
      <div {...handlers} style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 13, lineHeight: 1.2, color: NEO.ink, cursor: 'help' }}>{spell.name}</div>
      {tooltip}
      {spell.desc && <div style={{ fontSize: 10, fontWeight: 500, color: NEO.muted, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{spell.desc}</div>}
      {(spell.manaCost || spell.castTime) && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>{spell.manaCost && <span style={{ padding: '1px 5px', fontSize: 9, fontWeight: 700, backgroundColor: NEO.bg, border: `1px solid ${NEO.ink}`, color: NEO.ink }}>💎 {spell.manaCost}</span>}{spell.castTime && <span style={{ padding: '1px 5px', fontSize: 9, fontWeight: 700, backgroundColor: NEO.bg, border: `1px solid ${NEO.ink}`, color: NEO.ink }}>⏱ {spell.castTime}</span>}</div>}
    </div>);
}
// ═════ NpcRow — expandable bestiary card ═════
// Сворачиваемая карточка NPC (как RacialSpellCard/CharmRow): клик разворачивает
// блок с характеристиками и таблицей способностей. Урон каждой способности
// вычисляется по статам NPC (формулы стихий/оружия).
function NpcRow({ npc, spells, spellFormulas }) {
    const [expanded, setExpanded] = useState(false);
    const isBoss = npc.type === 'Босс';
    const isTrader = npc.type === 'Торговец';
    const stats = (npc.stats && typeof npc.stats === 'object') ? npc.stats : {};
    // Вычисляем все производные характеристики (как в армори)
    const fullStats = deriveFullStats(stats);
    const rawAbilities = Array.isArray(npc.abilities) ? npc.abilities : [];
    // Берём только первые 9 (как ограничение в задании)
    const abilities = rawAbilities.slice(0, 9);
    const spellList = abilities
        .map(id => spells.find(s => s.id === id))
        .filter(Boolean);
    // Показываем все статы (базовые + производные)
    const statEntries = Object.entries(fullStats).filter(([, v]) => v !== 0 && v !== '' && v != null);
    const typeColor = isBoss ? NEO.red : isTrader ? NEO.cyan : NEO.yellow;
    const elemBg = npc.element ? (SPELL_ELEMENT_COLORS[npc.element] || NEO.muted) : null;
    return (<div style={{ backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}` }}>
      {/* Header (кликабельный) */}
      <div onClick={() => setExpanded(!expanded)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', cursor: 'pointer',
            backgroundColor: isBoss ? NEO.red : NEO.bg,
            borderBottom: expanded ? `2px solid ${NEO.ink}` : 'none',
            flexWrap: 'wrap', gap: 8,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: isBoss ? NEO.ink : NEO.surface, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconImg icon={npc.icon} alt={npc.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Sword size={20} strokeWidth={2.5} style={{ color: isBoss ? NEO.yellow : NEO.red }}/>}/>
          </div>
          <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 800, fontFamily: 'monospace', backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>#{npc.id}</span>
          <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: isBoss ? '#fff' : NEO.ink }}>{npc.name}</span>
          <span style={{ padding: '2px 10px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', backgroundColor: typeColor, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{npc.type}</span>
          {elemBg && (<span style={{ padding: '2px 10px', fontSize: 10, fontWeight: 800, backgroundColor: elemBg, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{npc.element}</span>)}
          {npc.location && (<span style={{ padding: '2px 10px', fontSize: 10, fontWeight: 600, backgroundColor: isBoss ? 'rgba(0,0,0,0.3)' : NEO.surface, color: isBoss ? '#fff' : NEO.ink, border: `1px solid ${NEO.ink}` }}>📍 {npc.location}</span>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {statEntries.length > 0 && (<span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, backgroundColor: isBoss ? NEO.ink : NEO.lime, color: isBoss ? NEO.lime : NEO.ink, border: `1px solid ${NEO.ink}` }}>
              {statEntries.length} стат{statEntries.length === 1 ? '' : statEntries.length < 5 ? 'а' : 'ов'}
            </span>)}
          {spellList.length > 0 && (<span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, backgroundColor: isBoss ? NEO.ink : NEO.cyan, color: isBoss ? NEO.cyan : NEO.ink, border: `1px solid ${NEO.ink}` }}>
              {spellList.length} способн{spellList.length === 1 ? 'ость' : spellList.length < 5 ? 'ости' : 'остей'}
            </span>)}
          <ChevronRight size={18} strokeWidth={2.5} style={{ color: isBoss ? '#fff' : NEO.ink, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}/>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (<div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, backgroundColor: NEO.surface }}>
          {/* Description */}
          {npc.desc && (<div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Описание</div>
              <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontSize: 13, fontWeight: 500, color: NEO.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{npc.desc}</div>
            </div>)}

          {/* Stats table */}
          {statEntries.length > 0 && (<div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Характеристики</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}>
                {statEntries.map(([key, value]) => {
                    const def = STAT_DEF[key];
                    const color = STAT_COLOR[key] || NEO.muted;
                    const label = def?.label || key;
                    const isCustom = stats[key] !== undefined;
                    const numVal = typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value;
                    return (<div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', fontSize: 11, fontWeight: 600, color: NEO.ink, borderBottom: `1px solid ${NEO.ink}`, borderRight: `1px solid ${NEO.ink}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, backgroundColor: color, border: `1px solid ${NEO.ink}`, flexShrink: 0 }}/>
                        {label}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: isCustom ? NEO.red : NEO.ink }}>{numVal}</span>
                    </div>);
                })}
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, color: NEO.muted, marginTop: 4 }}>
                <span style={{ color: NEO.red }}>Красным</span> — задано вручную, остальные вычислены из основных характеристик
              </div>
            </div>)}

          {/* Abilities table */}
          {spellList.length > 0 ? (<div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Способности ({spellList.length})</div>
              <div style={{ overflowX: 'auto', border: `2px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead>
                    <tr style={{ backgroundColor: NEO.ink }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow, width: 200 }}>Заклинание</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow, width: 110 }}>Стихия/Оружие</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow, width: 50 }}>Ранг</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow }}>Описание (по статам NPC)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow, width: 90 }}>Урон</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.yellow, width: 70 }}>Мана</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spellList.map((spell, idx) => {
                    const spellElemColor = SPELL_ELEMENT_COLORS[spell.element] || NEO.muted;
                    const evaledDesc = evalDescription(spell.desc, fullStats);
                    const dmg = calcNpcSpellDamage(spell, fullStats, spellFormulas);
                    return (<tr key={spell.id} style={{ borderBottom: `1px solid ${NEO.ink}`, backgroundColor: idx % 2 === 0 ? NEO.surface : NEO.bg }}>
                          <td style={{ padding: '10px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 28, height: 28, flexShrink: 0, backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconImg icon={spell.icon} alt={spell.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Zap size={14} strokeWidth={2.5} style={{ color: spellElemColor }}/>}/>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: NEO.ink, lineHeight: 1.2 }}>{spell.name}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, fontFamily: 'monospace', color: NEO.muted }}>#{spell.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            {spell.element ? (<span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, backgroundColor: spellElemColor, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{spell.element}</span>) : <span style={{ color: NEO.muted, fontSize: 11 }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            {spell.rank ? (<span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{spell.rank}</span>) : <span style={{ color: NEO.muted, fontSize: 11 }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 10px', fontSize: 11, fontWeight: 500, color: NEO.ink, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{evaledDesc || '—'}</td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            {dmg !== null ? (<span style={{ padding: '3px 8px', fontSize: 12, fontWeight: 800, fontFamily: 'monospace', backgroundColor: NEO.lime, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>≈ {dmg.toFixed(0)}</span>) : <span style={{ color: NEO.muted, fontSize: 11 }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            {spell.manaCost ? (<span style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, backgroundColor: NEO.cyan, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{spell.manaCost}</span>) : <span style={{ color: NEO.muted, fontSize: 11 }}>—</span>}
                          </td>
                        </tr>);
                })}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 10, fontWeight: 500, color: NEO.muted, marginTop: 6, fontStyle: 'italic' }}>
                Урон вычисляется по характеристикам NPC (M = int·k, P = str·k). Формулы описаний подставляются через evalDescription.
              </div>
            </div>) : (<div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontSize: 12, fontWeight: 600, color: NEO.muted, textAlign: 'center' }}>
              У этого NPC нет способностей.
            </div>)}
        </div>)}
    </div>);
}
// ═════ NpcCard — компактная карточка для grid-режима (fallback, кликабельная) ═════
function NpcCard({ npc, onClick }) {
    const isBoss = npc.type === 'Босс';
    const { handlers, tooltip } = useHoverTooltip(npc.desc);
    const stats = (npc.stats && typeof npc.stats === 'object') ? npc.stats : {};
    const abilities = Array.isArray(npc.abilities) ? npc.abilities : [];
    const elemBg = npc.element ? (SPELL_ELEMENT_COLORS[npc.element] || NEO.muted) : null;
    return (<div onClick={() => onClick(npc)} style={{ backgroundColor: isBoss ? NEO.red : NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, padding: 12, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 120 }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', color: isBoss ? '#fff' : NEO.muted }}>#{npc.id}</span>
        <div style={{ display: 'flex', gap: 3 }}>
          <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', backgroundColor: isBoss ? NEO.ink : NEO.bg, color: isBoss ? NEO.yellow : NEO.ink, border: `1px solid ${NEO.ink}` }}>{npc.type}</span>
          {elemBg && <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, backgroundColor: elemBg, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{npc.element}</span>}
        </div>
      </div>
      <div style={{ width: 44, height: 44, backgroundColor: isBoss ? NEO.ink : NEO.bg, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
        <IconImg icon={npc.icon} alt={npc.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Sword size={22} strokeWidth={2.5} style={{ color: isBoss ? NEO.yellow : NEO.red }}/>}/>
      </div>
      <div {...handlers} style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 13, lineHeight: 1.2, color: isBoss ? '#fff' : NEO.ink, cursor: 'help' }}>{npc.name}</div>
      {tooltip}
      {npc.location && <div style={{ fontSize: 10, fontWeight: 500, color: isBoss ? '#fff' : NEO.muted }}>📍 {npc.location}</div>}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
        {abilities.length > 0 && <span style={{ padding: '1px 6px', fontSize: 9, fontWeight: 700, backgroundColor: isBoss ? NEO.ink : NEO.cyan, color: isBoss ? NEO.cyan : NEO.ink, border: `1px solid ${NEO.ink}` }}>{abilities.length} способн.</span>}
        {Object.keys(stats).length > 0 && <span style={{ padding: '1px 6px', fontSize: 9, fontWeight: 700, backgroundColor: isBoss ? NEO.ink : NEO.lime, color: isBoss ? NEO.lime : NEO.ink, border: `1px solid ${NEO.ink}` }}>{Object.keys(stats).length} стат.</span>}
      </div>
    </div>);
}
// ═════ DetailModal ═════
// Плейсхолдер иконки в таблице (когда icon не задан) — по типу предмета
function TablePlaceholderIcon({ item }) {
    const isArtifact = item?.type === 'Сборный артефакт';
    let Icon = Package, color = NEO.yellowDark;
    if (isArtifact) {
        Icon = Gem;
        color = NEO.yellowDark;
    }
    else if (item?.type === 'Базовый аксессуар') {
        Icon = Gem;
        color = NEO.lime;
    }
    else if (item?.type && ['Ткань', 'Трава', 'Руда', 'Кожа', 'Эссенция'].includes(item.type)) {
        Icon = Package;
        color = NEO.yellowDark;
    }
    else {
        Icon = Package;
        color = NEO.muted;
    }
    return <Icon size={18} strokeWidth={2.5} style={{ color }}/>;
}
// ═════ RecipeCard — карточка рецепта (расходники/аксессуары/зелья/свитки) ═════
const RECIPE_CATEGORY_LABELS = {
    accessories: 'Аксессуары', charms: 'Чармы', chemistry: 'Зелья',
    gems: 'Самоцветы', scrolls: 'Свитки',
};
const RECIPE_CATEGORY_COLORS = {
    accessories: NEO.lime, charms: NEO.pink, chemistry: '#0891b2',
    gems: NEO.cyan, scrolls: '#8b5cf6',
};
const RARITY_COLORS = {
    common: NEO.muted, uncommon: NEO.lime, rare: NEO.cyan,
    epic: NEO.pink, legendary: NEO.yellow,
};
function RecipeCard({ item, onClick }) {
    const catLabel = RECIPE_CATEGORY_LABELS[item.category] || item.category;
    const catColor = RECIPE_CATEGORY_COLORS[item.category] || NEO.cyan;
    const rarityColor = RARITY_COLORS[item.rarity] || NEO.muted;
    return (<div onClick={() => onClick(item)} style={{ backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, padding: 12, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 130 }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', color: NEO.muted }}>#{item.id}</span>
        <div style={{ display: 'flex', gap: 3 }}>
          <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', backgroundColor: catColor, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{catLabel}</span>
          {item.rarity && <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', backgroundColor: rarityColor, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{item.rarity}</span>}
        </div>
      </div>
      <div style={{ width: 40, height: 40, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
        <IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={item.category === 'scrolls' ? <ScrollIcon size={20} strokeWidth={2.5} style={{ color: '#8b5cf6' }}/> : <FlaskConical size={20} strokeWidth={2.5} style={{ color: catColor }}/>}/>
      </div>
      <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 13, lineHeight: 1.2, color: NEO.ink }}>{item.name}</div>
      {item.desc && <div style={{ fontSize: 10, fontWeight: 500, color: NEO.muted, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.desc}</div>}
      {item.mats && item.mats.length > 0 && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 'auto' }}>
          {item.mats.slice(0, 4).map((m, i) => (<span key={i} style={{ padding: '1px 5px', fontSize: 8, fontWeight: 700, backgroundColor: NEO.bg, border: `1px solid ${NEO.ink}`, color: NEO.ink }}>{m.name} ×{m.qty}</span>))}
          {item.mats.length > 4 && <span style={{ padding: '1px 5px', fontSize: 8, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>+{item.mats.length - 4}</span>}
        </div>)}
      {item.skill && <div style={{ fontSize: 9, fontWeight: 700, color: NEO.muted }}>Навык: {item.skill}</div>}
    </div>);
}
// Плейсхолдер иконки в детальном окне (когда icon не задан)
function DetailPlaceholderIcon({ type, item }) {
    const isBoss = item?.type === 'Босс';
    const isArtifact = item?.type === 'Сборный артефакт';
    let Icon = Package, color = NEO.muted;
    if (type === 'spell') {
        Icon = Zap;
        color = NEO.cyan;
    }
    else if (type === 'npc') {
        Icon = Sword;
        color = isBoss ? NEO.yellow : NEO.red;
    }
    else if (type === 'charm') {
        Icon = Sparkles;
        color = NEO.pink;
    }
    else if (type === 'item' || type === 'artifact') {
        Icon = Gem;
        color = isArtifact ? NEO.yellowDark : NEO.lime;
    }
    else if (type === 'material') {
        Icon = Package;
        color = NEO.yellowDark;
    }
    else if (type === 'racial') {
        Icon = Users;
        color = NEO.violet;
    }
    return <Icon size={40} strokeWidth={2.5} style={{ color }}/>;
}
function DetailModal({ item, type, spellFormulas, onClose }) {
    const user = useCurrentUser();
    // showValues: true = показывать вычисленные значения, false = чистая формула {формула}
    const [showValues, setShowValues] = useState(true);
    // spellStats из сохранённого армори игрока
    const spellStats = user?.savedArmory?.spellStats || null;
    if (!item)
        return null;
    const isArtifact = item.type === 'Сборный артефакт';
    const isBoss = item.type === 'Босс';
    const isCombo = type === 'combo';
    let headerBg = NEO.surface, headerFg = NEO.ink;
    if (isArtifact)
        headerBg = NEO.yellow;
    if (isBoss) {
        headerBg = NEO.red;
        headerFg = '#fff';
    }
    if (isCombo)
        headerBg = NEO.cyan;
    if (type === 'charm') {
        headerBg = NEO.pink;
        headerFg = '#fff';
    }
    // Spells: use the element color as the header background (Task 4 — color coding
    // consistency with ArmoryPage's spell detail modal).
    if (type === 'spell' && item.element) {
        headerBg = elementColor(item.element);
        headerFg = NEO.ink;
    }
    const copyItemId = () => {
        const text = `[item:${item.id}]`;
        if (navigator.clipboard)
            navigator.clipboard.writeText(text);
        else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    };
    // Описание: вычисляем {формулы} если showValues и есть spellStats, иначе — как есть
    const displayDesc = (showValues && spellStats) ? evalDescription(item.desc, spellStats) : item.desc;
    const hasFormulas = item.desc && /\{[^}]+\}/.test(item.desc);
    if (typeof document === 'undefined')
        return null;
    return createPortal(<div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: NEO.surface, border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`, width: 'calc(100% - 32px)', maxWidth: 560, maxHeight: '85vh', overflow: 'auto', position: 'relative', margin: 'auto', marginTop: '7vh' }}>
        <div style={{ backgroundColor: headerBg, color: headerFg, padding: '16px 20px', borderBottom: `3px solid ${NEO.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'sticky', top: 0, zIndex: 2 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, fontFamily: 'monospace', opacity: 0.7 }}>#{item.id}</span>
              <span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{item.type || type}</span>
            </div>
            <h2 style={{ margin: 0, fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1.1 }}>{item.name}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, flexShrink: 0, backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} strokeWidth={2.5}/></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 80, height: 80, backgroundColor: NEO.bg, border: `3px solid ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<DetailPlaceholderIcon type={type} item={item}/>}/></div>
          {item.desc && <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted }}>Описание</div>
              {hasFormulas && (<div style={{ display: 'flex', gap: 0, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}>
                  <button onClick={() => setShowValues(true)} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 800, backgroundColor: showValues ? NEO.ink : NEO.surface, color: showValues ? NEO.yellow : NEO.ink, border: 'none', cursor: 'pointer' }}>Значения</button>
                  <button onClick={() => setShowValues(false)} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 800, backgroundColor: !showValues ? NEO.ink : NEO.surface, color: !showValues ? NEO.yellow : NEO.ink, border: 'none', borderLeft: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Формула</button>
                </div>)}
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: NEO.ink, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{displayDesc}</p>
            {hasFormulas && spellStats && showValues && <div style={{ fontSize: 10, fontWeight: 600, color: NEO.muted, marginTop: 4 }}>↳ значения из армори игрока</div>}
            {hasFormulas && !spellStats && showValues && <div style={{ fontSize: 10, fontWeight: 600, color: NEO.red, marginTop: 4 }}>↳ сохраните армори для расчёта значений</div>}
          </div>}
          {isArtifact && item.recipe && <div><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Рецепт</div><div style={{ padding: '8px 12px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: NEO.ink }}>{item.recipe}</div></div>}
          {isCombo && item.combo && <div><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Комбо из</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{item.combo.map((sp, i) => <span key={i} style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, backgroundColor: NEO.cyan, color: NEO.ink, border: `2px solid ${NEO.ink}` }}>{sp}</span>)}</div></div>}
          {item.stats && Object.keys(item.stats).length > 0 && <div><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 8 }}>Характеристики</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{Object.entries(item.stats).filter(([k, v]) => v !== 0 && v !== '' && v != null).map(([key, value]) => { const def = STAT_DEF[key]; const color = STAT_COLOR[key] || NEO.muted; const Icon = def?.icon || Activity; return <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, backgroundColor: color, color: '#fff', border: `2px solid ${NEO.ink}` }}><Icon size={11} strokeWidth={2.5}/>{def?.label || key}: {def?.prefix || '+'}{value}{def?.suffix || ''}</span>; })}</div></div>}
          {item.level && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{item.level && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Уровень</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif', color: NEO.ink }}>{item.level}</div></div>}{item.location && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Локация</div><div style={{ fontSize: 13, fontWeight: 700, color: NEO.ink }}>{item.location}</div></div>}</div>}
          {(item.element || item.manaCost || item.castTime || item.formula) && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>{item.element && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>{elementLabel(item.element)}</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{item.element}</div></div>}{item.rank && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Ранг</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif', color: NEO.ink }}>{item.rank}</div></div>}{item.manaCost && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Мана</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif', color: NEO.ink }}>{item.manaCost}</div></div>}{item.castTime && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Каст</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{item.castTime}</div></div>}{item.cd && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>КД</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{item.cd}</div></div>}{item.value && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Значение</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif', color: NEO.ink }}>{item.value}</div></div>}{item.crystalGen && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Генерация кристаллов</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.limeDark }}>{item.crystalGen}</div></div>}{item.crystalReq && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Требует кристаллов</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.red }}>{item.crystalReq}</div></div>}</div>}
          {type === 'spell' && (() => {
            const disp = getSpellFormulaDisplay(item, spellFormulas);
            if (!disp.custom && !disp.elemental)
                return null;
            return (<div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Формула</div>
                {/* Если есть точечная — показываем её с пометкой */}
                {disp.isOverride && (<div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: NEO.pinkDark, marginBottom: 3 }}>Точечная (перекрывает стихийную):</div>
                    <div style={{ padding: '8px 12px', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: NEO.ink }}>{disp.custom}</div>
                  </div>)}
                {/* Версия из базовой формулы стихии (вычисленная) — показываем всегда для заклинаний */}
                {disp.elemental && (<div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: NEO.muted, marginBottom: 3 }}>{disp.isOverride ? 'Из базовой формулы стихии:' : 'Вычислена из стихии:'}</div>
                    <div style={{ padding: '8px 12px', backgroundColor: disp.isOverride ? NEO.bg : NEO.bg, border: `2px solid ${NEO.ink}`, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: NEO.ink }}>{disp.elemental}</div>
                    {item.element && spellFormulas?.[item.element] && (<div style={{ fontSize: 10, fontWeight: 600, color: NEO.muted, marginTop: 4 }}>
                        Базовая ({item.element}, ранг D): {spellFormulas[item.element].baseFormula}
                        {item.rank && spellFormulas[item.element].rankPercents?.[item.rank] != null ? ` × (1 + ${spellFormulas[item.element].rankPercents[item.rank]}%)` : ''}
                      </div>)}
                  </div>)}
              </div>);
        })()}
          {type === 'recipe' && item.mats && item.mats.length > 0 && (<div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Материалы</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {item.mats.map((m, i) => (<span key={i} style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, backgroundColor: NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}` }}>{m.name} ×{m.qty}</span>))}
              </div>
            </div>)}
          {type === 'recipe' && (item.skill || item.rarity || item.category) && (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
              {item.category && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Категория</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{RECIPE_CATEGORY_LABELS[item.category] || item.category}</div></div>}
              {item.rarity && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Редкость</div><div style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>{item.rarity}</div></div>}
              {item.skill && <div style={{ padding: 12, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Навык</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif', color: NEO.ink }}>{item.skill}</div></div>}
            </div>)}
          {(type === 'item' || type === 'artifact' || type === 'material') && <NeoButton onClick={copyItemId} variant="black" size="sm"><Copy size={12} strokeWidth={2.5}/> Скопировать [item:{item.id}]</NeoButton>}
        </div>
      </div>
    </div>, document.body);
}
// ═════ Главная DatabasePage ═════
export const DatabasePage = () => {
    const params = useParams();
    const navigate = useNavigate();
    // Синхронизация activeTab с URL: /database/:tab
    const urlTab = params.tab;
    const validTabs = ['items', 'charms', 'materials', 'spells', 'racial', 'npcs', 'recipes', 'consumables'];
    const [activeTab, setActiveTabState] = useState(urlTab && validTabs.includes(urlTab) ? urlTab : 'items');
    // При смене URL — обновляем activeTab
    useEffect(() => {
        if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this view after its route or browser-owned data changes.
            setActiveTabState(urlTab);
        }
    }, [urlTab]);
    // При смене вкладки — обновляем URL
    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        navigate('/database/' + tab);
    };
    const [search, setSearch] = useState('');
    const [itemTypeFilter, setItemTypeFilter] = useState('all');
    const [statFilters, setStatFilters] = useState({}); // { str: 'include', agi: 'exclude', ... }
    const [showStatFilter, setShowStatFilter] = useState(false); // свёрнут/раскрыт
    const [spellElementFilter, setSpellElementFilter] = useState('all');
    const [spellRankFilter, setSpellRankFilter] = useState('all');
    const [showSpellFilter, setShowSpellFilter] = useState(false);
    const [materialTypeFilter, setMaterialTypeFilter] = useState('all');
    const [showMaterialFilter, setShowMaterialFilter] = useState(false);
    const [racialRoleFilter, setRacialRoleFilter] = useState('all');
    const [viewMode, setViewMode] = useState('table'); // table по умолчанию
    // Bestiary (NPC) filters
    const [npcTypeFilter, setNpcTypeFilter] = useState('all');
    const [npcLocationFilter, setNpcLocationFilter] = useState('all');
    const [npcElementFilter, setNpcElementFilter] = useState('all');
    const [npcAbilitySearch, setNpcAbilitySearch] = useState('');
    const [npcStatFilters, setNpcStatFilters] = useState({}); // { str: 'include', agi: 'exclude', ... }
    const [showNpcFilter, setShowNpcFilter] = useState(false);
    const [visibleCount, setVisibleCount] = useState(40);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const loadingRef = useRef(null);
    const items = useCollection('DB_ITEMS', DB_ITEMS);
    const charms = useCollection('DB_CHARMS', DB_CHARMS);
    const regularItems = useCollection('DB_REGULAR_ITEMS', DB_REGULAR_ITEMS);
    const spells = useCollection('DB_SPELLS', DB_SPELLS);
    // DB_COMBO_SPELLS removed — all spells are now in DB_SPELLS
    const racialSpells = useCollection('DB_RACIAL_SPELLS', DB_RACIAL_SPELLS);
    const npcs = useCollection('DB_NPCS', DB_NPCS);
    const spellFormulas = useCollection('SPELL_FORMULAS', DEFAULT_SPELL_FORMULAS);
    // spellStats из сохранённого армори — для вычисления {формул} в описаниях таблиц
    const dbUser = useCurrentUser();
    const dbSpellStats = dbUser?.savedArmory?.spellStats || null;
    // MOCK_RECIPES — объект с категориями; преобразуем в плоский массив
    const recipesRaw = useCollection('MOCK_RECIPES', MOCK_RECIPES);
    const recipes = useMemo(() => {
        if (!recipesRaw || typeof recipesRaw !== 'object')
            return [];
        return Object.entries(recipesRaw).flatMap(([cat, arr]) => (Array.isArray(arr) ? arr : []).map(r => ({ ...r, category: cat })));
    }, [recipesRaw]);
    // Reset on tab/filter change
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restart incremental rendering when the filters change.
    useEffect(() => { setVisibleCount(40); }, [activeTab, search, itemTypeFilter, statFilters, racialRoleFilter, spellElementFilter, spellRankFilter, materialTypeFilter, npcTypeFilter, npcLocationFilter, npcElementFilter, npcAbilitySearch, npcStatFilters]);
    // Scroll listener for "scroll to top" button
    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    const filteredData = useMemo(() => {
        let data = [];
        if (activeTab === 'items')
            data = items;
        else if (activeTab === 'charms')
            data = charms;
        else if (activeTab === 'materials')
            data = regularItems;
        else if (activeTab === 'spells')
            data = spells;
        else if (activeTab === 'racial')
            data = racialSpells;
        else if (activeTab === 'npcs')
            data = npcs;
        else if (activeTab === 'recipes')
            data = recipes;
        else if (activeTab === 'consumables')
            data = regularItems.filter(it => it.type === 'Расходник');
        // Materials: исключаем расходники (они в отдельной вкладке)
        if (activeTab === 'materials') {
            data = data.filter(it => it.type !== 'Расходник');
        }
        // Item type filter
        if (activeTab === 'items' && itemTypeFilter !== 'all') {
            data = data.filter(it => it.type === itemTypeFilter);
        }
        // Stat filters — множественный выбор с include/exclude
        if (activeTab === 'items' && Object.keys(statFilters).length > 0) {
            data = data.filter(it => {
                const stats = it.stats || {};
                for (const [statKey, mode] of Object.entries(statFilters)) {
                    if (!mode)
                        continue;
                    const val = stats[statKey];
                    const hasStat = val !== undefined && val !== 0 && val !== '' && val != null && parseFloat(String(val).replace(',', '.')) > 0;
                    if (mode === 'include' && !hasStat)
                        return false; // должен иметь
                    if (mode === 'exclude' && hasStat)
                        return false; // не должен иметь
                }
                return true;
            });
        }
        // Racial role filter
        if (activeTab === 'racial' && racialRoleFilter !== 'all') {
            data = data.filter(it => (it.role || 'урон') === racialRoleFilter);
        }
        // Spell element filter
        if (activeTab === 'spells' && spellElementFilter !== 'all') {
            data = data.filter(it => it.element === spellElementFilter);
        }
        // Spell rank filter
        if (activeTab === 'spells' && spellRankFilter !== 'all') {
            data = data.filter(it => it.rank === spellRankFilter);
        }
        // Material type filter
        if (activeTab === 'materials' && materialTypeFilter !== 'all') {
            data = data.filter(it => it.type === materialTypeFilter);
        }
        // ═══ NPC (Bestiary) filters ═══
        if (activeTab === 'npcs') {
            // By type
            if (npcTypeFilter !== 'all') {
                data = data.filter(it => it.type === npcTypeFilter);
            }
            // By location
            if (npcLocationFilter !== 'all') {
                data = data.filter(it => it.location === npcLocationFilter);
            }
            // By element (including weapon types)
            if (npcElementFilter !== 'all') {
                data = data.filter(it => it.element === npcElementFilter);
            }
            // By ability search (spell name/desc matching)
            if (npcAbilitySearch.trim()) {
                const q = npcAbilitySearch.toLowerCase().trim();
                data = data.filter(it => {
                    const ids = Array.isArray(it.abilities) ? it.abilities : [];
                    if (ids.length === 0)
                        return false;
                    return ids.some(id => {
                        const sp = spells.find(s => s.id === id);
                        if (!sp)
                            return false;
                        return (sp.name || '').toLowerCase().includes(q) || (sp.desc || '').toLowerCase().includes(q);
                    });
                });
            }
            // By stats (include/exclude — как у items)
            if (Object.keys(npcStatFilters).length > 0) {
                data = data.filter(it => {
                    const stats = it.stats || {};
                    for (const [statKey, mode] of Object.entries(npcStatFilters)) {
                        if (!mode)
                            continue;
                        const val = stats[statKey];
                        const hasStat = val !== undefined && val !== 0 && val !== '' && val != null && parseFloat(String(val).replace(',', '.')) > 0;
                        if (mode === 'include' && !hasStat)
                            return false;
                        if (mode === 'exclude' && hasStat)
                            return false;
                    }
                    return true;
                });
            }
        }
        // Search — детальный поиск по всем релевантным полям
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            data = data.filter(it => {
                const name = (it.name || '').toLowerCase();
                const desc = (it.desc || '').toLowerCase();
                const type = (it.type || '').toLowerCase();
                const id = String(it.id || '');
                const element = (it.element || '').toLowerCase();
                const rank = (it.rank || '').toLowerCase();
                const role = (it.role || '').toLowerCase();
                const location = (it.location || '').toLowerCase();
                const recipe = (it.recipe || '').toLowerCase();
                const cls = (it.class || '').toLowerCase();
                // Поиск по статам (ключи и значения)
                let statsStr = '';
                if (it.stats && typeof it.stats === 'object') {
                    statsStr = JSON.stringify(it.stats).toLowerCase();
                }
                // Поиск по способностям (расовые — массив объектов; NPC — массив ID заклинаний)
                let abilitiesStr = '';
                if (Array.isArray(it.abilities)) {
                    if (it.abilities.length > 0 && typeof it.abilities[0] === 'object') {
                        abilitiesStr = it.abilities.map(a => (a.desc || '') + ' ' + (a.upgrade || '')).join(' ').toLowerCase();
                    }
                    else {
                        // NPC: массив числовых ID → тянем имена и описания заклинаний
                        abilitiesStr = it.abilities
                            .map(id => {
                            const sp = spells.find(s => s.id === id);
                            return sp ? ((sp.name || '') + ' ' + (sp.desc || '')) : '';
                        })
                            .join(' ')
                            .toLowerCase();
                    }
                }
                // Поиск по материалам рецептов и категории
                let matsStr = '';
                if (Array.isArray(it.mats)) {
                    matsStr = it.mats.map(m => (m.name || '') + ' ' + (m.qty || '')).join(' ').toLowerCase();
                }
                const category = (it.category || '').toLowerCase();
                return name.includes(q) || desc.includes(q) || type.includes(q) || id.includes(q)
                    || element.includes(q) || rank.includes(q) || role.includes(q)
                    || location.includes(q) || recipe.includes(q) || cls.includes(q)
                    || statsStr.includes(q) || abilitiesStr.includes(q)
                    || matsStr.includes(q) || category.includes(q);
            });
        }
        return data;
    }, [activeTab, search, itemTypeFilter, statFilters, racialRoleFilter, spellElementFilter, spellRankFilter, materialTypeFilter, npcTypeFilter, npcLocationFilter, npcElementFilter, npcAbilitySearch, npcStatFilters, items, charms, regularItems, spells, racialSpells, npcs, recipes]);
    const activeTabDef = TABS.find(t => t.id === activeTab);
    const isCharmsTab = activeTab === 'charms';
    const isRacialTab = activeTab === 'racial';
    const isNpcsTab = activeTab === 'npcs';
    // Уникальные локации и стихии NPC — для фильтров
    const npcLocations = useMemo(() => {
        const set = new Set();
        npcs.forEach(n => { if (n.location)
            set.add(n.location); });
        return Array.from(set);
    }, [npcs]);
    const npcElements = useMemo(() => {
        const set = new Set();
        npcs.forEach(n => { if (n.element)
            set.add(n.element); });
        return Array.from(set);
    }, [npcs]);
    // Toggle NPC stat filter: null → 'include' → 'exclude' → null
    const toggleNpcStatFilter = (statKey) => {
        setNpcStatFilters(prev => {
            const next = { ...prev };
            const current = next[statKey];
            if (!current)
                next[statKey] = 'include';
            else if (current === 'include')
                next[statKey] = 'exclude';
            else
                delete next[statKey];
            return next;
        });
    };
    const handleCardClick = (item) => {
        let type = 'item';
        if (activeTab === 'charms')
            type = 'charm';
        else if (activeTab === 'materials')
            type = 'material';
        else if (activeTab === 'spells')
            type = 'spell';
        else if (activeTab === 'npcs')
            type = 'npc';
        else if (activeTab === 'recipes')
            type = 'recipe';
        else if (activeTab === 'consumables')
            type = 'recipe';
        else if (item.type === 'Сборный артефакт')
            type = 'artifact';
        setSelectedType(type);
        setSelectedItem(item);
    };
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const visibleData = filteredData.slice(0, visibleCount);
    // Toggle stat filter: null → 'include' → 'exclude' → null
    const toggleStatFilter = (statKey) => {
        setStatFilters(prev => {
            const next = { ...prev };
            const current = next[statKey];
            if (!current)
                next[statKey] = 'include'; // 1 клик: включить
            else if (current === 'include')
                next[statKey] = 'exclude'; // 2 клик: исключить
            else
                delete next[statKey]; // 3 клик: сброс
            return next;
        });
    };
    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (!loadingRef.current)
            return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => prev + 40);
            }
        }, { threshold: 0.1 });
        observer.observe(loadingRef.current);
        return () => observer.disconnect();
    }, [filteredData.length, visibleCount]);
    return (<>
      {/* Header — в обычном контейнере (не расширенном), как у других страниц */}
      <div className="space-y-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 48, height: 48, backgroundColor: NEO.cyan, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} strokeWidth={2.5} style={{ color: NEO.ink }}/>
            </div>
            <div>
              <h1 style={{ margin: 0, fontFamily: '"Archivo Black", sans-serif', fontSize: 30, color: NEO.ink }}>
                База <span style={{ background: `linear-gradient(180deg, transparent 60%, ${NEO.cyan} 60%)` }}>знаний</span>
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 500, color: NEO.muted }}>
                {items.length + charms.length + regularItems.length + spells.length + racialSpells.length + npcs.length} записей
              </p>
            </div>
          </div>
        </div>
      </div>

    {/* Расширенный контейнер только для контента (таблицы/карточки) */}
    <div className="space-y-4" style={{ width: '95vw', maxWidth: '1600px', position: 'relative', left: '50%', transform: 'translateX(-50%)', marginTop: 16 }}>
      {/* Sticky tabs + search panel */}
      <div style={{
            position: 'sticky', top: 64, zIndex: 40,
            backgroundColor: NEO.bg, paddingTop: 8, paddingBottom: 8, marginBottom: 8,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const count = tab.id === 'items' ? items.length
                : tab.id === 'charms' ? charms.length
                    : tab.id === 'materials' ? regularItems.filter(it => it.type !== 'Расходник').length
                        : tab.id === 'spells' ? spells.length
                            : tab.id === 'racial' ? racialSpells.length
                                : tab.id === 'npcs' ? npcs.length
                                    : tab.id === 'recipes' ? recipes.length
                                        : tab.id === 'consumables' ? regularItems.filter(it => it.type === 'Расходник').length
                                            : 0;
            return (<button key={tab.id} onClick={() => { setActiveTab(tab.id); setItemTypeFilter('all'); setStatFilters({}); setRacialRoleFilter('all'); setSpellElementFilter('all'); setSpellRankFilter('all'); setMaterialTypeFilter('all'); setNpcTypeFilter('all'); setNpcLocationFilter('all'); setNpcElementFilter('all'); setNpcAbilitySearch(''); setNpcStatFilters({}); setSearch(''); }} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700,
                    backgroundColor: active ? tab.bg : NEO.surface, color: NEO.ink, border: `3px solid ${NEO.ink}`,
                    boxShadow: active ? `3px 3px 0px 0px ${NEO.ink}` : `2px 2px 0px 0px ${NEO.ink}`,
                    cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
                }}>
                <Icon size={14} strokeWidth={2.5}/> {tab.label}
                <span style={{ padding: '1px 5px', fontSize: 9, fontWeight: 800, backgroundColor: active ? NEO.ink : NEO.bg, color: active ? NEO.yellow : NEO.ink, border: `1px solid ${NEO.ink}` }}>{count}</span>
              </button>);
        })}
        </div>

        {/* Search + filters — для всех вкладок, включая чармы */}
        {(<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} strokeWidth={2.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Поиск...`} style={{ width: '100%', padding: '8px 12px 8px 32px', backgroundColor: NEO.surface, color: NEO.ink, border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500, fontSize: 13, outline: 'none' }} onFocus={e => { e.target.style.borderColor = NEO.lime; e.target.style.boxShadow = `3px 3px 0px 0px ${NEO.lime}`; }} onBlur={e => { e.target.style.borderColor = NEO.ink; e.target.style.boxShadow = `3px 3px 0px 0px ${NEO.ink}`; }}/>
            </div>
            {/* Item type filter */}
            {activeTab === 'items' && (<div style={{ display: 'flex', gap: 3 }}>
                {ITEM_TYPES.map(t => <button key={t} onClick={() => setItemTypeFilter(t)} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, backgroundColor: itemTypeFilter === t ? NEO.yellow : NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`, cursor: 'pointer' }}>{t === 'all' ? 'Все' : t === 'Базовый аксессуар' ? 'Базовые' : 'Артефакты'}</button>)}
              </div>)}
            {/* Racial role filter */}
            {isRacialTab && (<div style={{ display: 'flex', gap: 3 }}>
                {RACIAL_ROLES.map(r => <button key={r.id} onClick={() => setRacialRoleFilter(r.id)} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, backgroundColor: racialRoleFilter === r.id ? (r.id === 'урон' ? NEO.red : r.id === 'поддержка' ? NEO.lime : r.id === 'танк' ? NEO.cyan : NEO.yellow) : NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`, cursor: 'pointer' }}>{r.label}</button>)}
              </div>)}
            {/* NPC type filter (chips) */}
            {isNpcsTab && (<div style={{ display: 'flex', gap: 3 }}>
                {NPC_TYPES.map(t => (<button key={t.id} onClick={() => setNpcTypeFilter(t.id)} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, backgroundColor: npcTypeFilter === t.id ? t.color : NEO.surface, color: npcTypeFilter === t.id ? (t.id === 'all' ? NEO.yellow : NEO.ink) : NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`, cursor: 'pointer' }}>{t.label}</button>))}
              </div>)}
            {/* View toggle (not for charms/racial/npcs) */}
            {!isRacialTab && !isNpcsTab && (<div style={{ display: 'flex', gap: 0, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}>
                <button onClick={() => setViewMode('table')} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, backgroundColor: viewMode === 'table' ? NEO.ink : NEO.surface, color: viewMode === 'table' ? NEO.yellow : NEO.ink, border: 'none', cursor: 'pointer' }}>Таблица</button>
                <button onClick={() => setViewMode('grid')} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, backgroundColor: viewMode === 'grid' ? NEO.ink : NEO.surface, color: viewMode === 'grid' ? NEO.yellow : NEO.ink, border: 'none', borderLeft: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Карточки</button>
              </div>)}
            <span style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}` }}>{filteredData.length}</span>
          </div>)}

        {/* Stat filter — раскрывающаяся панель ПОД поиском (только для items) */}
        {activeTab === 'items' && (<div>
            {/* Кнопка-переключатель */}
            <button onClick={() => setShowStatFilter(!showStatFilter)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 11, fontWeight: 700,
                backgroundColor: Object.keys(statFilters).length > 0 ? NEO.lime : NEO.surface,
                color: NEO.ink, border: `2px solid ${NEO.ink}`,
                boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
                transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
              <Filter size={13} strokeWidth={2.5}/>
              Характеристики
              {Object.keys(statFilters).length > 0 && (<span style={{ padding: '1px 6px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>
                  {Object.keys(statFilters).length}
                </span>)}
              <ChevronRight size={12} strokeWidth={2.5} style={{ transform: showStatFilter ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}/>
            </button>

            {/* Раскрывающаяся панель с крупными кнопками */}
            {showStatFilter && (<div style={{
                    marginTop: 8, padding: 12,
                    backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`,
                    boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                    display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
                }}>
                {ALL_STAT_KEYS.map(key => {
                    const def = STAT_DEF[key];
                    const mode = statFilters[key];
                    const Icon = def?.icon || Activity;
                    const bg = !mode ? NEO.bg : mode === 'include' ? NEO.lime : NEO.red;
                    const fg = !mode ? NEO.ink : (mode === 'include' ? NEO.ink : '#fff');
                    const indicator = mode === 'include' ? '+' : mode === 'exclude' ? '−' : '';
                    return (<button key={key} onClick={() => toggleStatFilter(key)} title={def?.label || key} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 10px', fontSize: 11, fontWeight: 700,
                            backgroundColor: bg, color: fg,
                            border: `2px solid ${NEO.ink}`,
                            cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
                            transition: 'transform 0.1s',
                        }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(1px,1px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; }}>
                      {indicator && <span style={{ fontSize: 13, fontWeight: 900 }}>{indicator}</span>}
                      <Icon size={12} strokeWidth={2.5}/>
                      {def?.label || key}
                    </button>);
                })}
                {Object.keys(statFilters).length > 0 && (<button onClick={() => setStatFilters({})} style={{
                        padding: '6px 12px', fontSize: 11, fontWeight: 700,
                        backgroundColor: NEO.ink, color: NEO.yellow,
                        border: `2px solid ${NEO.ink}`, cursor: 'pointer',
                    }}>
                    Сбросить всё
                  </button>)}
              </div>)}
          </div>)}

        {/* Spell filter — раскрывающаяся панель (только для spells) */}
        {activeTab === 'spells' && (<div>
            <button onClick={() => setShowSpellFilter(!showSpellFilter)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 11, fontWeight: 700,
                backgroundColor: (spellElementFilter !== 'all' || spellRankFilter !== 'all') ? NEO.cyan : NEO.surface,
                color: NEO.ink, border: `2px solid ${NEO.ink}`,
                boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
            }}>
              <Filter size={13} strokeWidth={2.5}/>
              Фильтр заклинаний
              {(spellElementFilter !== 'all' || spellRankFilter !== 'all') && (<span style={{ padding: '1px 6px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>
                  {(spellElementFilter !== 'all' ? 1 : 0) + (spellRankFilter !== 'all' ? 1 : 0)}
                </span>)}
              <ChevronRight size={12} strokeWidth={2.5} style={{ transform: showSpellFilter ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}/>
            </button>

            {showSpellFilter && (<div style={{ marginTop: 8, padding: 12, backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Element filter */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Стихия / Оружие</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => setSpellElementFilter('all')} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: spellElementFilter === 'all' ? NEO.ink : NEO.bg, color: spellElementFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
                    {SPELL_ELEMENTS.map(el => (<button key={el} onClick={() => setSpellElementFilter(spellElementFilter === el ? 'all' : el)} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: spellElementFilter === el ? (SPELL_ELEMENT_COLORS[el] || NEO.cyan) : NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>{el}</button>))}
                  </div>
                </div>
                {/* Rank filter */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Ранг</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => setSpellRankFilter('all')} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: spellRankFilter === 'all' ? NEO.ink : NEO.bg, color: spellRankFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
                    {SPELL_RANKS.map(r => (<button key={r} onClick={() => setSpellRankFilter(spellRankFilter === r ? 'all' : r)} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: spellRankFilter === r ? NEO.yellow : NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>{r}</button>))}
                  </div>
                </div>
                {(spellElementFilter !== 'all' || spellRankFilter !== 'all') && (<button onClick={() => { setSpellElementFilter('all'); setSpellRankFilter('all'); }} style={{ padding: '4px 12px', fontSize: 10, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}`, cursor: 'pointer', alignSelf: 'flex-start' }}>Сбросить всё</button>)}
              </div>)}
          </div>)}

        {/* Material filter — раскрывающаяся панель (только для materials) */}
        {activeTab === 'materials' && (<div>
            <button onClick={() => setShowMaterialFilter(!showMaterialFilter)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 11, fontWeight: 700,
                backgroundColor: materialTypeFilter !== 'all' ? NEO.yellow : NEO.surface,
                color: NEO.ink, border: `2px solid ${NEO.ink}`,
                boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
            }}>
              <Filter size={13} strokeWidth={2.5}/>
              Тип материала
              {materialTypeFilter !== 'all' && (<span style={{ padding: '1px 6px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>1</span>)}
              <ChevronRight size={12} strokeWidth={2.5} style={{ transform: showMaterialFilter ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}/>
            </button>

            {showMaterialFilter && (<div style={{ marginTop: 8, padding: 12, backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => setMaterialTypeFilter('all')} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: materialTypeFilter === 'all' ? NEO.ink : NEO.bg, color: materialTypeFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
                {MATERIAL_TYPES.map(t => (<button key={t} onClick={() => setMaterialTypeFilter(materialTypeFilter === t ? 'all' : t)} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: materialTypeFilter === t ? (MATERIAL_TYPE_COLORS[t] || NEO.yellow) : NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>{t}</button>))}
              </div>)}
          </div>)}

        {/* Bestiary filter — раскрывающаяся панель (только для npcs) */}
        {isNpcsTab && (() => {
            const activeCount = (npcTypeFilter !== 'all' ? 1 : 0) +
                (npcLocationFilter !== 'all' ? 1 : 0) +
                (npcElementFilter !== 'all' ? 1 : 0) +
                (npcAbilitySearch.trim() ? 1 : 0) +
                Object.keys(npcStatFilters).length;
            return (<div>
              <button onClick={() => setShowNpcFilter(!showNpcFilter)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', fontSize: 11, fontWeight: 700,
                    backgroundColor: activeCount > 0 ? NEO.cyan : NEO.surface,
                    color: NEO.ink, border: `2px solid ${NEO.ink}`,
                    boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                    cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
                }}>
                <Filter size={13} strokeWidth={2.5}/>
                Фильтр бестиария
                {activeCount > 0 && (<span style={{ padding: '1px 6px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{activeCount}</span>)}
                <ChevronRight size={12} strokeWidth={2.5} style={{ transform: showNpcFilter ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}/>
              </button>

              {showNpcFilter && (<div style={{ marginTop: 8, padding: 12, backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Location filter */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Локация</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => setNpcLocationFilter('all')} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: npcLocationFilter === 'all' ? NEO.ink : NEO.bg, color: npcLocationFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
                      {npcLocations.map(loc => (<button key={loc} onClick={() => setNpcLocationFilter(npcLocationFilter === loc ? 'all' : loc)} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: npcLocationFilter === loc ? NEO.lime : NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>📍 {loc}</button>))}
                    </div>
                  </div>
                  {/* Element filter */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Стихия / Оружие</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={() => setNpcElementFilter('all')} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: npcElementFilter === 'all' ? NEO.ink : NEO.bg, color: npcElementFilter === 'all' ? NEO.yellow : NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Все</button>
                      {npcElements.map(el => (<button key={el} onClick={() => setNpcElementFilter(npcElementFilter === el ? 'all' : el)} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: npcElementFilter === el ? (SPELL_ELEMENT_COLORS[el] || NEO.cyan) : NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>{el}</button>))}
                    </div>
                  </div>
                  {/* Ability search */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Поиск по способности</div>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} strokeWidth={2.5} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
                      <input value={npcAbilitySearch} onChange={e => setNpcAbilitySearch(e.target.value)} placeholder="Название или описание заклинания..." style={{ width: '100%', padding: '6px 10px 6px 28px', backgroundColor: NEO.bg, color: NEO.ink, border: `2px solid ${NEO.ink}`, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 500, fontSize: 11, outline: 'none' }}/>
                    </div>
                  </div>
                  {/* Stat filter */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.muted, marginBottom: 6 }}>Характеристики (вкл/искл)</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {NPC_STAT_KEYS.map(key => {
                        const def = STAT_DEF[key];
                        const mode = npcStatFilters[key];
                        const Icon = def?.icon || Activity;
                        const bg = !mode ? NEO.bg : mode === 'include' ? NEO.lime : NEO.red;
                        const fg = !mode ? NEO.ink : (mode === 'include' ? NEO.ink : '#fff');
                        const indicator = mode === 'include' ? '+' : mode === 'exclude' ? '−' : '';
                        return (<button key={key} onClick={() => toggleNpcStatFilter(key)} title={def?.label || key} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                padding: '4px 8px', fontSize: 10, fontWeight: 700,
                                backgroundColor: bg, color: fg,
                                border: `2px solid ${NEO.ink}`,
                                cursor: 'pointer', fontFamily: '"Space Grotesk", sans-serif',
                            }}>
                            {indicator && <span style={{ fontSize: 12, fontWeight: 900 }}>{indicator}</span>}
                            <Icon size={10} strokeWidth={2.5}/>
                            {def?.label || key}
                          </button>);
                    })}
                    </div>
                  </div>
                  {/* Reset */}
                  {activeCount > 0 && (<button onClick={() => { setNpcTypeFilter('all'); setNpcLocationFilter('all'); setNpcElementFilter('all'); setNpcAbilitySearch(''); setNpcStatFilters({}); }} style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}`, cursor: 'pointer', alignSelf: 'flex-start' }}>
                      Сбросить всё
                    </button>)}
                </div>)}
            </div>);
        })()}
      </div>

      {/* Content */}
      {filteredData.length === 0 ? (<NeoEmpty icon={Search} text="Ничего не найдено."/>) : isCharmsTab ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredData.map(charm => <CharmRow key={charm.id} charm={charm}/>)}
        </div>) : isRacialTab ? (<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredData.map(race => <RacialSpellCard key={race.id} race={race} stats={dbSpellStats}/>)}
        </div>) : isNpcsTab ? (
        /* БЕСТИАРИЙ — список сворачиваемых карточек (как расовые) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleData.map(npc => (<NpcRow key={npc.id} npc={npc} spells={spells} spellFormulas={spellFormulas}/>))}
          {visibleCount < filteredData.length && (<div ref={loadingRef} style={{ padding: 16, textAlign: 'center', fontSize: 12, fontWeight: 700, color: NEO.muted, borderTop: `2px solid ${NEO.ink}` }}>Загрузка...</div>)}
        </div>) : activeTab === 'consumables' ? (
        /* ТАБЛИЦА Расходники (DB_REGULAR_ITEMS с type='Расходник') */
        <div style={{ border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`, backgroundColor: NEO.surface, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: NEO.ink, color: NEO.yellow }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 50 }}>ID</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 44 }}></th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>Название</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Описание</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%' }}>Эффект</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((item, i) => (<tr key={item.id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer', backgroundColor: i % 2 === 0 ? NEO.surface : NEO.bg, borderBottom: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.yellow} onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? NEO.surface : NEO.bg}>
                  <td style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: NEO.muted }}>#{item.id}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, overflow: 'hidden' }}>
                      <IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<ScrollIcon size={18} strokeWidth={2.5} style={{ color: '#7c3aed' }}/>}/>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: NEO.ink }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 500, color: NEO.muted, lineHeight: 1.4, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dbSpellStats ? evalDescription(item.desc, dbSpellStats) || '—' : (item.desc || '—')}</td>
                  <td style={{ padding: '10px 12px' }}>{renderStats(item.stats)}</td>
                </tr>))}
            </tbody>
          </table>
          {visibleCount < filteredData.length && <div ref={loadingRef} style={{ padding: 16, textAlign: 'center', fontSize: 12, fontWeight: 700, color: NEO.muted, borderTop: `2px solid ${NEO.ink}` }}>Загрузка...</div>}
        </div>) : activeTab === 'recipes' ? (
        /* ТАБЛИЦА Рецепты (MOCK_RECIPES) */
        <div style={{ border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`, backgroundColor: NEO.surface, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ backgroundColor: NEO.ink, color: NEO.yellow }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 50 }}>ID</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 44 }}></th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '20%' }}>Название</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Категория</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 90 }}>Редкость</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 70 }}>Навык</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Материалы</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((item, i) => {
                const catLabel = RECIPE_CATEGORY_LABELS[item.category] || item.category;
                const catColor = RECIPE_CATEGORY_COLORS[item.category] || NEO.cyan;
                const rarityColor = RARITY_COLORS[item.rarity] || NEO.muted;
                return (<tr key={item.id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer', backgroundColor: i % 2 === 0 ? NEO.surface : NEO.bg, borderBottom: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.yellow} onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? NEO.surface : NEO.bg}>
                    <td style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: NEO.muted }}>#{item.id}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, overflow: 'hidden' }}>
                        <IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<FlaskConical size={18} strokeWidth={2.5} style={{ color: catColor }}/>}/>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: NEO.ink }}>{item.name}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', backgroundColor: catColor, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{catLabel}</span></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', backgroundColor: rarityColor, color: NEO.ink, border: `1px solid ${NEO.ink}` }}>{item.rarity || '—'}</span></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: NEO.ink }}>{item.skill || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {(item.mats || []).slice(0, 5).map((m, idx) => (<span key={idx} style={{ padding: '2px 6px', fontSize: 9, fontWeight: 700, backgroundColor: NEO.bg, border: `1px solid ${NEO.ink}`, color: NEO.ink }}>{m.name} ×{m.qty}</span>))}
                        {(item.mats || []).length > 5 && <span style={{ padding: '2px 6px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>+{item.mats.length - 5}</span>}
                      </div>
                    </td>
                  </tr>);
            })}
            </tbody>
          </table>
          {visibleCount < filteredData.length && <div ref={loadingRef} style={{ padding: 16, textAlign: 'center', fontSize: 12, fontWeight: 700, color: NEO.muted, borderTop: `2px solid ${NEO.ink}` }}>Загрузка...</div>}
        </div>) : viewMode === 'grid' ? (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {visibleData.map(item => {
                if (activeTab === 'materials')
                    return <MaterialCard key={item.id} item={item} onClick={handleCardClick}/>;
                if (activeTab === 'spells')
                    return <SpellCard key={item.id} spell={item} onClick={handleCardClick}/>;
                if (activeTab === 'npcs')
                    return <NpcCard key={item.id} npc={item} onClick={handleCardClick}/>;
                if (activeTab === 'recipes')
                    return <RecipeCard key={item.id} item={item} onClick={handleCardClick}/>;
                return <ItemCard key={item.id} item={item} onClick={handleCardClick}/>;
            })}
          </div>
          {visibleCount < filteredData.length && <div ref={loadingRef} style={{ padding: 20, textAlign: 'center', fontSize: 13, fontWeight: 700, color: NEO.muted }}>Загрузка...</div>}
        </>) : activeTab === 'spells' ? (
        /* SPELL TABLE — все поля заклинаний */
        <div style={{ border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`, backgroundColor: NEO.surface, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr style={{ backgroundColor: NEO.ink, color: NEO.yellow }}>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 40 }}>ID</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 44 }}></th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 150 }}>Название</th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>Стихия / Оружие</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 40 }}>Ранг</th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Описание</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 70 }}>Перезарядка</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 70 }}>Время каста</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 70 }}>Стоимость маны</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>Генерация кристаллов</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>Требует кристаллов</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((item, i) => (<tr key={item.id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer', backgroundColor: i % 2 === 0 ? NEO.surface : NEO.bg, borderBottom: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.yellow} onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? NEO.surface : NEO.bg}>
                  <td style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: NEO.muted }}>#{item.id}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, overflow: 'hidden' }}>
                      <IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<Zap size={18} strokeWidth={2.5} style={{ color: NEO.cyan }}/>}/>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: NEO.ink }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: NEO.ink }}>{item.element || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.rank && <span style={{ padding: '2px 6px', fontSize: 10, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{item.rank}</span>}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 500, color: NEO.muted, lineHeight: 1.3, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dbSpellStats ? evalDescription(item.desc, dbSpellStats) || '—' : (item.desc || '—')}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: NEO.muted }}>{item.cd || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: NEO.muted }}>{item.castTime || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: NEO.cyanDark }}>{item.manaCost || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: NEO.limeDark }}>{item.crystalGen || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: NEO.red }}>{item.crystalReq || '—'}</td>
                </tr>))}
            </tbody>
          </table>
          {visibleCount < filteredData.length && <div ref={loadingRef} style={{ padding: 16, textAlign: 'center', fontSize: 12, fontWeight: 700, color: NEO.muted, borderTop: `2px solid ${NEO.ink}` }}>Загрузка...</div>}
        </div>) : (
        /* TABLE view (default) — показывает описание вместо типа */
        <div style={{ border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`, backgroundColor: NEO.surface, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: NEO.ink, color: NEO.yellow }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 50 }}>ID</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: 44 }}></th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>Название</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Описание</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%' }}>Статы</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((item, i) => (<tr key={item.id} onClick={() => handleCardClick(item)} style={{ cursor: 'pointer', backgroundColor: i % 2 === 0 ? NEO.surface : NEO.bg, borderBottom: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.yellow} onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? NEO.surface : NEO.bg}>
                  <td style={{ padding: '10px 12px', fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: NEO.muted }}>#{item.id}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, overflow: 'hidden' }}>
                      <IconImg icon={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={<TablePlaceholderIcon item={item}/>}/>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: NEO.ink }}>
                    <div>{item.name}</div>
                    {item.type && <div style={{ fontSize: 10, fontWeight: 600, color: NEO.muted, marginTop: 2 }}>{item.type === 'Сборный артефакт' ? '⚙ Артефакт' : item.type === 'Базовый аксессуар' ? '📋 Базовый' : item.type}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, fontWeight: 500, color: NEO.muted, lineHeight: 1.4, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dbSpellStats ? evalDescription(item.desc, dbSpellStats) || '—' : (item.desc || '—')}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{renderStats(item.stats)}</td>
                </tr>))}
            </tbody>
          </table>
          {visibleCount < filteredData.length && <div ref={loadingRef} style={{ padding: 16, textAlign: 'center', fontSize: 12, fontWeight: 700, color: NEO.muted, borderTop: `2px solid ${NEO.ink}` }}>Загрузка...</div>}
        </div>)}

      {/* Detail Modal */}
      {selectedItem && <DetailModal item={selectedItem} type={selectedType} spellFormulas={spellFormulas} onClose={() => { setSelectedItem(null); setSelectedType(null); }}/>}

      {/* Scroll to top button */}
      {showScrollTop && createPortal(<button onClick={scrollToTop} style={{
                position: 'fixed', bottom: 24, right: 24, zIndex: 90,
                width: 48, height: 48,
                backgroundColor: NEO.lime, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.1s, box-shadow 0.1s',
            }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `4px 4px 0px 0px ${NEO.ink}`; }} title="Наверх">
          <ArrowUp size={22} strokeWidth={2.5}/>
        </button>, document.body)}
    </div>
    </>);
};
