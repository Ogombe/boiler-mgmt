'use client';

import { useEffect, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, FileText, Wrench, AlertTriangle, CheckCircle2, Clock, Calculator, ClipboardCheck, FileBarChart, Package, Droplets, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { DashboardCharts } from './charts/DashboardCharts';

interface DashboardData {
  totalBoilers: number;
  todayLogCount: number;
  pendingMaintenance: number;
  completedMaintenance: number;
  overdueInspections: number;
  upcomingMaintenance: Array<{
    id: string; taskTitle: string; maintenanceType: string; frequency: string;
    nextDueDate: string | null; status: string; boiler: { name: string } | null;
  }>;
  recentInspections: Array<{
    id: string; inspectionType: string; inspectionDate: string; status: string;
    nextInspectionDate: string | null; boiler: { name: string } | null;
  }>;
  recentCalculations: Array<{
    id: string; calcDate: string; boilerEfficiency: string | null;
    boiler: { name: string } | null;
  }>;
}

interface LatestDailyReport {
  id: string;
  reportDate: string;
 waterConsumed: number | null;
  biomassConsumed: number | null;
  actualRatio: number | null;
  targetRatio: number | null;
  productionHours: number | null;
 steamGenerated: number | null;
 varianceRecorded: number | null;
 boiler: { name: string } | null;
 stockEntries: Array<{ fuelType: string; consumedQty: number | null; closingQty: number | null }>;
}

interface LowStockItem {
  fuelType: string;
  currentQty: number;
  lowStockThreshold: number;
}

const defaultData: DashboardData = {
  totalBoilers: 0, todayLogCount: 0, pendingMaintenance: 0,
  completedMaintenance: 0, overdueInspections: 0,
  upcomingMaintenance: [], recentInspections: [], recentCalculations: [],
};

export function Dashboard() {
  const { currentFactoryId } = useAppStore();
  const [data, setData] = useState<DashboardData>(defaultData);
  const [latestReport, setLatestReport] = useState<LatestDailyReport | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentFactoryId) return;
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      fetch(`/api/dashboard?factoryId=${currentFactoryId}`).then(r => r.json()),
      fetch(`/api/daily-reports?factoryId=${currentFactoryId}&date=${today}`).then(r => r.json()),
      fetch(`/api/fuel-stock?factoryId=${currentFactoryId}`).then(r => r.json()),
    ])
      .then(([dashData, reports, stockData]) => {
        setData(dashData);
        const reportList = Array.isArray(reports) ? reports : [];
        if (reportList.length > 0) setLatestReport(reportList[0]);
        const stocks = stockData?.stocks || [];
        setLowStockItems(stocks.filter((s: { lowStockThreshold: number | null; currentQty: number }) => s.lowStockThreshold != null && s.currentQty <= s.lowStockThreshold));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentFactoryId]);

  const stats = [
    { label: 'Active Boilers', value: data.totalBoilers, icon: Flame, color: 'text-forest', bg: 'bg-forest/[0.07]', border: 'border-forest/[0.12]' },
    { label: "Today's Log Entries", value: data.todayLogCount, icon: FileText, color: 'text-analytics', bg: 'bg-analytics/[0.07]', border: 'border-analytics/[0.12]' },
    { label: 'Pending Maintenance', value: data.pendingMaintenance, icon: Wrench, color: 'text-amber-accent', bg: 'bg-amber-accent/[0.07]', border: 'border-amber-accent/[0.12]' },
    { label: 'Overdue Inspections', value: data.overdueInspections, icon: AlertTriangle, color: 'text-critical', bg: 'bg-critical/[0.07]', border: 'border-critical/[0.12]' },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (<div key={i} className="h-32 bg-secondary animate-pulse rounded-xl" />))}
        </div>
        <div className="h-64 bg-secondary animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="font-display text-[26px] font-semibold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
          Overview of boiler operations, maintenance, and compliance status.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="rounded-xl border-border/60 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                    <p className="text-[28px] font-metric font-semibold mt-2 tracking-tight text-foreground">{s.value}</p>
                  </div>
                  <div className={`${s.bg} ${s.border} border p-2.5 rounded-xl`}>
                    <Icon className={`h-5 w-5 ${s.color}`} strokeWidth={1.5} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DashboardCharts />

      {/* Latest Daily Report Summary */}
      {latestReport && (
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2"><FileBarChart className="h-4 w-4 text-forest" strokeWidth={1.5} />Latest Daily Report</CardTitle>
            <CardDescription className="text-xs">{latestReport.reportDate} &middot; {latestReport.boiler?.name || 'All Boilers'}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Water</p>
                <p className="text-base font-metric font-semibold mt-1">{latestReport.waterConsumed != null ? latestReport.waterConsumed.toLocaleString() : '—'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Biomass</p>
                <p className="text-base font-metric font-semibold mt-1">{latestReport.biomassConsumed != null ? latestReport.biomassConsumed.toLocaleString() : '—'}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ratio (A/T)</p>
                <p className="text-base font-metric font-semibold mt-1">
                  <span className={latestReport.actualRatio != null && latestReport.targetRatio != null && latestReport.actualRatio > latestReport.targetRatio ? 'text-critical' : 'text-forest'}>{latestReport.actualRatio ?? '—'}</span>
                  <span className="text-muted-foreground">/{latestReport.targetRatio ?? '—'}</span>
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Production</p>
                <p className="text-base font-metric font-semibold mt-1">{latestReport.productionHours ?? '—'} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="rounded-xl border-critical/30 bg-critical/[0.02]">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-critical" strokeWidth={1.5} />Low Stock Alerts</CardTitle>
            <CardDescription className="text-xs">Fuel stock below threshold</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              {lowStockItems.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-critical/[0.05]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-critical" />
                    <span className="text-[13px] font-medium">{s.fuelType}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-metric font-semibold text-critical">{s.currentQty.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">/ {s.lowStockThreshold.toLocaleString()} threshold</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-accent" strokeWidth={1.5} />Upcoming Maintenance</CardTitle>
            <CardDescription className="text-xs">Pending maintenance tasks due soon</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {data.upcomingMaintenance.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-forest/30" /><p className="text-sm">No pending maintenance tasks</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {data.upcomingMaintenance.map((m) => (
                  <div key={m.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{m.taskTitle}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.boiler?.name || 'N/A'} &middot; {m.maintenanceType} &middot; {m.frequency}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <Badge variant="outline" className="text-[10px] font-medium">{m.status}</Badge>
                      {m.nextDueDate && (<span className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1"><Clock className="h-3 w-3" />{m.nextDueDate}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-analytics" strokeWidth={1.5} />Inspection Status</CardTitle>
            <CardDescription className="text-xs">Recent and upcoming inspections</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {data.recentInspections.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" strokeWidth={1.5} /><p className="text-sm">No inspection records yet</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {data.recentInspections.map((insp) => (
                  <div key={insp.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{insp.inspectionType}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{insp.boiler?.name || 'N/A'} &middot; {insp.inspectionDate}</p>
                    </div>
                    <Badge variant={insp.status === 'Passed' ? 'default' : 'outline'} className="text-[10px] font-medium shrink-0">{insp.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2"><Calculator className="h-4 w-4 text-forest" strokeWidth={1.5} />Recent Calculations</CardTitle>
            <CardDescription className="text-xs">Latest boiler efficiency calculations</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {data.recentCalculations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calculator className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" strokeWidth={1.5} /><p className="text-sm">No calculations recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {data.recentCalculations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                    <div><p className="text-[13px] font-medium">{c.boiler?.name || 'N/A'}</p><p className="text-[11px] text-muted-foreground">{c.calcDate}</p></div>
                    {c.boilerEfficiency && (
                      <div className="text-right">
                        <p className="text-lg font-metric font-semibold text-forest">{c.boilerEfficiency}%</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Efficiency</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-[14px] font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-forest" strokeWidth={1.5} />Maintenance Summary</CardTitle>
            <CardDescription className="text-xs">Completed vs. pending tasks</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-5 pt-1">
              <div>
                <div className="flex justify-between text-[13px] mb-2"><span className="text-muted-foreground">Completed</span><span className="font-metric font-medium">{data.completedMaintenance}</span></div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-forest rounded-full transition-all duration-500" style={{ width: data.completedMaintenance + data.pendingMaintenance > 0 ? `${(data.completedMaintenance / (data.completedMaintenance + data.pendingMaintenance)) * 100}%` : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px] mb-2"><span className="text-muted-foreground">Pending</span><span className="font-metric font-medium">{data.pendingMaintenance}</span></div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-amber-accent rounded-full transition-all duration-500" style={{ width: data.completedMaintenance + data.pendingMaintenance > 0 ? `${(data.pendingMaintenance / (data.completedMaintenance + data.pendingMaintenance)) * 100}%` : '0%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}