// @ts-nocheck
// Auto-converted from .js — user's actual data

// ═══════════════════════════════════════════════════════════════
//  deriveFullStats — вычисляет все производные характеристики
//  из базовых (str/agi/int), как в армори.
//  Берёт базовые статы + кастомные (добавленные через админку),
//  вычисляет производные, и мёрджит с кастомными (кастомные перекрывают).
// ═══════════════════════════════════════════════════════════════
import { evaluateFormula } from './formula.mjs';

export function deriveFullStats(baseStats) {
  if (!baseStats || typeof baseStats !== 'object') return {};

  // Базовые характеристики (из админки)
  const str = Number(baseStats.str) || 0;
  const agi = Number(baseStats.agi) || 0;
  const int = Number(baseStats.int) || 0;

  // Базовые значения для mana/stamina/speed — берём из кастомных или дефолт
  const manaPool = Number(baseStats.manaPool) || 100;
  const stamina = Number(baseStats.stamina) || 100;
  const speed = Number(baseStats.speed) || 0;

  // Производные характеристики — ТЕ ЖЕ ФОРМУЛЫ что в ArmoryPage (без аксессуаров)
  const physDmg = str * (1 + agi * 0.00006 + str * 0.00009) + 9;
  const magicDmg = int * (1 + agi * 0.00006 + int * 0.00009) + 9;
  const crit = 5 + (agi / 32);
  const critDmg = 50 + (int / 14.6) + crit;
  const mastery = ((str + agi + int) / 1000) + speed;

  const sumOfAllStats = str + agi + int;
  const hpDerived = Math.floor((1 + (str / 6) * (1 + stamina / 20)) + (sumOfAllStats * 0.69));
  const hpRegen = 10 + (str * 0.08) + (stamina * 0.15);
  const staminaRegen = 10 + ((hpRegen + ((str * 0.5) * (1 + stamina * 0.002))) / 20);
  const mpRegen = 10 + ((staminaRegen * 16 + ((int * 0.5) * (1 + manaPool * 0.002))) / 20);
  const moveSpeed = Math.floor(100 + (agi / 30));
  const armorDerived = 10 + agi * 0.063;
  const magicResistDerived = 10 + int * 0.063;

  // Базовые + производные (вычисленные)
  const derived = {
    str, agi, int,
    physDmg,
    magicDmg,
    crit,
    critDmg,
    mastery,
    hp: hpDerived,
    maxHp: hpDerived,
    hpRegen,
    mp: manaPool,
    mpRegen,
    manaPool,
    stamina,
    staminaRegen,
    energyRegen: 0,
    moveSpeed,
    armor: armorDerived,
    magicResist: magicResistDerived,
    physVamp: 0,
    magicVamp: 0,
    speed,
    cooldown: 0,
    spellRadius: 100,
  };

  // СУММИРУЕМ кастомные статы с вычисленными:
  // Если в baseStats есть ключ которого нет в derived — добавляем как есть
  // Если есть ключ который есть в derived — СУММИРУЕМ (вычисленное + кастомное)
  const result = { ...derived };
  for (const [key, val] of Object.entries(baseStats)) {
    if (key === 'str' || key === 'agi' || key === 'int') continue; // базовые не трогаем
    const numVal = Number(val);
    if (isNaN(numVal) || numVal === 0) continue;
    if (key in derived) {
      result[key] = derived[key] + numVal; // СУММА
    } else {
      result[key] = numVal; // новая кастомная характеристика
    }
  }
  // maxHp = суммарный hp
  result.maxHp = result.hp;
  return result;
}

// ═══════════════════════════════════════════════════════════════
//  gameUtils.js — markdown parser, rarity colors, bonus levels.
//  Put this file at:  utils/gameUtils.js
//  NOTE: dataStore/useCollection moved to utils/dataStore.js
// ═══════════════════════════════════════════════════════════════

const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const BANNED_WORDS = ['блять','сука','хуй','пиздец','ебать','ебаный','охуенно','пизда','гандон','долбоеб','мудак','уебище','залупа','гавно','fuck','shit','bitch','dick','asshole','cunt'];

function filterWords(text) {
  let t = text;
  BANNED_WORDS.forEach(w => {
    const re = new RegExp(w, 'gi');
    t = t.replace(re, match => '*'.repeat(match.length));
  });
  return t;
}

