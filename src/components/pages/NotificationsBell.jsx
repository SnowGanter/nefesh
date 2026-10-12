'use client';
import { useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useCurrentUser, useNotifications, authStore } from '@/lib/authStore';
const typeTone = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    danger: 'border-red-500/30 bg-red-500/10 text-red-400',
};
export const NotificationsBell = () => {
    const user = useCurrentUser();
    const notifs = useNotifications(user ? user.id : null);
    const [open, setOpen] = useState(false);
    const unread = notifs.filter((n) => !n.read).length;
    if (!user)
        return null;
    const timeAgo = (ts) => {
        const diff = Date.now() - ts;
        const min = Math.floor(diff / 60000);
        if (min < 1)
            return 'только что';
        if (min < 60)
            return `${min} мин назад`;
        const h = Math.floor(min / 60);
        if (h < 24)
            return `${h} ч назад`;
        return `${Math.floor(h / 24)} дн назад`;
    };
    return (<div className="relative">
      <button onClick={() => { if (!open && unread > 0)
        authStore.markAllRead(user.id); setOpen(!open); }} className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-white/20 hover:text-white" title="Уведомления">
        <Bell size={18}/>
        {unread > 0 && (<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-1 text-[10px] font-bold text-zinc-950">
            {unread > 9 ? '9+' : unread}
          </span>)}
      </button>

      {open && (<>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100">
                <Bell size={16} className="text-emerald-400"/> Уведомления
              </h3>
              {unread > 0 && (<button onClick={() => authStore.markAllRead(user.id)} className="flex items-center gap-1 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300">
                  <Check size={12}/> Прочитать все
                </button>)}
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifs.length === 0 ? (<div className="p-8 text-center text-sm text-zinc-500">Нет уведомлений</div>) : (notifs.map((n) => (<div key={n.id} className={`group flex items-start gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.03] ${!n.read ? 'bg-white/[0.02]' : ''}`}>
                    <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${n.read ? 'bg-zinc-700' : 'bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400'}`}/>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-300">{n.text}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                      {!n.read && (<button onClick={() => authStore.markNotifRead(n.id)} className="rounded p-1 text-zinc-500 transition hover:bg-emerald-500/10 hover:text-emerald-400" title="Прочитать">
                          <Check size={13}/>
                        </button>)}
                      <button onClick={() => authStore.deleteNotif(n.id)} className="rounded p-1 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400" title="Удалить">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>)))}
            </div>
          </div>
        </>)}
    </div>);
};
