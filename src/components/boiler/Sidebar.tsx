'use client';

import { useAppStore, type PageView } from '@/lib/store';
import {
  LayoutDashboard, FileText, Calculator, Droplets, Wrench,
  ClipboardCheck, FileBarChart, Flame, Building2, LogOut,
  Bell, Settings, BrainCircuit, MessageCircle, BarChart3, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotificationsBell } from '@/components/boiler/NotificationsBell';
import { PERMISSIONS, ROLE_DESCRIPTIONS } from '@/lib/permissions';

const navItems: { id: PageView; label: string; icon: React.ElementType; permission: keyof typeof PERMISSIONS }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'viewDashboard' },
  { id: 'executive-dashboard', label: 'Executive Dashboard', icon: BarChart3, permission: 'viewExecutiveDashboard' },
  { id: 'daily-reports', label: 'Daily Reports', icon: FileBarChart, permission: 'viewOperationLogs' },
  { id: 'operation-logs', label: 'Hourly Logs', icon: FileText, permission: 'viewOperationLogs' },
  { id: 'boilers', label: 'Boilers', icon: Flame, permission: 'manageBoilers' },
  { id: 'calculations', label: 'Boiler Calculations', icon: Calculator, permission: 'viewCalculations' },
  { id: 'water-chemistry', label: 'Water Chemistry', icon: Droplets, permission: 'viewWaterChemistry' },
  { id: 'maintenance', label: 'Maintenance Logs', icon: Wrench, permission: 'viewMaintenance' },
  { id: 'inspections', label: 'Inspection Records', icon: ClipboardCheck, permission: 'viewInspections' },
  { id: 'ai-insights', label: 'AI Insights', icon: BrainCircuit, permission: 'viewAIInsights' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: MessageCircle, permission: 'viewAIAssistant' },
  { id: 'reports', label: 'Reports', icon: FileBarChart, permission: 'viewReports' },
  { id: 'fuel-stock', label: 'Fuel Stock', icon: Package, permission: 'viewOperationLogs' },
  { id: 'factories', label: 'Factories & Users', icon: Building2, permission: 'manageFactories' },
  { id: 'settings', label: 'Settings', icon: Settings, permission: 'changePassword' },
];

export function Sidebar() {
  const { user, currentPage, setCurrentPage, factories, currentFactoryId, setCurrentFactoryId,
          setUser, setFactories, setShowLogin } = useAppStore();

  const factoryRole = useAppStore(s => s.getFactoryRole());

  const visibleNavItems = navItems.filter((item) => {
    return (PERMISSIONS[item.permission] as readonly string[]).includes(factoryRole);
  });

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('boiler_mgmt_auth');
    setUser(null);
    setFactories([]);
    setCurrentFactoryId(null);
    setShowLogin(true);
  };

  return (
    <aside className="hidden md:flex w-[272px] flex-col border-r border-border/60 bg-card min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-forest">
          <Flame className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-foreground">Boiler Management</h1>
          <p className="text-[11px] text-muted-foreground font-medium tracking-wide">Industrial Analytics</p>
        </div>
      </div>

      {/* Factory Selector */}
      <div className="px-4 pt-2 pb-1">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2">Active Factory</label>
        <Select value={currentFactoryId || ''} onValueChange={(v) => setCurrentFactoryId(v)}>
          <SelectTrigger className="w-full h-9 mt-1.5 bg-secondary/50 border-transparent rounded-lg">
            <Building2 className="h-3.5 w-3.5 mr-1.5 text-forest" />
            <SelectValue placeholder="Select factory..." />
          </SelectTrigger>
          <SelectContent>
            {factories.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <span className="flex items-center gap-2">
                  {f.name}
                  {f.city && <span className="text-muted-foreground text-xs">({f.city})</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notifications */}
      <div className="px-4 pt-2 flex justify-end"><NotificationsBell /></div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 text-left',
                isActive
                  ? 'bg-forest text-white shadow-sm shadow-forest/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2 : 1.5} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border/60 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <Avatar className="h-8 w-8 ring-2 ring-border">
            <AvatarFallback className="bg-forest/10 text-forest text-xs font-semibold">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate text-foreground">{user?.name || 'User'}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Badge variant="outline" className="text-[9px] h-5 shrink-0 font-medium border-border/80 text-muted-foreground">{factoryRole}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground px-1 truncate leading-relaxed">{ROLE_DESCRIPTIONS[factoryRole] || ''}</p>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-critical hover:bg-critical/5 gap-2 text-xs" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </Button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const { user, currentPage, setCurrentPage, factories, currentFactoryId, setCurrentFactoryId,
          setUser, setFactories, setShowLogin, unreadCount } = useAppStore();

  const factoryRole = useAppStore(s => s.getFactoryRole());
  const visibleNavItems = navItems.filter((item) => (PERMISSIONS[item.permission] as readonly string[]).includes(factoryRole));

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('boiler_mgmt_auth');
    setUser(null);
    setFactories([]);
    setCurrentFactoryId(null);
    setShowLogin(true);
  };

  return (
    <div className="md:hidden sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-forest">
            <Flame className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="font-display text-[15px] font-semibold tracking-tight">Boiler Mgmt</h1>
          {currentFactoryId && (
            <Select value={currentFactoryId} onValueChange={(v) => setCurrentFactoryId(v)}>
              <SelectTrigger className="h-7 w-auto text-[11px] border-transparent bg-secondary/50 p-0 px-2 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {factories.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="relative text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary transition-colors" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-critical text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-critical p-1.5 rounded-md hover:bg-critical/5 transition-colors" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex overflow-x-auto px-3 pb-2.5 gap-1.5 scrollbar-none">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all duration-200 shrink-0',
                isActive
                  ? 'bg-forest text-white shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