const getLocalForumImage = (url) => {
  if (!url.startsWith('local-image://') || typeof window === 'undefined') return url;
  try {
    const id = url.slice('local-image://'.length);
    const forum = JSON.parse(localStorage.getItem('mmoportal:forum:v1') || '{}');
    return forum.images?.[id]?.dataUrl || '';
  } catch { return ''; }
};

const inline = (text, itemLookup) => {
  let t = escapeHtml(text)
  // inline code
  t = t.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-mono text-[0.85em]">$1</code>')
  // bold
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-zinc-100">$1</strong>')
  // italic
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em class="italic text-zinc-200">$2</em>')
  // strikethrough ~~text~~
  t = t.replace(/~~([^~]+)~~/g, '<del class="text-zinc-500">$1</del>')
  // [color=red]text[/color]
  t = t.replace(/\[color=(#[0-9a-fA-F]{3,8}|[a-z]+)\]([^\[]+)\[\/color\]/g, '<span style="color:$1">$2</span>')
  // [size=14]text[/size]
  t = t.replace(/\[size=(\d+)\]([^\[]+)\[\/size\]/g, '<span style="font-size:$1px">$2</span>')
  // [spoiler]text[/spoiler] → clickable black box
  t = t.replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/g, '<span class="spoiler-tag inline-block rounded-md border border-white/10 bg-zinc-800 px-2 py-0.5 cursor-pointer select-none" onclick="this.classList.toggle(\'spoiler-revealed\')">📦 спойлер<span class="spoiler-content hidden ml-2">$1</span></span>')
  // [item:ID] → clickable span with item name if lookup provided
  if (typeof itemLookup === 'function') {
    t = t.replace(
      /\[item:(\d+)\]/g,
      (match, id) => {
        const item = itemLookup(id);
        const name = escapeHtml(String(item ? item.name : '#' + id));
        return '<span data-item-id="' + id + '" role="button" tabindex="0" class="item-link inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer">\u{1F4E6} ' + name + '</span>';
      },
    );
  } else {
    t = t.replace(
      /\[item:(\d+)\]/g,
      '<span data-item-id="$1" role="button" tabindex="0" class="item-link inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 cursor-pointer">\u{1F4E6} #$1</span>',
    );
  }
  // images: uploaded local files or remote URLs
  t = t.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (match, alt, rawUrl) => {
    const src = getLocalForumImage(rawUrl);
    if (!/^(https?:\/\/|data:image\/(?:png|jpe?g|gif|webp|avif);base64,)/i.test(src)) return alt;
    if (!src || !/^(https?:|data:image\/|local-image:\/\/)/.test(rawUrl)) return alt;
    return '<img src="' + escapeHtml(src) + '" alt="' + alt + '" loading="lazy" />';
  })
  // links [text](url)
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-400 underline decoration-emerald-400/40 hover:decoration-emerald-400">$1</a>',
  )
  return t
}

export function parseMarkdown(src, itemLookup, applyFilter = false, stats = null) {
  if (!src) return { __html: '' }
  let processed = src;
  if (applyFilter) processed = filterWords(processed);
  // Вычисляем {формулы} если переданы характеристики
  if (stats) processed = evalDescription(processed, stats);
  const lines = processed.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let inCode = false
  let inUl = false
  let inOl = false
  let inQuote = false

  const closeLists = () => {
    if (inUl) { html.push('</ul>'); inUl = false }
    if (inOl) { html.push('</ol>'); inOl = false }
  }
  const closeQuote = () => {
    if (inQuote) { html.push('</blockquote>'); inQuote = false }
  }

  for (const raw of lines) {
    const line = raw

    if (/^```/.test(line.trim())) {
      closeLists(); closeQuote()
      if (inCode) { html.push('</code></pre>'); inCode = false }
      else { html.push('<pre class="my-3 rounded-xl border border-white/10 bg-zinc-950/60 p-3 overflow-x-auto"><code class="font-mono text-[0.85em] text-emerald-300">'); inCode = true }
      continue
    }
    if (inCode) { html.push(escapeHtml(line)); continue }
    if (line.trim() === '') { closeLists(); closeQuote(); continue }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { closeLists(); closeQuote(); html.push('<hr class="my-3 border-white/10" />'); continue }

    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeLists(); closeQuote()
      const level = h[1].length
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs']
      html.push('<h' + level + ' class="mt-3 mb-1.5 font-bold ' + sizes[level - 1] + ' text-zinc-100">' + inline(h[2], itemLookup) + '</h' + level + '>')
      continue
    }

    if (/^>\s?/.test(line)) {
      closeLists()
      if (!inQuote) { html.push('<blockquote class="my-2 border-l-2 border-emerald-400/40 bg-emerald-500/5 pl-3 py-1.5 text-zinc-400 italic">'); inQuote = true }
      html.push('<p>' + inline(line.replace(/^>\s?/, ''), itemLookup) + '</p>')
      continue
    } else { closeQuote() }

    if (/^[-*+]\s+/.test(line)) {
      if (inOl) { html.push('</ol>'); inOl = false }
      if (!inUl) { html.push('<ul class="my-2 space-y-1 pl-5 list-disc list-outside marker:text-emerald-400/60">'); inUl = true }
      html.push('<li>' + inline(line.replace(/^[-*+]\s+/, ''), itemLookup) + '</li>')
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      if (inUl) { html.push('</ul>'); inUl = false }
      if (!inOl) { html.push('<ol class="my-2 space-y-1 pl-5 list-decimal list-outside marker:text-emerald-400/60">'); inOl = true }
      html.push('<li>' + inline(line.replace(/^\d+\.\s+/, ''), itemLookup) + '</li>')
      continue
    }

    closeLists()
    html.push('<p class="my-1.5 leading-relaxed">' + inline(line, itemLookup) + '</p>')
  }

  closeLists(); closeQuote()
  if (inCode) html.push('</code></pre>')
  return { __html: html.join('\n') }
}

export function getRarityColor(rarity) {
  switch (rarity) {
    case 'legendary': return 'text-amber-400'
    case 'epic':      return 'text-fuchsia-400'
    case 'rare':      return 'text-cyan-400'
    case 'uncommon':  return 'text-emerald-400'
    case 'common':    return 'text-zinc-400'
    default:          return 'text-zinc-300'
  }
}

export function getBonusLevelsCount(gemLevel) {
  if (gemLevel >= 12) return 4;
  if (gemLevel >= 9)  return 3;
  if (gemLevel >= 6)  return 2;
  if (gemLevel >= 3)  return 1;
  return 0;
}

// ════════════════════════════════════════════════════════════════
//  computeSpellFormula — вычисляет итоговую формулу заклинания.
//
//  Логика (по требованию пользователя):
//    1. Если у заклинания есть собственное поле `formula` (непустое) —
//       оно перекрывает стихийную (точечная настройка в DB_SPELLS).
//    2. Иначе берётся базовая формула стихии (ранг D) и умножается на
//       (1 + percent/100), где percent — надбавка для ранга заклинания.
//
//  Параметры:
//    spell       — объект заклинания из DB_SPELLS (поля: element, rank, formula)
//    formulas    — объект из SPELL_FORMULAS (dataStore.get('SPELL_FORMULAS'))
//                  структура: { [element]: { baseFormula, rankPercents: { D, DD, C, ... } } }
//
//  Возвращает: строка с итоговой формулой для отображения.
// ════════════════════════════════════════════════════════════════
export function computeSpellFormula(spell, formulas) {
  // Вычисление из стихийной базовой + процент ранга.
  // Точечная формула spell.formula (если задана) показывается отдельно — см. UI.
  if (!spell || !spell.element || !formulas) return '';
  const elemFormula = formulas[spell.element];
  if (!elemFormula || !elemFormula.baseFormula) return '';
  const base = elemFormula.baseFormula;
  const percent = (elemFormula.rankPercents && elemFormula.rankPercents[spell.rank] != null)
    ? elemFormula.rankPercents[spell.rank]
    : 0;
  if (!percent || percent === 0) return base;
  const mult = (1 + percent / 100).toFixed(2).replace('.', ',');
  return `${base} × ${mult}  (+${percent}%)`;
}

/**
 * Возвращает итоговую формулу для отображения.
 * Если у спелла есть точечная formula (непустая) — приоритет ей, но также
 * возвращается стихийная для подсказки. Логика:
 *   - spell.formula задано → показываем его (точечная настройка перекрывает стихийную)
 *   - иначе → вычисленная стихийная формула
 */
export function getSpellFormulaDisplay(spell, formulas) {
  const custom = spell && spell.formula && String(spell.formula).trim();
  const elemental = computeSpellFormula(spell, formulas);
  return {
    custom: custom ? String(custom) : null,    // Точечная формула (если задана)
    elemental: elemental || null,               // Вычисленная из стихийной
    isOverride: !!custom,                       // true если точечная перекрывает стихийную
  };
}

// ════════════════════════════════════════════════════════════════
//  evalDescription — подставляет {формулы} в описания.
//
//  Формат: в описании можно написать {выражение} — оно будет вычислено
//  с переменными характеристик персонажа и заменено на число.
//
//  Пример: "Урон {M*0,12} за удар, крит {crit}% шанс"
//    → "Урон 42 за удар, крит 25% шанс"
//
//  Переменные (те же что в формулах стихий):
//    M, P, str, agi, int, armor, speed, mastery, crit, critDmg,
//    hp, hpRegen, mp, mpRegen, stamina, staminaRegen, energyRegen,
//    moveSpeed, magicResist, physVamp, magicVamp, manaPool, cooldown
//
//  Если stats не передан — возвращает описание с невычисленными {формулами}.
//  Запятые в числах заменяются на точки (0,12 → 0.12).
// ════════════════════════════════════════════════════════════════
export function evalDescription(desc, stats) {
  if (!desc || typeof desc !== 'string') return desc || '';
  if (!stats || typeof stats !== 'object') return desc;

  // Определяем наибольшую основную характеристику (str/agi/int)
  const strVal = stats.str ?? 0;
  const agiVal = stats.agi ?? 0;
  const intVal = stats.int ?? 0;
  let topStatVal = strVal;
  let topStatNameStr = 'Сила';
  if (agiVal > topStatVal) { topStatVal = agiVal; topStatNameStr = 'Ловкость'; }
  if (intVal > topStatVal) { topStatVal = intVal; topStatNameStr = 'Интеллект'; }

  // Сначала заменяем {topStatName} на текст (до вычисления формул)
  let result = desc.replace(/\{topStatName\}/g, topStatNameStr);

  // Карта переменных → значения характеристик
  const vars = {
    M: stats.magicDmg ?? 0,
    P: stats.physDmg ?? 0,
    str: strVal,
    agi: agiVal,
    int: intVal,
    topStat: topStatVal,
    armor: stats.armor ?? 0,
    speed: stats.speed ?? 0,
    mastery: stats.mastery ?? 0,
    crit: stats.crit ?? 0,
    critDmg: stats.critDmg ?? 0,
    hp: stats.hp ?? 0,
    maxHp: stats.maxHp ?? stats.hp ?? 0,
    hpRegen: stats.hpRegen ?? 0,
    mp: stats.manaPool ?? 0,
    mpRegen: stats.mpRegen ?? 0,
    stamina: stats.stamina ?? 0,
    staminaRegen: stats.staminaRegen ?? 0,
    energyRegen: stats.energyRegen ?? 0,
    moveSpeed: stats.moveSpeed ?? 0,
    magicResist: stats.magicResist ?? 0,
    physVamp: stats.physVamp ?? 0,
    magicVamp: stats.magicVamp ?? 0,
    manaPool: stats.manaPool ?? 0,
    cooldown: stats.cooldown ?? 0,
    spellRadius: stats.spellRadius ?? 0,
  };

  // Заменяем {выражение} на вычисленное значение
  result = result.replace(/\{([^}]+)\}/g, (match, expr) => {
    try {
      // Заменяем запятые на точки для дробей
      let jsExpr = String(expr).replace(/,/g, '.');
      // Подставляем переменные
      const names = Object.keys(vars).sort((a, b) => b.length - a.length);
      for (const name of names) {
        const re = new RegExp(`\\b${name}\\b`, 'g');
        jsExpr = jsExpr.replace(re, `(${vars[name]})`);
      }
      const val = evaluateFormula(jsExpr);
      if (typeof val === 'number' && isFinite(val)) {
        // Округляем до целого если нет дробной части, иначе 2 знака
        return Number.isInteger(val) ? String(val) : val.toFixed(2).replace(/\.?0+$/, '');
      }
      return match; // если не вычислось — оставляем как есть
    } catch {
      return match; // ошибка вычисления — оставляем {формула}
    }
  });
  return result;
}

