'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Droplets, Fuel,
  BarChart3, Settings, Save, AlertCircle, CheckCircle2, Clock, Plus, Trash2, History, ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { can, PERMISSIONS } from '@/lib/permissions';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Types ──
interface MetricsData {
  period: string; startDate: string; endDate: string;
  totalSteamProduced: number; totalSteamTonnes: number;
  totalWaterConsumed: number; totalFuelByType: Record<string, number>; totalFuelAll: number;
  steamToFuelRatio: number; costPerTonne: number; waterPerTonneSteam: number;
  totalFuelCost: number; totalWaterCost: number; totalMaintenanceCost: number; totalOperationalCost: number;
  fuelCostBreakdown: Array<{ fuelType: string; consumed: number; unit: string; pricePerUnit: number; cost: number }>;
  revenue: number; grossMargin: number; marginPercent: number; breakEvenRatio: number;
  steamPrice: number; steamUnit: string; waterPrice: number; waterUnit: string;
  steamProductionTrend: Array<{ date: string; steam: number }>;
  steamToFuelTrend: Array<{ date: string; ratio: number }>;
  costBreakdown: Array<{ name: string; value: number; color: string }>;
  dailyFuelEfficiency: Array<{ date: string; steam: number; fuel: number; ratio: number; water: number }>;
  dataPoints: { calculations: number; operationLogs: number };
}

interface FuelPrice {
  id?: string; fuelType: string; price: number; unit: string; updatedAt?: string;
}

interface PriceHistoryEntry {
  id: string; priceType: string; fuelType: string | null;
  oldPrice: number; newPrice: number; unit: string;
  changedBy: string | null; changedByName: string | null; createdAt: string;
}

interface PricingData {
  config: { steamPrice: number; steamUnit: string; waterPrice: number; waterUnit: string; updatedAt: string } | null;
  fuelPrices: FuelPrice[];
  fuelPriceHistories: PriceHistoryEntry[];
}

const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#eab308'];

const defaultMetrics: MetricsData = {
  period: 'month', startDate: '', endDate: '',
  totalSteamProduced: 0, totalSteamTonnes: 0, totalWaterConsumed: 0,
  totalFuelByType: {}, totalFuelAll: 0, steamToFuelRatio: 0, costPerTonne: 0, waterPerTonneSteam: 0,
  totalFuelCost: 0, totalWaterCost: 0, totalMaintenanceCost: 0, totalOperationalCost: 0,
  fuelCostBreakdown: [], revenue: 0, grossMargin: 0, marginPercent: 0, breakEvenRatio: 0,
  steamPrice: 0, steamUnit: 'tonne', waterPrice: 0, waterUnit: 'm3',
  steamProductionTrend: [], steamToFuelTrend: [], costBreakdown: [], dailyFuelEfficiency: [],
  dataPoints: { calculations: 0, operationLogs: 0 },
};

const defaultPricing: PricingData = { config: null, fuelPrices: [], fuelPriceHistories: [] };

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return 'KES ' + (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return 'KES ' + (amount / 1_000).toFixed(1) + 'K';
  return 'KES ' + amount.toFixed(0);
}

function formatNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals || 1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(decimals || 1) + 'K';
  return n.toFixed(decimals);
}

function TrendIndicator({ value, threshold = 0, inverse = false }: { value: number; threshold?: number; inverse?: boolean }) {
  if (Math.abs(value) < threshold) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const isGood = inverse ? value < 0 : value > 0;
  return isGood
    ? <TrendingUp className="h-4 w-4 text-forest" />
    : <TrendingDown className="h-4 w-4 text-critical" />;
}

// ── Custom Tooltip ──
function ChartTooltip({ active, payload, label, unit = '' }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(2)}{unit}
        </p>
      ))}
    </div>
  );
}

