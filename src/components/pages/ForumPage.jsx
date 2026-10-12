'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from '@/lib/router';
import { Activity, Bell, Bold, BookOpen, Bookmark, Check, ChevronRight, ChevronUp, Clock, Code, Copy, Edit2, Eye, EyeOff, Flag, Hash, Home, Image as ImageIcon, Italic, Link2, List, ListOrdered, Lock, Maximize2, MessageSquare, Minimize2, Minus, Paperclip, Pin, PlusCircle, Quote, Search, Send, Shield, Smile, Trash2, TrendingUp, X, Zap, ArrowUp, History, Move, Merge, Archive, ChevronDown } from 'lucide-react';
import { STAT_DEF } from '@/data/gameData';
import { parseMarkdown } from '@/lib/gameUtils';
import { dataStore } from '@/lib/dataStore';
import { forumStore, useForumData } from '@/lib/forumStore';
import { useCurrentUser, authStore } from '@/lib/authStore';
import { UserTitle, ShareButton, ThreadPreviewTooltip, ReactionsListTooltip, } from '@/lib/ForumSirusFeatures';
import { NEO, NeoBadge } from '@/components/Neo';
/* ════════════════════════════════════════════════════════════════
   Constants
   ════════════════════════════════════════════════════════════════ */
const POSTS_PER_PAGE = 8;
const TOPICS_PER_PAGE = 12;
const REACTIONS = ['👍', '🔥', '❤️', '😂', '🎉', '🤔', '👎', '🤡', '🤮', '🤦'];
const TAGS = [
    { id: 'guide', label: 'Гайд', icon: BookOpen, color: 'lime' },
    { id: 'question', label: 'Вопрос', icon: MessageSquare, color: 'cyan' },
    { id: 'discussion', label: 'Обсуждение', icon: Hash, color: 'pink' },
    { id: 'solved', label: 'Решено', icon: Check, color: 'lime' },
    { id: 'announcement', label: 'Анонс', icon: Zap, color: 'yellow' },
    { id: 'bug', label: 'Баг', icon: X, color: 'red' },
];
/* Neobrutalism palette mapping for tag colors */
const TAG_STYLES = {
    lime: { bg: NEO.lime, fg: NEO.ink, dot: NEO.limeDark },
    cyan: { bg: NEO.cyan, fg: NEO.ink, dot: NEO.cyanDark },
    pink: { bg: NEO.pink, fg: '#fff', dot: NEO.pinkDark },
    yellow: { bg: NEO.yellow, fg: NEO.ink, dot: NEO.yellowDark },
    red: { bg: NEO.red, fg: '#fff', dot: NEO.redDark },
};
const getTag = (id) => TAGS.find(t => t.id === id);
/* Online users (mock — would come from server in production) */
const ONLINE_USERS = ['FrostKing', 'StormWeaver', 'Admin', 'PlayerOne', 'NightOwl', 'MoonRider'];
const isOnline = (name) => ONLINE_USERS.includes(name);
/* All emojis available in the markdown editor (horizontal scroll picker) */
const ALL_EMOJIS = [
    '😀', '😂', '🤣', '😊', '😍', '😎', '🤔', '😢', '😭', '😡', '😱', '😴', '🤯', '🥳', '😇', '😈',
    '👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🙏', '💪', '👊', '✊', '🤟', '👌', '🤙', '👋', '🤜',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💝', '💘', '💔', '❣️', '💟', '💕', '💞',
    '⚔️', '🗡️', '🛡️', '🏹', '🪓', '🔨', '🔥', '💥', '⚡', '☠️', '💀', '🩸', '🎯', '⚒️', '🔱', '🤺',
    '✨', '🌟', '⭐', '💫', '🪄', '🔮', '🧙', '🧝', '🧚', '🧞', '🌀', '💎', '🎒', '📜', '🧪', '⚗️',
    '🐉', '🐲', '🦅', '🐺', '🦊', '🐻', '🦁', '🐍', '🕷️', '🦇', '🌙', '☀️', '🌧️', '❄️', '🌊', '🌳',
    '✅', '❌', '⚠️', '🚫', '💯', '🔔', '📢', '📌', '🏆', '🥇', '👑', '💰', '🎁', '🎉', '🎊', '🃏',
    '🤡', '🤮', '🤦', '💩', '😴', '🥱', '🙄', '😏', '😬', '🤥', '👀', '🧐', '🤓', '😈', '👿', '👹',
];
/* Color & size options for [color=] and [size=] toolbar dropdowns */
const COLOR_OPTIONS = [
    { name: 'Красный', value: '#ef4444' },
    { name: 'Оранжевый', value: '#f97316' },
    { name: 'Янтарный', value: '#f59e0b' },
    { name: 'Зелёный', value: '#22c55e' },
    { name: 'Изумруд', value: '#10b981' },
    { name: 'Бирюзовый', value: '#06b6d4' },
    { name: 'Розовый', value: '#ec4899' },
    { name: 'Фуксия', value: '#d946ef' },
    { name: 'Пурпур', value: '#a855f7' },
    { name: 'Серый', value: '#9ca3af' },
    { name: 'Чёрный', value: '#000000' },
];
const SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28];
/* Achievement tiers based on post count — neobrutalism colors */
const ACHIEVEMENT_TIERS = [
    { min: 200, label: 'Легенда', bg: NEO.yellow, fg: NEO.ink, icon: '👑' },
    { min: 50, label: 'Ветеран', bg: NEO.pink, fg: '#fff', icon: '🏆' },
    { min: 10, label: 'Активный', bg: NEO.lime, fg: NEO.ink, icon: '⚡' },
    { min: 1, label: 'Новичок', bg: NEO.cyan, fg: NEO.ink, icon: '🌱' },
];
const getAchievement = (postCount) => ACHIEVEMENT_TIERS.find(t => postCount >= t.min) || null;
/* Avatar color palette (neobrutalism) */
const AVATAR_COLORS = [
    { bg: NEO.pink, fg: '#fff' },
    { bg: NEO.yellow, fg: NEO.ink },
    { bg: NEO.lime, fg: NEO.ink },
    { bg: NEO.cyan, fg: NEO.ink },
    { bg: NEO.violet, fg: '#fff' },
];
/* ════════════════════════════════════════════════════════════════
   itemLookup — used by parseMarkdown to resolve [item:ID] tokens
   ════════════════════════════════════════════════════════════════ */
const itemLookup = (id) => {
    const allItems = [...dataStore.get('DB_ITEMS'), ...dataStore.get('DB_REGULAR_ITEMS'), ...dataStore.get('DB_CHARMS')];
    return allItems.find(i => String(i.id) === String(id));
};
/* ════════════════════════════════════════════════════════════════
   Inline <style> for spoiler tags — neobrutalism palette
   ════════════════════════════════════════════════════════════════ */
const SpoilerStyles = () => (<style>{`
    .spoiler-tag {
      background-color: ${NEO.ink} !important;
      border: 2px solid ${NEO.ink} !important;
      color: ${NEO.yellow} !important;
      font-weight: 700 !important;
      padding: 2px 6px !important;
      cursor: pointer;
      display: inline-block;
    }
    .spoiler-tag .spoiler-content { display: none !important; }
    .spoiler-tag.spoiler-revealed {
      background-color: ${NEO.lime} !important;
      border-color: ${NEO.ink} !important;
    }
    .spoiler-tag.spoiler-revealed .spoiler-content {
      display: inline !important;
      color: ${NEO.ink} !important;
    }
    .spoiler-tag.spoiler-revealed::before {
      content: '📦 раскрыто: ';
      color: ${NEO.ink};
      font-size: 0.75rem;
    }
    .forum-post-content { color: ${NEO.ink}; }
    .forum-post-content pre { white-space: pre-wrap; }
    .forum-post-content code { white-space: pre-wrap; word-break: break-word; }
    .forum-post-content img { max-width: 100%; }
  `}</style>);
/* ════════════════════════════════════════════════════════════════
   Shared inline-style helpers (neobrutalism)
   ════════════════════════════════════════════════════════════════ */
const cardStyle = (bg = NEO.surface) => ({
    backgroundColor: bg,
    border: `3px solid ${NEO.ink}`,
    boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
});
const cardHoverStyle = {
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    cursor: 'pointer',
};
const btnStyle = (bg = NEO.surface, fg = NEO.ink) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: '"Space Grotesk", sans-serif',
    backgroundColor: bg,
    color: fg,
    border: `3px solid ${NEO.ink}`,
    boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    whiteSpace: 'nowrap',
});
const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: NEO.surface,
    color: NEO.ink,
    border: `3px solid ${NEO.ink}`,
    boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
    fontFamily: '"Space Grotesk", sans-serif',
    fontWeight: 500,
    fontSize: '14px',
    outline: 'none',
    transition: 'transform 0.1s, box-shadow 0.1s',
};
const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: NEO.muted,
};
const headerBarStyle = (bg = NEO.yellow) => ({
    backgroundColor: bg,
    borderBottom: `3px solid ${NEO.ink}`,
    padding: '12px 20px',
});
/* ════════════════════════════════════════════════════════════════
   Small presentational components
   ════════════════════════════════════════════════════════════════ */
const TagBadge = ({ tagId, size = 'sm' }) => {
    const tag = getTag(tagId);
    if (!tag)
        return null;
    const style = TAG_STYLES[tag.color];
    const TagIcon = tag.icon;
    return (<span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: size === 'xs' ? '2px 6px' : '3px 8px',
            fontSize: size === 'xs' ? '10px' : '11px',
            fontWeight: 700,
            backgroundColor: style.bg,
            color: style.fg,
            border: `2px solid ${NEO.ink}`,
            boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
        }}>
      <TagIcon size={size === 'xs' ? 9 : 11} strokeWidth={2.5}/>
      {tag.label}
    </span>);
};
const Avatar = ({ name, size = 40, isAdmin, isMod }) => {
    const initials = name ? name.slice(0, 2).toUpperCase() : '??';
    const avatarSrc = authStore.getUsers().find((user) => user.username === name)?.avatar;
    const colorIdx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
    const color = isAdmin
        ? { bg: NEO.red, fg: '#fff' }
        : isMod
            ? { bg: NEO.yellow, fg: NEO.ink }
            : AVATAR_COLORS[colorIdx];
    return (<div style={{
            width: size,
            height: size,
            minWidth: size,
            fontSize: size * 0.36,
            backgroundColor: color.bg,
            color: color.fg,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            fontWeight: 900,
            fontFamily: '"Archivo Black", sans-serif',
        }}>
      {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover"/> : initials}
    </div>);
};
const RoleBadge = ({ user, isOP, isMe }) => {
    if (!user)
        return null;
    if (user.role === 'admin')
        return <NeoBadge bg={NEO.red} fg="#fff">ADMIN</NeoBadge>;
    if (user.role === 'mod')
        return <NeoBadge bg={NEO.yellow} fg={NEO.ink}>MOD</NeoBadge>;
    if (isOP)
        return <NeoBadge bg={NEO.yellow} fg={NEO.ink}>Автор</NeoBadge>;
    if (isMe)
        return <NeoBadge bg={NEO.cyan} fg={NEO.ink}>Вы</NeoBadge>;
    return null;
};
const AchievementBadge = ({ postCount }) => {
    const ach = getAchievement(postCount);
    if (!ach)
        return null;
    return (<span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: ach.bg,
            color: ach.fg,
            border: `2px solid ${NEO.ink}`,
            boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
        }}>
      <span>{ach.icon}</span> {ach.label}
    </span>);
};
const Toast = ({ message, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (<div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            backgroundColor: NEO.ink,
            color: NEO.yellow,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `6px 6px 0px 0px ${NEO.lime}`,
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            fontSize: '14px',
        }}>
      <div style={{ width: 10, height: 10, backgroundColor: NEO.lime, border: `2px solid ${NEO.ink}` }}/>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: NEO.yellow, cursor: 'pointer', marginLeft: 8, padding: 0, display: 'flex' }}>
        <X size={14} strokeWidth={3}/>
      </button>
    </div>);
};
const ToolBtn = ({ onClick, children, title }) => (<button type="button" onClick={onClick} title={title} style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NEO.surface,
        color: NEO.ink,
        border: `2px solid ${NEO.ink}`,
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
    }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = NEO.yellow; e.currentTarget.style.transform = 'translate(1px,1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = NEO.surface; e.currentTarget.style.transform = 'translate(0,0)'; }}>
    {children}
  </button>);
