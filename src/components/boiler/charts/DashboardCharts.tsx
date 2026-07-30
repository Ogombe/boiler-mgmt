'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/* ── Premium Chart Palette ── */
const COLORS = {
  pressure: '#1E3A5F',
  fuel: '#C48A1A',
  flueGas: '#B42318',
  steamTemp: '#1B4332',
  waterLevel: '#7C8F5B',
  efficiency: '#1E3A5F',
  stackLoss: '#B42318',
  radiationLoss: '#C48A1A',
  otherLoss: '#7C8F5B',
  o2: '#6366F1',
  co2: '#E11D48',
  feedWater: '#1E3A5F',
  boilerWater: '#B42318',
  completed: '#1B4332',
  pending: '#C48A1A',
  inProgress: '#1E3A5F',
  deferred: '#9CA3AF',
  preventive: '#1E3A5F',
  reactive: '#B42318',
  predictive: '#1B4332',
};

const PIE_COLORS = [COLORS.preventive, COLORS.reactive, COLORS.predictive, COLORS.deferred, COLORS.o2];
const STATUS_COLORS = [COLORS.completed, COLORS.pending, COLORS.inProgress, COLORS.deferred];

interface ChartData {
  operationalTrend: Array<{ date: string; steamPressure: number; fuelConsumption: number | null; flueGasTemp: number | null; steamTemp: number | null; waterLevel: number | null; }>;
  efficiencyTrend: Array<{ date: string; efficiency: number; stackLoss: number | null; radiationLoss: number | null; o2: number | null; co2: number | null; }>;
  maintenanceByStatus: Array<{ name: string; value: number }>;
  maintenanceByType: Array<{ name: string; value: number }>;
  maintenanceByFrequency: Array<{ name: string; value: number }>;
  phTrend: Array<{ date: string; feedWater: number | null; boilerWater: number | null; }>;
  conductivityTrend: Array<{ date: string; feedWater: number | null; boilerWater: number | null; }>;
  heatLossBreakdown: Array<{ date: string; stackLoss: number; radiationLoss: number; otherLosses: number; }>;
}

const emptyData: ChartData = {
  operationalTrend: [], efficiencyTrend: [], maintenanceByStatus: [],
  maintenanceByType: [], maintenanceByFrequency: [], phTrend: [],
  conductivityTrend: [], heatLossBreakdown: [],
};

const axisStyle = { fontSize: 10, fill: '#9CA3AF' };
const gridStyle = { stroke: '#F1F0ED', strokeDasharray: '4 4' };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border/80 rounded-xl px-4 py-3 shadow-lg shadow-black/[0.06] text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-2 py-0.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-metric font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-[13px] text-center px-8">
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

