'use client';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Gavel, MessageSquare, Sparkles, Swords, User, Zap, } from 'lucide-react';
import { DB_ITEMS, INITIAL_AUCTION, INITIAL_POSTS, INITIAL_TOPICS, MOCK_NEWS } from '@/data/gameData';
import { useCollection } from '@/lib/dataStore';
import { evalDescription } from '@/lib/gameUtils';
import { useCurrentUser } from '@/lib/authStore';
const quickActions = [
    { id: 'database', title: 'База знаний', desc: 'Предметы, чармы, заклинания и рецепты', icon: BookOpen, bg: '#84cc16', fg: '#000' },
    { id: 'armory', title: 'Армори', desc: 'Калькулятор статов и профили персонажей', icon: User, bg: '#fbbf24', fg: '#000' },
    { id: 'forum', title: 'Форум', desc: 'Темы, ответы и обсуждения сообщества', icon: MessageSquare, bg: '#06b6d4', fg: '#000' },
    { id: 'auction', title: 'Аукцион', desc: 'Лоты, цены и быстрые покупки', icon: Gavel, bg: '#ec4899', fg: '#fff' },
];
const serverStatus = [
    { name: 'EU-Central', mode: 'PvP', load: 'Высокая', loadValue: 84, online: true },
    { name: 'RU-Main', mode: 'PvE', load: 'Средняя', loadValue: 52, online: true },
    { name: 'Test Realm', mode: 'PTR', load: 'Закрыт', loadValue: 0, online: false },
];
const roadmap = [
    { label: 'Визуальный слой', state: 'активен', value: 100, bg: '#84cc16' },
    { label: 'Локальные фичи', state: 'в работе', value: 65, bg: '#fbbf24' },
    { label: 'База и аккаунты', state: 'позже', value: 20, bg: '#06b6d4' },
];
const tagStyles = {
    Бета: { bg: '#84cc16', fg: '#000' },
    Патч: { bg: '#fbbf24', fg: '#000' },
    Событие: { bg: '#ec4899', fg: '#fff' },
};
const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};
export const HomePage = ({ onNavigate }) => {
    const homeUser = useCurrentUser();
    const homeStats = homeUser?.savedArmory?.spellStats || null;
    const news = useCollection('MOCK_NEWS', MOCK_NEWS);
    const statCounts = {
        items: useCollection('DB_ITEMS', DB_ITEMS).length,
        topics: useCollection('INITIAL_TOPICS', INITIAL_TOPICS).length,
        auction: useCollection('INITIAL_AUCTION', INITIAL_AUCTION).length,
        posts: useCollection('INITIAL_POSTS', INITIAL_POSTS).length,
    };
    const stats = [
        { label: 'ПРЕДМЕТОВ', value: statCounts.items, bg: '#84cc16', fg: '#000' },
        { label: 'ТЕМ ФОРУМА', value: statCounts.topics, bg: '#fbbf24', fg: '#000' },
        { label: 'ЛОТОВ', value: statCounts.auction, bg: '#06b6d4', fg: '#000' },
        { label: 'СООБЩЕНИЙ', value: statCounts.posts, bg: '#ec4899', fg: '#fff' },
    ];
    return (<motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
      {/* ── HERO ── */}
      <motion.section variants={item}>
        <div className="relative overflow-hidden p-8 md:p-12" style={{
            backgroundColor: '#fff',
            border: '4px solid #000',
            boxShadow: '8px 8px 0px 0px #000',
        }}>
          {/* Decorative corner blocks */}
          <div className="absolute right-0 top-0 h-24 w-24" style={{ backgroundColor: '#fbbf24', borderLeft: '4px solid #000', borderBottom: '4px solid #000' }}/>
          <div className="absolute -right-2 -top-2 h-6 w-6" style={{ backgroundColor: '#84cc16', border: '3px solid #000' }}/>

          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex min-h-[280px] flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider" style={{
            backgroundColor: '#84cc16',
            border: '2px solid #000',
            boxShadow: '2px 2px 0px 0px #000',
            color: '#000',
        }}>
                  <Sparkles size={12} strokeWidth={3}/> Игровой портал · демо
                </span>
                <h1 className="mt-6 text-4xl md:text-6xl" style={{ fontFamily: '"Archivo Black", sans-serif', lineHeight: 1.05, letterSpacing: '-0.03em', color: '#000' }}>
                  Nefesh
                  <br />
                  <span style={{ background: 'linear-gradient(180deg, transparent 60%, #fbbf24 60%)', padding: '0 0.1em' }}>
                    единый центр
                  </span>{' '}
                  сообщества
                </h1>
                <p className="mt-5 max-w-xl text-base md:text-lg" style={{ color: '#525252', fontWeight: 500 }}>
                  Форум, аукцион, база знаний, профили персонажей и калькулятор билдов — всё в одном месте, в одном стиле, под одной учетной записью.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={() => onNavigate('database')} className="neo-btn neo-btn-lime text-base" style={{ padding: '14px 24px' }}>
                  Открыть базу
                  <ArrowRight size={18} strokeWidth={3}/>
                </button>
                <button onClick={() => onNavigate('armory')} className="neo-btn neo-btn-white text-base" style={{ padding: '14px 24px' }}>
                  <Swords size={18} strokeWidth={3} style={{ color: '#000' }}/>
                  Собрать билд
                </button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s) => (<div key={s.label} className="p-4" style={{
                backgroundColor: s.bg,
                color: s.fg,
                border: '3px solid #000',
                boxShadow: '4px 4px 0px 0px #000',
                transition: 'transform 0.1s, box-shadow 0.1s',
            }}>
                  <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '2rem', lineHeight: 1 }}>{s.value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-80">{s.label}</div>
                </div>))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── QUICK ACTIONS ── */}
      <motion.section variants={item}>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl md:text-3xl" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
            Быстрый{' '}
            <span style={{ background: 'linear-gradient(180deg, transparent 60%, #84cc16 60%)' }}>доступ</span>
          </h2>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#525252' }}>4 раздела</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (<motion.button key={action.id} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} onClick={() => onNavigate(action.id)} className="group relative overflow-hidden p-5 text-left" style={{
                    backgroundColor: '#fff',
                    border: '3px solid #000',
                    boxShadow: '6px 6px 0px 0px #000',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }}>
                <div className="absolute -right-6 -top-6 h-20 w-20" style={{ backgroundColor: action.bg, border: '2px solid #000', transform: 'rotate(45deg)' }}/>
                <div className="relative mb-4 flex h-12 w-12 items-center justify-center" style={{ backgroundColor: action.bg, border: '3px solid #000', boxShadow: '3px 3px 0px 0px #000', color: action.fg }}>
                  <Icon size={22} strokeWidth={2.5}/>
                </div>
                <h3 className="relative flex items-center gap-1.5 text-base" style={{ fontFamily: '"Archivo Black", sans-serif', color: '#000' }}>
                  {action.title}
                  <ArrowRight size={14} strokeWidth={3} style={{ color: '#000' }}/>
                </h3>
                <p className="relative mt-1.5 text-sm" style={{ color: '#525252', fontWeight: 500 }}>{homeStats ? evalDescription(action.desc, homeStats) : action.desc}</p>
              </motion.button>);
        })}
        </div>
      </motion.section>

      {/* ── NEWS + SIDEBAR ── */}
      <motion.section variants={item} className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* News */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl md:text-3xl" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
              Последние{' '}
              <span style={{ background: 'linear-gradient(180deg, transparent 60%, #fbbf24 60%)' }}>новости</span>
            </h2>
            <button onClick={() => onNavigate('forum')} className="neo-btn neo-btn-white text-xs">Обсудить на форуме →</button>
          </div>
          <div className="space-y-4">
            {news.map((newsItem) => {
            const tag = tagStyles[newsItem.tag] || { bg: '#fff', fg: '#000' };
            return (<article key={newsItem.id} className="group relative overflow-hidden p-5" style={{
                    backgroundColor: '#fff',
                    border: '3px solid #000',
                    boxShadow: '6px 6px 0px 0px #000',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                }}>
                  {/* Left color stripe */}
                  <div className="absolute left-0 top-0 h-full w-2" style={{ backgroundColor: tag.bg, borderRight: '2px solid #000' }}/>
                  <div className="ml-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: tag.bg, color: tag.fg, border: '2px solid #000', boxShadow: '2px 2px 0px 0px #000' }}>
                        {newsItem.tag}
                      </span>
                      <span className="text-xs font-bold" style={{ color: '#525252' }}>{newsItem.date}</span>
                    </div>
                    <h3 className="mt-3 text-xl" style={{ fontFamily: '"Archivo Black", sans-serif', color: '#000' }}>
                      {newsItem.title}
                    </h3>
                    <p className="mt-2 text-sm" style={{ color: '#404040', fontWeight: 500 }}>{homeStats ? evalDescription(newsItem.excerpt, homeStats) : newsItem.excerpt}</p>
                  </div>
                </article>);
        })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Servers */}
          <div>
            <h2 className="mb-3 text-xl" style={{ fontFamily: '"Archivo Black", sans-serif' }}>Серверы · пример данных</h2>
            <div className="p-5" style={{ backgroundColor: '#fff', border: '3px solid #000', boxShadow: '6px 6px 0px 0px #000' }}>
              <div className="space-y-4">
                {serverStatus.map((server) => (<div key={server.name} className="border-b-2 border-black pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-bold" style={{ color: '#000' }}>
                          {server.name}
                          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: '#000', color: '#fbbf24' }}>
                            {server.mode}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold" style={{ color: '#525252' }}>
                          {server.online ? `Нагрузка: ${server.load}` : 'Сервер недоступен'}
                        </div>
                      </div>
                      <span className="px-2 py-1 text-[10px] font-bold uppercase" style={{
                backgroundColor: server.online ? '#84cc16' : '#ef4444',
                color: server.online ? '#000' : '#fff',
                border: '2px solid #000',
            }}>
                        {server.online ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    {server.online && (<div className="mt-2 h-3 w-full" style={{ backgroundColor: '#fef9e7', border: '2px solid #000' }}>
                        <div className="h-full" style={{
                    width: `${server.loadValue}%`,
                    backgroundColor: server.loadValue > 70 ? '#ef4444' : '#84cc16',
                }}/>
                      </div>)}
                  </div>))}
              </div>
            </div>
          </div>

          {/* Roadmap */}
          <div>
            <h2 className="mb-3 text-xl" style={{ fontFamily: '"Archivo Black", sans-serif' }}>Перед релизом</h2>
            <div className="p-5" style={{ backgroundColor: '#fff', border: '3px solid #000', boxShadow: '6px 6px 0px 0px #000' }}>
              <div className="space-y-4">
                {roadmap.map((r) => (<div key={r.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm font-bold">
                      <span style={{ color: '#000' }}>{r.label}</span>
                      <span style={{ color: r.bg === '#84cc16' ? '#65a30d' : r.bg === '#fbbf24' ? '#d97706' : '#0891b2' }}>
                        {r.state}
                      </span>
                    </div>
                    <div className="h-3 w-full" style={{ backgroundColor: '#fef9e7', border: '2px solid #000' }}>
                      <div className="h-full" style={{ width: `${r.value}%`, backgroundColor: r.bg }}/>
                    </div>
                  </div>))}
              </div>
            </div>
          </div>

          {/* CTA block */}
          <div className="relative overflow-hidden p-5" style={{ backgroundColor: '#84cc16', border: '3px solid #000', boxShadow: '6px 6px 0px 0px #000' }}>
            <Zap size={64} className="absolute -right-3 -top-3" style={{ color: 'rgba(0,0,0,0.2)' }} strokeWidth={2.5}/>
            <div className="relative">
              <h3 className="text-base" style={{ fontFamily: '"Archivo Black", sans-serif', color: '#000' }}>Стать частью портала</h3>
              <p className="mt-1 text-xs font-medium" style={{ color: '#000' }}>
                Создайте локальный профиль, чтобы попробовать форум и сохранить билд в этом браузере.
              </p>
              <button onClick={() => onNavigate(homeUser ? 'profile' : 'login')} className="neo-btn neo-btn-black mt-3 w-full text-sm">
                {homeUser ? 'Мой профиль' : 'Создать аккаунт'}
                <ArrowRight size={14} strokeWidth={3}/>
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── С ЧЕГО НАЧАТЬ (sirus-style "What to do now") ── */}
      <motion.section variants={item}>
        <div className="p-6 md:p-8" style={{ backgroundColor: '#000', border: '4px solid #000', boxShadow: '8px 8px 0px 0px #84cc16' }}>
          <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#84cc16' }}>С ЧЕГО НАЧАТЬ</span>
              <h2 className="mt-2 text-3xl" style={{ fontFamily: '"Archivo Black", sans-serif', color: '#fbbf24' }}>
                Что делать сейчас
              </h2>
              <p className="mt-2 text-sm" style={{ color: '#a3a3a3' }}>
                Три направления для развития персонажа и участия в сообществе.
              </p>
            </div>
            <div className="space-y-3">
              {[
            { tag: 'SUPPLY', icon: BookOpen, bg: '#84cc16', fg: '#000', text: 'Изучи базу знаний: предметы, чармы, заклинания и рецепты. Подбери экипировку для билда.' },
            { tag: 'COMMERCIAL', icon: Gavel, bg: '#fbbf24', fg: '#000', text: 'Открой аукцион: сравни характеристики и цены демонстрационных лотов.' },
            { tag: 'COMMUNITY', icon: MessageSquare, bg: '#ec4899', fg: '#fff', text: 'Зайди на форум: посмотри обсуждения и попробуй создать свою тему.' },
        ].map((item) => {
            const Icon = item.icon;
            return (<div key={item.tag} className="flex items-start gap-3 p-4" style={{ backgroundColor: item.bg, color: item.fg, border: '3px solid #000', boxShadow: '4px 4px 0px 0px #000' }}>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center" style={{ backgroundColor: '#fff', border: '2px solid #000', color: '#000' }}>
                      <Icon size={20} strokeWidth={2.5}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider">{item.tag}</div>
                      <div className="mt-0.5 text-sm font-medium">{item.text}</div>
                    </div>
                  </div>);
        })}
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>);
};
