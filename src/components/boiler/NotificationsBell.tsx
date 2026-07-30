'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAppStore, type NotificationInfo } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

const pColors: Record<string, string> = {
  critical: 'bg-critical', high: 'bg-forest', medium: 'bg-amber-accent', low: 'bg-muted-foreground',
};

export function NotificationsBell() {
  const { currentFactoryId, setUnreadCount } = useAppStore();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationInfo[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentFactoryId) return;
    (async () => {
      try {
        const r = await fetch(`/api/notifications?factoryId=${currentFactoryId}`);
        const c = r.headers.get('X-Unread-Count');
        if (c) { const n = parseInt(c); setUnread(n); setUnreadCount(n); }
        setNotifs(await r.json());
      } catch {}
    })();
  }, [currentFactoryId, setUnreadCount]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markRead = async (id: string) => {
    await fetch('/api/notifications/mark-read', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setNotifs(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
    const nu = Math.max(0, unread - 1); setUnread(nu); setUnreadCount(nu);
  };

  const markAll = async () => {
    if (!currentFactoryId) return;
    await fetch('/api/notifications/mark-read', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true, factoryId: currentFactoryId }) });
    setNotifs(p => p.map(n => ({ ...n, isRead: true })));
    setUnread(0); setUnreadCount(0);
  };

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-critical text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl border border-border/60 shadow-xl shadow-black/[0.08] z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-forest hover:underline">Mark all read</button>}
          </div>
          <ScrollArea className="max-h-96">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm"><Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />No notifications</div>
            ) : notifs.map(n => (
              <div key={n.id} className={cn('flex gap-2.5 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/60 cursor-pointer transition-colors duration-150', !n.isRead && 'bg-forest/[0.04]')} onClick={() => markRead(n.id)}>
                <div className={cn('w-1 rounded-full shrink-0 mt-0.5', pColors[n.priority] || 'bg-muted-foreground')} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[13px]', !n.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