const Pagination = ({ current, total, onChange }) => {
    if (total <= 1)
        return null;
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    return (<div className="flex flex-wrap items-center justify-center gap-2 py-4">
      <button disabled={current === 1} onClick={() => onChange(current - 1)} style={{
            ...btnStyle(NEO.surface, NEO.ink),
            opacity: current === 1 ? 0.4 : 1,
            cursor: current === 1 ? 'not-allowed' : 'pointer',
        }}>
        ← Назад
      </button>
      {pages.map(p => (<button key={p} onClick={() => onChange(p)} style={{
                width: 36,
                height: 36,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: '"Space Grotesk", sans-serif',
                backgroundColor: current === p ? NEO.lime : NEO.surface,
                color: NEO.ink,
                border: `3px solid ${NEO.ink}`,
                boxShadow: current === p ? `4px 4px 0px 0px ${NEO.ink}` : `3px 3px 0px 0px ${NEO.ink}`,
                cursor: 'pointer',
                transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
          {p}
        </button>))}
      <button disabled={current === total} onClick={() => onChange(current + 1)} style={{
            ...btnStyle(NEO.surface, NEO.ink),
            opacity: current === total ? 0.4 : 1,
            cursor: current === total ? 'not-allowed' : 'pointer',
        }}>
        Вперёд →
      </button>
    </div>);
};
/* ════════════════════════════════════════════════════════════════
   MarkdownEditor — neobrutalism toolbar
   ════════════════════════════════════════════════════════════════ */
const MarkdownEditor = ({ value, onChange, placeholder, minHeight = 140, onSubmit }) => {
    const tab = 'write';
    const [showEmoji, setShowEmoji] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [showSizes, setShowSizes] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const wrap = (before, after = '') => {
        const el = textareaRef.current;
        if (!el)
            return;
        const s = el.selectionStart, e = el.selectionEnd;
        const next = value.substring(0, s) + before + value.substring(s, e) + after + value.substring(e);
        onChange(next);
        setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length); }, 0);
    };
    const insertLink = () => {
        const el = textareaRef.current;
        if (!el)
            return;
        const selected = value.substring(el.selectionStart, el.selectionEnd) || 'текст ссылки';
        wrap(`[${selected}](`, ')');
    };
    const insertImage = () => {
        const url = window.prompt('URL изображения:');
        if (url)
            wrap(`![изображение](${url})\n`);
    };
    const insertList = () => { wrap('- ', ''); };
    const insertOrderedList = () => { wrap('1. ', ''); };
    const insertHR = () => { wrap('\n---\n'); };
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (file.size > 500 * 1024) {
            alert('Файл слишком большой. Максимум 500КБ.');
            e.target.value = '';
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Только изображения.');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const imageId = forumStore.saveImage({ name: file.name, type: file.type, dataUrl: String(reader.result) });
            wrap('![' + file.name + '](local-image://' + imageId + ')\n');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    const applyColor = (color) => {
        wrap(`[color=${color}]`, '[/color]');
        setShowColors(false);
    };
    const applySize = (size) => {
        wrap(`[size=${size}]`, '[/size]');
        setShowSizes(false);
    };
    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                wrap('**', '**');
            }
            else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                wrap('*', '*');
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (onSubmit)
                    onSubmit();
            }
        }
    };
    const divider = <div style={{ width: 1, height: 16, backgroundColor: NEO.ink, margin: '0 4px', flexShrink: 0 }}/>;
    return (<div style={{
            ...(fullscreen
                ? { position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', backgroundColor: NEO.bg }
                : {}),
            ...(!fullscreen ? cardStyle(NEO.surface) : {}),
            overflow: 'hidden',
        }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2" style={{ borderBottom: `3px solid ${NEO.ink}`, backgroundColor: NEO.yellow, padding: '8px 12px' }}>
        <div className="flex items-center gap-1 overflow-x-auto">
          <ToolBtn onClick={() => wrap('**', '**')} title="Жирный (Ctrl+B)"><Bold size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={() => wrap('*', '*')} title="Курсив (Ctrl+I)"><Italic size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={() => wrap('~~', '~~')} title="Зачёркнутый"><span style={{ textDecoration: 'line-through', fontWeight: 700 }}><Minus size={14} strokeWidth={2.5}/></span></ToolBtn>
          {divider}
          {/* Color picker dropdown */}
          <div className="relative">
            <ToolBtn onClick={() => { setShowColors(!showColors); setShowSizes(false); setShowEmoji(false); }} title="Цвет текста">
              <span style={{ display: 'inline-block', width: 16, height: 16, background: `linear-gradient(135deg, ${NEO.red} 0%, ${NEO.yellow} 50%, ${NEO.pink} 100%)`, border: `2px solid ${NEO.ink}` }}/>
            </ToolBtn>
            {showColors && (<>
                <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setShowColors(false)}/>
                <div style={{
                position: 'absolute', left: 0, top: '100%', zIndex: 30, marginTop: 4, width: 160,
                maxHeight: 260, overflowY: 'auto',
                backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                padding: 6,
            }}>
                  {COLOR_OPTIONS.map(c => (<button key={c.value} type="button" onClick={() => applyColor(c.value)} style={{
                    display: 'flex', width: '100%', alignItems: 'center', gap: 8,
                    padding: '6px 8px', fontSize: 12, fontWeight: 600,
                    backgroundColor: 'transparent', color: NEO.ink, border: 'none', cursor: 'pointer',
                }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = NEO.bg; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <span style={{ width: 12, height: 12, backgroundColor: c.value, border: `2px solid ${NEO.ink}`, flexShrink: 0 }}/>
                      {c.name}
                    </button>))}
                </div>
              </>)}
          </div>
          {/* Size picker dropdown */}
          <div className="relative">
            <ToolBtn onClick={() => { setShowSizes(!showSizes); setShowColors(false); setShowEmoji(false); }} title="Размер текста">
              <span style={{ fontSize: 11, fontWeight: 900, fontFamily: '"Archivo Black", sans-serif' }}>A</span>
            </ToolBtn>
            {showSizes && (<>
                <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setShowSizes(false)}/>
                <div style={{
                position: 'absolute', left: 0, top: '100%', zIndex: 30, marginTop: 4, width: 112,
                backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                padding: 6,
            }}>
                  {SIZE_OPTIONS.map(s => (<button key={s} type="button" onClick={() => applySize(s)} style={{
                    display: 'block', width: '100%', padding: '4px 8px',
                    fontSize: s, fontWeight: 600,
                    backgroundColor: 'transparent', color: NEO.ink, border: 'none', cursor: 'pointer',
                }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = NEO.bg; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      {s}px
                    </button>))}
                </div>
              </>)}
          </div>
          {divider}
          <ToolBtn onClick={insertList} title="Маркированный список"><List size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={insertOrderedList} title="Нумерованный список"><ListOrdered size={14} strokeWidth={2.5}/></ToolBtn>
          {divider}
          <ToolBtn onClick={() => wrap('> ')} title="Цитата"><Quote size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={() => wrap('`', '`')} title="Код"><Code size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={insertLink} title="Ссылка"><Link2 size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={insertImage} title="Изображение по URL"><ImageIcon size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={insertHR} title="Разделитель"><Minus size={14} strokeWidth={2.5}/></ToolBtn>
          <ToolBtn onClick={() => wrap('[spoiler]', '[/spoiler]')} title="Спойлер"><EyeOff size={14} strokeWidth={2.5}/></ToolBtn>
          {divider}
          <div className="relative">
            <ToolBtn onClick={() => { setShowEmoji(!showEmoji); setShowColors(false); setShowSizes(false); }} title="Эмодзи"><Smile size={14} strokeWidth={2.5}/></ToolBtn>
            {showEmoji && (<>
                <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setShowEmoji(false)}/>
                <div style={{
                position: 'absolute', left: 0, top: '100%', zIndex: 30, marginTop: 8, maxWidth: 320,
                overflowX: 'auto', backgroundColor: NEO.surface,
                border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`, padding: 8,
            }}>
                  <div className="flex gap-1">
                    {ALL_EMOJIS.map(e => (<button key={e} type="button" onClick={() => { wrap(e); }} style={{
                    width: 32, height: 32, flexShrink: 0, fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                }} onMouseEnter={(ev) => { ev.currentTarget.style.backgroundColor = NEO.yellow; }} onMouseLeave={(ev) => { ev.currentTarget.style.backgroundColor = 'transparent'; }}>
                        {e}
                      </button>))}
                  </div>
                </div>
              </>)}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: value.length > 5000 ? NEO.red : NEO.muted }}>{value.length}/5000</span>
          <ToolBtn onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? 'Свернуть' : 'Полный экран'}>
            {fullscreen ? <Minimize2 size={14} strokeWidth={2.5}/> : <Maximize2 size={14} strokeWidth={2.5}/>}
          </ToolBtn>
        </div>
      </div>

      {/* Body */}
      <div className={fullscreen ? 'flex-1 overflow-auto' : ''}>
        {tab === 'write' ? (<>
          <textarea ref={textareaRef} value={value} onChange={e => onChange(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} maxLength={5000} style={{
                width: '100%',
                minHeight: fullscreen ? '100%' : minHeight,
                padding: '12px 16px',
                backgroundColor: NEO.surface,
                color: NEO.ink,
                border: 'none',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 500,
                fontSize: 14,
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
            }}/>
          {value.trim() && (<div style={{ borderTop: '2px solid #000', backgroundColor: NEO.bg, padding: '10px 16px' }}>
              <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em', color: NEO.muted, textTransform: 'uppercase' }}>\u0422\u0430\u043a \u0443\u0432\u0438\u0434\u044f\u0442 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435</div>
              <div className="forum-post-content" dangerouslySetInnerHTML={parseMarkdown(value, itemLookup, true)}/>
            </div>)}
          </>) : (<div style={{ minHeight, padding: '12px 16px' }} className="forum-post-content" dangerouslySetInnerHTML={parseMarkdown(value || '*Нет содержимого*', itemLookup, true)}/>)}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between" style={{ borderTop: `3px solid ${NEO.ink}`, backgroundColor: NEO.bg, padding: '8px 12px' }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            fontSize: 12, fontWeight: 700,
            backgroundColor: NEO.surface, color: NEO.ink,
            border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            cursor: 'pointer',
        }}>
          <Paperclip size={13} strokeWidth={2.5}/> Прикрепить файлы
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }}/>
        <span style={{ fontSize: 10, fontWeight: 600, color: NEO.muted }}>Markdown · эмодзи · [item:ID] · Ctrl+B/I · Ctrl+Enter</span>
      </div>
    </div>);
};
/* ════════════════════════════════════════════════════════════════
   AuthorName — author name with mini-profile hover popover
   ════════════════════════════════════════════════════════════════ */
const AuthorName = ({ name, postUser, postCount, reputation, isAdmin, isMod, isOP, isMe, onAuthorClick, size = 'sm' }) => {
    const [showCard, setShowCard] = useState(false);
    const hoverTimer = useRef(null);
    const handleEnter = () => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setShowCard(true), 220);
    };
    const handleLeave = () => {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setShowCard(false), 180);
    };
    const regDate = postUser?.registeredAt || postUser?.createdAt || postUser?.date || null;
    const ach = getAchievement(postCount);
    return (<div className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button type="button" onClick={() => onAuthorClick(name)} style={{
            fontSize: size === 'sm' ? 13 : 15,
            fontWeight: 800,
            fontFamily: '"Space Grotesk", sans-serif',
            color: isAdmin ? NEO.red : isMod ? NEO.yellowDark : isOP ? NEO.yellowDark : NEO.ink,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            textDecoration: 'underline',
        }}>
        {name}
      </button>
      {showCard && (<div style={{
                position: 'absolute', left: 0, top: '100%', zIndex: 150, marginTop: 8, width: 256,
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                padding: 16, textAlign: 'left',
            }}>
          <div className="flex items-center gap-3">
            <Avatar name={name} size={48} isAdmin={isAdmin} isMod={isMod}/>
            <div className="min-w-0">
              <div style={{ fontWeight: 900, color: NEO.ink, fontFamily: '"Archivo Black", sans-serif', fontSize: 14 }}>{name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: NEO.muted }}>
                {isAdmin ? 'Администратор' : isMod ? 'Модератор' : 'Пользователь'}
              </div>
              {isOnline(name) && <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, color: NEO.limeDark }}>● онлайн</div>}
            </div>
          </div>
          {ach && (<div className="mt-3 flex justify-center">
              <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    backgroundColor: ach.bg, color: ach.fg,
                    border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                <span>{ach.icon}</span> {ach.label}
              </span>
            </div>)}
          <div className="mt-3 space-y-1.5" style={{ borderTop: `2px solid ${NEO.ink}`, paddingTop: 12, fontSize: 12 }}>
            <div className="flex justify-between">
              <span style={{ color: NEO.muted, fontWeight: 600 }}>Репутация:</span>
              <span style={{ fontWeight: 800, color: reputation > 0 ? NEO.limeDark : reputation < 0 ? NEO.red : NEO.ink }}>{reputation > 0 ? '+' : ''}{reputation}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: NEO.muted, fontWeight: 600 }}>Сообщений:</span>
              <span style={{ fontWeight: 800, color: NEO.ink }}>{postCount}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: NEO.muted, fontWeight: 600 }}>На сайте с:</span>
              <span style={{ fontWeight: 800, color: NEO.ink }}>{regDate || '—'}</span>
            </div>
          </div>
          <button type="button" onClick={() => onAuthorClick(name)} style={{
                marginTop: 12, width: '100%',
                padding: '6px 12px', fontSize: 12, fontWeight: 700,
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                cursor: 'pointer',
            }}>
            Все темы автора →
          </button>
        </div>)}
    </div>);
};
/* ════════════════════════════════════════════════════════════════
   ForumSidebar — shared across main + subcategory views.
   ════════════════════════════════════════════════════════════════ */
const SidebarCard = ({ title, icon, accentBg, accentFg, children }) => {
    const Icon = icon;
    return (<div style={cardStyle(NEO.surface)}>
      <h3 className="flex items-center justify-between" style={{
            ...headerBarStyle(accentBg),
            color: accentFg,
            fontSize: 13, fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            fontFamily: '"Archivo Black", sans-serif',
        }}>
        <span className="flex items-center gap-2">
          <Icon size={16} strokeWidth={2.5}/>
          {title}
        </span>
      </h3>
      <div style={{ padding: 16 }}>{children}</div>
    </div>);
};
const ForumSidebar = ({ posts, topics, users, onlineUsers, onJumpToTopic, currentUser, onOpenPMs }) => {
    const lastPosts = [...posts].slice(-5).reverse();
    const totalTopics = topics.length;
    const totalPosts = posts.length;
    const totalUsers = users.length;
    const newestUser = users.length ? users[users.length - 1] : null;
    const unreadPMs = currentUser ? forumStore.getUnreadPMs(currentUser) : 0;
    return (<div className="space-y-4">
      {/* PM widget */}
      {currentUser && (<SidebarCard title="Личные сообщения" icon={MessageSquare} accentBg={NEO.pink} accentFg="#fff">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 11, fontWeight: 700, color: NEO.muted, textTransform: 'uppercase' }}>
              {unreadPMs > 0 ? `${unreadPMs} новых` : 'Нет новых'}
            </span>
            {unreadPMs > 0 && (<span style={{
                    padding: '2px 8px', fontSize: 11, fontWeight: 800,
                    backgroundColor: NEO.pink, color: '#fff',
                    border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                }}>{unreadPMs} нов.</span>)}
          </div>
          <button onClick={onOpenPMs} style={{
                width: '100%', padding: '8px 14px',
                fontSize: 13, fontWeight: 700,
                backgroundColor: NEO.pink, color: '#fff',
                border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
            Открыть переписку
          </button>
        </SidebarCard>)}

      {/* Новые сообщения */}
      <SidebarCard title="Новые сообщения" icon={TrendingUp} accentBg={NEO.yellow} accentFg={NEO.ink}>
        <div className="space-y-3">
          {lastPosts.length === 0 ? (<p style={{ fontSize: 12, fontStyle: 'italic', color: NEO.muted }}>Пока нет сообщений</p>) : lastPosts.map(post => {
            const topic = topics.find(t => t.id === post.topicId);
            return (<button key={post.id} onClick={() => topic && onJumpToTopic(topic)} className="group flex w-full items-start gap-2.5 text-left" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
                <Avatar name={post.author} size={28} isAdmin={post.author === 'Admin'} isMod={false}/>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span style={{ fontSize: 12, fontWeight: 800, color: NEO.ink }}>{post.author}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: NEO.muted, flexShrink: 0 }}>{post.date}</span>
                  </div>
                  <p style={{ marginTop: 2, fontSize: 11, lineHeight: 1.3, color: NEO.muted, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {post.content.replace(/[#*`>_\[\]]/g, '').replace(/!\[.*?\]\(.*?\)/g, '').slice(0, 80)}
                  </p>
                </div>
              </button>);
        })}
        </div>
      </SidebarCard>

      {/* Статистика форума */}
      <SidebarCard title="Статистика форума" icon={Activity} accentBg={NEO.lime} accentFg={NEO.ink}>
        <div className="grid grid-cols-2 gap-3">
          <div style={{ backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, padding: 12, boxShadow: `3px 3px 0px 0px ${NEO.ink}` }}>
            <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1, color: NEO.limeDark }}>{totalTopics}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NEO.muted, marginTop: 2 }}>тем</div>
          </div>
          <div style={{ backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, padding: 12, boxShadow: `3px 3px 0px 0px ${NEO.ink}` }}>
            <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1, color: NEO.yellowDark }}>{totalPosts}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NEO.muted, marginTop: 2 }}>сообщений</div>
          </div>
          <div style={{ backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, padding: 12, boxShadow: `3px 3px 0px 0px ${NEO.ink}` }}>
            <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1, color: NEO.pinkDark }}>{totalUsers}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NEO.muted, marginTop: 2 }}>пользователей</div>
          </div>
          <div style={{ backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, padding: 12, boxShadow: `3px 3px 0px 0px ${NEO.ink}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: NEO.cyanDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newestUser ? newestUser.username : '—'}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: NEO.muted, marginTop: 2 }}>новый участник</div>
          </div>
        </div>
      </SidebarCard>

      {/* Кто онлайн */}
      <SidebarCard title="Кто онлайн" icon={Activity} accentBg={NEO.cyan} accentFg={NEO.ink}>
        <div className="flex flex-wrap gap-1.5">
          {onlineUsers.length === 0 ? (<p style={{ fontSize: 12, fontStyle: 'italic', color: NEO.muted }}>Никого нет</p>) : onlineUsers.map(name => (<span key={name} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', fontSize: 12, fontWeight: 700,
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            }}>
              <span style={{ width: 6, height: 6, backgroundColor: NEO.lime, border: `1px solid ${NEO.ink}` }}/>
              {name}
            </span>))}
        </div>
        <p style={{ marginTop: 12, fontSize: 11, fontWeight: 600, color: NEO.muted }}>{onlineUsers.length} пользователей · {Math.max(0, Math.floor(onlineUsers.length * 2.4))} гостей</p>
      </SidebarCard>
    </div>);
};
/* ════════════════════════════════════════════════════════════════
   ForumPage — main component
   ════════════════════════════════════════════════════════════════ */
export const ForumPage = () => {
    const navigate = useNavigate();
    const { subcatId, topicId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const authorFilter = searchParams.get('author');
    /* ── View state (driven by URL via useEffect) ── */
    const [view, setView] = useState('main');
    const [activeMainCat, setActiveMainCat] = useState(null);
    const [activeSubCat, setActiveSubCat] = useState(null);
    const [activeTopic, setActiveTopic] = useState(null);
    /* ── Forum data (persists in localStorage via forumStore) ── */
    const forumData = useForumData();
    const { mainCategories: mainCats, subCategories: subCats, topics, posts } = forumData;
    const currentUser = useCurrentUser();
    const forumStats = currentUser?.savedArmory?.spellStats || null;
    const CURRENT_USER = currentUser ? currentUser.username : 'Гость';
    const IS_ADMIN = currentUser?.role === 'admin';
    const IS_MOD = currentUser?.role === 'mod';
    const CAN_MODERATE = IS_ADMIN || IS_MOD;
    const IS_BANNED = currentUser?.banned === true;
    const IS_MUTED = currentUser?.muted === true;
    /* ── Form state ── */
    const [newPostText, setNewPostText] = useState('');
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');
    const [newTopicTag, setNewTopicTag] = useState('');
    const [newMainCatName, setNewMainCatName] = useState('');
    const [newSubCatName, setNewSubCatName] = useState('');
    const [newSubCatDesc, setNewSubCatDesc] = useState('');
    const [newSubCatParent, setNewSubCatParent] = useState(1);
    /* ── Poll fields (Feature #6) ── */
    const [pollEnabled, setPollEnabled] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    /* ── Topic list filter state ── */
    const [topicSearch, setTopicSearch] = useState('');
    const [topicTagFilter, setTopicTagFilter] = useState('all');
    const [topicSort, setTopicSort] = useState('newest');
    const [topicsPage, setTopicsPage] = useState(1);
    const [postsPage, setPostsPage] = useState(1);
    /* ── Post interaction state ── */
    const [editingPostId, setEditingPostId] = useState(null);
    const [editingContent, setEditingContent] = useState('');
    const [quotedPost, setQuotedPost] = useState(null);
    const [toast, setToast] = useState(null);
    const [openReactionsFor, setOpenReactionsFor] = useState(null);
    const [itemTooltip, setItemTooltip] = useState(null);
    const [itemModal, setItemModal] = useState(null);
    const [warnModal, setWarnModal] = useState(null);
    const [warnReason, setWarnReason] = useState('');
    /* ── New feature state ── */
    const [moveTopicModal, setMoveTopicModal] = useState(null);
    const [moveTargetSubcat, setMoveTargetSubcat] = useState('');
    const [massMoveModal, setMassMoveModal] = useState(null);
    const [massMoveTarget, setMassMoveTarget] = useState('');
    const [reportModal, setReportModal] = useState(null);
    const [reportReason, setReportReason] = useState('');
    const [pmModal, setPmModal] = useState(null);
    const [pmText, setPmText] = useState('');
    const [pmInboxOpen, setPmInboxOpen] = useState(false);
    const [editHistoryModal, setEditHistoryModal] = useState(null);
    const [archiveChoiceModal, setArchiveChoiceModal] = useState(null);
    // Forum standard: moderation + post actions as dropdowns (not button rows)
    const [modDropdownOpen, setModDropdownOpen] = useState(false);
    const [quickReplyFor, setQuickReplyFor] = useState(null);
    const [quickReplyText, setQuickReplyText] = useState('');
    const [selectedTopicIds, setSelectedTopicIds] = useState([]);
    const [massMode, setMassMode] = useState(false);
    const [expandedIgnored, setExpandedIgnored] = useState(new Set());
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const replyRef = useRef(null);
    const draftRef = useRef('');
    const showToast = useCallback((msg) => setToast(msg), []);
    /* ── URL → view sync ── */
    const subCatsKey = JSON.stringify(subCats);
    const mainCatsKey = JSON.stringify(mainCats);
    useEffect(() => {
        if (topicId) {
            const topic = forumStore.getTopics().find(t => String(t.id) === String(topicId));
            if (topic) {
                const sub = subCats.find(s => s.id === topic.subcategoryId);
                const main = mainCats.find(c => c.id === sub?.parentId);
                // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize this view after its route or browser-owned data changes.
                setActiveMainCat(main || null);
                setActiveSubCat(sub || null);
                setActiveTopic({ ...topic, views: (topic.views || 0) + 1 });
                setPostsPage(1);
                setNewPostText('');
                setQuotedPost(null);
                setQuickReplyFor(null);
                setView('topic');
                return;
            }
        }
        if (subcatId) {
            const sub = subCats.find(s => String(s.id) === String(subcatId));
            if (sub) {
                const main = mainCats.find(c => c.id === sub.parentId);
                setActiveMainCat(main || null);
                setActiveSubCat(sub);
                setTopicsPage(1);
                setTopicSearch('');
                setTopicTagFilter('all');
                setTopicSort('newest');
                setView('subcategory');
                return;
            }
        }
        if (authorFilter) {
            setView('authorTopics');
            setActiveMainCat(null);
            setActiveSubCat(null);
            setActiveTopic(null);
            return;
        }
        setView('main');
        setActiveMainCat(null);
        setActiveSubCat(null);
        setActiveTopic(null);
    }, [subcatId, topicId, authorFilter, subCatsKey, mainCatsKey]);
    /* ── Helpers ── */
    const now = () => {
        const d = new Date();
        return `Сегодня, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    const subscribed = forumStore.getSubscriptions(CURRENT_USER);
    const bookmarked = forumStore.getBookmarks(CURRENT_USER);
    const ignoredUsers = currentUser ? forumStore.getIgnored(CURRENT_USER) : [];
    const getPostCount = useCallback((username) => posts.filter(p => p.author === username).length, [posts]);
    /* ── Navigation handlers ── */
    const handleSubcategoryClick = (sub) => navigate(`/forum/subcat/${sub.id}`);
    const handleTopicClick = (topic) => navigate(`/forum/topic/${topic.id}`);
    const goMain = () => { setSearchParams({}); navigate('/forum'); };
    const handleAuthorClick = (name) => {
        navigate(`/forum?author=${encodeURIComponent(name)}`);
    };
    const clearAuthorFilter = () => {
        setSearchParams({});
        navigate('/forum');
    };
    const navigateTo = (target) => {
        if (target === 'main') {
            goMain();
            return;
        }
        if (target === 'subcategory' && activeSubCat) {
            navigate(`/forum/subcat/${activeSubCat.id}`);
            return;
        }
        if (target === 'createMainCat' || target === 'createSubCat') {
            setView(target);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (target === 'createTopic') {
            setView('createTopic');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (target === 'archive') {
            setView('archive');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setView(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    /* ── Create category handlers ── */
    const handleCreateMainCat = (e) => {
        e.preventDefault();
        if (!newMainCatName.trim())
            return;
        if (!CAN_MODERATE) {
            showToast('Только модератор может создавать разделы');
            return;
        }
        forumStore.addMainCategory(newMainCatName);
        setNewMainCatName('');
        showToast('Раздел создан!');
        navigateTo('main');
    };
    const handleCreateSubCat = (e) => {
        e.preventDefault();
        if (!newSubCatName.trim())
            return;
        if (!CAN_MODERATE) {
            showToast('Только модератор может создавать подразделы');
            return;
        }
        forumStore.addSubCategory(newSubCatParent, newSubCatName, newSubCatDesc);
        setNewSubCatName('');
        setNewSubCatDesc('');
        showToast('Подраздел создан!');
        navigateTo('main');
    };
    /* ── Create topic handler (with permission + poll support) ── */
    const handleCreateTopic = (e) => {
        e.preventDefault();
        if (!newTopicTitle.trim() || !newTopicContent.trim())
            return;
        if (!currentUser) {
            showToast('Войдите, чтобы создавать темы');
            return;
        }
        if (!forumStore.canCreateTopic(CURRENT_USER, activeSubCat?.id)) {
            showToast('У вас нет прав создавать темы в этом разделе');
            return;
        }
        const newTopic = forumStore.addTopic({
            subcategoryId: activeSubCat.id,
            title: newTopicTitle,
            author: CURRENT_USER,
            date: now(),
            tag: newTopicTag || null,
        });
        forumStore.addPost({ topicId: newTopic.id, author: CURRENT_USER, content: newTopicContent, date: now() });
        if (pollEnabled && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
            const cleanOptions = pollOptions.map(o => o.trim()).filter(Boolean);
            forumStore.addPoll(newTopic.id, pollQuestion.trim(), cleanOptions);
        }
        setNewTopicTitle('');
        setNewTopicContent('');
        setNewTopicTag('');
        setPollEnabled(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        showToast('Тема создана!');
        navigate(`/forum/topic/${newTopic.id}`);
    };
    /* ── Post handlers ── */
    const handleAddPost = () => {
        if (!newPostText.trim())
            return;
        if (!currentUser) {
            showToast('Войдите, чтобы отвечать');
            return;
        }
        if (IS_MUTED) {
            showToast('Вам запрещено писать (мут)');
            return;
        }
        forumStore.addPost({ topicId: activeTopic.id, author: CURRENT_USER, content: newPostText, date: now() });
        setNewPostText('');
        draftRef.current = '';
        forumStore.clearDraft(activeTopic.id, CURRENT_USER);
        setQuotedPost(null);
        showToast('Ответ отправлен!');
        const newCount = posts.filter(p => p.topicId === activeTopic.id).length + 1;
        setPostsPage(Math.ceil(newCount / POSTS_PER_PAGE));
    };
    const handleQuickReplySubmit = (postId) => {
        if (!quickReplyText.trim())
            return;
        if (!currentUser) {
            showToast('Войдите, чтобы отвечать');
            return;
        }
        if (IS_MUTED) {
            showToast('Вам запрещено писать (мут)');
            return;
        }
        forumStore.addPost({ topicId: activeTopic.id, author: CURRENT_USER, content: quickReplyText, date: now() });
        setQuickReplyFor(null);
        setQuickReplyText('');
        showToast('Ответ отправлен!');
        const newCount = posts.filter(p => p.topicId === activeTopic.id).length + 1;
        setPostsPage(Math.ceil(newCount / POSTS_PER_PAGE));
    };
    const handleReact = (postId, emoji) => {
        if (!currentUser) {
            showToast('Войдите, чтобы реагировать');
            return;
        }
        forumStore.toggleReaction(postId, emoji, CURRENT_USER);
    };
    const handleQuote = (post) => {
        let quote = '';
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) {
            quote = sel.toString().trim();
        }
        else {
            quote = post.content.substring(0, 200);
            if (post.content.length > 200)
                quote += '...';
        }
        const quoteText = `> **${post.author}:** ${quote.replace(/\n/g, '\n> ')}\n\n`;
        setNewPostText(prev => prev ? prev + '\n' + quoteText : quoteText);
        setQuotedPost(post);
        setTimeout(() => { replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    };
    const handleStartEdit = (post) => {
        setEditingPostId(post.id);
        setEditingContent(post.content);
    };
    const handleSaveEdit = (id) => {
        if (!editingContent.trim())
            return;
        const oldPost = posts.find(p => p.id === id);
        if (oldPost && oldPost.content !== editingContent) {
            forumStore.saveEditHistory(id, oldPost.content);
        }
        forumStore.updatePost(id, editingContent);
        setEditingPostId(null);
        showToast('Сообщение обновлено');
    };
    const handleDeletePost = (id) => {
        if (!confirm('Удалить сообщение?'))
            return;
        forumStore.deletePost(id);
        showToast('Сообщение удалено');
    };
    /* ── Topic moderation handlers ── */
    const handleTogglePin = () => {
        if (!activeTopic || !CAN_MODERATE)
            return;
        const next = !activeTopic.pinned;
        forumStore.updateTopic(activeTopic.id, { pinned: next });
        setActiveTopic({ ...activeTopic, pinned: next });
        showToast(next ? 'Тема закреплена' : 'Тема откреплена');
    };
    const handleToggleClose = () => {
        if (!activeTopic || !CAN_MODERATE)
            return;
        const next = !activeTopic.closed;
        forumStore.updateTopic(activeTopic.id, { closed: next });
        setActiveTopic({ ...activeTopic, closed: next });
        showToast(next ? 'Тема закрыта' : 'Тема открыта');
    };
    const handleDeleteTopic = () => {
        if (!activeTopic || !CAN_MODERATE)
            return;
        setArchiveChoiceModal({ topicId: activeTopic.id });
    };
    const confirmArchive = () => {
        if (!archiveChoiceModal)
            return;
        forumStore.archiveTopic(archiveChoiceModal.topicId);
        showToast('Тема архивирована');
        setArchiveChoiceModal(null);
        if (activeSubCat)
            navigate(`/forum/subcat/${activeSubCat.id}`);
        else
            navigate('/forum');
    };
    const confirmPermanentDelete = () => {
        if (!archiveChoiceModal)
            return;
        if (!confirm('Удалить тему навсегда вместе со всеми сообщениями?'))
            return;
        forumStore.deleteTopic(archiveChoiceModal.topicId);
        showToast('Тема удалена навсегда');
        setArchiveChoiceModal(null);
        if (activeSubCat)
            navigate(`/forum/subcat/${activeSubCat.id}`);
        else
            navigate('/forum');
    };
    const handleMarkSolved = () => {
        if (!activeTopic)
            return;
        forumStore.updateTopic(activeTopic.id, { tag: 'solved' });
        setActiveTopic({ ...activeTopic, tag: 'solved' });
        showToast('Тема помечена как решённая');
    };
    const handleMoveTopic = () => {
        if (!activeTopic || !CAN_MODERATE)
            return;
        setMoveTopicModal({ topicId: activeTopic.id, currentSubcatId: activeTopic.subcategoryId });
        setMoveTargetSubcat(String(activeTopic.subcategoryId));
    };
    const confirmMoveTopic = () => {
        if (!moveTopicModal || !moveTargetSubcat)
            return;
        forumStore.moveTopic(moveTopicModal.topicId, Number(moveTargetSubcat));
        showToast('Тема перемещена');
        setMoveTopicModal(null);
        navigate(`/forum/subcat/${moveTargetSubcat}`);
    };
    /* ── Subscribe / Bookmark ── */
    const handleToggleSubscribe = () => {
        if (!currentUser) {
            showToast('Войдите, чтобы подписаться');
            return;
        }
        forumStore.toggleSubscription(activeTopic.id, CURRENT_USER);
        showToast(subscribed.includes(activeTopic.id) ? 'Вы отписались от темы' : 'Вы подписались на тему');
    };
    const handleToggleBookmark = () => {
        if (!currentUser) {
            showToast('Войдите, чтобы добавить в закладки');
            return;
        }
        forumStore.toggleBookmark(activeTopic.id, CURRENT_USER);
        showToast(bookmarked.includes(activeTopic.id) ? 'Удалено из закладок' : 'Добавлено в закладки');
    };
    /* ── Warn user (admin/mod) ── */
    const handleOpenWarn = (post) => {
        setWarnModal({ username: post.author, postId: post.id });
        setWarnReason('');
    };
    const handleSubmitWarn = () => {
        if (!warnModal)
            return;
        if (!warnReason.trim()) {
            showToast('Укажите причину предупреждения');
            return;
        }
        forumStore.addWarning(warnModal.username, warnReason, CURRENT_USER);
        showToast(`Предупреждение выдано: ${warnModal.username}`);
        setWarnModal(null);
        setWarnReason('');
    };
    /* ── Feature #4: Report post ── */
    const handleOpenReport = (post) => {
        if (!currentUser) {
            showToast('Войдите, чтобы жаловаться');
            return;
        }
        setReportModal({ postId: post.id });
        setReportReason('');
    };
    const handleSubmitReport = () => {
        if (!reportModal)
            return;
        if (!reportReason.trim()) {
            showToast('Укажите причину жалобы');
            return;
        }
        forumStore.addReport(reportModal.postId, CURRENT_USER, reportReason.trim());
        showToast('Жалоба отправлена');
        setReportModal(null);
        setReportReason('');
    };
    /* ── Feature #13: PM system ── */
    const handleOpenPM = (toUser) => {
        if (!currentUser) {
            showToast('Войдите, чтобы отправлять ЛС');
            return;
        }
        if (toUser === CURRENT_USER) {
            showToast('Нельзя писать ЛС самому себе');
            return;
        }
        setPmModal({ to: toUser });
        setPmText('');
    };
    const handleSubmitPM = () => {
        if (!pmModal || !pmText.trim())
            return;
        forumStore.sendPM(CURRENT_USER, pmModal.to, pmText.trim());
        showToast(`Сообщение отправлено: ${pmModal.to}`);
        setPmModal(null);
        setPmText('');
    };
    /* ── Feature #14: Reputation / karma ── */
    const handleReputation = (postId, author, delta) => {
        if (!currentUser) {
            showToast('Sign in to vote');
            return;
        }
        if (author === CURRENT_USER) {
            showToast('You cannot vote for your own post');
            return;
        }
        forumStore.votePostReputation(postId, author, CURRENT_USER, delta);
    };
    const handleToggleIgnore = (author) => {
        if (!currentUser) {
            showToast('Войдите, чтобы управлять игнор-листом');
            return;
        }
        if (author === CURRENT_USER) {
            showToast('Нельзя игнорировать себя');
            return;
        }
        forumStore.toggleIgnore(CURRENT_USER, author);
        const isIgnored = forumStore.getIgnored(CURRENT_USER).includes(author);
        showToast(isIgnored ? `Пользователь ${author} добавлен в игнор` : `Пользователь ${author} удалён из игнора`);
    };
    /* ── Feature #29: Collapsible categories ── */
    const collapsedCats = currentUser ? forumStore.getCollapsedCats(CURRENT_USER) : [];
    const handleToggleCollapseCat = (catId) => {
        if (!currentUser)
            return;
        forumStore.toggleCollapsedCat(catId, CURRENT_USER);
    };
    /* ── Feature #6: Polls — vote ── */
    const handleVote = (optionIdx) => {
        if (!currentUser) {
            showToast('Войдите, чтобы голосовать');
            return;
        }
        if (!activeTopic)
            return;
        forumStore.votePoll(activeTopic.id, optionIdx, CURRENT_USER);
        showToast('Голос принят');
    };
    /* ── Feature #17: Mass topic management ── */
    const toggleTopicSelection = (topicId) => {
        setSelectedTopicIds(prev => prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]);
    };
    const handleMassDelete = () => {
        if (selectedTopicIds.length === 0)
            return;
        if (!confirm(`Удалить ${selectedTopicIds.length} тем навсегда?`))
            return;
        selectedTopicIds.forEach(id => forumStore.deleteTopic(id));
        showToast(`Удалено тем: ${selectedTopicIds.length}`);
        setSelectedTopicIds([]);
    };
    const handleMassArchive = () => {
        if (selectedTopicIds.length === 0)
            return;
        if (!confirm(`Архивировать ${selectedTopicIds.length} тем?`))
            return;
        selectedTopicIds.forEach(id => forumStore.archiveTopic(id));
        showToast(`Архивировано тем: ${selectedTopicIds.length}`);
        setSelectedTopicIds([]);
    };
    const handleMassClose = () => {
        if (selectedTopicIds.length === 0)
            return;
        selectedTopicIds.forEach(id => forumStore.updateTopic(id, { closed: true }));
        showToast(`Закрыто тем: ${selectedTopicIds.length}`);
        setSelectedTopicIds([]);
    };
    const handleOpenMassMove = () => {
        if (selectedTopicIds.length === 0)
            return;
        setMassMoveModal({ topicIds: [...selectedTopicIds] });
        setMassMoveTarget(String(activeSubCat?.id || ''));
    };
    const confirmMassMove = () => {
        if (!massMoveModal || !massMoveTarget)
            return;
        massMoveModal.topicIds.forEach(id => forumStore.moveTopic(id, Number(massMoveTarget)));
        showToast(`Перемещено тем: ${massMoveModal.topicIds.length}`);
        setMassMoveModal(null);
        setSelectedTopicIds([]);
    };
    // Feature #18: Merge topics
    const handleMerge = () => {
        if (selectedTopicIds.length < 2) {
            showToast('Выберите минимум 2 темы');
            return;
        }
        if (!confirm(`Объединить ${selectedTopicIds.length} тем в «${topics.find(t => t.id === selectedTopicIds[0])?.title || 'первую выбранную'}»? Все посты будут перемещены в неё.`))
            return;
        const [targetId, ...sourceIds] = selectedTopicIds;
        sourceIds.forEach(srcId => forumStore.mergeTopics(srcId, targetId));
        showToast('Темы объединены');
        setSelectedTopicIds([]);
    };
    /* ── Feature #19: Restore from archive ── */
    const handleRestoreArchived = (topicId) => {
        forumStore.restoreTopic(topicId);
        showToast('Тема восстановлена из архива');
    };
    /* ── Feature #8: Autosave draft ── */
    useEffect(() => {
        draftRef.current = newPostText;
    }, [newPostText]);
    useEffect(() => {
        if (view !== 'topic' || !activeTopic || !currentUser)
            return;
        const draft = forumStore.getDraft(activeTopic.id, CURRENT_USER);
        if (draft && !newPostText) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the locally saved draft after opening its topic.
            setNewPostText(draft);
            draftRef.current = draft;
        }
        const interval = setInterval(() => {
            if (draftRef.current) {
                forumStore.saveDraft(activeTopic.id, CURRENT_USER, draftRef.current);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [view, activeTopic?.id, CURRENT_USER]);
    /* ── Feature #10: Unread tracking ── */
    useEffect(() => {
        if (view === 'topic' && activeTopic && currentUser) {
            const topicPosts = forumStore.getPostsByTopic(activeTopic.id);
            const postIds = topicPosts.map(p => p.id);
            const t = setTimeout(() => {
                forumStore.markTopicRead(activeTopic.id, CURRENT_USER, postIds);
            }, 600);
            return () => clearTimeout(t);
        }
    }, [view, activeTopic?.id, CURRENT_USER]);
    /* ── Feature #28 + #30: Scroll-to-top button + reading progress ── */
    useEffect(() => {
        const handler = () => {
            setShowScrollTop(window.scrollY > 500);
            if (view === 'topic') {
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                const progress = scrollHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollHeight) * 100)) : 0;
                setReadingProgress(progress);
            }
            else {
                setReadingProgress(0);
            }
        };
        window.addEventListener('scroll', handler, { passive: true });
        handler();
        return () => window.removeEventListener('scroll', handler);
    }, [view]);
    /* ── Stats helpers ── */
    const getSubStats = (subId) => {
        const ts = topics.filter(t => t.subcategoryId === subId);
        const ps = posts.filter(p => ts.some(t => t.id === p.topicId));
        const last = ts.length > 0 ? ts[ts.length - 1] : null;
        const lastPost = ps.length > 0 ? ps[ps.length - 1] : null;
        return { topics: ts.length, posts: ps.length, lastTopic: last, lastPost };
    };
    const getTopicStats = (topicId) => {
        const tp = posts.filter(p => p.topicId === topicId);
        const lastPost = tp.length ? tp[tp.length - 1] : null;
        return {
            replies: Math.max(0, tp.length - 1),
            views: topics.find(t => t.id === topicId)?.views || 0,
            likes: tp.reduce((s, p) => s + (p.likes || 0), 0),
            lastPost,
            lastDate: lastPost ? lastPost.date : (topics.find(t => t.id === topicId)?.date || ''),
        };
    };
    const getVisibleTopics = () => {
        if (!activeSubCat)
            return [];
        let list = topics.filter(t => t.subcategoryId === activeSubCat.id);
        if (topicSearch.trim()) {
            const q = topicSearch.toLowerCase();
            list = list.filter(t => t.title.toLowerCase().includes(q) || t.author.toLowerCase().includes(q));
        }
        if (topicTagFilter !== 'all')
            list = list.filter(t => t.tag === topicTagFilter);
        if (topicSort === 'popular')
            list = [...list].sort((a, b) => getTopicStats(b.id).likes - getTopicStats(a.id).likes);
        else if (topicSort === 'replies')
            list = [...list].sort((a, b) => getTopicStats(b.id).replies - getTopicStats(a.id).replies);
        else
            list = [...list].sort((a, b) => (b.id - a.id));
        return list;
    };
    const visibleTopics = view === 'subcategory' ? getVisibleTopics() : [];
    const pinnedTopics = visibleTopics.filter(t => t.pinned);
    const regularTopics = visibleTopics.filter(t => !t.pinned);
    const pagedRegularTopics = regularTopics.slice((topicsPage - 1) * TOPICS_PER_PAGE, topicsPage * TOPICS_PER_PAGE);
    const regularTotalPages = Math.ceil(regularTopics.length / TOPICS_PER_PAGE);
    const currentPosts = activeTopic ? posts.filter(p => p.topicId === activeTopic.id) : [];
    const topicStarter = currentPosts[0] || null;
    const replyPosts = currentPosts.slice(1);
    const pagedReplies = replyPosts.slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE);
    const pagedPosts = topicStarter ? [topicStarter, ...pagedReplies] : [];
    const postsTotalPages = Math.max(1, Math.ceil(replyPosts.length / POSTS_PER_PAGE));
    const allUsers = (() => {
        try {
            return JSON.parse(localStorage.getItem('mmoportal:users:v1') || '[]');
        }
        catch {
            return [];
        }
    })();
    const sidebarUsers = allUsers.length > 0 ? allUsers : [{ username: 'admin', role: 'admin' }];
    const getUserByName = (name) => allUsers.find(u => u.username === name);
    const canCreateInActive = activeSubCat && currentUser
        ? forumStore.canCreateTopic(CURRENT_USER, activeSubCat.id)
        : false;
    const activePoll = activeTopic ? forumStore.getPoll(activeTopic.id) : null;
    /* ════════════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════════════ */
    return (<div>
      <SpoilerStyles />
      {toast && <Toast message={toast} onClose={() => setToast(null)}/>}

      {/* Reading progress bar */}
      {view === 'topic' && (<div style={{ position: 'fixed', left: 0, top: 0, zIndex: 180, height: 4, width: '100%', backgroundColor: 'transparent' }}>
          <div style={{ height: '100%', width: `${readingProgress}%`, backgroundColor: NEO.lime, borderBottom: `2px solid ${NEO.ink}`, transition: 'width 0.15s' }}/>
        </div>)}

      {/* Scroll-to-top button */}
      {showScrollTop && (<button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Наверх" style={{
                position: 'fixed', bottom: 24, left: 24, zIndex: 170,
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.lime, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
                cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
          <ArrowUp size={18} strokeWidth={3}/>
        </button>)}

      <div className="relative">
        {/* ── Page heading ── */}
        <div className="mb-6">
          <h1 className="flex items-center gap-3" style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 30, color: NEO.ink }}>
            <span style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: NEO.pink, color: '#fff',
            border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
        }}>
              <MessageSquare size={20} strokeWidth={2.5}/>
            </span>
            <span style={{ background: `linear-gradient(180deg, transparent 60%, ${NEO.yellow} 60%)`, padding: '0 0.1em' }}>Форум сообщества</span>
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, fontWeight: 500, color: NEO.muted }}>Обсуждения, гайды, поиск гильдии и сообщения о багах</p>
        </div>

        {/* ── Breadcrumb Bar ── */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-2">
            <button onClick={goMain} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', fontSize: 13, fontWeight: 700,
            backgroundColor: view === 'main' && !authorFilter ? NEO.lime : NEO.surface,
            color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            cursor: 'pointer',
        }}>
              <Home size={14} strokeWidth={2.5}/> Форум
            </button>
            {authorFilter && (<>
                <ChevronRight size={14} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 13, fontWeight: 700,
                backgroundColor: NEO.pink, color: '#fff',
                border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            }}>
                  Темы автора: {authorFilter}
                  <button onClick={clearAuthorFilter} style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#fff' }}>
                    <X size={12} strokeWidth={3}/>
                  </button>
                </span>
              </>)}
            {activeMainCat && (<>
                <ChevronRight size={14} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                <span style={{ padding: '6px 12px', fontSize: 13, fontWeight: 600, color: NEO.muted }}>{activeMainCat.name}</span>
              </>)}
            {activeSubCat && (<>
                <ChevronRight size={14} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                <button onClick={() => navigateTo('subcategory')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', fontSize: 13, fontWeight: 700,
                backgroundColor: view === 'subcategory' || view === 'createTopic' ? NEO.lime : NEO.surface,
                color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                cursor: 'pointer',
            }}>
                  {activeSubCat.name}
                </button>
              </>)}
            {activeTopic && view === 'topic' && (<>
                <ChevronRight size={14} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                <span style={{ maxWidth: 200, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: NEO.limeDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{activeTopic.title}</span>
              </>)}
            {view === 'archive' && (<>
                <ChevronRight size={14} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                <span style={{ padding: '6px 12px', fontSize: 13, fontWeight: 700, backgroundColor: NEO.yellow, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}>Архив</span>
              </>)}
          </nav>
          <div className="flex flex-shrink-0 gap-2">
            {view === 'main' && !authorFilter && CAN_MODERATE && (<>
                <button onClick={() => setView('createSubCat')} style={btnStyle(NEO.lime, NEO.ink)}>
                  <PlusCircle size={14} strokeWidth={2.5}/> Подраздел
                </button>
                <button onClick={() => setView('archive')} style={btnStyle(NEO.surface, NEO.ink)}>
                  <Archive size={13} strokeWidth={2.5}/> Архив
                </button>
              </>)}
            {view === 'subcategory' && canCreateInActive && (<button onClick={() => setView('createTopic')} style={btnStyle(NEO.lime, NEO.ink)}>
                <PlusCircle size={16} strokeWidth={2.5}/> Создать тему
              </button>)}
            {view === 'subcategory' && CAN_MODERATE && (<button onClick={() => { setMassMode(!massMode); setSelectedTopicIds([]); }} style={btnStyle(massMode ? NEO.yellow : NEO.surface, NEO.ink)}>
                <Check size={13} strokeWidth={2.5}/> {massMode ? 'Готово' : 'Массовое управление'}
              </button>)}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            MAIN VIEW — forum standard: full-width categories + compact stats below
            ════════════════════════════════════════════════════════════ */}
        {view === 'main' && !authorFilter && (<div className="space-y-6">
            <div className="space-y-4">
              {mainCats.length === 0 ? (<div style={{ ...cardStyle(NEO.surface), padding: 40, textAlign: 'center' }}>
                  <MessageSquare size={32} strokeWidth={2.5} style={{ color: NEO.muted, margin: '0 auto' }}/>
                  <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, color: NEO.muted }}>Разделов пока нет</p>
                  {CAN_MODERATE && (<button onClick={() => setView('createMainCat')} style={{ ...btnStyle(NEO.lime, NEO.ink), marginTop: 12 }}>
                      Создать первый раздел →
                    </button>)}
                </div>) : (mainCats.map((cat, catIdx) => {
                const catSubs = subCats.filter(s => s.parentId === cat.id && !s.hidden);
                const catHiddenSubs = subCats.filter(s => s.parentId === cat.id && s.hidden);
                const isCollapsed = collapsedCats.includes(cat.id);
                const catAccent = [NEO.lime, NEO.yellow, NEO.cyan, NEO.pink][catIdx % 4];
                return (<div key={cat.id} style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
                      {/* Category header */}
                      <button onClick={() => handleToggleCollapseCat(cat.id)} className="flex w-full items-center gap-3 text-left" style={{
                        width: '100%',
                        backgroundColor: catAccent,
                        borderBottom: `3px solid ${NEO.ink}`,
                        padding: '16px 24px',
                        border: 'none',
                        cursor: 'pointer',
                    }}>
                        <div style={{
                        width: 40, height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: NEO.surface, color: NEO.ink,
                        border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                    }}>
                          <BookOpen size={18} strokeWidth={2.5}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, color: NEO.ink }}>{cat.name}</h2>
                          <p style={{ fontSize: 12, fontWeight: 600, color: NEO.ink, opacity: 0.7 }}>
                            {catSubs.length} подразделов{CAN_MODERATE && catHiddenSubs.length > 0 ? ` · ${catHiddenSubs.length} скрыто` : ''}{isCollapsed ? ' · свёрнут' : ''}
                          </p>
                        </div>
                        <ChevronDown size={18} strokeWidth={2.5} style={{ color: NEO.ink, transform: isCollapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}/>
                        {CAN_MODERATE && (<span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); if (window.confirm(`Удалить раздел «${cat.name}» со всеми подразделами, темами и сообщениями?`)) {
                        forumStore.deleteMainCategory(cat.id);
                        showToast('Раздел удалён');
                    } }} onKeyDown={(e) => { if (e.key === 'Enter') {
                        e.stopPropagation();
                        if (window.confirm(`Удалить раздел «${cat.name}»?`)) {
                            forumStore.deleteMainCategory(cat.id);
                            showToast('Раздел удалён');
                        }
                    } }} style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            padding: 6, backgroundColor: NEO.red, color: '#fff',
                            border: `2px solid ${NEO.ink}`, cursor: 'pointer',
                        }} title="Удалить раздел">
                            <Trash2 size={15} strokeWidth={2.5}/>
                          </span>)}
                      </button>

                      {!isCollapsed && (<>
                          {catSubs.length === 0 && !CAN_MODERATE ? (<p style={{ padding: '20px 24px', fontSize: 14, fontStyle: 'italic', color: NEO.muted }}>Нет подразделов</p>) : (<div>
                              {catSubs.map(sub => {
                                const st = getSubStats(sub.id);
                                return (<div key={sub.id} className="group flex w-full items-center gap-4 text-left" style={{ padding: '16px 24px', borderBottom: `2px solid ${NEO.ink}`, transition: 'background-color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = NEO.bg; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                                    <button onClick={() => handleSubcategoryClick(sub)} style={{
                                        width: 44, height: 44, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: NEO.lime, color: NEO.ink,
                                        border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                                        cursor: 'pointer', transition: 'transform 0.1s',
                                    }}>
                                      <MessageSquare size={20} strokeWidth={2.5}/>
                                    </button>
                                    <button onClick={() => handleSubcategoryClick(sub)} className="min-w-0 flex-1 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                      <div style={{ fontWeight: 800, color: NEO.ink, fontSize: 15 }}>{sub.name}</div>
                                      <div style={{ marginTop: 2, fontSize: 13, color: NEO.muted, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.desc}</div>
                                    </button>
                                    <div className="hidden flex-shrink-0 items-center gap-5 sm:flex" style={{ fontSize: 12, color: NEO.muted }}>
                                      <div className="text-center">
                                        <div style={{ fontSize: 14, fontWeight: 800, color: NEO.ink }}>{st.topics}</div>
                                        <div>тем</div>
                                      </div>
                                      <div className="text-center">
                                        <div style={{ fontSize: 14, fontWeight: 800, color: NEO.ink }}>{st.posts}</div>
                                        <div>постов</div>
                                      </div>
                                      {st.lastPost && (<div className="hidden max-w-[150px] text-right lg:block">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <Avatar name={st.lastPost.author} size={20} isAdmin={st.lastPost.author === 'Admin'}/>
                                            <button onClick={(e) => { e.stopPropagation(); handleAuthorClick(st.lastPost.author); }} style={{
                                            fontSize: 12, fontWeight: 700, color: NEO.cyanDark,
                                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>{st.lastPost.author}</button>
                                          </div>
                                          <div style={{ marginTop: 2, fontSize: 11, fontWeight: 600, color: NEO.muted }}>{st.lastPost.date}</div>
                                        </div>)}
                                      {CAN_MODERATE && (<div className="flex gap-1" style={{ opacity: 0, transition: 'opacity 0.15s' }}>
                                          <button onClick={() => { forumStore.toggleHideSubCategory(sub.id); showToast(sub.hidden ? 'Подраздел показан' : 'Подраздел скрыт'); }} style={{ padding: 6, backgroundColor: NEO.yellow, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'inline-flex' }} title="Скрыть подраздел">
                                            <EyeOff size={14} strokeWidth={2.5}/>
                                          </button>
                                          <button onClick={() => { if (window.confirm(`Удалить подраздел «${sub.name}» со всеми темами и сообщениями?`)) {
                                        forumStore.deleteSubCategory(sub.id);
                                        showToast('Подраздел удалён');
                                    } }} style={{ padding: 6, backgroundColor: NEO.red, color: '#fff', border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'inline-flex' }} title="Удалить подраздел">
                                            <Trash2 size={14} strokeWidth={2.5}/>
                                          </button>
                                        </div>)}
                                      <ChevronRight size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/>
                                    </div>
                                  </div>);
                            })}
                              {CAN_MODERATE && catHiddenSubs.map(sub => (<div key={sub.id} className="group flex w-full items-center gap-4 text-left" style={{ padding: '16px 24px', borderBottom: `2px solid ${NEO.ink}`, opacity: 0.6 }}>
                                  <div style={{
                                    width: 44, height: 44, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: NEO.yellow, color: NEO.ink,
                                    border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                                }}>
                                    <EyeOff size={20} strokeWidth={2.5}/>
                                  </div>
                                  <button onClick={() => handleSubcategoryClick(sub)} className="min-w-0 flex-1 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    <div style={{ fontWeight: 800, color: NEO.yellowDark }}>{sub.name} <span style={{ fontSize: 12, color: NEO.muted }}>(скрыт)</span></div>
                                    <div style={{ marginTop: 2, fontSize: 13, color: NEO.muted, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.desc}</div>
                                  </button>
                                  <div className="flex gap-1">
                                    <button onClick={() => { forumStore.toggleHideSubCategory(sub.id); showToast('Подраздел показан'); }} style={{ padding: 6, backgroundColor: NEO.lime, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'inline-flex' }} title="Показать подраздел">
                                      <Eye size={14} strokeWidth={2.5}/>
                                    </button>
                                    <button onClick={() => { if (window.confirm(`Удалить подраздел «${sub.name}»?`)) {
                                forumStore.deleteSubCategory(sub.id);
                                showToast('Подраздел удалён');
                            } }} style={{ padding: 6, backgroundColor: NEO.red, color: '#fff', border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'inline-flex' }} title="Удалить подраздел">
                                      <Trash2 size={14} strokeWidth={2.5}/>
                                    </button>
                                  </div>
                                </div>))}
                            </div>)}
                        </>)}
                    </div>);
            }))}
            </div>

            {/* Compact forum stats — below categories, not sidebar (forum standard) */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div style={{ ...cardStyle(NEO.lime), padding: '12px 16px', color: NEO.ink }}>
                <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', lineHeight: 1 }}>{topics.length}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Тем</div>
              </div>
              <div style={{ ...cardStyle(NEO.yellow), padding: '12px 16px', color: NEO.ink }}>
                <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', lineHeight: 1 }}>{posts.length}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Сообщений</div>
              </div>
              <div style={{ ...cardStyle(NEO.cyan), padding: '12px 16px', color: NEO.ink }}>
                <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', lineHeight: 1 }}>{sidebarUsers.length}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>Юзеров</div>
              </div>
              <div style={{ ...cardStyle(NEO.pink), padding: '12px 16px', color: '#fff' }}>
                <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.5rem', lineHeight: 1 }}>{ONLINE_USERS.length}</div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2, opacity: 0.9 }}>Онлайн</div>
              </div>
            </div>
          </div>)}

        {/* ════════════════════════════════════════════════════════════
            AUTHOR TOPICS VIEW — Feature #5 (no sidebar, forum standard)
            ════════════════════════════════════════════════════════════ */}
        {view === 'authorTopics' && authorFilter && (<div className="space-y-4">
            <div style={{ ...cardStyle(NEO.surface), padding: 20 }}>
              <div className="flex items-center gap-3">
                <Avatar name={authorFilter} size={48} isAdmin={authorFilter === 'Admin'}/>
                <div>
                  <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, color: NEO.ink }}>{authorFilter}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: NEO.muted }}>
                    {getPostCount(authorFilter)} сообщений · репутация {forumStore.getReputation(authorFilter)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
              <div style={{ ...headerBarStyle(NEO.cyan), fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.ink, fontFamily: '"Archivo Black", sans-serif' }}>
                Темы автора ({topics.filter(t => t.author === authorFilter).length})
              </div>
              {topics.filter(t => t.author === authorFilter).length === 0 ? (<div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 14, fontWeight: 500, color: NEO.muted }}>У этого пользователя пока нет тем</div>) : (<div>
                  {topics.filter(t => t.author === authorFilter).map(topic => (<TopicRow key={topic.id} topic={topic} stats={getTopicStats(topic.id)} onClick={() => handleTopicClick(topic)}/>))}
                </div>)}
            </div>
          </div>)}

        {/* ════════════════════════════════════════════════════════════
            ARCHIVE VIEW — Feature #19
            ════════════════════════════════════════════════════════════ */}
        {view === 'archive' && CAN_MODERATE && (<div>
            <div style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
              <div className="flex items-center gap-2" style={{ ...headerBarStyle(NEO.yellow), color: NEO.ink }}>
                <Archive size={16} strokeWidth={2.5}/>
                <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.ink, fontFamily: '"Archivo Black", sans-serif' }}>Архив тем</h2>
                <span style={{ marginLeft: 8, padding: '2px 8px', fontSize: 10, fontWeight: 800, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}` }}>{forumStore.getArchivedTopics().length}</span>
              </div>
              {forumStore.getArchivedTopics().length === 0 ? (<div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 14, fontWeight: 500, color: NEO.muted }}>Архив пуст</div>) : (<div>
                  {forumStore.getArchivedTopics().map(topic => (<div key={topic.id} className="flex items-center gap-4" style={{ padding: '16px 20px', borderBottom: `2px solid ${NEO.ink}` }}>
                      <div style={{
                        width: 40, height: 40,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: NEO.yellow, color: NEO.ink,
                        border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                    }}>
                        <Archive size={16} strokeWidth={2.5}/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div style={{ fontSize: 14, fontWeight: 800, color: NEO.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.title}</div>
                        <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: NEO.muted }}>
                          Автор: {topic.author} · архивирована {new Date(topic.archivedAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <button onClick={() => handleRestoreArchived(topic.id)} style={btnStyle(NEO.lime, NEO.ink)}>
                        <Check size={12} strokeWidth={2.5}/> Восстановить
                      </button>
                    </div>))}
                </div>)}
            </div>
          </div>)}

        {/* ════════════════════════════════════════════════════════════
            SUBCATEGORY VIEW — full width, no sidebar (forum standard)
            ════════════════════════════════════════════════════════════ */}
        {view === 'subcategory' && (<div className="space-y-4">
              {/* Search / Filter bar */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search size={15} strokeWidth={2.5} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: NEO.muted, pointerEvents: 'none' }}/>
                  <input value={topicSearch} onChange={e => { setTopicSearch(e.target.value); setTopicsPage(1); }} placeholder="Поиск по темам..." style={{ ...inputStyle, paddingLeft: 40 }}/>
                </div>
                <div className="flex gap-2">
                  <select value={topicTagFilter} onChange={e => { setTopicTagFilter(e.target.value); setTopicsPage(1); }} style={{ ...inputStyle, width: 'auto', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
                    <option value="all">Все теги</option>
                    {TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <select value={topicSort} onChange={e => setTopicSort(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
                    <option value="newest">Новые</option>
                    <option value="popular">По лайкам</option>
                    <option value="replies">По ответам</option>
                  </select>
                </div>
              </div>

              {/* Mass management toolbar */}
              {massMode && CAN_MODERATE && (<div className="flex flex-wrap items-center gap-2" style={{ ...cardStyle(NEO.yellow), padding: '12px 16px' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.ink, fontFamily: '"Archivo Black", sans-serif' }}>
                    Выбрано: {selectedTopicIds.length}
                  </span>
                  <div className="flex-1"/>
                  <button onClick={handleMassArchive} disabled={selectedTopicIds.length === 0} style={{ ...btnStyle(NEO.surface, NEO.ink), opacity: selectedTopicIds.length === 0 ? 0.4 : 1, cursor: selectedTopicIds.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <Archive size={12} strokeWidth={2.5}/> Архивировать
                  </button>
                  <button onClick={handleMassDelete} disabled={selectedTopicIds.length === 0} style={{ ...btnStyle(NEO.red, '#fff'), opacity: selectedTopicIds.length === 0 ? 0.4 : 1, cursor: selectedTopicIds.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <Trash2 size={12} strokeWidth={2.5}/> Удалить выбранные
                  </button>
                  <button onClick={handleMassClose} disabled={selectedTopicIds.length === 0} style={{ ...btnStyle(NEO.surface, NEO.ink), opacity: selectedTopicIds.length === 0 ? 0.4 : 1, cursor: selectedTopicIds.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <Lock size={12} strokeWidth={2.5}/> Закрыть выбранные
                  </button>
                  <button onClick={handleOpenMassMove} disabled={selectedTopicIds.length === 0} style={{ ...btnStyle(NEO.lime, NEO.ink), opacity: selectedTopicIds.length === 0 ? 0.4 : 1, cursor: selectedTopicIds.length === 0 ? 'not-allowed' : 'pointer' }}>
                    <Move size={12} strokeWidth={2.5}/> Переместить выбранные
                  </button>
                  <button onClick={handleMerge} disabled={selectedTopicIds.length < 2} style={{ ...btnStyle(NEO.pink, '#fff'), opacity: selectedTopicIds.length < 2 ? 0.4 : 1, cursor: selectedTopicIds.length < 2 ? 'not-allowed' : 'pointer' }} title="Минимум 2 темы">
                    <Merge size={12} strokeWidth={2.5}/> Объединить
                  </button>
                </div>)}

              {/* Topics table */}
              <div style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
                {/* Header row */}
                <div className="hidden md:grid" style={{ gridTemplateColumns: massMode ? '2rem 3fr 5fr 3fr' : '4fr 5fr 3fr', gap: 16, ...headerBarStyle(NEO.ink), color: NEO.yellow, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"Archivo Black", sans-serif' }}>
                  {massMode && <div className="col-span-1"/>}
                  <div>Автор</div>
                  <div>Тема</div>
                  <div style={{ textAlign: 'right' }}>Статистика</div>
                </div>

                {pinnedTopics.length === 0 && pagedRegularTopics.length === 0 ? (<div className="flex flex-col items-center" style={{ padding: '64px 16px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 16, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: NEO.bg, border: `3px solid ${NEO.ink}`, boxShadow: `4px 4px 0px 0px ${NEO.ink}` }}>
                      <MessageSquare size={28} strokeWidth={2.5} style={{ color: NEO.muted }}/>
                    </div>
                    <p style={{ fontWeight: 700, color: NEO.muted, fontSize: 14 }}>Тем пока нет</p>
                    {canCreateInActive ? (<button onClick={() => setView('createTopic')} style={{ ...btnStyle(NEO.lime, NEO.ink), marginTop: 12 }}>
                        Создать первую →
                      </button>) : (<p style={{ marginTop: 8, fontSize: 12, color: NEO.muted, fontWeight: 500 }}>
                        {!currentUser ? 'Войдите, чтобы создавать темы' : 'У вас нет прав для создания тем здесь'}
                      </p>)}
                  </div>) : (<div>
                    {/* Pinned topics — inline at top, no separate "ВАЖНЫЕ ТЕМЫ" block (forum standard) */}
                    {pinnedTopics.map(topic => (<TopicRow key={topic.id} topic={topic} stats={getTopicStats(topic.id)} onClick={() => handleTopicClick(topic)} onAuthorClick={handleAuthorClick} unreadCount={currentUser ? forumStore.getUnreadCount(topic.id, CURRENT_USER) : 0} showCheckbox={massMode && CAN_MODERATE} checked={selectedTopicIds.includes(topic.id)} onCheckChange={() => toggleTopicSelection(topic.id)}/>))}
                    {/* Regular topics — single list, no "Обычные темы" header */}
                    {pagedRegularTopics.map(topic => (<TopicRow key={topic.id} topic={topic} stats={getTopicStats(topic.id)} onClick={() => handleTopicClick(topic)} onAuthorClick={handleAuthorClick} unreadCount={currentUser ? forumStore.getUnreadCount(topic.id, CURRENT_USER) : 0} showCheckbox={massMode && CAN_MODERATE} checked={selectedTopicIds.includes(topic.id)} onCheckChange={() => toggleTopicSelection(topic.id)}/>))}
                  </div>)}
              </div>

              <Pagination current={topicsPage} total={regularTotalPages} onChange={p => { setTopicsPage(p); window.scrollTo(0, 0); }}/>
          </div>)}

        {/* ════════════════════════════════════════════════════════════
            CREATE FORMS (with poll support — Feature #6)
            ════════════════════════════════════════════════════════════ */}
        {(view === 'createMainCat' || view === 'createSubCat' || view === 'createTopic') && (<div className="mx-auto max-w-2xl">
            <div style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
              <div className="flex items-center gap-3" style={{ ...headerBarStyle(NEO.lime), color: NEO.ink }}>
                <div style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            }}>
                  <PlusCircle size={16} strokeWidth={2.5}/>
                </div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, color: NEO.ink }}>
                  {view === 'createMainCat' && 'Создать раздел'}
                  {view === 'createSubCat' && 'Создать подраздел'}
                  {view === 'createTopic' && `Новая тема — ${activeSubCat?.name}`}
                </h3>
              </div>

              <form onSubmit={view === 'createMainCat' ? handleCreateMainCat : view === 'createSubCat' ? handleCreateSubCat : handleCreateTopic} className="space-y-5 p-6">
                {view === 'createMainCat' && (<div className="space-y-2">
                    <label style={labelStyle}>Название раздела</label>
                    <input value={newMainCatName} onChange={e => setNewMainCatName(e.target.value)} autoFocus placeholder="Например: Гильдии и сообщества" style={inputStyle}/>
                  </div>)}

                {view === 'createSubCat' && (<>
                    <div className="space-y-2">
                      <label style={labelStyle}>Родительский раздел</label>
                      <select value={newSubCatParent} onChange={e => setNewSubCatParent(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {mainCats.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label style={labelStyle}>Название</label>
                      <input value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} autoFocus placeholder="Название подраздела" style={inputStyle}/>
                    </div>
                    <div className="space-y-2">
                      <label style={labelStyle}>Описание</label>
                      <input value={newSubCatDesc} onChange={e => setNewSubCatDesc(e.target.value)} placeholder="Краткое описание" style={inputStyle}/>
                    </div>
                  </>)}

                {view === 'createTopic' && (<>
                    <div className="space-y-2">
                      <label style={labelStyle}>Заголовок</label>
                      <input value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)} autoFocus placeholder="Введите заголовок темы..." style={inputStyle}/>
                    </div>
                    <div className="space-y-2">
                      <label style={labelStyle}>Тег</label>
                      <div className="flex flex-wrap gap-2">
                        {TAGS.map(tag => {
                    const style = TAG_STYLES[tag.color];
                    const TagIcon = tag.icon;
                    const active = newTopicTag === tag.id;
                    return (<button key={tag.id} type="button" onClick={() => setNewTopicTag(active ? '' : tag.id)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', fontSize: 12, fontWeight: 700,
                            backgroundColor: active ? style.bg : NEO.surface,
                            color: active ? style.fg : NEO.ink,
                            border: `2px solid ${NEO.ink}`,
                            boxShadow: active ? `3px 3px 0px 0px ${NEO.ink}` : `2px 2px 0px 0px ${NEO.ink}`,
                            cursor: 'pointer',
                            transform: active ? 'translate(1px,1px)' : 'translate(0,0)',
                            transition: 'transform 0.1s, box-shadow 0.1s',
                        }}>
                              {active && <Check size={11} strokeWidth={2.5}/>}
                              <TagIcon size={11} strokeWidth={2.5}/> {tag.label}
                            </button>);
                })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label style={labelStyle}>Содержимое</label>
                      <MarkdownEditor value={newTopicContent} onChange={setNewTopicContent} placeholder="Напишите ваше сообщение. Поддерживается **Markdown** и [item:ID]" minHeight={160}/>
                    </div>

                    {/* Polls section */}
                    <div className="space-y-3" style={{ ...cardStyle(NEO.bg), padding: 16, boxShadow: `4px 4px 0px 0px ${NEO.ink}`, border: `2px solid ${NEO.ink}` }}>
                      <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={pollEnabled} onChange={e => setPollEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: NEO.limeDark }}/>
                        <span className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 700, color: NEO.ink }}>
                          <TrendingUp size={14} strokeWidth={2.5} style={{ color: NEO.limeDark }}/> Добавить опрос
                        </span>
                      </label>
                      {pollEnabled && (<div className="space-y-3" style={{ paddingLeft: 24 }}>
                          <div className="space-y-1.5">
                            <label style={labelStyle}>Вопрос</label>
                            <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Ваш вопрос..." style={inputStyle}/>
                          </div>
                          <div className="space-y-1.5">
                            <label style={labelStyle}>Варианты ответа (2-6)</label>
                            {pollOptions.map((opt, i) => (<div key={i} className="flex items-center gap-2">
                                <input value={opt} onChange={e => {
                            const next = [...pollOptions];
                            next[i] = e.target.value;
                            setPollOptions(next);
                        }} placeholder={`Вариант ${i + 1}`} style={inputStyle}/>
                                {pollOptions.length > 2 && (<button type="button" onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} style={{ padding: 6, backgroundColor: NEO.red, color: '#fff', border: `2px solid ${NEO.ink}`, cursor: 'pointer', display: 'inline-flex', flexShrink: 0 }}>
                                    <X size={14} strokeWidth={2.5}/>
                                  </button>)}
                              </div>))}
                            {pollOptions.length < 6 && (<button type="button" onClick={() => setPollOptions([...pollOptions, ''])} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 8px', fontSize: 12, fontWeight: 700,
                            backgroundColor: 'transparent', color: NEO.limeDark,
                            border: 'none', cursor: 'pointer',
                        }}>
                                <PlusCircle size={12} strokeWidth={2.5}/> Добавить вариант
                              </button>)}
                          </div>
                        </div>)}
                    </div>
                  </>)}

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => navigateTo(view === 'createTopic' ? 'subcategory' : 'main')} style={btnStyle(NEO.surface, NEO.ink)}>
                    Отмена
                  </button>
                  <button type="submit" disabled={(view === 'createMainCat' && !newMainCatName.trim()) ||
                (view === 'createSubCat' && !newSubCatName.trim()) ||
                (view === 'createTopic' && (!newTopicTitle.trim() || !newTopicContent.trim()))} style={{
                ...btnStyle(NEO.lime, NEO.ink),
                opacity: ((view === 'createMainCat' && !newMainCatName.trim()) || (view === 'createSubCat' && !newSubCatName.trim()) || (view === 'createTopic' && (!newTopicTitle.trim() || !newTopicContent.trim()))) ? 0.4 : 1,
                cursor: ((view === 'createMainCat' && !newMainCatName.trim()) || (view === 'createSubCat' && !newSubCatName.trim()) || (view === 'createTopic' && (!newTopicTitle.trim() || !newTopicContent.trim()))) ? 'not-allowed' : 'pointer',
            }}>
                    {view === 'createTopic' ? 'Создать тему' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          </div>)}

        {/* ════════════════════════════════════════════════════════════
            TOPIC VIEW
            ════════════════════════════════════════════════════════════ */}
        {view === 'topic' && activeTopic && (<div className="space-y-4">
            {/* Topic header */}
            <div style={{ ...cardStyle(NEO.surface), padding: '20px 24px' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {activeTopic.tag && <TagBadge tagId={activeTopic.tag}/>}
                    {activeTopic.pinned && (<span className="flex items-center gap-1" style={{ padding: '3px 8px', fontSize: 12, fontWeight: 700, backgroundColor: NEO.yellow, color: NEO.ink, border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}>
                        <Pin size={11} strokeWidth={2.5}/> Закреплено
                      </span>)}
                    {activeTopic.closed && (<span className="flex items-center gap-1" style={{ padding: '3px 8px', fontSize: 12, fontWeight: 700, backgroundColor: NEO.red, color: '#fff', border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}` }}>
                        <Lock size={11} strokeWidth={2.5}/> Закрыто
                      </span>)}
                  </div>
                  <h1 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, lineHeight: 1.2, color: activeTopic.pinned ? NEO.yellowDark : NEO.ink }}>
                    {activeTopic.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3" style={{ fontSize: 14, fontWeight: 600, color: NEO.muted }}>
                    <span>Автор: <AuthorName name={activeTopic.author} postUser={getUserByName(activeTopic.author)} postCount={getPostCount(activeTopic.author)} reputation={forumStore.getReputation(activeTopic.author)} isAdmin={activeTopic.author === 'Admin'} onAuthorClick={handleAuthorClick}/></span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock size={12} strokeWidth={2.5}/> {activeTopic.date}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Eye size={12} strokeWidth={2.5}/> {activeTopic.views || 1} просмотров</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><MessageSquare size={12} strokeWidth={2.5}/> {getTopicStats(activeTopic.id).replies} ответов</span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <button onClick={handleToggleSubscribe} style={btnStyle(subscribed.includes(activeTopic.id) ? NEO.lime : NEO.surface, NEO.ink)}>
                    <Bell size={12} strokeWidth={2.5}/> {subscribed.includes(activeTopic.id) ? 'Вы подписаны' : 'Подписаться'}
                  </button>
                  <button onClick={handleToggleBookmark} style={btnStyle(bookmarked.includes(activeTopic.id) ? NEO.yellow : NEO.surface, NEO.ink)}>
                    <Bookmark size={12} strokeWidth={2.5}/> {bookmarked.includes(activeTopic.id) ? 'В закладках' : 'В закладки'}
                  </button>
                </div>
              </div>

              {/* Moderation — compact dropdown (forum standard: not a button row) */}
              {CAN_MODERATE && (<div className="relative" style={{ marginTop: 12 }}>
                  <button onClick={() => setModDropdownOpen(!modDropdownOpen)} style={btnStyle(NEO.ink, NEO.yellow)}>
                    <Shield size={12} strokeWidth={2.5}/> Модерация
                    <ChevronDown size={11} strokeWidth={2.5} style={{ transform: modDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}/>
                  </button>
                  {modDropdownOpen && (<>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setModDropdownOpen(false)}/>
                      <div className="absolute right-0 top-full" style={{
                        zIndex: 50,
                        marginTop: 6,
                        minWidth: 200,
                        backgroundColor: NEO.surface,
                        border: `3px solid ${NEO.ink}`,
                        boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                    }}>
                        <button onClick={() => { handleTogglePin(); setModDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, color: NEO.ink, fontSize: 13, textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.yellow} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Pin size={13} strokeWidth={2.5}/> {activeTopic.pinned ? 'Открепить' : 'Закрепить'}
                        </button>
                        <button onClick={() => { handleToggleClose(); setModDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, color: NEO.ink, fontSize: 13, textAlign: 'left', borderTop: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.red} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Lock size={13} strokeWidth={2.5}/> {activeTopic.closed ? 'Открыть тему' : 'Закрыть тему'}
                        </button>
                        <button onClick={() => { handleMoveTopic(); setModDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, color: NEO.ink, fontSize: 13, textAlign: 'left', borderTop: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.lime} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Move size={13} strokeWidth={2.5}/> Переместить
                        </button>
                        {activeTopic.tag !== 'solved' && (<button onClick={() => { handleMarkSolved(); setModDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, color: NEO.ink, fontSize: 13, textAlign: 'left', borderTop: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.lime} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Check size={13} strokeWidth={2.5}/> Отметить решённой
                          </button>)}
                        <button onClick={() => { setArchiveChoiceModal({ topicId: activeTopic.id }); setModDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, color: NEO.ink, fontSize: 13, textAlign: 'left', borderTop: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.yellow} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Archive size={13} strokeWidth={2.5}/> В архив
                        </button>
                        <button onClick={() => { handleDeleteTopic(); setModDropdownOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, color: NEO.red, fontSize: 13, textAlign: 'left', borderTop: `1px solid ${NEO.ink}` }} onMouseEnter={e => e.currentTarget.style.backgroundColor = NEO.red} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Trash2 size={13} strokeWidth={2.5}/> Удалить тему
                        </button>
                      </div>
                    </>)}
                </div>)}
            </div>

            {/* Poll display */}
            {activePoll && (<PollView poll={activePoll} currentUser={CURRENT_USER} onVote={handleVote}/>)}

            {/* Top pagination */}
            <Pagination current={postsPage} total={postsTotalPages} onChange={p => { setPostsPage(p); window.scrollTo(0, 0); }}/>

            {/* Posts */}
            <div className="space-y-5">
              {pagedPosts.length === 0 ? (<div style={{ ...cardStyle(NEO.surface), padding: 40, textAlign: 'center' }}>
                  <MessageSquare size={28} strokeWidth={2.5} style={{ color: NEO.muted, margin: '0 auto' }}/>
                  <p style={{ marginTop: 8, fontSize: 14, fontWeight: 500, color: NEO.muted }}>В теме пока нет сообщений</p>
                </div>) : pagedPosts.map((post, i) => {
                const postUser = getUserByName(post.author);
                const isAdmin = postUser?.role === 'admin' || post.author === 'Admin';
                const isMod = postUser?.role === 'mod';
                const isOP = post.author === activeTopic.author;
                const isMe = post.author === CURRENT_USER;
                const isEditing = editingPostId === post.id;
                const isStarterPost = post.id === topicStarter?.id;
                const globalNum = isStarterPost ? 1 : 1 + (postsPage - 1) * POSTS_PER_PAGE + i;
                const canEditThisPost = isMe || CAN_MODERATE;
                const canDeleteThisPost = isMe || CAN_MODERATE;
                const postAuthorPostCount = getPostCount(post.author);
                const postAuthorRep = forumStore.getReputation(post.author);
                const reputationVote = currentUser ? forumStore.getPostReputationVote(post.id, CURRENT_USER) : 0;
                const postIsIgnored = ignoredUsers.includes(post.author) && !isMe;
                const postIsExpanded = expandedIgnored.has(post.id);
                if (postIsIgnored && !postIsExpanded) {
                    return (<div key={post.id} style={{ ...cardStyle(NEO.bg), padding: '12px 20px', border: `2px solid ${NEO.ink}` }}>
                      <div className="flex items-center justify-between gap-3" style={{ fontSize: 14 }}>
                        <span style={{ color: NEO.muted, fontWeight: 600 }}>
                          🚫 Сообщение от <span style={{ fontWeight: 800, color: NEO.ink }}>{post.author}</span> скрыто (игнор)
                        </span>
                        <button onClick={() => setExpandedIgnored(prev => new Set([...prev, post.id]))} className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 700, color: NEO.cyanDark, background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Eye size={12} strokeWidth={2.5}/> Показать
                        </button>
                      </div>
                    </div>);
                }
                return (<div key={post.id} style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
                    {/* Post header */}
                    <div className="flex items-center justify-between" style={{ borderBottom: `2px solid ${NEO.ink}`, backgroundColor: NEO.bg, padding: '12px 20px', position: 'relative' }}>
                      <div className="flex items-center gap-3 md:hidden">
                        <div className="relative">
                          <Avatar name={post.author} size={34} isAdmin={isAdmin} isMod={isMod}/>
                          <span style={{
                        position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
                        backgroundColor: isOnline(post.author) ? NEO.lime : NEO.faint,
                        border: `2px solid ${NEO.ink}`,
                    }}/>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <AuthorName name={post.author} postUser={postUser} postCount={postAuthorPostCount} reputation={postAuthorRep} isAdmin={isAdmin} isMod={isMod} isOP={isOP} isMe={isMe} onAuthorClick={handleAuthorClick}/>
                            <RoleBadge user={postUser || { role: isAdmin ? 'admin' : null }} isOP={isOP} isMe={isMe}/>
                            <span style={{ fontSize: 10, fontWeight: 700, color: isOnline(post.author) ? NEO.limeDark : NEO.muted }}>
                              {isOnline(post.author) ? '● онлайн' : '○ оффлайн'}
                            </span>
                            {postIsIgnored && postIsExpanded && (<button onClick={() => setExpandedIgnored(prev => { const n = new Set(prev); n.delete(post.id); return n; })} style={{ padding: '2px 6px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.yellow, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer' }} title="Свернуть обратно">
                                игнор
                              </button>)}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: NEO.muted }}>
                            <Clock size={10} strokeWidth={2.5}/> {post.date}
                            {post.edited && (<span className="ml-1.5 italic flex items-center gap-0.5">
                                (ред.)
                                <button onClick={() => setEditHistoryModal({ postId: post.id })} className="ml-0.5 inline-flex items-center gap-0.5" style={{ fontSize: 10, fontWeight: 700, color: NEO.cyanDark, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                  <History size={9} strokeWidth={2.5}/> история
                                </button>
                              </span>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3" style={{ fontSize: 11, fontWeight: 700, color: NEO.muted }}>
                        <span className="hidden md:inline-flex items-center gap-1"><Clock size={10} strokeWidth={2.5}/> {post.date}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: NEO.muted }}>#{globalNum}</span>
                <div className="flex items-center gap-1 flex-wrap justify-end" style={{ position: 'absolute', right: 20, top: 4, zoom: 0.78 }}>
                          <div className="flex items-center gap-2">
                            {/* eslint-disable-next-line react-hooks/refs -- The quoted post is plain data; the ref is read only in the delayed event handler. */}
                            <button onClick={() => handleQuote(post)} style={btnStyle(NEO.surface, NEO.ink)}>
                              <Quote size={13} strokeWidth={2.5}/> Цитировать
                            </button>
                            {currentUser && !activeTopic.closed && !IS_MUTED && (<button onClick={() => { setQuickReplyFor(quickReplyFor === post.id ? null : post.id); setQuickReplyText(''); }} style={btnStyle(quickReplyFor === post.id ? NEO.lime : NEO.surface, NEO.ink)}>
                                <Zap size={13} strokeWidth={2.5}/> {quickReplyFor === post.id ? 'Свернуть' : 'Быстрый ответ'}
                              </button>)}
                            <ShareButton postId={post.id} topicId={activeTopic.id} onToast={showToast}/>
                            {currentUser && !isMe && (<button onClick={() => handleOpenReport(post)} style={btnStyle(NEO.red, '#fff')}>
                                <Flag size={12} strokeWidth={2.5}/> Жалоба
                              </button>)}
                          </div>

                      </div>
                      </div>
                    </div>

                    {/* Post body — 2 columns: author sidebar + content (forum standard: compact sidebar) */}
                    <div className="flex flex-col md:flex-row">
                      {/* Author sidebar — compact: avatar + name + title + rep only */}
                      <div className="hidden flex-shrink-0 flex-col items-center gap-1.5 md:flex md:w-32" style={{ borderRight: `2px solid ${NEO.ink}`, padding: '12px 8px' }}>
                        <Avatar name={post.author} size={44} isAdmin={isAdmin} isMod={isMod}/>
                        <div className="w-full text-center">
                          <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: isAdmin ? NEO.red : isMod ? NEO.yellowDark : NEO.ink }}>{post.author}</div>
                          <UserTitle user={postUser} username={post.author} className="mt-0.5"/>
                          <div className="mt-0.5" style={{ fontSize: 9, fontWeight: 700, color: isOnline(post.author) ? NEO.limeDark : NEO.faint }}>
                            {isOnline(post.author) ? '● онлайн' : '○ оффлайн'}
                          </div>
                        </div>
                        {/* Compact reputation — just number + 2 small buttons */}
                        {!isMe && currentUser && (<div className="relative flex w-full items-center justify-center gap-1 mt-1">
                            <span style={{ position: 'absolute', right: '50%', transform: 'translateX(-26px)', minWidth: 26, textAlign: 'right', fontSize: 12, fontWeight: 900, color: postAuthorRep > 0 ? NEO.limeDark : postAuthorRep < 0 ? NEO.red : NEO.muted, fontFamily: '"Archivo Black", sans-serif' }}>
                              {postAuthorRep > 0 ? '+' : ''}{postAuthorRep}
                            </span>
                            <button onClick={() => handleReputation(post.id, post.author, 1)} style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: reputationVote === 1 ? NEO.yellow : NEO.lime, color: NEO.ink, border: `2px solid ${NEO.ink}`, cursor: 'pointer', padding: 0 }} title="+1 репутации">
                              <ChevronUp size={15} strokeWidth={3}/>
                            </button>
                            <button onClick={() => handleReputation(post.id, post.author, -1)} style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: reputationVote === -1 ? NEO.yellowDark : NEO.red, color: '#fff', border: `2px solid ${NEO.ink}`, cursor: 'pointer', padding: 0 }} title="-1 репутации">
                              <ChevronDown size={15} strokeWidth={3}/>
                            </button>
                          </div>)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1" style={{ padding: '16px 20px' }}>
                        {isEditing ? (<div className="space-y-3">
                            <MarkdownEditor value={editingContent} onChange={setEditingContent} minHeight={100}/>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingPostId(null)} style={btnStyle(NEO.surface, NEO.ink)}>
                                Отмена
                              </button>
                              <button onClick={() => handleSaveEdit(post.id)} style={btnStyle(NEO.lime, NEO.ink)}>
                                <Check size={12} strokeWidth={2.5}/> Сохранить
                              </button>
                            </div>
                          </div>) : (<>
                            <div className="forum-post-content" style={{ fontSize: 14, lineHeight: 1.6, color: NEO.ink }} dangerouslySetInnerHTML={parseMarkdown(post.content, itemLookup, true, forumStats)} onClick={(e) => {
                            const target = e.target.closest('[data-item-id]');
                            if (target) {
                                e.preventDefault();
                                const itemId = target.getAttribute('data-item-id');
                                const item = itemLookup(itemId);
                                if (item)
                                    setItemModal(item);
                                else
                                    showToast(`Предмет #${itemId} не найден в базе`);
                            }
                        }} onMouseMove={(e) => {
                            const target = e.target.closest('[data-item-id]');
                            if (target) {
                                const itemId = target.getAttribute('data-item-id');
                                const item = itemLookup(itemId);
                                if (item)
                                    setItemTooltip({ item, x: e.clientX, y: e.clientY });
                            }
                            else {
                                setItemTooltip(null);
                            }
                        }} onMouseLeave={() => setItemTooltip(null)}/>
                          </>)}
                      </div>
                    </div>

                    {/* Post footer — reactions + actions */}
                    {!isEditing && (<div className="space-y-2" style={{ borderTop: `2px solid ${NEO.ink}`, padding: '12px 20px', backgroundColor: NEO.bg }}>
                        {/* Reactions bar */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const postReactions = forumStore.getReactions(post.id);
                            const userReactions = forumStore.getUserReactions(post.id, CURRENT_USER);
                            const entries = Object.entries(postReactions);
                            if (entries.length === 0)
                                return null;
                            return (<ReactionsListTooltip reactions={postReactions}>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {entries.map(([emoji, data]) => {
                                    const mine = userReactions.includes(emoji);
                                    return (<button key={emoji} onClick={() => handleReact(post.id, emoji)} style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '4px 10px', fontSize: 12, fontWeight: 800,
                                            backgroundColor: mine ? NEO.lime : NEO.surface,
                                            color: NEO.ink,
                                            border: `2px solid ${NEO.ink}`,
                                            boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                                            cursor: 'pointer',
                                        }}>
                                        <span style={{ fontSize: 14 }}>{emoji}</span> {data.count}
                                      </button>);
                                })}
                                </div>
                              </ReactionsListTooltip>);
                        })()}
                          {/* Add reaction */}
                          <div className="relative">
                            <button onClick={() => setOpenReactionsFor(openReactionsFor === post.id ? null : post.id)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', fontSize: 12, fontWeight: 700,
                            backgroundColor: NEO.surface, color: NEO.ink,
                            border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                            cursor: 'pointer',
                        }}>
                              <Smile size={13} strokeWidth={2.5}/> +
                            </button>
                            {openReactionsFor === post.id && (<>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpenReactionsFor(null)}/>
                                <div className="flex flex-nowrap gap-1" style={{
                                position: 'absolute', bottom: '100%', left: 0, zIndex: 30, marginBottom: 4,
                                backgroundColor: NEO.surface, border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                                padding: 8,
                            }}>
                                  {REACTIONS.map(emoji => (<button key={emoji} onClick={() => { handleReact(post.id, emoji); setOpenReactionsFor(null); }} style={{
                                    width: 32, height: 32, flexShrink: 0, fontSize: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                                }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = NEO.yellow; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>{emoji}</button>))}
                                </div>
                              </>)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {CAN_MODERATE && post.author !== CURRENT_USER && !(postUser?.role === 'admin') && (<button onClick={() => handleOpenWarn(post)} style={btnStyle(NEO.yellow, NEO.ink)}>
                                <Bell size={12} strokeWidth={2.5}/> Предупредить
                              </button>)}
                            {canEditThisPost && (<button onClick={() => handleStartEdit(post)} style={btnStyle(NEO.cyan, NEO.ink)}>
                                <Edit2 size={12} strokeWidth={2.5}/> {!isMe && CAN_MODERATE ? 'Ред. (мод)' : 'Изменить'}
                              </button>)}
                            {canDeleteThisPost && (<button onClick={() => handleDeletePost(post.id)} style={btnStyle(NEO.red, '#fff')}>
                                <Trash2 size={12} strokeWidth={2.5}/> {!isMe && CAN_MODERATE ? 'Удалить (мод)' : 'Удалить'}
                              </button>)}
                          </div>
                        </div>

                        {/* Inline quick reply editor */}
                        {quickReplyFor === post.id && (<div className="mt-3" style={{ backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, padding: 12 }}>
                            <div className="mb-2 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 800, color: NEO.limeDark, fontFamily: '"Archivo Black", sans-serif' }}>
                              <Zap size={12} strokeWidth={2.5}/> Быстрый ответ на #{globalNum}
                            </div>
                            <MarkdownEditor value={quickReplyText} onChange={setQuickReplyText} placeholder="Быстрый ответ... (Ctrl+Enter для отправки)" minHeight={100} onSubmit={() => handleQuickReplySubmit(post.id)}/>
                            <div className="mt-2 flex justify-end gap-2">
                              <button onClick={() => { setQuickReplyFor(null); setQuickReplyText(''); }} style={btnStyle(NEO.surface, NEO.ink)}>
                                Отмена
                              </button>
                              <button onClick={() => handleQuickReplySubmit(post.id)} disabled={!quickReplyText.trim()} style={{ ...btnStyle(NEO.lime, NEO.ink), opacity: !quickReplyText.trim() ? 0.4 : 1, cursor: !quickReplyText.trim() ? 'not-allowed' : 'pointer' }}>
                                <Send size={12} strokeWidth={2.5}/> Ответить
                              </button>
                            </div>
                          </div>)}
                      </div>)}
                  </div>);
            })}
            </div>

            {/* Bottom pagination */}
            <Pagination current={postsPage} total={postsTotalPages} onChange={p => { setPostsPage(p); window.scrollTo(0, 0); }}/>

            {/* Reply box */}
            {activeTopic.closed ? (<div className="flex items-center justify-center gap-3" style={{ ...cardStyle(NEO.red), padding: '24px 16px', textAlign: 'center', backgroundColor: NEO.red, color: '#fff' }}>
                <Lock size={18} strokeWidth={2.5}/>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Тема закрыта для ответов</span>
              </div>) : !currentUser ? (<div className="flex items-center justify-center gap-3" style={{ ...cardStyle(NEO.surface), padding: '24px 16px', textAlign: 'center' }}>
                <MessageSquare size={18} strokeWidth={2.5} style={{ color: NEO.muted }}/>
                <span style={{ fontSize: 14, fontWeight: 600, color: NEO.muted }}>Войдите, чтобы оставить ответ</span>
              </div>) : IS_MUTED ? (<div className="flex items-center justify-center gap-3" style={{ ...cardStyle(NEO.yellow), padding: '24px 16px', textAlign: 'center' }}>
                <Bell size={18} strokeWidth={2.5}/>
                <span style={{ fontSize: 14, fontWeight: 800, color: NEO.ink }}>Вам запрещено писать (мут)</span>
              </div>) : (<div ref={replyRef} style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
                <div className="flex items-center justify-between" style={{ ...headerBarStyle(NEO.lime), color: NEO.ink, padding: '16px 24px' }}>
                  <div className="flex items-center gap-3">
                    <Avatar name={CURRENT_USER} size={32} isAdmin={IS_ADMIN} isMod={IS_MOD}/>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: NEO.ink }}>
                        {quotedPost ? <span>Ответить <span style={{ color: NEO.ink, textDecoration: 'underline' }}>{quotedPost.author}</span></span> : 'Ваш ответ'}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: NEO.ink, opacity: 0.7 }}>Markdown · [item:ID] · автосохранение каждые 3с · Ctrl+Enter для отправки</div>
                    </div>
                  </div>
                  {quotedPost && (<button onClick={() => { setQuotedPost(null); setNewPostText(''); }} className="flex items-center gap-1.5" style={{ padding: '4px 8px', fontSize: 12, fontWeight: 700, backgroundColor: NEO.red, color: '#fff', border: `2px solid ${NEO.ink}`, cursor: 'pointer' }}>
                      <X size={12} strokeWidth={2.5}/> Убрать цитату
                    </button>)}
                </div>
                <div className="p-4">
                  <MarkdownEditor value={newPostText} onChange={setNewPostText} placeholder="Напишите ваш ответ..." minHeight={120} onSubmit={handleAddPost}/>
                  <div className="mt-3 flex justify-end">
                    <button onClick={handleAddPost} disabled={!newPostText.trim()} style={{ ...btnStyle(NEO.lime, NEO.ink), opacity: !newPostText.trim() ? 0.4 : 1, cursor: !newPostText.trim() ? 'not-allowed' : 'pointer', padding: '10px 20px', fontSize: 14 }}>
                      <Send size={16} strokeWidth={2.5}/> Отправить
                    </button>
                  </div>
                </div>
              </div>)}
          </div>)}
      </div>

      {/* ════════════════════════════════════════════════════════════
            Modal: Move topic
            ════════════════════════════════════════════════════════════ */}
      {moveTopicModal && (<div onClick={() => setMoveTopicModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 448, backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.lime), color: NEO.ink, padding: '20px 24px' }}>
              <button onClick={() => setMoveTopicModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: NEO.ink }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <Move size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: NEO.ink }}>Переместить тему</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: NEO.ink, opacity: 0.7 }}>Выберите новый подраздел</p>
              </div>
            </div>
            <div className="space-y-4" style={{ padding: 24 }}>
              <div className="space-y-2">
                <label style={labelStyle}>Целевой подраздел</label>
                <select value={moveTargetSubcat} onChange={e => setMoveTargetSubcat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {subCats.map(s => (<option key={s.id} value={s.id}>
                      {mainCats.find(c => c.id === s.parentId)?.name || '?'} → {s.name}
                    </option>))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setMoveTopicModal(null)} style={btnStyle(NEO.surface, NEO.ink)}>Отмена</button>
                <button onClick={confirmMoveTopic} style={btnStyle(NEO.lime, NEO.ink)}>Переместить</button>
              </div>
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Modal: Mass move
            ════════════════════════════════════════════════════════════ */}
      {massMoveModal && (<div onClick={() => setMassMoveModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 448, backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.lime), color: NEO.ink, padding: '20px 24px' }}>
              <button onClick={() => setMassMoveModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: NEO.ink }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <Move size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: NEO.ink }}>Переместить {massMoveModal.topicIds.length} тем</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: NEO.ink, opacity: 0.7 }}>Выберите новый подраздел</p>
              </div>
            </div>
            <div className="space-y-4" style={{ padding: 24 }}>
              <div className="space-y-2">
                <label style={labelStyle}>Целевой подраздел</label>
                <select value={massMoveTarget} onChange={e => setMassMoveTarget(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {subCats.map(s => (<option key={s.id} value={s.id}>
                      {mainCats.find(c => c.id === s.parentId)?.name || '?'} → {s.name}
                    </option>))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setMassMoveModal(null)} style={btnStyle(NEO.surface, NEO.ink)}>Отмена</button>
                <button onClick={confirmMassMove} style={btnStyle(NEO.lime, NEO.ink)}>Переместить</button>
              </div>
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Modal: Report post
            ════════════════════════════════════════════════════════════ */}
      {reportModal && (<div onClick={() => setReportModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 448, backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.red), color: '#fff', padding: '20px 24px' }}>
              <button onClick={() => setReportModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#fff', color: NEO.red,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <Flag size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: '#fff' }}>Пожаловаться на сообщение</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: '#fff', opacity: 0.9 }}>Модераторы рассмотрят вашу жалобу</p>
              </div>
            </div>
            <div className="space-y-4" style={{ padding: 24 }}>
              <div className="space-y-2">
                <label style={labelStyle}>Причина жалобы</label>
                <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} autoFocus rows={4} placeholder="Опишите, что нарушает это сообщение..." style={{ ...inputStyle, resize: 'vertical' }}/>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setReportModal(null)} style={btnStyle(NEO.surface, NEO.ink)}>Отмена</button>
                <button onClick={handleSubmitReport} style={btnStyle(NEO.red, '#fff')}>Отправить жалобу</button>
              </div>
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Modal: PM compose
            ════════════════════════════════════════════════════════════ */}
      {pmModal && (<div onClick={() => setPmModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 448, backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.pink), color: '#fff', padding: '20px 24px' }}>
              <button onClick={() => setPmModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <Avatar name={pmModal.to} size={36}/>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: '#fff' }}>Личное сообщение</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: '#fff', opacity: 0.9 }}>Кому: <span style={{ fontWeight: 800 }}>{pmModal.to}</span></p>
              </div>
            </div>
            <div className="space-y-4" style={{ padding: 24 }}>
              <div className="space-y-2">
                <label style={labelStyle}>Сообщение</label>
                <textarea value={pmText} onChange={e => setPmText(e.target.value)} autoFocus rows={5} placeholder="Напишите ваше сообщение..." style={{ ...inputStyle, resize: 'vertical' }}/>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setPmModal(null)} style={btnStyle(NEO.surface, NEO.ink)}>Отмена</button>
                <button onClick={handleSubmitPM} disabled={!pmText.trim()} style={{ ...btnStyle(NEO.pink, '#fff'), opacity: !pmText.trim() ? 0.4 : 1, cursor: !pmText.trim() ? 'not-allowed' : 'pointer' }}>Отправить</button>
              </div>
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Modal: PM inbox
            ════════════════════════════════════════════════════════════ */}
      {pmInboxOpen && currentUser && (<div onClick={() => setPmInboxOpen(false)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 512, maxHeight: '80vh',
                display: 'flex', flexDirection: 'column',
                backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.pink), color: '#fff', padding: '20px 24px' }}>
              <button onClick={() => setPmInboxOpen(false)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#fff', color: NEO.pink,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <MessageSquare size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: '#fff' }}>Личные сообщения</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: '#fff', opacity: 0.9 }}>Входящие для {CURRENT_USER}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {forumStore.getPMs(CURRENT_USER).length === 0 ? (<div style={{ padding: '48px 16px', textAlign: 'center', fontSize: 14, fontWeight: 500, color: NEO.muted }}>Нет сообщений</div>) : (<div>
                  {forumStore.getPMs(CURRENT_USER).map(pm => (<div key={pm.id} style={{
                        padding: '12px 24px',
                        borderBottom: `2px solid ${NEO.ink}`,
                        backgroundColor: !pm.read && pm.to === CURRENT_USER ? NEO.bg : 'transparent',
                    }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={pm.from === CURRENT_USER ? pm.to : pm.from} size={28}/>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: NEO.ink }}>
                              {pm.from === CURRENT_USER ? '→ ' + pm.to : '← ' + pm.from}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 600, color: NEO.muted }}>{new Date(pm.date).toLocaleString('ru-RU')}</div>
                          </div>
                        </div>
                        {!pm.read && pm.to === CURRENT_USER && (<span style={{ padding: '2px 8px', fontSize: 9, fontWeight: 800, backgroundColor: NEO.pink, color: '#fff', border: `2px solid ${NEO.ink}` }}>новое</span>)}
                      </div>
                      <p style={{ marginTop: 6, fontSize: 12, fontWeight: 500, color: NEO.ink, whiteSpace: 'pre-wrap' }}>{pm.text}</p>
                      {pm.to === CURRENT_USER && !pm.read && (<button onClick={() => forumStore.markPMRead(pm.id, CURRENT_USER)} style={{ marginTop: 6, fontSize: 10, fontWeight: 800, color: NEO.pinkDark, background: 'none', border: 'none', cursor: 'pointer' }}>
                          Отметить прочитанным
                        </button>)}
                    </div>))}
                </div>)}
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Modal: Edit history
            ════════════════════════════════════════════════════════════ */}
      {editHistoryModal && (<div onClick={() => setEditHistoryModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 512, maxHeight: '80vh',
                display: 'flex', flexDirection: 'column',
                backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.cyan), color: NEO.ink, padding: '20px 24px' }}>
              <button onClick={() => setEditHistoryModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: NEO.ink }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <History size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: NEO.ink }}>История правок</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: NEO.ink, opacity: 0.7 }}>Сообщение #{editHistoryModal.postId}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: 16 }}>
              {forumStore.getEditHistory(editHistoryModal.postId).length === 0 ? (<div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 14, fontWeight: 500, color: NEO.muted }}>История правок пуста</div>) : (<div className="space-y-3">
                  {forumStore.getEditHistory(editHistoryModal.postId).slice().reverse().map((entry, i) => (<div key={i} style={{ backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`, padding: 12 }}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span style={{ fontSize: 12, fontWeight: 800, color: NEO.cyanDark }}>Версия {forumStore.getEditHistory(editHistoryModal.postId).length - i}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: NEO.muted }}>{new Date(entry.date).toLocaleString('ru-RU')}</span>
                      </div>
                      <div className="forum-post-content" style={{ backgroundColor: NEO.surface, border: `2px solid ${NEO.ink}`, padding: 8, fontSize: 12, color: NEO.ink }} dangerouslySetInnerHTML={parseMarkdown(entry.content, itemLookup, true, forumStats)}/>
                    </div>))}
                </div>)}
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Modal: Archive choice
            ════════════════════════════════════════════════════════════ */}
      {archiveChoiceModal && (<div onClick={() => setArchiveChoiceModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 448, backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.yellow), color: NEO.ink, padding: '20px 24px' }}>
              <button onClick={() => setArchiveChoiceModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: NEO.ink }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <Archive size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: NEO.ink }}>Удаление темы</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: NEO.ink, opacity: 0.7 }}>Выберите тип удаления</p>
              </div>
            </div>
            <div className="space-y-3" style={{ padding: 24 }}>
              <button onClick={confirmArchive} className="flex w-full items-start gap-3 text-left" style={{
                backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                padding: 16, cursor: 'pointer',
                transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
                <Archive size={18} strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0, color: NEO.yellowDark }}/>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: NEO.yellowDark }}>Архивировать</div>
                  <div style={{ marginTop: 2, fontSize: 12, fontWeight: 500, color: NEO.muted }}>Тема будет перемещена в архив. Позже её можно восстановить.</div>
                </div>
              </button>
              <button onClick={confirmPermanentDelete} className="flex w-full items-start gap-3 text-left" style={{
                backgroundColor: NEO.bg, border: `2px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                padding: 16, cursor: 'pointer',
                transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
                <Trash2 size={18} strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0, color: NEO.red }}/>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: NEO.red }}>Удалить навсегда</div>
                  <div style={{ marginTop: 2, fontSize: 12, fontWeight: 500, color: NEO.muted }}>Тема и все сообщения будут безвозвратно удалены.</div>
                </div>
              </button>
              <button onClick={() => setArchiveChoiceModal(null)} style={btnStyle(NEO.surface, NEO.ink)}>Отмена</button>
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Item tooltip (follows mouse)
            ════════════════════════════════════════════════════════════ */}
      {itemTooltip && itemTooltip.item && (() => {
            const item = itemTooltip.item;
            const tw = 300, th = 200;
            const left = itemTooltip.x + 16 + tw > window.innerWidth ? itemTooltip.x - tw - 16 : itemTooltip.x + 16;
            const top = itemTooltip.y + 16 + th > window.innerHeight ? itemTooltip.y - th - 16 : itemTooltip.y + 16;
            return (<div style={{
                    position: 'fixed', top, left, zIndex: 9999, width: 288,
                    backgroundColor: NEO.surface, color: NEO.ink,
                    border: `3px solid ${NEO.ink}`, boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
                    padding: 16, textAlign: 'left', pointerEvents: 'none',
                    fontFamily: '"Space Grotesk", sans-serif',
                }}>
            <div className="mb-2 flex items-start justify-between" style={{ borderBottom: `2px solid ${NEO.ink}`, paddingBottom: 8 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: NEO.yellowDark, fontFamily: '"Archivo Black", sans-serif' }}>{item.name}</h4>
              <span style={{ marginLeft: 8, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}` }}>ID: {item.id}</span>
            </div>
            {item.desc && <p style={{ marginBottom: 8, fontSize: 12, lineHeight: 1.5, fontWeight: 500, color: NEO.ink }}>{item.desc}</p>}
            {item.stats && Object.keys(item.stats).length > 0 && (<div className="flex flex-wrap gap-1.5">
                {Object.entries(item.stats).map(([key, value]) => {
                        if (!value || parseFloat(String(value).replace(',', '.')) <= 0)
                            return null;
                        const def = STAT_DEF[key];
                        if (!def)
                            return null;
                        const Icon = def.icon || Activity;
                        return (<div key={key} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 6px', fontSize: 10, fontWeight: 700,
                                backgroundColor: NEO.lime, color: NEO.ink,
                                border: `2px solid ${NEO.ink}`,
                            }}>
                      <Icon size={10} strokeWidth={2.5}/>
                      <span style={{ textTransform: 'uppercase' }}>{def.label}:</span>
                      <span style={{ fontWeight: 900 }}>{def.prefix}{value}{def.suffix}</span>
                    </div>);
                    })}
              </div>)}
          </div>);
        })()}

      {/* ════════════════════════════════════════════════════════════
            Item detail modal (on click)
            ════════════════════════════════════════════════════════════ */}
      {itemModal && (<div onClick={() => setItemModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 448, backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.yellow), color: NEO.ink, padding: '20px 24px' }}>
              <button onClick={() => setItemModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: NEO.ink }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 48, height: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <BookOpen size={22} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 18, color: NEO.ink }}>{itemModal.name}</h3>
                <div className="mt-0.5 flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, color: NEO.muted }}>
                  <span style={{ padding: '2px 6px', fontFamily: 'monospace', fontWeight: 700, backgroundColor: NEO.ink, color: NEO.yellow, border: `2px solid ${NEO.ink}` }}>ID: {itemModal.id}</span>
                  {itemModal.type && <span>· {itemModal.type}</span>}
                  {itemModal.rarity && <span>· {itemModal.rarity}</span>}
                </div>
              </div>
            </div>
            <div className="space-y-4" style={{ padding: 24 }}>
              {itemModal.desc && (<div>
                  <h4 style={labelStyle}>Описание</h4>
                  <p style={{ marginTop: 6, fontSize: 14, lineHeight: 1.5, fontWeight: 500, color: NEO.ink }}>{itemModal.desc}</p>
                </div>)}
              {itemModal.recipe && (<div>
                  <h4 style={labelStyle}>Крафт</h4>
                  <p style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: NEO.yellowDark }}>{itemModal.recipe}</p>
                </div>)}
              {itemModal.stats && Object.keys(itemModal.stats).length > 0 && (<div>
                  <h4 style={{ ...labelStyle, marginBottom: 8 }}>Характеристики</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(itemModal.stats).map(([key, value]) => {
                    if (!value || parseFloat(String(value).replace(',', '.')) <= 0)
                        return null;
                    const def = STAT_DEF[key];
                    if (!def)
                        return null;
                    const Icon = def.icon || Activity;
                    return (<div key={key} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', fontSize: 12, fontWeight: 700,
                            backgroundColor: NEO.lime, color: NEO.ink,
                            border: `2px solid ${NEO.ink}`, boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                        }}>
                          <Icon size={12} strokeWidth={2.5}/>
                          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{def.label}:</span>
                          <span style={{ fontWeight: 900 }}>{def.prefix}{value}{def.suffix}</span>
                        </div>);
                })}
                  </div>
                </div>)}
              <button onClick={() => { navigator.clipboard?.writeText(`[item:${itemModal.id}]`); showToast(`Скопировано [item:${itemModal.id}]`); }} style={btnStyle(NEO.yellow, NEO.ink)}>
                <Copy size={14} strokeWidth={2.5}/> Скопировать [item:{itemModal.id}]
              </button>
            </div>
          </div>
        </div>)}

      {/* ════════════════════════════════════════════════════════════
            Modal: Warn user
            ════════════════════════════════════════════════════════════ */}
      {warnModal && (<div onClick={() => setWarnModal(null)} style={{
                position: 'fixed', inset: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 16,
            }}>
          <div onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: 448, backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`, boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }}>
            <div className="relative flex items-center gap-3" style={{ ...headerBarStyle(NEO.yellow), color: NEO.ink, padding: '20px 24px' }}>
              <button onClick={() => setWarnModal(null)} style={{ position: 'absolute', right: 16, top: 16, padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: NEO.ink }}>
                <X size={18} strokeWidth={2.5}/>
              </button>
              <div style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: NEO.surface, color: NEO.ink,
                border: `3px solid ${NEO.ink}`, boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <Bell size={18} strokeWidth={2.5}/>
              </div>
              <div>
                <h3 style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 16, color: NEO.ink }}>Предупредить пользователя</h3>
                <p style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: NEO.ink, opacity: 0.7 }}>Цель: <span style={{ fontWeight: 800 }}>{warnModal.username}</span></p>
              </div>
            </div>
            <div className="space-y-4" style={{ padding: 24 }}>
              <div className="space-y-2">
                <label style={labelStyle}>Причина</label>
                <textarea value={warnReason} onChange={e => setWarnReason(e.target.value)} autoFocus rows={3} placeholder="Опишите нарушение правил..." style={{ ...inputStyle, resize: 'vertical' }}/>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setWarnModal(null)} style={btnStyle(NEO.surface, NEO.ink)}>Отмена</button>
                <button onClick={handleSubmitWarn} style={btnStyle(NEO.yellow, NEO.ink)}>Выдать предупреждение</button>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
};
/* ════════════════════════════════════════════════════════════════
   PollView — displays a poll above posts (Feature #6)
   ════════════════════════════════════════════════════════════════ */
