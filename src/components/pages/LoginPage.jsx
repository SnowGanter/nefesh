'use client';
import { useState } from 'react';
import { LogIn, Sparkles, UserPlus, X } from 'lucide-react';
import { authStore } from '@/lib/authStore';
import { NEO, NeoButton, NeoHeading, NeoInput } from '@/components/Neo';
export const LoginPage = ({ onClose, onNavigate }) => {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const result = mode === 'login'
            ? authStore.login(username, password)
            : authStore.register(username, password);
        if (result.ok) {
            onClose();
            onNavigate('profile');
        }
        else {
            setError(result.error || 'Ошибка');
        }
    };
    const Icon = mode === 'login' ? LogIn : UserPlus;
    return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Вход' : 'Регистрация'} className="relative w-full max-w-md" style={{
            backgroundColor: NEO.surface,
            border: `4px solid ${NEO.ink}`,
            boxShadow: `8px 8px 0px 0px ${NEO.ink}`,
        }} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} aria-label="Закрыть" className="absolute right-3 top-3" style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: NEO.surface,
            border: `2px solid ${NEO.ink}`,
            boxShadow: `2px 2px 0px 0px ${NEO.ink}`,
            cursor: 'pointer',
            transition: 'transform 0.1s, box-shadow 0.1s',
        }} onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(1px, 1px)';
            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`;
        }} onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)';
            e.currentTarget.style.boxShadow = `2px 2px 0px 0px ${NEO.ink}`;
        }} onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translate(2px, 2px)';
            e.currentTarget.style.boxShadow = `0px 0px 0px 0px ${NEO.ink}`;
        }} onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translate(1px, 1px)';
            e.currentTarget.style.boxShadow = `1px 1px 0px 0px ${NEO.ink}`;
        }}>
          <X size={16} strokeWidth={2.5} style={{ color: NEO.ink }}/>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5" style={{
            backgroundColor: NEO.lime,
            borderBottom: `4px solid ${NEO.ink}`,
        }}>
          <div className="flex items-center justify-center" style={{
            width: 44, height: 44,
            backgroundColor: NEO.surface,
            border: `3px solid ${NEO.ink}`,
            boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
        }}>
            <Icon size={22} strokeWidth={2.5} style={{ color: NEO.ink }}/>
          </div>
          <div>
            <NeoHeading level={3} style={{ fontSize: '1.25rem' }}>
              {mode === 'login' ? 'Вход' : 'Регистрация'}
            </NeoHeading>
            <p style={{ fontSize: '12px', fontWeight: 600, color: NEO.ink, marginTop: 2 }}>
              {mode === 'login' ? 'Вход в локальный демо-профиль' : 'Профиль сохранится в этом браузере'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
<p className="text-xs font-semibold">Демо-профиль хранится на этом устройстве. Используйте отдельный тестовый пароль.</p>
          <div className="space-y-2">
            <label htmlFor="login-username" className="block text-xs font-bold uppercase tracking-wider" style={{ color: NEO.muted }}>
              Имя пользователя
            </label>
            <NeoInput id="login-username" name="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} autoFocus placeholder="Минимум 3 символа"/>
          </div>
          <div className="space-y-2">
            <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider" style={{ color: NEO.muted }}>
              Пароль
            </label>
            <NeoInput id="login-password" name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 3 символа"/>
          </div>

          {error && (<div className="px-4 py-3 text-sm font-bold" style={{
                backgroundColor: NEO.red,
                color: '#ffffff',
                border: `3px solid ${NEO.ink}`,
                boxShadow: `4px 4px 0px 0px ${NEO.ink}`,
            }}>
              {error}
            </div>)}

          <NeoButton type="submit" variant="lime" size="lg" style={{ width: '100%' }}>
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </NeoButton>

          {/* Toggle login/register */}
          <div className="text-center text-sm" style={{ color: NEO.muted, fontWeight: 600 }}>
            {mode === 'login' ? (<>
                Нет аккаунта?{' '}
                <button type="button" onClick={() => { setMode('register'); setError(''); }} style={{
                color: NEO.ink,
                fontWeight: 800,
                textDecoration: 'underline',
                textDecorationColor: NEO.lime,
                textDecorationThickness: '3px',
                textUnderlineOffset: '3px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
            }}>
                  Регистрация
                </button>
              </>) : (<>
                Уже есть аккаунт?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); }} style={{
                color: NEO.ink,
                fontWeight: 800,
                textDecoration: 'underline',
                textDecorationColor: NEO.lime,
                textDecorationThickness: '3px',
                textUnderlineOffset: '3px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
            }}>
                  Войти
                </button>
              </>)}
          </div>

          {/* Hint admin/admin */}
          {mode === 'login' && (<div className="flex items-center justify-center gap-1.5 px-4 py-3 text-center text-xs" style={{
                backgroundColor: NEO.yellow,
                color: NEO.ink,
                border: `3px solid ${NEO.ink}`,
                boxShadow: `3px 3px 0px 0px ${NEO.ink}`,
                fontWeight: 700,
            }}>
              <Sparkles size={12} strokeWidth={2.5}/>
              Тестовый админ:{' '}
              <span style={{
                fontFamily: 'monospace',
                fontWeight: 800,
                backgroundColor: NEO.ink,
                color: NEO.yellow,
                padding: '1px 6px',
            }}>
                admin / admin
              </span>
            </div>)}
        </form>
      </div>
    </div>);
};