export function ExecutiveDashboard() {
  const { currentFactoryId, user } = useAppStore();
  const factoryRole = useAppStore((s) => s.getFactoryRole());
  const [metrics, setMetrics] = useState<MetricsData>(defaultMetrics);
  const [pricing, setPricing] = useState<PricingData>(defaultPricing);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('month');
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [showPricingPanel, setShowPricingPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canEditPricing = can(factoryRole, 'manageFactories'); // CEO/Manager only

  // Pricing form state
  const [editSteamPrice, setEditSteamPrice] = useState('');
  const [editWaterPrice, setEditWaterPrice] = useState('');
  const [editFuelPrices, setEditFuelPrices] = useState<FuelPrice[]>([]);
  const [newFuelType, setNewFuelType] = useState('');
  const [newFuelPrice, setNewFuelPrice] = useState('');

  const fetchMetrics = useCallback(() => {
    if (!currentFactoryId) return;
    setLoading(true);
    fetch('/api/executive-dashboard/metrics?factoryId=' + currentFactoryId + '&period=' + period)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setMetrics(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentFactoryId, period]);

  const fetchPricing = useCallback(() => {
    if (!currentFactoryId) return;
    fetch('/api/pricing/config?factoryId=' + currentFactoryId)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setPricing(data);
          setEditSteamPrice(data.config?.steamPrice?.toString() || '0');
          setEditWaterPrice(data.config?.waterPrice?.toString() || '0');
          setEditFuelPrices(data.fuelPrices || []);
        }
      })
      .catch(() => {});
  }, [currentFactoryId]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  const handleSavePricing = async () => {
    if (!currentFactoryId) return;
    setSavingPricing(true);
    setPricingSaved(false);
    try {
      const res = await fetch('/api/pricing/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: currentFactoryId,
          steamPrice: parseFloat(editSteamPrice) || 0,
          steamUnit: 'tonne',
          waterPrice: parseFloat(editWaterPrice) || 0,
          waterUnit: 'm3',
          fuelPrices: editFuelPrices.map((fp) => ({ fuelType: fp.fuelType, price: fp.price, unit: fp.unit })),
          changedBy: user?.id,
          changedByName: user?.name || user?.email,
        }),
      });
      if (res.ok) {
        setPricingSaved(true);
        setTimeout(() => setPricingSaved(false), 3000);
        fetchPricing();
        fetchMetrics(); // refresh with new prices
      }
    } catch {}
    setSavingPricing(false);
  };

  const addFuelRow = () => {
    if (!newFuelType.trim() || !newFuelPrice.trim()) return;
    setEditFuelPrices([...editFuelPrices, { fuelType: newFuelType.trim(), price: parseFloat(newFuelPrice) || 0, unit: 'litre' }]);
    setNewFuelType('');
    setNewFuelPrice('');
  };

  const removeFuelRow = (idx: number) => {
    setEditFuelPrices(editFuelPrices.filter((_, i) => i !== idx));
  };

  const allHistory = [
    ...pricing.fuelPriceHistories,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (<div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (<div key={i} className="h-72 bg-muted animate-pulse rounded-xl" />))}
        </div>
      </div>
    );
  }

  const hasData = metrics.dataPoints.calculations > 0 || metrics.dataPoints.operationLogs > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-forest" />
            Steam-as-a-Service Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Real cost and efficiency of steam production — profitability at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24h</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          {canEditPricing && (
            <Button variant="outline" size="sm" onClick={() => setShowPricingPanel(!showPricingPanel)}>
              <Settings className="h-4 w-4 mr-1.5" />
              Pricing
            </Button>
          )}
        </div>
      </div>

      {!hasData && (
        <Card className="border-amber-accent/30 bg-amber-accent/[0.04]">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-accent mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-accent text-sm">No Production Data Yet</p>
              <p className="text-muted-foreground text-xs mt-1">
                This dashboard requires Boiler Calculation records with steam generated and fuel consumption data. Please ensure calculations are being logged regularly from the Boiler Calculations page.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          ROW 1: HEADLINE KPI CARDS
          The two MOST PROMINENT numbers per the spec:
          1. Steam-to-Fuel Ratio  2. Cost per Tonne
          ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ── CARD 1: Steam Produced ── */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Steam Produced</p>
            <p className="text-2xl font-bold mt-1">{formatNumber(metrics.totalSteamTonnes, 1)} <span className="text-sm font-normal text-muted-foreground">t</span></p>
            <p className="text-xs text-muted-foreground mt-1">{formatNumber(metrics.totalSteamProduced, 0)} kg total</p>
          </CardContent>
          <div className="absolute top-3 right-3">
            <div className="bg-analytics/[0.07] p-2 rounded-lg"><Droplets className="h-4 w-4 text-analytics" /></div>
          </div>
        </Card>

        {/* ── CARD 2: Steam-to-Fuel Ratio (PROMINENT) ── */}
        <Card className="relative overflow-hidden border-2 border-forest/20 bg-forest/[0.03]">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground font-medium">Steam-to-Fuel Ratio</p>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-forest/[0.07] text-forest border-forest/20">KEY</Badge>
            </div>
            <p className="text-3xl font-black mt-1 text-forest">{metrics.steamToFuelRatio}</p>
            <p className="text-xs text-muted-foreground mt-1">kg steam per kg/L fuel</p>
          </CardContent>
          <div className="absolute top-3 right-3">
            <div className="bg-forest/[0.07] p-2 rounded-lg"><Fuel className="h-5 w-5 text-forest" /></div>
          </div>
        </Card>

        {/* ── CARD 3: Cost per Tonne (PROMINENT) ── */}
        <Card className="relative overflow-hidden border-2 border-amber-accent/30 bg-amber-accent/[0.03]">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground font-medium">Cost per Tonne</p>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-amber-accent/[0.07] text-amber-accent border-amber-accent/20">KEY</Badge>
            </div>
            <p className="text-3xl font-black mt-1 text-amber-accent">{formatCurrency(metrics.costPerTonne)}</p>
            <p className="text-xs text-muted-foreground mt-1">total operational cost / tonne steam</p>
          </CardContent>
          <div className="absolute top-3 right-3">
            <div className="bg-amber-accent/[0.07] p-2 rounded-lg"><DollarSign className="h-5 w-5 text-amber-accent" /></div>
          </div>
        </Card>

        {/* ── CARD 4: Margin ── */}
        <Card className={`relative overflow-hidden ${metrics.grossMargin >= 0 ? 'border-forest/20' : 'border-critical/20'}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Gross Margin</p>
            <p className={`text-2xl font-bold mt-1 ${metrics.grossMargin >= 0 ? 'text-forest' : 'text-critical'}`}>
              {formatCurrency(metrics.grossMargin)}
            </p>
            <p className={`text-xs mt-1 ${metrics.grossMargin >= 0 ? 'text-forest' : 'text-critical'}`}>
              {metrics.marginPercent}% margin &middot; Revenue: {formatCurrency(metrics.revenue)}
            </p>
          </CardContent>
          <div className="absolute top-3 right-3">
            <div className={`${metrics.grossMargin >= 0 ? 'bg-forest/[0.07]' : 'bg-critical/[0.07]'} p-2 rounded-lg`}>
              {metrics.grossMargin >= 0
                ? <TrendingUp className={`h-4 w-4 ${metrics.grossMargin >= 0 ? 'text-forest' : 'text-critical'}`} />
                : <TrendingDown className="h-4 w-4 text-critical" />}
            </div>
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════
          ROW 2: TREND CHARTS
          ══════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Steam Production Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Steam Production Trend</CardTitle>
            <CardDescription className="text-xs">Tonnes of steam produced over time</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {metrics.steamProductionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.steamProductionTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(-5)} />
                  <YAxis tick={{ fontSize: 10 }} unit=" t" />
                  <Tooltip content={<ChartTooltip unit=" t" />} />
                  <Line type="monotone" dataKey="steam" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Steam" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No trend data available</div>
            )}
          </CardContent>
        </Card>

        {/* Steam-to-Fuel Ratio Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Steam-to-Fuel Ratio Trend</CardTitle>
            <CardDescription className="text-xs">Efficiency indicator — declining trend signals scaling, fouling, or poor combustion</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {metrics.steamToFuelTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.steamToFuelTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(-5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="ratio" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="S/F Ratio" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No trend data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════
          ROW 3: COST BREAKDOWN + DERIVED METRICS
          ══════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Cost Breakdown Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cost Breakdown</CardTitle>
            <CardDescription className="text-xs">Operational cost by category</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.costBreakdown.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={metrics.costBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {metrics.costBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No cost data (set prices first)</div>
            )}
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Fuel Cost</span><span className="font-medium">{formatCurrency(metrics.totalFuelCost)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Total Water Cost</span><span className="font-medium">{formatCurrency(metrics.totalWaterCost)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Maintenance Cost</span><span className="font-medium">{formatCurrency(metrics.totalMaintenanceCost)}</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between text-xs font-medium"><span>Total Operational Cost</span><span>{formatCurrency(metrics.totalOperationalCost)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Fuel Cost Breakdown by Fuel Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fuel Consumption & Cost</CardTitle>
            <CardDescription className="text-xs">By fuel type</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.fuelCostBreakdown.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.fuelCostBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="fuelType" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="cost" fill="#f97316" radius={[0, 4, 4, 0]} name="Cost" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No fuel data</div>
            )}
            <div className="mt-3 space-y-1.5">
              {metrics.fuelCostBreakdown.map((fc, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{fc.fuelType}: {formatNumber(fc.consumed, 0)} {fc.unit} @ {formatCurrency(fc.pricePerUnit)}/{fc.unit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Derived / CEO Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Key Financials</CardTitle>
            <CardDescription className="text-xs">Calculated from operational data + pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Revenue (Steam Sold)</span>
                <span className="text-sm font-bold">{formatCurrency(metrics.revenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Cost</span>
                <span className="text-sm font-medium text-critical">-{formatCurrency(metrics.totalOperationalCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Gross Margin</span>
                <span className={`text-lg font-bold ${metrics.grossMargin >= 0 ? 'text-forest' : 'text-critical'}`}>
                  {formatCurrency(metrics.grossMargin)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Margin %</span>
                <Badge variant={metrics.marginPercent >= 0 ? 'default' : 'destructive'} className={metrics.marginPercent >= 0 ? 'bg-forest/[0.07] text-forest' : ''}>
                  {metrics.marginPercent}%
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Water per Tonne Steam</span>
                <span className="text-sm font-medium">{metrics.waterPerTonneSteam.toFixed(0)} L/t</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Break-even S/F Ratio</span>
                <span className="text-sm font-medium">{metrics.breakEvenRatio > 0 ? metrics.breakEvenRatio.toFixed(2) : 'N/A'}</span>
              </div>
              {metrics.breakEvenRatio > 0 && metrics.steamToFuelRatio > 0 && (
                <div className={`text-xs p-2 rounded-md ${metrics.steamToFuelRatio >= metrics.breakEvenRatio ? 'bg-forest/[0.07] text-forest' : 'bg-critical/[0.07] text-critical'}`}>
                  {metrics.steamToFuelRatio >= metrics.breakEvenRatio
                    ? 'Current efficiency is above break-even — profitable at current prices.'
                    : 'Current efficiency is below break-even — losing money at current prices.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════
          DAILY EFFICIENCY TABLE
          ══════════════════════════════════════════════════════ */}
      {metrics.dailyFuelEfficiency.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Daily Production & Efficiency</CardTitle>
            <CardDescription className="text-xs">Daily breakdown for the selected period — spot efficiency degradation early</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Date</th>
                    <th className="text-right py-2 px-2 font-medium">Steam (t)</th>
                    <th className="text-right py-2 px-2 font-medium">Fuel</th>
                    <th className="text-right py-2 px-2 font-medium">Water (L)</th>
                    <th className="text-right py-2 px-2 font-medium">S/F Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.dailyFuelEfficiency.slice().reverse().map((row, i) => {
                    const avgRatio = metrics.steamToFuelRatio;
                    const isBelowAvg = row.ratio > 0 && avgRatio > 0 && row.ratio < avgRatio * 0.85;
                    return (
                      <tr key={i} className={`border-b ${isBelowAvg ? 'bg-critical/[0.07]' : ''}`}>
                        <td className="py-2 px-2">{row.date}</td>
                        <td className="text-right py-2 px-2">{row.steam}</td>
                        <td className="text-right py-2 px-2">{formatNumber(row.fuel, 0)}</td>
                        <td className="text-right py-2 px-2">{formatNumber(row.water, 0)}</td>
                        <td className={`text-right py-2 px-2 font-medium ${isBelowAvg ? 'text-critical' : ''}`}>
                          {row.ratio}
                          {isBelowAvg && <AlertCircle className="inline h-3 w-3 ml-1" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════
          PRICING PANEL (CEO/Manager only)
          ══════════════════════════════════════════════════════ */}
      {canEditPricing && showPricingPanel && (
        <Card className="border-dashed border-2 border-forest/20 bg-forest/[0.03]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-forest" />
                  Pricing Configuration
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Set steam, water, and fuel prices. All changes are logged for audit. Past calculations use the price that was in effect at that time.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                  <History className="h-3.5 w-3.5 mr-1" /> History
                </Button>
                <Button size="sm" onClick={handleSavePricing} disabled={savingPricing} className="bg-forest hover:bg-forest">
                  <Save className="h-3.5 w-3.5 mr-1" /> {savingPricing ? 'Saving...' : 'Save Prices'}
                </Button>
              </div>
            </div>
            {pricingSaved && (
              <div className="flex items-center gap-1.5 text-forest text-xs mt-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Pricing updated and logged successfully.
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Steam & Water Prices */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Steam Price (per tonne)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KES</span>
                    <Input type="number" value={editSteamPrice} onChange={(e) => setEditSteamPrice(e.target.value)} className="pl-12 h-9 text-sm" />
                  </div>
                  <span className="flex items-center text-xs text-muted-foreground px-2">/ tonne</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Water Price (per m3)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KES</span>
                    <Input type="number" value={editWaterPrice} onChange={(e) => setEditWaterPrice(e.target.value)} className="pl-12 h-9 text-sm" />
                  </div>
                  <span className="flex items-center text-xs text-muted-foreground px-2">/ m3</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fuel Prices */}
            <div>
              <Label className="text-xs font-medium">Fuel Prices (per fuel type)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">Add pricing for each fuel type your plant uses.</p>
              <div className="space-y-2">
                {editFuelPrices.map((fp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={fp.fuelType} disabled className="h-9 text-sm w-28 bg-muted" />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KES</span>
                      <Input
                        type="number" value={fp.price || ''}
                        onChange={(e) => {
                          const updated = [...editFuelPrices];
                          updated[idx] = { ...updated[idx], price: parseFloat(e.target.value) || 0 };
                          setEditFuelPrices(updated);
                        }}
                        className="pl-12 h-9 text-sm"
                      />
                    </div>
                    <Select
                      value={fp.unit}
                      onValueChange={(v) => {
                        const updated = [...editFuelPrices];
                        updated[idx] = { ...updated[idx], unit: v };
                        setEditFuelPrices(updated);
                      }}
                    >
                      <SelectTrigger className="w-20 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="litre">/ litre</SelectItem>
                        <SelectItem value="kg">/ kg</SelectItem>
                        <SelectItem value="tonne">/ tonne</SelectItem>
                      </SelectContent>
                    </Select>
                    {canEditPricing && (
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-critical hover:text-critical" onClick={() => removeFuelRow(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new fuel type row */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed">
                <Input placeholder="e.g. Diesel" value={newFuelType} onChange={(e) => setNewFuelType(e.target.value)} className="h-9 text-sm w-28" />
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KES</span>
                  <Input type="number" placeholder="0" value={newFuelPrice} onChange={(e) => setNewFuelPrice(e.target.value)} className="pl-12 h-9 text-sm" />
                </div>
                <Button variant="outline" size="sm" className="h-9" onClick={addFuelRow} disabled={!newFuelType.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Price History */}
            {showHistory && allHistory.length > 0 && (
              <div className="mt-4">
                <Separator className="mb-4" />
                <p className="text-xs font-medium mb-2">Price Change History</p>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {allHistory.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 text-xs p-2 rounded bg-white border">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">{new Date(h.createdAt).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{h.priceType}{h.fuelType ? ': ' + h.fuelType : ''}</Badge>
                      <span className="line-through text-muted-foreground">{h.oldPrice}</span>
                      <span className="font-medium">{h.newPrice}</span>
                      <span className="text-muted-foreground">{h.unit}</span>
                      {h.changedByName && <span className="text-muted-foreground ml-auto">by {h.changedByName}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data footer */}
      <div className="text-xs text-muted-foreground text-center pb-2">
        {metrics.dataPoints.calculations} calculation records &middot; {metrics.dataPoints.operationLogs} operation logs &middot; Period: {metrics.startDate} to {metrics.endDate}
      </div>
    </div>
  );
}
