'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Gavel, Search, Coins, X, Gem, Sparkles, Package, ArrowUp, ChevronDown, TrendingDown, TrendingUp, Filter, ChevronRight, Activity, } from 'lucide-react';
import { DB_ITEMS, DB_CHARMS, DB_REGULAR_ITEMS, STAT_DEF } from '@/data/gameData';
import { useCollection } from '@/lib/dataStore';
import { evalDescription } from '@/lib/gameUtils';
import { useCurrentUser } from '@/lib/authStore';
import { useParams, useNavigate } from '@/lib/router';
import { NEO, NeoButton, NeoEmpty } from '@/components/Neo';
const FONT_DISPLAY = '"Archivo Black", sans-serif';
const FONT_BODY = '"Space Grotesk", sans-serif';
const STAT_COLOR = {
    str: NEO.red, agi: NEO.lime, int: NEO.cyan, armor: NEO.muted,
    speed: NEO.yellow, mastery: NEO.pink, hpRegen: '#16a34a', mpRegen: '#0891b2',
    staminaRegen: '#ea580c', energyRegen: NEO.yellowDark, moveSpeed: '#14b8a6',
    magicResist: '#6366f1', physVamp: '#e11d48', manaPool: '#3b82f6',
    stamina: '#f97316', crit: '#dc2626', critDmg: '#be123c',
    magicVamp: '#c026d3', magicDmg: '#a855f7', physDmg: '#ef4444', hp: '#22c55e',
    cooldown: '#8b5cf6',
};
const EXCLUDED_STATS = ['magicDmg', 'physDmg', 'hp'];
const ALL_STAT_KEYS = Object.keys(STAT_DEF).filter(k => !EXCLUDED_STATS.includes(k));
const NPC_SELLERS = [
    'DarkKnight99', 'AlchemistBob', 'TankPro', 'Rogue123', 'HealerPro',
    'MerchantKing', 'ShadowTrader', 'GoldHunter', 'BattleMage', 'LootGoblin',
    'SilentBlade', 'CrystalEye', 'FireFox', 'IceWolf', 'ThunderHawk',
    'GoldFinger', 'NightTrader', 'StormBringer', 'FrostWolf', 'EmberFox',
];
// ═══ Market value ═══
function calcMarketValue(item, category) {
    let base = 50;
    if (item.stats && typeof item.stats === 'object') {
        const entries = Object.entries(item.stats).filter(([k, v]) => v && parseFloat(String(v).replace(',', '.')) > 0);
        entries.forEach(([key, val]) => { base += Math.ceil(parseFloat(String(val).replace(',', '.')) * 20); });
    }
    if (item.type === 'Сборный артефакт')
        base *= 3;
    if (category === 'charms')
        base *= 5;
    return Math.ceil(base / 10) * 10;
}
// ═══ Generate MULTIPLE lots per item (3-7 lots, different sellers/prices) ═══
function generateLotsForItem(item, category, sourceType) {
    let seed = [...`${sourceType}:${item.id}`].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 2166136261);
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const mv = calcMarketValue(item, category);
    const lotCount = 3 + Math.floor(random() * 5); // 3-7 stable demo lots
    const lots = [];
    const usedSellers = new Set();
    for (let i = 0; i < lotCount; i++) {
        // Different price multipliers per lot (60%-140% of MV)
        const buyoutMult = 0.6 + random() * 0.8;
        const buyout = Math.ceil((mv * buyoutMult) / 10) * 10;
        const bid = Math.ceil((buyout * (0.5 + random() * 0.2)) / 10) * 10;
        // Pick unique seller
        let seller;
        do {
            seller = NPC_SELLERS[Math.floor(random() * NPC_SELLERS.length)];
        } while (usedSellers.has(seller) && usedSellers.size < NPC_SELLERS.length);
        usedSellers.add(seller);
        const hours = Math.floor(random() * 47) + 1;
        const mins = Math.floor(random() * 59);
        const time = `${hours}ч ${String(mins).padStart(2, '0')}м`;
        const pct = Math.round((buyout / mv) * 100);
        let deal = 'fair';
        if (pct < 80)
            deal = 'great';
        else if (pct > 110)
            deal = 'overpriced';
        lots.push({
            lotId: `${sourceType}-${item.id}-${i}`,
            itemId: item.id,
            name: item.name,
            type: item.type || (category === 'charms' ? 'Чарма' : 'Материал'),
            desc: item.desc || '',
            stats: item.stats || {},
            recipe: item.recipe || '',
            category,
            sourceType,
            seller,
            time,
            bid,
            buyout,
            marketValue: mv,
            pct,
            deal,
        });
    }
    return lots;
}
// ═══ Stats renderer ═══
function renderStats(stats, maxBadges = 3) {
    if (!stats || typeof stats !== 'object')
        return null;
    const entries = Object.entries(stats).filter(([k, v]) => v !== 0 && v !== '' && v != null);
    if (entries.length === 0)
        return null;
    return (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {entries.slice(0, maxBadges).map(([key, value]) => {
            const def = STAT_DEF[key];
            const color = STAT_COLOR[key] || NEO.muted;
            const label = def?.label || key;
            return <span key={key} style={{ padding: '0px 4px', fontSize: 8, fontWeight: 700, backgroundColor: color, color: '#fff', border: `1px solid ${NEO.ink}` }}>{label}+{value}</span>;
        })}
      {entries.length > maxBadges && <span style={{ padding: '0px 4px', fontSize: 8, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>+{entries.length - maxBadges}</span>}
    </div>);
}
// ═══ Deal badge ═══
function DealBadge({ pct, deal }) {
    const colors = { great: { bg: NEO.lime, fg: NEO.ink, icon: TrendingDown }, fair: { bg: NEO.yellow, fg: NEO.ink, icon: null }, overpriced: { bg: NEO.red, fg: '#fff', icon: TrendingUp } };
    const c = colors[deal] || colors.fair;
    const Icon = c.icon;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 5px', fontSize: 9, fontWeight: 800, backgroundColor: c.bg, color: c.fg, border: `1px solid ${NEO.ink}` }}>{Icon && <Icon size={9} strokeWidth={2.5}/>}{pct}%</span>;
}
// ═══ GroupModal — shows all lots of one item (TSM style) ═══
function GroupModal({ group, onClose, onBuy }) {
    if (!group)
        return null;
    const { lots } = group;
    const catColor = group.category === 'charms' ? NEO.pink : group.type === 'Сборный артефакт' ? NEO.yellow : group.category === 'materials' ? NEO.cyan : NEO.lime;
    // Sort lots by best deal (lowest pct first)
    const sortedLots = [...lots].sort((a, b) => a.pct - b.pct);
    const bestLot = sortedLots[0];
    const cheapestLot = [...lots].sort((a, b) => a.buyout - b.buyout)[0];
    return (<div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: NEO.surface, border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`, maxWidth: 600, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ backgroundColor: catColor, padding: '12px 16px', borderBottom: `3px solid ${NEO.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 800, fontFamily: 'monospace', opacity: 0.7 }}>#{group.itemId}</span>
              <span style={{ padding: '1px 6px', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{group.type}</span>
              <DealBadge pct={bestLot.pct} deal={bestLot.deal}/>
            </div>
            <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 18, color: NEO.ink }}>{group.name}</h2>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} strokeWidth={2.5}/></button>
        </div>

        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Item info */}
          {group.desc && <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: NEO.ink, lineHeight: 1.5 }}>{auctionStats ? evalDescription(group.desc, auctionStats) : group.desc}</p>}
          {group.stats && Object.keys(group.stats).length > 0 && (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {Object.entries(group.stats).filter(([k, v]) => v !== 0 && v !== '' && v != null).map(([key, value]) => {
                const def = STAT_DEF[key];
                const color = STAT_COLOR[key] || NEO.muted;
                const Icon = def?.icon || null;
                return <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', fontSize: 9, fontWeight: 700, backgroundColor: color, color: '#fff', border: `2px solid ${NEO.ink}` }}>{Icon && <Icon size={9} strokeWidth={2.5}/>}{def?.label || key}: +{value}{def?.suffix || ''}</span>;
            })}
            </div>)}
          {/* Summary */}
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, padding: 8, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}>
              <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Лотов</div>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: FONT_DISPLAY, color: NEO.ink }}>{lots.length}</div>
            </div>
            <div style={{ flex: 1, padding: 8, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}>
              <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Рынок</div>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: FONT_DISPLAY, color: NEO.muted }}>{group.marketValue}</div>
            </div>
            <div style={{ flex: 1, padding: 8, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}>
              <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Мин. выкуп</div>
              <div style={{ fontSize: 16, fontWeight: 900, fontFamily: FONT_DISPLAY, color: NEO.ink }}>{cheapestLot.buyout}</div>
            </div>
          </div>

          {/* Lots table */}
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Все лоты ({lots.length})</div>
          <div style={{ border: `2px solid ${NEO.ink}`, backgroundColor: NEO.surface, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ backgroundColor: NEO.ink, color: NEO.yellow }}>
                <th style={{ padding: '5px 5px', textAlign: 'left', fontSize: 8, fontWeight: 800, textTransform: 'uppercase' }}>Продавец</th>
                <th style={{ padding: '5px 5px', textAlign: 'center', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 40 }}>%</th>
                <th style={{ padding: '5px 5px', textAlign: 'right', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 50 }}>Ставка</th>
                <th style={{ padding: '5px 5px', textAlign: 'right', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 50 }}>Выкуп</th>
                <th style={{ padding: '5px 5px', textAlign: 'center', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 45 }}>Время</th>
                <th style={{ padding: '5px 5px', textAlign: 'center', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 50 }}></th>
              </tr></thead>
              <tbody>
                {sortedLots.map(lot => (<tr key={lot.lotId} style={{ borderBottom: `1px solid ${NEO.ink}`, backgroundColor: lot === bestLot ? NEO.bg : NEO.surface }}>
                    <td style={{ padding: '4px 5px', fontSize: 10, fontWeight: 700, color: NEO.ink }}>{lot.seller}{lot === bestLot && <span style={{ fontSize: 8, color: NEO.limeDark, marginLeft: 3 }}>★ лучшая</span>}</td>
                    <td style={{ padding: '4px 5px', textAlign: 'center' }}><DealBadge pct={lot.pct} deal={lot.deal}/></td>
                    <td style={{ padding: '4px 5px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: NEO.muted, fontFamily: 'monospace' }}>{lot.bid}</td>
                    <td style={{ padding: '4px 5px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: NEO.ink, fontFamily: 'monospace' }}>{lot.buyout}</td>
                    <td style={{ padding: '4px 5px', textAlign: 'center', fontSize: 9, fontWeight: 600, color: NEO.muted }}>{lot.time}</td>
                    <td style={{ padding: '4px 5px', textAlign: 'center' }}>
                      <button onClick={(e) => { e.stopPropagation(); onBuy(lot); }} style={{ padding: '3px 8px', fontSize: 9, fontWeight: 700, backgroundColor: NEO.lime, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `1px 1px 0px 0px ${NEO.ink}`, cursor: 'pointer' }}>Выкуп</button>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>);
}
// ═══ Main AuctionPage ═══
export const AuctionPage = () => {
    const auctionUser = useCurrentUser();
    const auctionStats = auctionUser?.savedArmory?.spellStats || null;
    const auctionParams = useParams();
    const auctionNavigate = useNavigate();
    const validCategories = ['all', 'items', 'charms', 'materials'];
    const [search, setSearch] = useState('');
    const [category, setCategoryState] = useState(auctionParams.category && validCategories.includes(auctionParams.category) ? auctionParams.category : 'all');
    useEffect(() => {
        if (auctionParams.category && validCategories.includes(auctionParams.category) && auctionParams.category !== category) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this view after its route or browser-owned data changes.
            setCategoryState(auctionParams.category);
        }
    }, [auctionParams.category]);
    const setCategory = (cat) => {
        setCategoryState(cat);
        auctionNavigate('/auction/' + cat);
    };
    const [sortBy, setSortBy] = useState('dealBest');
    const [viewMode, setViewMode] = useState('table');
    const [notification, setNotification] = useState(null);
    const [groupModal, setGroupModal] = useState(null);
    const [buyModal, setBuyModal] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [visibleCount, setVisibleCount] = useState(50);
    const [showPriceFilter, setShowPriceFilter] = useState(false);
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [dealFilter, setDealFilter] = useState('all');
    const [showStatFilter, setShowStatFilter] = useState(false);
    const [statFilters, setStatFilters] = useState({});
    const loadingRef = useRef(null);
    const dbItems = useCollection('DB_ITEMS', DB_ITEMS);
    const dbCharms = useCollection('DB_CHARMS', DB_CHARMS);
    const dbMaterials = useCollection('DB_REGULAR_ITEMS', DB_REGULAR_ITEMS);
    const [soldLots, setSoldLots] = useState(() => {
        if (typeof window === 'undefined')
            return [];
        try {
            const raw = localStorage.getItem('mmoportal:auction:sold');
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    });
    const saveSold = (sold) => { setSoldLots(sold); if (typeof window !== 'undefined')
        localStorage.setItem('mmoportal:auction:sold', JSON.stringify(sold)); };
    // Generate ALL lots (multiple per item)
    const allLots = useMemo(() => {
        const lots = [];
        dbItems.forEach(item => { const cat = item.type === 'Сборный артефакт' ? 'artifacts' : 'items'; lots.push(...generateLotsForItem(item, cat, 'DB_ITEMS')); });
        dbCharms.forEach(item => lots.push(...generateLotsForItem(item, 'charms', 'DB_CHARMS')));
        dbMaterials.forEach(item => lots.push(...generateLotsForItem(item, 'materials', 'DB_REGULAR_ITEMS')));
        return lots;
    }, [dbItems, dbCharms, dbMaterials]);
    // Group lots by item (itemId + sourceType)
    const itemGroups = useMemo(() => {
        const groups = {};
        allLots.forEach(lot => {
            if (soldLots.includes(lot.lotId))
                return;
            const key = `${lot.sourceType}-${lot.itemId}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    itemId: lot.itemId,
                    name: lot.name,
                    type: lot.type,
                    desc: lot.desc,
                    stats: lot.stats,
                    recipe: lot.recipe,
                    category: lot.category,
                    sourceType: lot.sourceType,
                    marketValue: lot.marketValue,
                    lots: [],
                };
            }
            groups[key].lots.push(lot);
        });
        return Object.values(groups);
    }, [allLots, soldLots]);
    // Filter + sort groups
    const filteredGroups = useMemo(() => {
        let data = itemGroups.filter(g => g.lots.length > 0);
        if (category !== 'all')
            data = data.filter(g => g.category === category);
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            data = data.filter(g => g.name.toLowerCase().includes(q) || g.type.toLowerCase().includes(q) || g.lots.some(l => l.seller.toLowerCase().includes(q)));
        }
        // Stat filters
        if (Object.keys(statFilters).length > 0) {
            data = data.filter(g => {
                const stats = g.stats || {};
                for (const [statKey, mode] of Object.entries(statFilters)) {
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
        // Deal filter (filter groups that have at least one lot matching)
        if (dealFilter !== 'all') {
            data = data.filter(g => g.lots.some(l => l.deal === dealFilter));
        }
        // Price range
        if (priceMin)
            data = data.filter(g => g.lots.some(l => l.buyout >= parseInt(priceMin)));
        if (priceMax)
            data = data.filter(g => g.lots.some(l => l.buyout <= parseInt(priceMax)));
        // Sort groups — different default sort per category
        const defaultSortByCategory = {
            all: 'dealBest',
            items: 'dealBest',
            artifacts: 'mvDesc',
            charms: 'dealBest',
            materials: 'priceAsc',
        };
        const effectiveSort = sortBy === 'dealBest' && category !== 'all' ? (defaultSortByCategory[category] || 'dealBest') : sortBy;
        const sorters = {
            dealBest: (a, b) => Math.min(...a.lots.map(l => l.pct)) - Math.min(...b.lots.map(l => l.pct)),
            dealWorst: (a, b) => Math.min(...b.lots.map(l => l.pct)) - Math.min(...a.lots.map(l => l.pct)),
            priceAsc: (a, b) => Math.min(...a.lots.map(l => l.buyout)) - Math.min(...b.lots.map(l => l.buyout)),
            priceDesc: (a, b) => Math.min(...b.lots.map(l => l.buyout)) - Math.min(...a.lots.map(l => l.buyout)),
            nameAsc: (a, b) => a.name.localeCompare(b.name),
            mvDesc: (a, b) => b.marketValue - a.marketValue,
        };
        data.sort(sorters[effectiveSort] || sorters.dealBest);
        return data;
    }, [itemGroups, category, search, statFilters, dealFilter, priceMin, priceMax, sortBy]);
    // Total lots count (for display)
    const totalLots = filteredGroups.reduce((sum, g) => sum + g.lots.length, 0);
    const greatDeals = filteredGroups.filter(g => g.lots.some(l => l.deal === 'great')).length;
    const cheapest = filteredGroups.length ? Math.min(...filteredGroups.map(g => Math.min(...g.lots.map(l => l.buyout)))) : 0;
    const soldCount = soldLots.length;
    useEffect(() => { if (notification) {
        const t = setTimeout(() => setNotification(null), 3000);
        return () => clearTimeout(t);
    } }, [notification]);
    useEffect(() => { const onScroll = () => setShowScrollTop(window.scrollY > 400); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll); }, []);
    useEffect(() => { if (!loadingRef.current)
        return; const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting)
        setVisibleCount(p => p + 50); }, { threshold: 0.1 }); obs.observe(loadingRef.current); return () => obs.disconnect(); }, [filteredGroups.length, visibleCount]);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restart incremental rendering when the filters change.
    useEffect(() => { setVisibleCount(50); }, [search, category, sortBy, priceMin, priceMax, dealFilter, statFilters]);
    const toggleStatFilter = (statKey) => {
        setStatFilters(prev => { const next = { ...prev }; const cur = next[statKey]; if (!cur)
            next[statKey] = 'include';
        else if (cur === 'include')
            next[statKey] = 'exclude';
        else
            delete next[statKey]; return next; });
    };
    const handleGroupClick = (group) => setGroupModal(group);
    const handleBuy = (lot) => { setGroupModal(null); setBuyModal(lot); };
    const handleConfirmBuy = (lot) => { saveSold([...soldLots, lot.lotId]); setBuyModal(null); setNotification(`Выкуплено: ${lot.name} за ${lot.buyout} (${lot.pct}% от рынка)`); };
    const visibleGroups = filteredGroups.slice(0, visibleCount);
    const CATEGORIES = [
        { id: 'all', label: 'Все', icon: Package, count: itemGroups.filter(g => g.lots.length > 0).length },
        { id: 'items', label: 'Аксессуары', icon: Gem, bg: NEO.lime, count: itemGroups.filter(g => g.category === 'items' && g.lots.length > 0).length },
        { id: 'artifacts', label: 'Артефакты', icon: Gem, bg: NEO.yellow, count: itemGroups.filter(g => g.category === 'artifacts' && g.lots.length > 0).length },
        { id: 'charms', label: 'Чармы', icon: Sparkles, bg: NEO.pink, count: itemGroups.filter(g => g.category === 'charms' && g.lots.length > 0).length },
        { id: 'materials', label: 'Материалы', icon: Package, bg: NEO.cyan, count: itemGroups.filter(g => g.category === 'materials' && g.lots.length > 0).length },
    ];
    return (<div className="space-y-3">
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 44, height: 44, backgroundColor: NEO.yellow, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gavel size={20} strokeWidth={2.5} style={{ color: NEO.ink }}/></div>
        <div style={{ flex: '1 1 170px', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 24, color: NEO.ink }}>Аукционный дом <span style={{ background: `linear-gradient(180deg, transparent 60%, ${NEO.yellow} 60%)` }}>% от рынка</span></h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 500, color: NEO.muted }}>{filteredGroups.length} предметов · {totalLots} лотов · {greatDeals} выгодных · продано {soldCount}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ padding: '6px 10px', backgroundColor: NEO.lime, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, lineHeight: 1, color: NEO.ink }}>{greatDeals}</div><div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: NEO.ink, opacity: 0.7 }}>Выгодно</div></div>
          <div style={{ padding: '6px 10px', backgroundColor: NEO.cyan, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, lineHeight: 1, color: NEO.ink }}>{cheapest}</div><div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: NEO.ink, opacity: 0.7 }}>Мин. цена</div></div>
          <div style={{ padding: '6px 10px', backgroundColor: NEO.yellow, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}><div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, lineHeight: 1, color: NEO.ink }}>{totalLots}</div><div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: NEO.ink, opacity: 0.7 }}>Лотов</div></div>
        </div>
      </div>

      {/* Sticky filter panel */}
      <div style={{ position: 'sticky', top: 64, zIndex: 40, backgroundColor: NEO.bg, paddingTop: 6, paddingBottom: 6, borderBottom: `3px solid ${NEO.ink}` }}>
        {/* Categories */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 10, fontWeight: 700, backgroundColor: active ? (cat.bg || NEO.yellow) : NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: active ? `2px 2px 0px 0px ${NEO.ink}` : `1px 1px 0px 0px ${NEO.ink}`, cursor: 'pointer', fontFamily: FONT_BODY }}><Icon size={11} strokeWidth={2.5}/> {cat.label}<span style={{ padding: '0px 3px', fontSize: 8, fontWeight: 800, backgroundColor: active ? NEO.ink : NEO.bg, color: active ? NEO.yellow : NEO.ink, border: `1px solid ${NEO.ink}` }}>{cat.count}</span></button>;
        })}
        </div>
        {/* Search + sort + filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
            <Search size={13} strokeWidth={2.5} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." style={{ width: '100%', padding: '6px 8px 6px 26px', backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 11, outline: 'none' }}/>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 8px', backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 10, cursor: 'pointer', outline: 'none' }}>
            <option value="dealBest">Выгода: лучшие</option><option value="dealWorst">Выгода: худшие</option><option value="priceAsc">Цена: дешевле</option><option value="priceDesc">Цена: дороже</option><option value="nameAsc">Название: А-Я</option><option value="mvDesc">Ценность: выше</option>
          </select>
          <div style={{ display: 'flex', gap: 0, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}>
            <button onClick={() => setDealFilter('all')} style={{ padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: dealFilter === 'all' ? NEO.ink : NEO.surface, color: dealFilter === 'all' ? NEO.yellow : NEO.ink, border: 'none', cursor: 'pointer' }}>Все</button>
            <button onClick={() => setDealFilter('great')} style={{ padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: dealFilter === 'great' ? NEO.lime : NEO.surface, color: NEO.ink, border: 'none', borderLeft: `1px solid ${NEO.ink}`, cursor: 'pointer' }}>Выгода</button>
            <button onClick={() => setDealFilter('fair')} style={{ padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: dealFilter === 'fair' ? NEO.yellow : NEO.surface, color: NEO.ink, border: 'none', borderLeft: `1px solid ${NEO.ink}`, cursor: 'pointer' }}>Честно</button>
            <button onClick={() => setDealFilter('overpriced')} style={{ padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: dealFilter === 'overpriced' ? NEO.red : NEO.surface, color: dealFilter === 'overpriced' ? '#fff' : NEO.ink, border: 'none', borderLeft: `1px solid ${NEO.ink}`, cursor: 'pointer' }}>Дорого</button>
          </div>
          {/* Stat filter toggle */}
          <button onClick={() => setShowStatFilter(!showStatFilter)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: Object.keys(statFilters).length > 0 ? NEO.lime : NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`, cursor: 'pointer', fontFamily: FONT_BODY }}>
            <Filter size={11} strokeWidth={2.5}/> Статы
            {Object.keys(statFilters).length > 0 && <span style={{ padding: '0px 4px', fontSize: 8, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{Object.keys(statFilters).length}</span>}
            <ChevronRight size={10} strokeWidth={2.5} style={{ transform: showStatFilter ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}/>
          </button>
          {/* Price range toggle */}
          <button onClick={() => setShowPriceFilter(!showPriceFilter)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: (priceMin || priceMax) ? NEO.cyan : NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`, cursor: 'pointer', fontFamily: FONT_BODY }}>
            <Coins size={11} strokeWidth={2.5}/> Цена <ChevronDown size={10} strokeWidth={2.5} style={{ transform: showPriceFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}/>
          </button>
          <div style={{ display: 'flex', gap: 0, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}>
            <button onClick={() => setViewMode('table')} style={{ padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: viewMode === 'table' ? NEO.ink : NEO.surface, color: viewMode === 'table' ? NEO.yellow : NEO.ink, border: 'none', cursor: 'pointer' }}>Таблица</button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '5px 8px', fontSize: 9, fontWeight: 700, backgroundColor: viewMode === 'grid' ? NEO.ink : NEO.surface, color: viewMode === 'grid' ? NEO.yellow : NEO.ink, border: 'none', borderLeft: `1px solid ${NEO.ink}`, cursor: 'pointer' }}>Карточки</button>
          </div>
          <span style={{ padding: '3px 6px', fontSize: 10, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}` }}>{filteredGroups.length}</span>
        </div>
        {/* Stat filter panel */}
        {showStatFilter && (<div style={{ marginTop: 4, padding: 8, backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {ALL_STAT_KEYS.map(key => {
                const def = STAT_DEF[key];
                const mode = statFilters[key];
                const Icon = def?.icon || Activity;
                const bg = !mode ? NEO.bg : mode === 'include' ? NEO.lime : NEO.red;
                const fg = !mode ? NEO.ink : (mode === 'include' ? NEO.ink : '#fff');
                const indicator = mode === 'include' ? '+' : mode === 'exclude' ? '−' : '';
                return <button key={key} onClick={() => toggleStatFilter(key)} title={def?.label || key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', fontSize: 10, fontWeight: 700, backgroundColor: bg, color: fg, border: `2px solid ${NEO.ink}`, cursor: 'pointer', fontFamily: FONT_BODY }}>{indicator && <span style={{ fontSize: 12, fontWeight: 900 }}>{indicator}</span>}<Icon size={10} strokeWidth={2.5}/>{def?.label || key}</button>;
            })}
            {Object.keys(statFilters).length > 0 && <button onClick={() => setStatFilters({})} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>Сбросить всё</button>}
          </div>)}
        {/* Price range panel */}
        {showPriceFilter && (<div style={{ marginTop: 4, padding: 8, backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Цена:</span>
            <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="мин" style={{ width: 70, padding: '4px 6px', backgroundColor: NEO.bg, color: NEO.ink, border: `1px solid ${NEO.ink}`, fontSize: 11, outline: 'none' }}/>
            <span style={{ color: NEO.muted, fontSize: 11 }}>—</span>
            <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="макс" style={{ width: 70, padding: '4px 6px', backgroundColor: NEO.bg, color: NEO.ink, border: `1px solid ${NEO.ink}`, fontSize: 11, outline: 'none' }}/>
            {(priceMin || priceMax) && <button onClick={() => { setPriceMin(''); setPriceMax(''); }} style={{ padding: '3px 6px', fontSize: 9, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}`, cursor: 'pointer' }}>Сбросить</button>}
          </div>)}
      </div>

      {/* Notification */}
      {notification && <div style={{ padding: '8px 14px', backgroundColor: NEO.lime, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, display: 'flex', alignItems: 'center', gap: 8 }}><Coins size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/><span style={{ fontWeight: 700, fontSize: 12, color: NEO.ink }}>{notification}</span></div>}

      {/* Content */}
      {filteredGroups.length === 0 ? (<NeoEmpty icon={Gavel} text="Предметы не найдены."/>) : viewMode === 'grid' ? (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
            {visibleGroups.map(group => {
                const bestLot = group.lots.reduce((best, l) => l.pct < best.pct ? l : best, group.lots[0]);
                const cheapestLot = group.lots.reduce((min, l) => l.buyout < min.buyout ? l : min, group.lots[0]);
                const cardBg = group.type === 'Сборный артефакт' ? NEO.yellow : NEO.surface;
                return (<div key={group.key} onClick={() => handleGroupClick(group)} style={{ backgroundColor: cardBg, border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, padding: 8, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 140 }} onMouseEnter={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = `3px 3px 0px 0px ${NEO.ink}`; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 800, fontFamily: 'monospace', color: NEO.muted }}>#{group.itemId}</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <span style={{ padding: '1px 4px', fontSize: 8, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{group.lots.length} шт</span>
                      <DealBadge pct={bestLot.pct} deal={bestLot.deal}/>
                    </div>
                  </div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 12, lineHeight: 1.2, color: NEO.ink }}>{group.name}</div>
                  {group.desc && <div style={{ fontSize: 8, fontWeight: 500, color: NEO.muted, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{auctionStats ? evalDescription(group.desc, auctionStats) : group.desc}</div>}
                  <div style={{ marginTop: 'auto' }}>{renderStats(group.stats, 3)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 3, borderTop: `1px solid ${NEO.ink}` }}>
                    <div>
                      <div style={{ fontSize: 7, fontWeight: 700, color: NEO.muted }}>рынок: {group.marketValue}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: NEO.ink, fontFamily: 'monospace' }}>{cheapestLot.buyout}+</div>
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 600, color: NEO.muted }}>от {cheapestLot.buyout}</div>
                  </div>
                </div>);
            })}
          </div>
          {visibleCount < filteredGroups.length && <div ref={loadingRef} style={{ padding: 12, textAlign: 'center', fontSize: 11, fontWeight: 700, color: NEO.muted }}>Загрузка...</div>}
        </>) : (<div style={{ border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`, backgroundColor: NEO.surface, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead><tr style={{ backgroundColor: NEO.ink, color: NEO.yellow }}>
              <th style={{ padding: '6px 6px', textAlign: 'left', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 30 }}>ID</th>
              <th style={{ padding: '6px 6px', textAlign: 'left', fontSize: 8, fontWeight: 800, textTransform: 'uppercase' }}>Предмет</th>
              <th style={{ padding: '6px 6px', textAlign: 'left', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 90 }}>Статы</th>
              <th style={{ padding: '6px 6px', textAlign: 'center', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 35 }}>Лоты</th>
              <th style={{ padding: '6px 6px', textAlign: 'center', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 45 }}>% рын.</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 50 }}>Рынок</th>
              <th style={{ padding: '6px 6px', textAlign: 'right', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 55 }}>От</th>
              <th style={{ padding: '6px 6px', textAlign: 'center', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', width: 50 }}></th>
            </tr></thead>
            <tbody>
              {visibleGroups.map(group => {
                const bestLot = group.lots.reduce((best, l) => l.pct < best.pct ? l : best, group.lots[0]);
                const cheapestLot = group.lots.reduce((min, l) => l.buyout < min.buyout ? l : min, group.lots[0]);
                return (<tr key={group.key} onClick={() => handleGroupClick(group)} style={{ cursor: 'pointer', backgroundColor: NEO.surface, borderBottom: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.bg} onMouseLeave={e => e.currentTarget.style.backgroundColor = NEO.surface}>
                    <td style={{ padding: '4px 6px', fontSize: 9, fontWeight: 700, fontFamily: 'monospace', color: NEO.muted }}>#{group.itemId}</td>
                    <td style={{ padding: '4px 6px' }}><div style={{ fontSize: 11, fontWeight: 700, color: NEO.ink }}>{group.name}</div><div style={{ fontSize: 8, fontWeight: 600, color: NEO.muted }}>{group.type}</div></td>
                    <td style={{ padding: '4px 6px' }}>{renderStats(group.stats, 2)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}><span style={{ padding: '1px 5px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `1px solid ${NEO.ink}` }}>{group.lots.length}</span></td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}><DealBadge pct={bestLot.pct} deal={bestLot.deal}/></td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: NEO.muted, fontFamily: 'monospace' }}>{group.marketValue}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontSize: 12, fontWeight: 800, color: NEO.ink, fontFamily: 'monospace' }}>{cheapestLot.buyout}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}><button onClick={(e) => { e.stopPropagation(); handleGroupClick(group); }} style={{ padding: '3px 10px', fontSize: 10, fontWeight: 700, backgroundColor: NEO.yellow, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `1px 1px 0px 0px ${NEO.ink}`, cursor: 'pointer', fontFamily: FONT_BODY }}>Лоты →</button></td>
                  </tr>);
            })}
            </tbody>
          </table>
          {visibleCount < filteredGroups.length && <div ref={loadingRef} style={{ padding: 10, textAlign: 'center', fontSize: 10, fontWeight: 700, color: NEO.muted, borderTop: `2px solid ${NEO.ink}` }}>Загрузка...</div>}
        </div>)}

      {/* Group modal */}
      {groupModal && <GroupModal group={groupModal} onClose={() => setGroupModal(null)} onBuy={handleBuy}/>}

      {/* Buy confirmation modal */}
      {buyModal && (<div onClick={() => setBuyModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: NEO.surface, border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`, maxWidth: 380, width: '100%' }}>
            <div style={{ backgroundColor: buyModal.deal === 'great' ? NEO.lime : buyModal.deal === 'overpriced' ? NEO.red : NEO.yellow, padding: '10px 14px', borderBottom: `3px solid ${NEO.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DealBadge pct={buyModal.pct} deal={buyModal.deal}/><span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: NEO.ink }}>{buyModal.name}</span></div>
              <button onClick={() => setBuyModal(null)} style={{ width: 24, height: 24, backgroundColor: NEO.surface, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} strokeWidth={2.5}/></button>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div style={{ padding: 8, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Рынок</div><div style={{ fontSize: 14, fontWeight: 900, fontFamily: FONT_DISPLAY, color: NEO.muted }}>{buyModal.marketValue}</div></div>
                <div style={{ padding: 8, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Ставка</div><div style={{ fontSize: 14, fontWeight: 900, fontFamily: FONT_DISPLAY, color: NEO.muted }}>{buyModal.bid}</div></div>
                <div style={{ padding: 8, backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}` }}><div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', color: NEO.muted }}>Выкуп</div><div style={{ fontSize: 14, fontWeight: 900, fontFamily: FONT_DISPLAY, color: NEO.ink }}>{buyModal.buyout} <Coins size={10} style={{ display: 'inline', color: NEO.yellow }}/></div></div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: NEO.muted }}>{buyModal.seller} · {buyModal.time}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <NeoButton onClick={() => setBuyModal(null)} variant="white" size="sm">Отмена</NeoButton>
                <NeoButton onClick={() => handleConfirmBuy(buyModal)} variant="lime" size="sm"><Coins size={12} strokeWidth={2.5}/> Выкупить</NeoButton>
              </div>
            </div>
          </div>
        </div>)}

      {/* Scroll to top */}
      {showScrollTop && <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 80, width: 40, height: 40, backgroundColor: NEO.lime, color: NEO.ink, border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUp size={18} strokeWidth={2.5}/></button>}
    </div>);
};
