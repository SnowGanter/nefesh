'use client';
// ═══════════════════════════════════════════════════════════════
//  page.tsx — Nefesh · neobrutalism edition
//  Единая тема (без переключения). Чёрные рамки, жёсткие тени,
//  яркие акценты (lime/yellow/cyan/pink). Шрифты Space Grotesk +
//  Archivo Black.
// ═══════════════════════════════════════════════════════════════
import React, { Component, useState } from 'react';
import {
  AlertTriangle, BookOpen, Database, Gavel, Home, LogIn, LogOut, Menu,
  MessageSquare, RefreshCw, Shield, Sparkles, User, X,
} from 'lucide-react';
import { HomePage } from '@/components/pages/HomePage';
import { ForumPage } from '@/components/pages/ForumPage';
import { AuctionPage } from '@/components/pages/AuctionPage';
import { ArmoryPage } from '@/components/pages/ArmoryPage';
import { DatabasePage } from '@/components/pages/DatabasePage';
import { AdminPage } from '@/components/pages/AdminPage';
import { LoginPage } from '@/components/pages/LoginPage';
import { ProfilePage } from '@/components/pages/ProfilePage';
import { NotificationsBell } from '@/components/pages/NotificationsBell';
import { UserManagementPage } from '@/components/pages/UserManagementPage';
import { useCurrentUser, authStore } from '@/lib/authStore';
import {
  RouterProvider, Link, NavLink, Navigate, useNavigate,
} from '@/lib/router';

// ════════════════════════════════════════ Error Boundary ════════════════════════════════════════
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="neo-card mx-auto max-w-xl p-8 text-center">
          <AlertTriangle className="mx-auto mb-4" size={48} strokeWidth={2.5} />
          <h2 className="neo-heading mb-2 text-2xl">Раздел не загрузился</h2>
          <p className="mb-6 text-base" style={{ color: '#525252' }}>
            Ошибка не сломала весь сайт.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="neo-btn neo-btn-lime"
          >
            <RefreshCw size={18} /> Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ════════════════════════════════════════ Protected Route ════════════════════════════════════════
function ProtectedRoute({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: 'admin' | 'mod';
}) {
  const user = useCurrentUser();
  if (!user) {
    return (
      <div className="neo-card flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <User size={40} strokeWidth={2.5} />
        <p className="text-lg" style={{ color: '#525252' }}>Войдите, чтобы открыть этот раздел</p>
        <Link to="/home" className="neo-btn neo-btn-yellow">← На главную</Link>
      </div>
    );
  }
  if (requireRole === 'admin' && user.role !== 'admin') {
    return (
      <div className="neo-card flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <Shield size={40} strokeWidth={2.5} />
        <p className="text-lg" style={{ color: '#525252' }}>Доступ только для администраторов</p>
        <Link to="/home" className="neo-btn neo-btn-yellow">← На главную</Link>
      </div>
    );
  }
  if (requireRole === 'mod' && user.role !== 'admin' && user.role !== 'mod') {
    return (
      <div className="neo-card flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <Shield size={40} strokeWidth={2.5} />
        <p className="text-lg" style={{ color: '#525252' }}>Доступ только для модераторов</p>
        <Link to="/home" className="neo-btn neo-btn-yellow">← На главную</Link>
      </div>
    );
  }
  return <>{children}</>;
}