export function DashboardCharts() {
  const { currentFactoryId } = useAppStore();
  const [data, setData] = useState<ChartData>(emptyData);
  const [loading, setLoading] = useState(true);

  const fetchCharts = useCallback(() => {
    if (!currentFactoryId) return;
    fetch(`/api/dashboard/charts?factoryId=${currentFactoryId}`)
      .then((r) => r.json()).then((d) => setData(d.error ? emptyData : d))
      .catch(() => {}).finally(() => setLoading(false));
  }, [currentFactoryId]);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  const hasOpsData = data.operationalTrend.length > 0;
  const hasEffData = data.efficiencyTrend.length > 0;
  const hasMaintData = data.maintenanceByStatus.length > 0;
  const hasWaterData = data.phTrend.length > 0;
  const totalMaint = data.maintenanceByStatus.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-5">
      {/* Steam Pressure & Fuel */}
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Steam Pressure & Fuel Consumption Trend</CardTitle></CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (<div className="h-64 bg-secondary animate-pulse rounded-xl" />) : !hasOpsData ? (
            <EmptyChartState message="No operation log data yet. Record hourly logs to see pressure and fuel trends." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.operationalTrend} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.pressure} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={COLORS.pressure} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                <YAxis yAxisId="pressure" tick={axisStyle} tickLine={false} axisLine={false} label={{ value: 'bar', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9CA3AF' } }} />
                <YAxis yAxisId="fuel" orientation="right" tick={axisStyle} tickLine={false} axisLine={false} label={{ value: 'kg/hr', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#9CA3AF' } }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconSize={8} iconType="circle" />
                <Area yAxisId="pressure" type="monotone" dataKey="steamPressure" stroke={COLORS.pressure} strokeWidth={2} fill="url(#pressureGrad)" name="Steam Pressure (bar)" dot={{ r: 3, fill: COLORS.pressure }} activeDot={{ r: 5 }} />
                <Line yAxisId="fuel" type="monotone" dataKey="fuelConsumption" stroke={COLORS.fuel} strokeWidth={2} strokeDasharray="6 4" name="Fuel Consumption (kg/hr)" dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Efficiency + Flue Gas */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Boiler Efficiency Trend</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (<div className="h-52 bg-secondary animate-pulse rounded-xl" />) : !hasEffData ? (
              <EmptyChartState message="No calculation data yet. Record boiler calculations to track efficiency." />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={data.efficiencyTrend} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.efficiency} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={COLORS.efficiency} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9CA3AF' } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="efficiency" stroke={COLORS.efficiency} strokeWidth={2.5} fill="url(#effGrad)" name="Efficiency (%)" dot={{ r: 4, fill: COLORS.efficiency }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Flue Gas Temperature</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (<div className="h-52 bg-secondary animate-pulse rounded-xl" />) : !hasOpsData ? (
              <EmptyChartState message="No flue gas data. Track flue gas temp in hourly logs to monitor stack losses." />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={data.operationalTrend.filter((d) => d.flueGasTemp)} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9CA3AF' } }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="flueGasTemp" stroke={COLORS.flueGas} strokeWidth={2} name="Flue Gas Temp (°C)" dot={{ r: 3, fill: COLORS.flueGas }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Distribution */}
      <div className="grid md:grid-cols-3 gap-5">
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Maintenance by Status</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (<div className="h-48 bg-secondary animate-pulse rounded-xl" />) : !hasMaintData ? (
              <EmptyChartState message="No maintenance data recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart><Pie data={data.maintenanceByStatus} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                  {data.maintenanceByStatus.map((_, i) => (<Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />))}
                </Pie><Tooltip formatter={(v: number) => `${v} (${totalMaint > 0 ? ((v / totalMaint) * 100).toFixed(0) : 0}%)`} /><Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} iconType="circle" /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Maintenance by Type</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (<div className="h-48 bg-secondary animate-pulse rounded-xl" />) : !hasMaintData ? (
              <EmptyChartState message="No maintenance data recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <PieChart><Pie data={data.maintenanceByType} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                  {data.maintenanceByType.map((entry) => (<Cell key={entry.name} fill={entry.name === 'Preventive' ? COLORS.preventive : entry.name === 'Reactive' ? COLORS.reactive : COLORS.predictive} />))}
                </Pie><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} iconType="circle" /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Maintenance by Frequency</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (<div className="h-48 bg-secondary animate-pulse rounded-xl" />) : data.maintenanceByFrequency.length === 0 ? (
              <EmptyChartState message="No maintenance data recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={data.maintenanceByFrequency} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridStyle} horizontal={false} />
                  <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} fill={COLORS.efficiency} barSize={32}>
                    {data.maintenanceByFrequency.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Water pH + Heat Loss */}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Water pH Trend</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (<div className="h-52 bg-secondary animate-pulse rounded-xl" />) : !hasWaterData ? (
              <EmptyChartState message="No water chemistry data. Record water tests to monitor pH trends." />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={data.phTrend} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} domain={[0, 14]} label={{ value: 'pH', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9CA3AF' } }} />
                  <Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} iconType="circle" />
                  <Line type="monotone" dataKey="feedWater" stroke={COLORS.feedWater} strokeWidth={2} name="Feed Water pH" dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="boilerWater" stroke={COLORS.boilerWater} strokeWidth={2} name="Boiler Water pH" dot={{ r: 3 }} connectNulls strokeDasharray="6 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-2 px-5 pt-5"><CardTitle className="text-[14px] font-semibold">Heat Loss Breakdown</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (<div className="h-52 bg-secondary animate-pulse rounded-xl" />) : data.heatLossBreakdown.length === 0 ? (
              <EmptyChartState message="No calculation data. Record boiler calculations with heat loss values." />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data.heatLossBreakdown} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} label={{ value: '%', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#9CA3AF' } }} />
                  <Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} iconType="circle" />
                  <Bar dataKey="stackLoss" stackId="loss" fill={COLORS.stackLoss} name="Stack Loss (%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="radiationLoss" stackId="loss" fill={COLORS.radiationLoss} name="Radiation Loss (%)" />
                  <Bar dataKey="otherLosses" stackId="loss" fill={COLORS.otherLoss} name="Other Losses (%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}