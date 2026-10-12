// ═══════════════════════════════════════════════════════════════
//  ForumSirusFeatures.jsx
//  Дополнительные компоненты форума, вдохновлённые forum.sirus.su:
//    1. UserTitle       — титул под ником ("Комьюнити менеджер" и т.д.)
//    2. StaffBanner     — цветная лента-баннер под/над ником
//    3. ShareButton     — кнопка "Поделиться" с копированием permalink
//    4. MarkReadButton  — кнопка "Отметить прочитанным"
//    5. UserHoverCard   — карточка юзера при наведении на имя
//    6. ThreadPreviewTooltip — превью первого поста темы при наведении
//    7. ReactionsListTooltip — список отреагировавших при наведении
//
//  Импорты:
//    import { UserTitle, StaffBanner, ShareButton, MarkReadButton,
//             UserHoverCard, ThreadPreviewTooltip, ReactionsListTooltip }
//      from '../utils/ForumSirusFeatures';
//
//  Не требует изменений в forumStore — использует существующие методы
//  (getReputation, getNotifications, getUserByName из authStore).
//  Mark-as-read хранится в localStorage напрямую (отдельный ключ).
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Link2, MailCheck, Shield, ShieldCheck, Sparkles, Eye, Clock, Calendar, MessageSquare, } from 'lucide-react';
// ── 1. User title — текстовая подпись под ником ────────────────
// Используется на странице поста (в сайдбаре автора) и в карточке юзера.
// Определяется по роли + опциональному кастомному титулу.
const USER_TITLES = {
    admin: { label: 'Администратор', icon: Shield, color: 'text-red-400' },
    mod: { label: 'Модератор', icon: ShieldCheck, color: 'text-amber-400' },
    user: { label: 'Участник', icon: null, color: 'text-zinc-400' },
};
// Кастомные титулы по имени (как "Комьюнити менеджер" на sirus)
const CUSTOM_TITLES = {
    'Admin': 'Комьюнити менеджер',
    'FrostKing': 'Ветеран сервера',
    'StormWeaver': 'Гайд-мейкер',
    'MoonRider': 'Рейд-лидер',
};
export const UserTitle = ({ user, username, className = '' }) => {
    const name = username || user?.username;
    const role = user?.role || 'user';
    const baseDef = USER_TITLES[role] || USER_TITLES.user;
    const custom = name && CUSTOM_TITLES[name];
    const label = custom || baseDef.label;
    const Icon = baseDef.icon;
    return (<div className={`text-[10px] font-semibold uppercase tracking-wide leading-tight ${baseDef.color} ${className}`}>
      {Icon && <Icon size={9} className="mr-0.5 inline"/>}
      {label}
    </div>);
};
// ── 2. StaffBanner — цветная лента под ником ───────────────────
// Имитирует userBanner из XenForo (как на sirus: "Sirus staff", "Комьюнити менеджер")
// Единый стиль для всех типов — выровненные ленты с одинаковой высотой.
export const StaffBanner = ({ user, username }) => {
    const name = username || user?.username;
    const role = user?.role;
    if (role === 'admin') {
        return (<div className="mt-1.5 inline-flex w-full items-center justify-center gap-1 border-l-[3px] border-red-500 bg-red-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-300">
        <Shield size={9}/> Staff
      </div>);
    }
    if (role === 'mod') {
        return (<div className="mt-1.5 inline-flex w-full items-center justify-center gap-1 border-l-[3px] border-amber-500 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
        <ShieldCheck size={9}/> Модератор
      </div>);
    }
    if (name && CUSTOM_TITLES[name]) {
        return (<div className="mt-1.5 inline-flex w-full items-center justify-center gap-1 border-l-[3px] border-fuchsia-500 bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fuchsia-300">
        <Sparkles size={9}/> {CUSTOM_TITLES[name]}
      </div>);
    }
    return null;
};
// ── 3. ShareButton — кнопка "Поделиться" с permalink ───────────
export const ShareButton = ({ postId, topicId, onToast, size = 13, className = '' }) => {
    const [copied, setCopied] = useState(false);
    const handleShare = async (e) => {
        e?.stopPropagation();
        const url = typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}#!/forum/topic/${topicId}?post=${postId}`
            : `/forum/topic/${topicId}?post=${postId}`;
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
            }
            else {
                // Fallback
                const ta = document.createElement('textarea');
                ta.value = url;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            onToast?.('Ссылка скопирована');
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            onToast?.('Не удалось скопировать');
        }
    };
    return (<button onClick={handleShare} title="Поделиться сообщением" className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${copied
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'} ${className}`}>
      {copied ? <Check size={size}/> : <Link2 size={size}/>}
      {copied ? 'Скопировано' : 'Поделиться'}
    </button>);
};
// ── 4. MarkReadButton — отметить подкатегорию прочитанной ──────
// Хранит список прочитанных подкатегорий в localStorage (mmoportal:readSubcats:v1)
const READ_SUBCATS_KEY = 'mmoportal:readSubcats:v1';
function loadReadSubcats(username) {
    if (typeof window === 'undefined')
        return [];
    try {
        const raw = localStorage.getItem(READ_SUBCATS_KEY);
        if (!raw)
            return [];
        const data = JSON.parse(raw);
        return data[username] || [];
    }
    catch {
        return [];
    }
}
function saveReadSubcat(username, subcatId) {
    if (typeof window === 'undefined')
        return;
    try {
        const raw = localStorage.getItem(READ_SUBCATS_KEY);
        const data = raw ? JSON.parse(raw) : {};
        if (!data[username])
            data[username] = [];
        if (!data[username].includes(subcatId))
            data[username].push(subcatId);
        localStorage.setItem(READ_SUBCATS_KEY, JSON.stringify(data));
    }
    catch { /* ignore */ }
}
export const MarkReadButton = ({ subcatId, username, onDone, className = '' }) => {
    const [marked, setMarked] = useState(false);
    useEffect(() => {
        if (username && subcatId) {
            const read = loadReadSubcats(username);
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this view after its route or browser-owned data changes.
            setMarked(read.includes(subcatId));
        }
    }, [username, subcatId]);
    const handleMark = (e) => {
        e?.stopPropagation();
        if (!username || !subcatId)
            return;
        saveReadSubcat(username, subcatId);
        setMarked(true);
        onDone?.();
    };
    if (!username)
        return null;
    return (<button onClick={handleMark} disabled={marked} title={marked ? 'Подкатегория отмечена как прочитанная' : 'Отметить все темы прочитанными'} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${marked
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:text-white'} ${className}`}>
      <MailCheck size={13}/> {marked ? 'Прочитано' : 'Отметить прочитанным'}
    </button>);
};
// Утилита — используется TopicRow для отображения "нет новых" если подкатегория прочитана
export const isSubcatRead = (username, subcatId) => {
    if (!username || !subcatId)
        return false;
    return loadReadSubcats(username).includes(subcatId);
};
// ── 5. UserHoverCard — карточка юзера при наведении на имя ─────
// Показывает: аватар, ник, титул, баннер, кол-во постов, репутацию, дату регистрации, онлайн-статус
export const UserHoverCard = ({ user, // объект юзера из authStore (с role, createdAt, bio)
username, // строка — имя
postCount = 0, // кол-во постов
reputation = 0, // репутация
isAdmin = false, isMod = false, isOnline = false, children, // триггер (имя/аватар)
align = 'left', // 'left' | 'right'
 }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const hideTimer = useRef(null);
    const cardRef = useRef(null);
    const role = user?.role || (isAdmin ? 'admin' : isMod ? 'mod' : 'user');
    const createdAt = user?.createdAt;
    const bio = user?.bio;
    const show = useCallback((e) => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const cardW = 280;
        const x = align === 'right'
            ? Math.max(8, rect.right - cardW)
            : Math.min(window.innerWidth - cardW - 8, rect.left);
        setPos({ x, y: rect.bottom + 6 });
        setOpen(true);
    }, [align]);
    const hide = useCallback(() => {
        hideTimer.current = setTimeout(() => setOpen(false), 200);
    }, []);
    const cancelHide = useCallback(() => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    }, []);
    if (!username)
        return children || null;
    return (<span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && typeof document !== 'undefined' && (<div ref={cardRef} onMouseEnter={cancelHide} onMouseLeave={hide} style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 100 }} className="w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header with avatar + name */}
          <div className="flex items-center gap-3 border-b border-white/8 bg-gradient-to-r from-emerald-500/[0.06] to-transparent p-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-white shadow-lg ${role === 'admin' ? 'from-red-600 to-rose-700'
                : role === 'mod' ? 'from-amber-500 to-orange-600'
                    : 'from-emerald-500 to-teal-600'}`} style={{ fontSize: 18 }}>
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm font-bold ${role === 'admin' ? 'text-red-400'
                : role === 'mod' ? 'text-amber-400'
                    : 'text-zinc-100'}`}>{username}</div>
              <UserTitle user={user} username={username}/>
              <div className="mt-1">
                <StaffBanner user={user} username={username}/>
              </div>
            </div>
            {isOnline && (<span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400"/>
                онлайн
              </span>)}
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/8 text-center">
            <div className="px-2 py-2.5">
              <div className="text-base font-black text-zinc-200">{postCount}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600">постов</div>
            </div>
            <div className="px-2 py-2.5">
              <div className={`text-base font-black ${reputation > 0 ? 'text-emerald-400' : reputation < 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                {reputation > 0 ? '+' : ''}{reputation}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600">репут.</div>
            </div>
            <div className="px-2 py-2.5">
              <div className="text-base font-black text-amber-400">
                {getAchievementLabel(postCount)}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-600">ранг</div>
            </div>
          </div>
          {/* Bio + joined */}
          <div className="space-y-2 p-3 text-xs">
            {bio && (<div className="text-zinc-400">
                <span className="font-semibold text-zinc-300">О себе: </span>
                {bio.length > 80 ? bio.slice(0, 80) + '…' : bio}
              </div>)}
            {createdAt && (<div className="flex items-center gap-1 text-zinc-500">
                <Calendar size={11}/>
                На портале с {new Date(createdAt).toLocaleDateString('ru-RU')}
              </div>)}
          </div>
        </div>)}
    </span>);
};
function getAchievementLabel(postCount) {
    if (postCount >= 200)
        return '👑';
    if (postCount >= 50)
        return '🏆';
    if (postCount >= 10)
        return '⚡';
    if (postCount >= 1)
        return '🌱';
    return '—';
}
// ── 6. ThreadPreviewTooltip — превью первого поста темы ────────
// Показывается при наведении на заголовок темы в списке тем.
export const ThreadPreviewTooltip = ({ topic, firstPost, children }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const hideTimer = useRef(null);
    const show = useCallback((e) => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        if (!firstPost && !topic)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cardW = 360;
        const x = Math.min(window.innerWidth - cardW - 8, Math.max(8, rect.left));
        setPos({ x, y: rect.bottom + 6 });
        setOpen(true);
    }, [firstPost, topic]);
    const hide = useCallback(() => {
        hideTimer.current = setTimeout(() => setOpen(false), 200);
    }, []);
    const cancelHide = useCallback(() => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    }, []);
    // Strip markdown for preview
    const previewText = (firstPost?.content || '')
        .replace(/[#*`>_~\[\]()]/g, '')
        .replace(/\[item:\d+\]/g, '📦')
        .replace(/\n+/g, ' ')
        .trim()
        .slice(0, 200);
    return (<span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && (<div onMouseEnter={cancelHide} onMouseLeave={hide} style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 100 }} className="w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-white/8 bg-gradient-to-r from-fuchsia-500/[0.06] to-transparent px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
              <Eye size={11}/> Превью темы
            </div>
            <div className="mt-1 text-sm font-bold text-zinc-100 line-clamp-2">{topic?.title}</div>
          </div>
          <div className="p-4">
            {previewText ? (<p className="text-xs leading-relaxed text-zinc-400">{previewText}{firstPost?.content?.length > 200 ? '…' : ''}</p>) : (<p className="text-xs italic text-zinc-600">Нет содержимого</p>)}
            <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-2 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1">
                <MessageSquare size={10}/> {topic?.views || 0} просмотров
              </span>
              {firstPost?.date && (<span className="flex items-center gap-1">
                  <Clock size={10}/> {firstPost.date}
                </span>)}
            </div>
          </div>
        </div>)}
    </span>);
};
// ── 7. ReactionsListTooltip — список отреагировавших ──────────
// Показывает при наведении на блок реакций список юзеров.
export const ReactionsListTooltip = ({ reactions = {}, children }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const hideTimer = useRef(null);
    // reactions: { '👍': { count, users: ['Admin', 'FrostKing'] }, ... }
    const allUsers = [];
    Object.entries(reactions).forEach(([emoji, data]) => {
        (data?.users || []).forEach(u => allUsers.push({ emoji, user: u }));
    });
    const show = useCallback((e) => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        if (allUsers.length === 0)
            return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cardW = 260;
        const x = Math.min(window.innerWidth - cardW - 8, Math.max(8, rect.left));
        setPos({ x, y: rect.bottom + 4 });
        setOpen(true);
    }, [allUsers.length]);
    const hide = useCallback(() => {
        hideTimer.current = setTimeout(() => setOpen(false), 200);
    }, []);
    const cancelHide = useCallback(() => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    }, []);
    if (allUsers.length === 0)
        return children || null;
    return (<span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && (<div onMouseEnter={cancelHide} onMouseLeave={hide} style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 100 }} className="w-[260px] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Реакции ({allUsers.length})
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar p-2">
            {allUsers.map((r, i) => (<div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-white/5">
                <span className="text-sm">{r.emoji}</span>
                <span className="truncate text-zinc-300">{r.user}</span>
              </div>))}
          </div>
        </div>)}
    </span>);
};