// ════════════════════════════════════════ Layout ════════════════════════════════════════
function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const user = useCurrentUser();
  const navigate = useNavigate();

  React.useEffect(() => {
    const openLogin = () => setShowLogin(true);
    window.addEventListener('nefesh:login', openLogin);
    return () => window.removeEventListener('nefesh:login', openLogin);
  }, []);

  const navItems: {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
    path: string;
  }[] = [
    { id: 'home', label: 'Главная', icon: Home, path: '/home' },
    { id: 'forum', label: 'Форум', icon: MessageSquare, path: '/forum' },
    { id: 'auction', label: 'Аукцион', icon: Gavel, path: '/auction' },
    { id: 'armory', label: 'Армори', icon: User, path: '/armory' },
    { id: 'database', label: 'База знаний', icon: BookOpen, path: '/database' },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Админка', icon: Database, path: '/admin' as const }] : []),
    ...(user?.role === 'admin' || user?.role === 'mod'
      ? [{ id: 'users', label: 'Юзеры', icon: Shield, path: '/users' as const }]
      : []),
  ];

  const handleNavigate = (viewId: string) => {
    setShowLogin(false);
    setMobileMenuOpen(false);
    navigate('/' + viewId);
  };

  return (
    <div className="relative flex min-h-screen flex-col" style={{ backgroundColor: '#fef9e7', backgroundImage: 'radial-gradient(#d4c97a 1px, transparent 1px)', backgroundSize: '32px 32px', color: '#000' }}>
      {/* ── Nav ── */}
      <nav
        aria-label="Основная навигация"
        className="sticky top-0 z-50"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '4px solid #000',
          boxShadow: '0 6px 0px 0px #000',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to="/home"
              className="flex flex-shrink-0 cursor-pointer items-center gap-2.5"
              style={{ fontWeight: 900 }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center"
                style={{
                  backgroundColor: '#84cc16',
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0px 0px #000',
                }}
              >
                <Sparkles size={20} strokeWidth={2.5} style={{ color: '#000' }} />
              </div>
              <span
                style={{
                  fontFamily: '"Archivo Black", sans-serif',
                  fontSize: '1.25rem',
                  letterSpacing: '-0.03em',
                  color: '#000',
                }}
              >
                Nefesh
              </span>
            </Link>

            {/* Center nav */}
            <div className="hidden flex-1 justify-center xl:flex">
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-all duration-100 ${isActive ? '' : 'hover:bg-[#fef9e7]'}`
                      }
                    >
                      {({ isActive }) => (
                        <span
                          style={
                            isActive
                              ? {
                                  backgroundColor: '#fbbf24',
                                  border: '2px solid #000',
                                  boxShadow: '2px 2px 0px 0px #000',
                                  padding: '6px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#000',
                                }
                              : { color: '#000', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }
                          }
                        >
                          <Icon size={15} strokeWidth={2.5} />
                          {item.label}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Right actions */}
            <div className="hidden items-center gap-2 xl:flex">
              {user ? (
                <>
                  <NotificationsBell />
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold"
                    style={{
                      backgroundColor: '#fff',
                      border: '3px solid #000',
                      boxShadow: '3px 3px 0px 0px #000',
                      color: '#000',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    title="Личный кабинет"
                  >
                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden text-[10px] font-black"
                      style={{ backgroundColor: '#84cc16', border: '2px solid #000', color: '#000' }}
                    >
                      {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.username.slice(0, 2).toUpperCase()}
                    </div>
                    {user.username}
                  </Link>
                  <button
                    onClick={() => { authStore.logout(); handleNavigate('home'); }}
                    className="flex h-10 w-10 items-center justify-center"
                    style={{
                      backgroundColor: '#ef4444',
                      border: '3px solid #000',
                      boxShadow: '3px 3px 0px 0px #000',
                      color: '#fff',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    title="Выйти"
                  >
                    <LogOut size={18} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="neo-btn neo-btn-lime"
                >
                  <LogIn size={16} strokeWidth={2.5} /> Войти
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="xl:hidden">
              <button
                aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-10 w-10 items-center justify-center"
                style={{
                  backgroundColor: '#fff',
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0px 0px #000',
                  color: '#000',
                }}
              >
                {mobileMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t-4 border-black bg-white xl:hidden">
            <div className="space-y-1 px-3 pb-4 pt-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-base font-bold"
                    style={{ color: '#000', border: '2px solid transparent' }}
                  >
                    <Icon size={20} strokeWidth={2.5} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-3 flex flex-col gap-2 border-t-4 border-black px-2 pt-4">
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="neo-btn neo-btn-white justify-start"
                    >
                      <User size={18} strokeWidth={2.5} /> {user.username}
                    </Link>
                    <button
                      onClick={() => { authStore.logout(); handleNavigate('home'); setMobileMenuOpen(false); }}
                      className="neo-btn justify-start"
                      style={{ backgroundColor: '#ef4444', color: '#fff' }}
                    >
                      <LogOut size={18} strokeWidth={2.5} /> Выйти
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}
                    className="neo-btn neo-btn-lime"
                  >
                    <LogIn size={16} strokeWidth={2.5} /> Войти / Регистрация
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {showLogin && <LoginPage onClose={() => setShowLogin(false)} onNavigate={handleNavigate} />}

      {/* ── Main ── */}
      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <p className="mb-6 border-2 border-black bg-[#fbbf24] px-4 py-3 text-sm font-semibold">
          Демо Nefesh: аккаунты, форум и изменения сохраняются только в вашем браузере.
        </p>
        <ErrorBoundary>{children}</ErrorBoundary>

      </main>

      {/* ── Footer ── */}
      <footer
        className="mt-auto"
        style={{
          backgroundColor: '#000',
          borderTop: '4px solid #84cc16',
          color: '#fff',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center"
              style={{ backgroundColor: '#84cc16', border: '2px solid #fff' }}
            >
              <Sparkles size={14} strokeWidth={2.5} style={{ color: '#000' }} />
            </div>
            <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
              © 2026 NEFESH · ИГРОВОЙ ПОРТАЛ
            </span>
          </div>
          <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-wider">
            <a href="https://github.com/SnowGanter/nefesh#readme" className="transition hover:text-[#84cc16]">Документация</a>
            <a href="https://github.com/SnowGanter/nefesh/issues" className="transition hover:text-[#84cc16]">Поддержка</a>
            <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/downloads/`} className="transition hover:text-[#84cc16]">Исходники</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ════════════════════════════════════════ Page (root) ════════════════════════════════════════
export default function Page() {
  return (
    <RouterProvider
      layout={(children) => <Layout>{children}</Layout>}
      fallback={<Navigate to="/home" replace />}
      routes={[
        { path: '/home', element: <HomePage onNavigate={(id: string) => {
          if (id === 'login') window.dispatchEvent(new Event('nefesh:login'));
          else window.location.hash = '#!/' + id;
        }} /> },
        { path: '/forum', element: <ForumPage /> },
        { path: '/forum/subcat/:subcatId', element: <ForumPage /> },
        { path: '/forum/topic/:topicId', element: <ForumPage /> },
        { path: '/auction', element: <AuctionPage /> },
        { path: '/auction/:category', element: <AuctionPage /> },
        { path: '/armory', element: <ArmoryPage /> },
        { path: '/armory/:subtab', element: <ArmoryPage /> },
        { path: '/database', element: <DatabasePage /> },
        { path: '/database/:tab', element: <DatabasePage /> },
        { path: '/database/:tab/:itemId', element: <DatabasePage /> },
        { path: '/database/item/:itemId', element: <DatabasePage /> },
        {
          path: '/admin',
          element: <ProtectedRoute requireRole="admin"><AdminPage /></ProtectedRoute>,
        },
        {
          path: '/admin/:collection',
          element: <ProtectedRoute requireRole="admin"><AdminPage /></ProtectedRoute>,
        },
        {
          path: '/users',
          element: <ProtectedRoute requireRole="mod"><UserManagementPage /></ProtectedRoute>,
        },
        {
          path: '/profile',
          element: (
            <ProtectedRoute>
              <ProfilePage onNavigate={(id: string) => { if (typeof window !== 'undefined') window.location.hash = '#!/' + id; }} />
            </ProtectedRoute>
          ),
        },
        { path: '*', element: <Navigate to="/home" replace /> },
      ]}
    />
  );
}
