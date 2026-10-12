'use client';
import { useRef, useState } from 'react';
import { ArrowRight, Calendar, Check, LogOut, Shield, Sparkles, Upload, User as UserIcon } from 'lucide-react';
import { useCurrentUser, authStore } from '@/lib/authStore';
import { MOCK_CHARACTERS } from '@/data/gameData';
import { NEO, NeoButton, NeoCard, NeoHeading, NeoInput, NeoStat, NeoTextarea, } from '@/components/Neo';
const roleLabel = { admin: 'Администратор', mod: 'Модератор', user: 'Пользователь' };
const roleBadgeStyle = {
    admin: { bg: NEO.red, fg: '#ffffff' },
    mod: { bg: NEO.yellow, fg: NEO.ink },
    user: { bg: NEO.cyan, fg: NEO.ink },
};
export const ProfilePage = ({ onNavigate }) => {
    const user = useCurrentUser();
    const [bio, setBio] = useState(user ? user.bio || '' : '');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [msg, setMsg] = useState('');
    const avatarInputRef = useRef(null);
    if (!user) {
        return (<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex items-center justify-center" style={{
                width: 64, height: 64,
                backgroundColor: NEO.surface,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `6px 6px 0px 0px ${NEO.ink}`,
            }}>
          <UserIcon size={28} strokeWidth={2.5} style={{ color: NEO.muted }}/>
        </div>
        <p style={{ color: NEO.muted, fontWeight: 600 }}>Войдите, чтобы увидеть личный кабинет</p>
        <NeoButton variant="lime" onClick={() => onNavigate('home')}>На главную</NeoButton>
      </div>);
    }
    const char = MOCK_CHARACTERS.find((c) => c.name === user.username);
    const roleColors = roleBadgeStyle[user.role] || roleBadgeStyle.user;
    const handleAvatarUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith('image/') || file.size > 700 * 1024) {
            setMsg('Choose an image up to 700 KB');
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => { authStore.updateProfile(user.id, { avatar: String(reader.result) }); setMsg('Avatar updated'); setTimeout(() => setMsg(''), 2500); };
        reader.readAsDataURL(file);
        event.target.value = '';
    };
    const saveBio = () => {
        authStore.updateProfile(user.id, { bio });
        setMsg('Описание сохранено');
        setTimeout(() => setMsg(''), 2500);
    };
    const changePass = () => {
        if (oldPass !== user.password) {
            setMsg('Старый пароль неверен');
            setTimeout(() => setMsg(''), 2500);
            return;
        }
        if (newPass.length < 3) {
            setMsg('Новый пароль слишком короткий');
            setTimeout(() => setMsg(''), 2500);
            return;
        }
        authStore.updateProfile(user.id, { password: newPass });
        setOldPass('');
        setNewPass('');
        setMsg('Пароль изменён');
        setTimeout(() => setMsg(''), 2500);
    };
    const stats = [
        { label: 'Роль', value: roleLabel[user.role], bg: NEO.lime },
        {
            label: 'Статус',
            value: user.banned ? 'Заблокирован' : user.muted ? 'Мут' : 'Активен',
            bg: user.banned ? NEO.red : user.muted ? NEO.yellow : NEO.lime,
        },
        { label: 'ID', value: user.id.slice(0, 10), bg: NEO.cyan },
        { label: 'Дней на портале', value: String(Math.floor((Date.now() - user.createdAt) / 86400000) || 0), bg: NEO.pink },
    ];
    return (<div className="space-y-6">
      {/* ── Profile header ── */}
      <NeoCard flat style={{ padding: 0, overflow: 'hidden' }}>
        {/* Top stripe */}
        <div style={{
            height: 80,
            backgroundColor: NEO.lime,
            borderBottom: `4px solid ${NEO.ink}`,
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.08) 10px, rgba(0,0,0,0.08) 20px)`,
        }}/>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col items-start gap-4 md:flex-row md:items-end">
            {/* Avatar */}
            <div>
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden border-4 border-black bg-white shadow-[4px_4px_0_#000]">
                {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover"/> : <UserIcon size={42} strokeWidth={2.5} style={{ color: NEO.ink }}/>}
              </div>
              <button type="button" onClick={() => avatarInputRef.current?.click()} className="mt-2 flex w-24 items-center justify-center gap-1 border-2 border-black bg-white px-1 py-1.5 text-[11px] font-extrabold text-black">
                <Upload size={13} strokeWidth={3}/> Avatar
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden"/>
            </div>

            {/* Name + badges */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <NeoHeading level={1} style={{ fontSize: '2rem' }}>{user.username}</NeoHeading>
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
                  {roleLabel[user.role]}
                </span>
                {user.muted && (<span className="inline-flex items-center" style={{
                padding: '3px 10px',
                backgroundColor: NEO.yellow,
                color: NEO.ink,
                border: `2px solid ${NEO.ink}`,
                boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                    Мут
                  </span>)}
                {user.banned && (<span className="inline-flex items-center" style={{
                padding: '3px 10px',
                backgroundColor: NEO.red,
                color: '#ffffff',
                border: `2px solid ${NEO.ink}`,
                boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                    Бан
                  </span>)}
              </div>
              <p className="mt-2 flex items-center gap-1.5" style={{ color: NEO.muted, fontSize: '14px', fontWeight: 600 }}>
                <Calendar size={14} strokeWidth={2.5}/>
                С нами с {new Date(user.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>

            {/* Logout */}
            <NeoButton variant="red" onClick={() => { authStore.logout(); onNavigate('home'); }}>
              <LogOut size={16} strokeWidth={2.5}/> Выйти
            </NeoButton>
          </div>
        </div>
      </NeoCard>

      {/* ── Quick actions for admin/mod ── */}
      {(user.role === 'admin' || user.role === 'mod') && (<div className="flex flex-wrap gap-3">
          <NeoButton variant="cyan" onClick={() => onNavigate('users')}>
            <Shield size={16} strokeWidth={2.5}/> Управление пользователями
          </NeoButton>
          {user.role === 'admin' && (<NeoButton variant="yellow" onClick={() => onNavigate('admin')}>
              <Sparkles size={16} strokeWidth={2.5}/> База данных
            </NeoButton>)}
        </div>)}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (<NeoStat key={s.label} value={s.value} label={s.label} bg={s.bg} fg={s.bg === NEO.red || s.bg === NEO.pink ? '#ffffff' : NEO.ink}/>))}
      </div>

      {/* ── Bio section ── */}
      <NeoCard flat style={{ padding: 24 }}>
        <NeoHeading level={3} style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          О себе
        </NeoHeading>
        <NeoTextarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Расскажите о себе..."/>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <NeoButton variant="lime" onClick={saveBio}>Сохранить</NeoButton>
          {msg && (<span className="inline-flex items-center gap-1.5 px-3 py-1.5" style={{
                backgroundColor: NEO.lime,
                color: NEO.ink,
                border: `2px solid ${NEO.ink}`,
                boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
                fontSize: '13px',
                fontWeight: 700,
            }}>
              <Check size={14} strokeWidth={3}/> {msg}
            </span>)}
        </div>
      </NeoCard>

      {/* ── Password section ── */}
      <NeoCard flat style={{ padding: 24 }}>
        <NeoHeading level={3} style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          Сменить пароль
        </NeoHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <NeoInput type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder="Старый пароль"/>
          <NeoInput type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Новый пароль"/>
        </div>
        <div className="mt-4">
          <NeoButton variant="white" onClick={changePass}>Сменить пароль</NeoButton>
        </div>
      </NeoCard>

      {/* ── Linked character ── */}
      {char && (<NeoCard flat style={{ padding: 24 }}>
          <NeoHeading level={3} style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Привязанный персонаж
          </NeoHeading>
          <NeoCard hover onClick={() => onNavigate('armory')} style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="flex items-center justify-center flex-shrink-0" style={{
                width: 48, height: 48,
                backgroundColor: NEO.yellow,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
            }}>
              <UserIcon size={24} strokeWidth={2.5} style={{ color: NEO.ink }}/>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1rem', color: NEO.ink }}>
                {char.name}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: NEO.muted, marginTop: 2 }}>
                Гильдия: {char.guild}
              </div>
            </div>
            <ArrowRight size={20} strokeWidth={2.5} style={{ color: NEO.ink, flexShrink: 0 }}/>
          </NeoCard>
        </NeoCard>)}
    </div>);
};