const PollView = ({ poll, currentUser, onVote }) => {
    const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
    const myVote = poll.options.findIndex(o => o.votes?.includes(currentUser));
    return (<div style={{ ...cardStyle(NEO.surface), overflow: 'hidden' }}>
      <div className="flex items-center gap-2" style={{ ...headerBarStyle(NEO.lime), color: NEO.ink }}>
        <TrendingUp size={16} strokeWidth={2.5}/>
        <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: NEO.ink, fontFamily: '"Archivo Black", sans-serif' }}>Опрос</h3>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: NEO.ink, opacity: 0.7 }}>{totalVotes} голосов</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 800, color: NEO.ink, fontFamily: '"Archivo Black", sans-serif' }}>{poll.question}</div>
        <div className="space-y-2">
          {poll.options.map((opt, i) => {
            const votes = opt.votes?.length || 0;
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const isMine = myVote === i;
            return (<button key={i} onClick={() => onVote(i)} className="group relative block w-full text-left" style={{
                    width: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: NEO.bg,
                    border: `2px solid ${NEO.ink}`,
                    boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }}>
                <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, backgroundColor: NEO.lime, opacity: 0.4, transition: 'width 0.5s' }}/>
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isMine && <Check size={14} strokeWidth={2.5} style={{ color: NEO.limeDark }}/>}
                    <span style={{ fontSize: 14, fontWeight: isMine ? 800 : 600, color: NEO.ink }}>{opt.text}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: NEO.ink }}>
                    {votes} {pct > 0 && `· ${pct}%`}
                  </span>
                </div>
              </button>);
        })}
        </div>
        {myVote >= 0 && <p style={{ marginTop: 12, fontSize: 12, fontWeight: 500, color: NEO.muted }}>Вы проголосовали за вариант #{myVote + 1}. Можно изменить голос, нажав на другой вариант.</p>}
        {!currentUser && <p style={{ marginTop: 12, fontSize: 12, fontStyle: 'italic', color: NEO.muted }}>Войдите, чтобы голосовать.</p>}
      </div>
    </div>);
};
/* ════════════════════════════════════════════════════════════════
   TopicRow — single row in the topic list
   ════════════════════════════════════════════════════════════════ */
