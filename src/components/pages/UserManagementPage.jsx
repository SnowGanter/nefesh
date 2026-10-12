'use client';
import { useState } from 'react';
import { Ban, Check, Search, Shield, ShieldCheck, ShieldX, Volume2, VolumeX } from 'lucide-react';
import { useCurrentUser, useUsers, authStore } from '@/lib/authStore';
import { NEO, NeoButton, NeoCard, NeoHeading, NeoInput, NeoPageHeader, NeoStat, } from '@/components/Neo';
const roleLabel = { admin: 'Админ', mod: 'Модер', user: 'Юзер' };
const roleBadgeStyle = {
    admin: { bg: NEO.red, fg: '#ffffff' },
    mod: { bg: NEO.yellow, fg: NEO.ink },
    user: { bg: NEO.cyan, fg: NEO.ink },
};
// Small inline action button (table cell)
const ActionBtn = ({ onClick, disabled, variant, icon: Icon, children, title }) => {
    const colorMap = {
        yellow: { bg: NEO.yellow, fg: NEO.ink },
        red: { bg: NEO.red, fg: '#ffffff' },
        lime: { bg: NEO.lime, fg: NEO.ink },
        cyan: { bg: NEO.cyan, fg: NEO.ink },
    };
    const c = colorMap[variant] || colorMap.yellow;
    return (<button type="button" onClick={onClick} disabled={disabled} title={title} className="inline-flex items-center gap-1" style={{
            padding: '5px 9px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            backgroundColor: disabled ? '#e5e5e5' : c.bg,
            color: disabled ? '#a3a3a3' : c.fg,
            border: `2px solid ${NEO.ink}`,
            borderRadius: 0,
            boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            transition: 'transform 0.1s, box-shadow 0.1s',
            fontFamily: '"Space Grotesk", sans-serif',
        }} onMouseEnter={(e) => {
            if (disabled)
                return;
            e.currentTarget.style.transform = 'translate(1px, 1px)';
            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`;
        }} onMouseLeave={(e) => {
            if (disabled)
                return;
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
        }} onMouseDown={(e) => {
            if (disabled)
                return;
            e.currentTarget.style.transform = 'translate(2px, 2px)';
            e.currentTarget.style.boxShadow = `0px 0px 0px 0px ${NEO.ink}`;
        }} onMouseUp={(e) => {
            if (disabled)
                return;
            e.currentTarget.style.transform = 'translate(1px, 1px)';
            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`;
        }}>
      <Icon size={12} strokeWidth={2.5}/>
      {children}
    </button>);
};
export const UserManagementPage = () => {
    const me = useCurrentUser();
    const users = useUsers();
    const [search, setSearch] = useState('');
    const [confirm, setConfirm] = useState(null);
    if (!me || (me.role !== 'admin' && me.role !== 'mod')) {
        return (<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex items-center justify-center" style={{
                width: 64, height: 64,
                backgroundColor: NEO.surface,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            }}>
          <ShieldX size={28} strokeWidth={2.5} style={{ color: NEO.red }}/>
        </div>
        <p style={{ color: NEO.muted, fontWeight: 600 }}>
          Доступ только для модераторов и администраторов
        </p>
      </div>);
    }
    const isAdmin = me.role === 'admin';
    const filtered = users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));
    const handleAction = (action, title, message) => {
        setConfirm({ action, title, message });
    };
    const stats = [
        { label: 'Всего', value: users.length, bg: NEO.lime, fg: NEO.ink },
        { label: 'Админы', value: users.filter((u) => u.role === 'admin').length, bg: NEO.red, fg: '#ffffff' },
        { label: 'Модераторы', value: users.filter((u) => u.role === 'mod').length, bg: NEO.yellow, fg: NEO.ink },
        { label: 'Заблокированы', value: users.filter((u) => u.banned).length, bg: NEO.pink, fg: '#ffffff' },
    ];
    return (<div className="space-y-6">
      {/* ── Confirm modal ── */}
      {confirm && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setConfirm(null)}>
          <div className="relative w-full max-w-md" style={{
                backgroundColor: NEO.surface,
                border: `4px solid ${NEO.ink}`,
                boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
            }} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-5" style={{
                backgroundColor: NEO.yellow,
                borderBottom: `4px solid ${NEO.ink}`,
            }}>
              <div className="flex items-center justify-center" style={{
                width: 40, height: 40,
                backgroundColor: NEO.surface,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
                <Shield size={20} strokeWidth={2.5} style={{ color: NEO.ink }}/>
              </div>
              <NeoHeading level={3} style={{ fontSize: '1.125rem' }}>{confirm.title}</NeoHeading>
            </div>
            <div className="p-6">
              <p style={{ color: NEO.muted, fontSize: '14px', fontWeight: 500, marginBottom: 20 }}>
                {confirm.message}
              </p>
              <div className="flex justify-end gap-3">
                <NeoButton variant="white" onClick={() => setConfirm(null)}>Отмена</NeoButton>
                <NeoButton variant="lime" onClick={() => { confirm.action(); setConfirm(null); }}>
                  Подтвердить
                </NeoButton>
              </div>
            </div>
          </div>
        </div>)}

      {/* ── Page header ── */}
      <NeoPageHeader icon={Shield} iconBg={NEO.yellow} title="Управление пользователями" subtitle={isAdmin ? 'Полный доступ: роли, баны, муты' : 'Доступ: муты (без банов и смены ролей)'}/>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (<NeoStat key={s.label} value={s.value} label={s.label} bg={s.bg} fg={s.fg}/>))}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/>
        </div>
        <NeoInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени..." style={{ paddingLeft: 40 }}/>
      </div>

      {/* ── Users table ── */}
      <NeoCard flat style={{ padding: 0, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: NEO.ink }}>
                <th className="p-4" style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: NEO.yellow,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
                  Пользователь
                </th>
                <th className="p-4" style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: NEO.yellow,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
                  Роль
                </th>
                <th className="p-4" style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: NEO.yellow,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
                  Статус
                </th>
                <th className="p-4 text-right" style={{
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: NEO.yellow,
            borderBottom: `3px solid ${NEO.ink}`,
        }}>
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => {
            const roleColors = roleBadgeStyle[u.role] || roleBadgeStyle.user;
            const isLast = idx === filtered.length - 1;
            return (<tr key={u.id} style={{
                    backgroundColor: idx % 2 === 0 ? NEO.surface : '#fef9e7',
                    borderBottom: isLast ? 'none' : `2px solid ${NEO.ink}`,
                }}>
                    {/* User cell */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center flex-shrink-0" style={{
                    width: 36, height: 36,
                    backgroundColor: NEO.lime,
                    border: `2px solid ${NEO.ink}`,
                    boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                    fontSize: '11px',
                    fontWeight: 800,
                    color: NEO.ink,
                }}>
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2" style={{ fontWeight: 700, color: NEO.ink, fontSize: '14px' }}>
                            {u.username}
                            {u.id === me.id && (<span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: NEO.muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                                (вы)
                              </span>)}
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: NEO.muted, marginTop: 2 }}>
                            {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role cell */}
                    <td className="p-4">
                      <span className="inline-flex items-center" style={{
                    padding: '3px 10px',
                    backgroundColor: roleColors.bg,
                    color: roleColors.fg,
                    border: `2px solid ${NEO.ink}`,
                    boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}>
                        {roleLabel[u.role]}
                      </span>
                    </td>

                    {/* Status cell */}
                    <td className="p-4">
                      {u.banned ? (<span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        backgroundColor: NEO.red,
                        color: '#ffffff',
                        border: `2px solid ${NEO.ink}`,
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                          Бан
                        </span>) : u.muted ? (<span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        backgroundColor: NEO.yellow,
                        color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                          Мут
                        </span>) : (<span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        backgroundColor: NEO.lime,
                        color: NEO.ink,
                        border: `2px solid ${NEO.ink}`,
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                          Активен
                        </span>)}
                    </td>

                    {/* Actions cell */}
                    <td className="p-4">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <ActionBtn onClick={() => handleAction(() => authStore.setMuted(u.id, !u.muted), u.muted ? 'Снять мут?' : 'Замутить?', u.muted ? `Снять мут с ${u.username}?` : `Ограничить ${u.username} возможность писать?`)} disabled={u.role === 'admin' || u.id === me.id} variant={u.muted ? 'lime' : 'yellow'} icon={u.muted ? Volume2 : VolumeX} title={u.muted ? 'Снять мут' : 'Мут'}>
                          {u.muted ? 'Размут' : 'Мут'}
                        </ActionBtn>

                        {isAdmin && (<ActionBtn onClick={() => handleAction(() => authStore.setBanned(u.id, !u.banned), u.banned ? 'Разбанить?' : 'Забанить?', u.banned ? `Разблокировать ${u.username}?` : `Заблокировать ${u.username}? Он не сможет войти.`)} disabled={u.role === 'admin' || u.id === me.id} variant={u.banned ? 'lime' : 'red'} icon={u.banned ? Check : Ban} title={u.banned ? 'Разбанить' : 'Бан'}>
                            {u.banned ? 'Разбан' : 'Бан'}
                          </ActionBtn>)}

                        {isAdmin && u.id !== me.id && u.role !== 'admin' && (<ActionBtn onClick={() => handleAction(() => authStore.promote(u.id, u.role === 'mod' ? 'user' : 'mod'), u.role === 'mod' ? 'Понизить?' : 'Повысить?', u.role === 'mod' ? `Снять модератора с ${u.username}?` : `Сделать ${u.username} модератором?`)} disabled={false} variant="cyan" icon={u.role === 'mod' ? ShieldX : ShieldCheck} title={u.role === 'mod' ? 'Понизить' : 'Повысить до модера'}>
                            {u.role === 'mod' ? 'Снять' : 'Модер'}
                          </ActionBtn>)}
                      </div>
                    </td>
                  </tr>);
        })}
            </tbody>
          </table>
        </div>
      </NeoCard>
    </div>);
};