const TopicRow = ({ topic, stats, onClick, onAuthorClick, unreadCount = 0, showCheckbox = false, checked = false, onCheckChange }) => {
    return (<div className="group relative grid w-full grid-cols-1 gap-3 md:grid-cols-12 md:items-center md:gap-4 text-left" style={{ padding: '16px 20px', borderBottom: `2px solid ${NEO.ink}`, transition: 'background-color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = NEO.bg; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
      {showCheckbox && (<div className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 md:block">
          <input type="checkbox" checked={checked} onChange={(e) => { e.stopPropagation(); onCheckChange?.(); }} onClick={(e) => e.stopPropagation()} style={{ width: 16, height: 16, accentColor: NEO.limeDark }}/>
        </div>)}
      {/* LEFT — Author + date + unread badge */}
      <div className={`col-span-4 flex items-center gap-2.5 ${showCheckbox ? 'md:pl-6' : ''}`}>
        <Avatar name={topic.author} size={32} isAdmin={topic.author === 'Admin'}/>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onAuthorClick?.(topic.author); }} style={{
            fontSize: 12, fontWeight: 800, color: NEO.cyanDark,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline',
        }}>
              {topic.author}
            </button>
            {unreadCount > 0 && (<span style={{
                padding: '2px 6px', fontSize: 9, fontWeight: 800,
                backgroundColor: NEO.lime, color: NEO.ink,
                border: `2px solid ${NEO.ink}`,
            }} title="Новых сообщений">
                {unreadCount} нов.
              </span>)}
          </div>
          <div className="mt-0.5 flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: NEO.muted }}>
            <Clock size={10} strokeWidth={2.5}/> {topic.date}
          </div>
        </div>
      </div>

      {/* CENTER — Title + tags + status icons */}
      <button onClick={onClick} className="col-span-5 min-w-0 cursor-pointer text-left" style={{ background: 'none', border: 'none', padding: 0 }}>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {topic.pinned && <Pin size={12} strokeWidth={2.5} style={{ flexShrink: 0, color: NEO.yellowDark }}/>}
          {topic.closed && <Lock size={12} strokeWidth={2.5} style={{ flexShrink: 0, color: NEO.red }}/>}
          {topic.tag && <TagBadge tagId={topic.tag} size="xs"/>}
        </div>
        <ThreadPreviewTooltip topic={topic} firstPost={stats.firstPost || stats.lastPost}>
          <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3, color: topic.pinned ? NEO.yellowDark : NEO.ink, fontFamily: '"Space Grotesk", sans-serif' }}>
            {topic.title}
          </div>
        </ThreadPreviewTooltip>
      </button>

      {/* RIGHT — Stats */}
      <div className="col-span-3 flex items-center justify-end gap-3" style={{ fontSize: 12 }}>
        <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'center' }}>
          <div className="flex items-center gap-1" style={{ fontWeight: 800, color: NEO.ink }}>
            <MessageSquare size={11} strokeWidth={2.5} style={{ color: NEO.muted }}/>
            {stats.replies}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: NEO.muted }}>ответов</div>
        </button>
        <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'center' }}>
          <div className="flex items-center gap-1" style={{ fontWeight: 800, color: NEO.ink }}>
            <Eye size={11} strokeWidth={2.5} style={{ color: NEO.muted }}/>
            {stats.views}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: NEO.muted }}>просмотров</div>
        </button>
        {stats.lastPost && (<div className="hidden max-w-[120px] text-right xl:block">
            <div className="flex items-center justify-end gap-1.5">
              <Avatar name={stats.lastPost.author} size={18} isAdmin={stats.lastPost.author === 'Admin'}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: NEO.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stats.lastPost.author}</span>
            </div>
            <div style={{ marginTop: 2, fontSize: 10, fontWeight: 600, color: NEO.muted }}>{stats.lastPost.date}</div>
          </div>)}
        <ChevronRight size={14} strokeWidth={2.5} style={{ color: NEO.ink }}/>
      </div>
    </div>);
};
export default ForumPage;
