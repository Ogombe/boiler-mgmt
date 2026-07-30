'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, FileBarChart, Search, CalendarDays, Gauge, Droplets, Flame, Package, Beaker, Thermometer, TrendingDown, ArrowRight, AlertTriangle, ChevronDown, ChevronUp, X, Calculator,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { ExportButton } from '@/components/boiler/ExportButton';

// ─── Types ───

interface StockEntry {
  id?: string;
  fuelType: string;
  openingQty: string;
  addedQty: string;
  closingQty: string;
  consumedQty: string;
}

interface DailyReportData {
  id: string;
  factoryId: string;
  reportDate: string;
  boilerId: string | null;
  productionHours: number | null;
  forceOutageHours: number | null;
  waterConsumed: number | null;
  biomassConsumed: number | null;
  actualRatio: number | null;
  targetRatio: number | null;
  steamGenerated: number | null;
  waterMeterInitial: string | null;
  waterMeterFinal: string | null;
  returnMeterInitial: string | null;
  returnMeterFinal: string | null;
  steamMeterInitial: string | null;
  steamMeterFinal: string | null;
  lbmsRecorded: number | null;
  manualRecorded: number | null;
  varianceRecorded: number | null;
  varianceCause: string | null;
  fwTemperature: number | null;
  fwPh: number | null;
  fwTds: number | null;
  fwHardness: number | null;
  bwTemperature: number | null;
  bwPh: number | null;
  bwTds: number | null;
  bwHardness: number | null;
  ashContent: number | null;
  avgMoisture: string | null;
  flueGasTemp: number | null;
  remarks: string | null;
  operatorName: string | null;
  boiler?: { id: string; name: string; capacity: string | null } | null;
  stockEntries: StockEntry[];
}

interface Boiler { id: string; name: string; capacity?: string | null; }

// ─── Fuel Types ───

const BIOMASS_FUELS = [
  'PW (Plywood Waste)',
  'OFC (Off-cut/Firewood)',
  'MC (Macadamia/Coffee)',
  'Pellets',
  'Coffee Husk',
  'Maize Cob',
  'LB (Lump Briquettes)',
  'Briquettes',
  'Macadamia Shell',
  'Sawdust',
  'Bagasse',
  'Coal',
];

const OTHER_FUELS = [
  'HFO (Heavy Fuel Oil)',
  'Diesel',
  'LPG',
  'Natural Gas',
];

const ALL_FUELS = [...BIOMASS_FUELS, ...OTHER_FUELS];

// Short names for display
const FUEL_SHORT: Record<string, string> = {
  'PW (Plywood Waste)': 'PW',
  'OFC (Off-cut/Firewood)': 'OFC',
  'MC (Macadamia/Coffee)': 'MC',
  'Pellets': 'Pellets',
  'Coffee Husk': 'C. Husk',
  'Maize Cob': 'M. Cob',
  'LB (Lump Briquettes)': 'LB',
  'Briquettes': 'Briquettes',
  'Macadamia Shell': 'M. Shell',
  'Sawdust': 'Sawdust',
  'Bagasse': 'Bagasse',
  'Coal': 'Coal',
  'HFO (Heavy Fuel Oil)': 'HFO',
  'Diesel': 'Diesel',
  'LPG': 'LPG',
  'Natural Gas': 'Gas',
};

// ─── Empty States ───

function emptyStockEntry(fuelType: string): StockEntry {
  return { fuelType, openingQty: '', addedQty: '', closingQty: '', consumedQty: '' };
}

const emptyForm = {
  reportDate: new Date().toISOString().split('T')[0],
  boilerId: '',
  productionHours: '',
  forceOutageHours: '',
  waterConsumed: '',
  biomassConsumed: '',
  actualRatio: '',
  targetRatio: '',
  steamGenerated: '',
  waterMeterInitial: '',
  waterMeterFinal: '',
  returnMeterInitial: '',
  returnMeterFinal: '',
  steamMeterInitial: '',
  steamMeterFinal: '',
  lbmsRecorded: '',
  manualRecorded: '',
  varianceRecorded: '',
  varianceCause: '',
  fwTemperature: '',
  fwPh: '',
  fwTds: '',
  fwHardness: '',
  bwTemperature: '',
  bwPh: '',
  bwTds: '',
  bwHardness: '',
  ashContent: '',
  avgMoisture: '',
  flueGasTemp: '',
  remarks: '',
  operatorName: '',
  stockEntries: [] as StockEntry[],
};

// ─── Component ───

export function DailyReportPage() {
  const { currentFactoryId } = useAppStore();
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyReportData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    if (!currentFactoryId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/daily-reports?factoryId=${currentFactoryId}&date=${filterDate}`).then(r => r.json()),
      fetch(`/api/boilers?factoryId=${currentFactoryId}`).then(r => r.json()),
    ])
      .then(([reportsData, boilersData]) => {
        setReports(Array.isArray(reportsData) ? reportsData : []);
        setBoilers(Array.isArray(boilersData) ? boilersData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterDate, currentFactoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Form Helpers ───

  const updateField = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const addStockRow = (fuelType: string) => {
    if (form.stockEntries.some(e => e.fuelType === fuelType)) {
      toast({ title: 'Already added', description: `${fuelType} is already in the stock list.` });
      return;
    }
    setForm(f => ({ ...f, stockEntries: [...f.stockEntries, emptyStockEntry(fuelType)] }));
  };

  const removeStockRow = (idx: number) => {
    setForm(f => ({ ...f, stockEntries: f.stockEntries.filter((_, i) => i !== idx) }));
  };

  const updateStockField = (idx: number, field: keyof StockEntry, value: string) => {
    setForm(f => {
      const updated = [...f.stockEntries];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, stockEntries: updated };
    });
  };

  // Auto-calculate water consumed from meter readings
  const calcWaterFromMeter = () => {
    const initial = parseFloat(form.waterMeterInitial);
    const final = parseFloat(form.waterMeterFinal);
    if (!isNaN(initial) && !isNaN(final) && final > initial) {
      const consumed = final - initial;
      setForm(f => ({ ...f, waterConsumed: String(consumed) }));
      toast({ title: 'Water Calculated', description: `Water consumed: ${consumed.toLocaleString()} lts` });
    }
  };

  // Auto-calculate steam from meter readings
  const calcSteamFromMeter = () => {
    const initial = parseFloat(form.steamMeterInitial);
    const final = parseFloat(form.steamMeterFinal);
    if (!isNaN(initial) && !isNaN(final) && final > initial) {
      const steam = final - initial;
      setForm(f => ({ ...f, steamGenerated: String(steam) }));
      toast({ title: 'Steam Calculated', description: `Steam generated: ${steam.toLocaleString()} kgs` });
    }
  };

  // Auto-calculate variance
  const calcVariance = () => {
    const manual = parseFloat(form.manualRecorded);
    const lbms = parseFloat(form.lbmsRecorded);
    if (!isNaN(manual) && !isNaN(lbms)) {
      const variance = manual - lbms;
      setForm(f => ({ ...f, varianceRecorded: String(Math.abs(variance)) }));
    }
  };

  // Auto-calculate total consumed stock
  const totalConsumed = form.stockEntries.reduce((sum, e) => sum + (parseFloat(e.consumedQty) || 0), 0);
  const totalOpening = form.stockEntries.reduce((sum, e) => sum + (parseFloat(e.openingQty) || 0), 0);
  const totalClosing = form.stockEntries.reduce((sum, e) => sum + (parseFloat(e.closingQty) || 0), 0);
  const totalAdded = form.stockEntries.reduce((sum, e) => sum + (parseFloat(e.addedQty) || 0), 0);

  // ─── Submit ───

  const handleSubmit = async () => {
    if (!currentFactoryId) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        factoryId: currentFactoryId,
        reportDate: form.reportDate,
        boilerId: form.boilerId || null,
        productionHours: form.productionHours ? parseFloat(form.productionHours) : null,
        forceOutageHours: form.forceOutageHours ? parseFloat(form.forceOutageHours) : null,
        waterConsumed: form.waterConsumed ? parseFloat(form.waterConsumed) : null,
        biomassConsumed: form.biomassConsumed ? parseFloat(form.biomassConsumed) : null,
        actualRatio: form.actualRatio ? parseFloat(form.actualRatio) : null,
        targetRatio: form.targetRatio ? parseFloat(form.targetRatio) : null,
        steamGenerated: form.steamGenerated ? parseFloat(form.steamGenerated) : null,
        waterMeterInitial: form.waterMeterInitial || null,
        waterMeterFinal: form.waterMeterFinal || null,
        returnMeterInitial: form.returnMeterInitial || null,
        returnMeterFinal: form.returnMeterFinal || null,
        steamMeterInitial: form.steamMeterInitial || null,
        steamMeterFinal: form.steamMeterFinal || null,
        lbmsRecorded: form.lbmsRecorded ? parseFloat(form.lbmsRecorded) : null,
        manualRecorded: form.manualRecorded ? parseFloat(form.manualRecorded) : null,
        varianceRecorded: form.varianceRecorded ? parseFloat(form.varianceRecorded) : null,
        varianceCause: form.varianceCause || null,
        fwTemperature: form.fwTemperature ? parseFloat(form.fwTemperature) : null,
        fwPh: form.fwPh ? parseFloat(form.fwPh) : null,
        fwTds: form.fwTds ? parseFloat(form.fwTds) : null,
        fwHardness: form.fwHardness ? parseFloat(form.fwHardness) : null,
        bwTemperature: form.bwTemperature ? parseFloat(form.bwTemperature) : null,
        bwPh: form.bwPh ? parseFloat(form.bwPh) : null,
        bwTds: form.bwTds ? parseFloat(form.bwTds) : null,
        bwHardness: form.bwHardness ? parseFloat(form.bwHardness) : null,
        ashContent: form.ashContent ? parseFloat(form.ashContent) : null,
        avgMoisture: form.avgMoisture || null,
        flueGasTemp: form.flueGasTemp ? parseFloat(form.flueGasTemp) : null,
        remarks: form.remarks || null,
        operatorName: form.operatorName || null,
        stockEntries: form.stockEntries.map(e => ({
          fuelType: e.fuelType,
          openingQty: e.openingQty ? parseFloat(e.openingQty) : null,
          addedQty: e.addedQty ? parseFloat(e.addedQty) : null,
          closingQty: e.closingQty ? parseFloat(e.closingQty) : null,
          consumedQty: e.consumedQty ? parseFloat(e.consumedQty) : null,
        })),
      };

      const res = await fetch('/api/daily-reports', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });

      if (res.ok) {
        toast({ title: editing ? 'Report Updated' : 'Report Created', description: `Daily report for ${form.reportDate} saved successfully.` });
        setOpen(false); setEditing(null); setForm(emptyForm); fetchData();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to save report.', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this daily report? This will also remove its stock entries.')) return;
    await fetch(`/api/daily-reports?id=${id}`, { method: 'DELETE' });
    toast({ title: 'Deleted', description: 'Daily report removed.' });
    fetchData();
  };

  const startEdit = (report: DailyReportData) => {
    setEditing(report);
    setForm({
      reportDate: report.reportDate,
      boilerId: report.boilerId || '',
      productionHours: report.productionHours != null ? String(report.productionHours) : '',
      forceOutageHours: report.forceOutageHours != null ? String(report.forceOutageHours) : '',
      waterConsumed: report.waterConsumed != null ? String(report.waterConsumed) : '',
      biomassConsumed: report.biomassConsumed != null ? String(report.biomassConsumed) : '',
      actualRatio: report.actualRatio != null ? String(report.actualRatio) : '',
      targetRatio: report.targetRatio != null ? String(report.targetRatio) : '',
      steamGenerated: report.steamGenerated != null ? String(report.steamGenerated) : '',
      waterMeterInitial: report.waterMeterInitial || '',
      waterMeterFinal: report.waterMeterFinal || '',
      returnMeterInitial: report.returnMeterInitial || '',
      returnMeterFinal: report.returnMeterFinal || '',
      steamMeterInitial: report.steamMeterInitial || '',
      steamMeterFinal: report.steamMeterFinal || '',
      lbmsRecorded: report.lbmsRecorded != null ? String(report.lbmsRecorded) : '',
      manualRecorded: report.manualRecorded != null ? String(report.manualRecorded) : '',
      varianceRecorded: report.varianceRecorded != null ? String(report.varianceRecorded) : '',
      varianceCause: report.varianceCause || '',
      fwTemperature: report.fwTemperature != null ? String(report.fwTemperature) : '',
      fwPh: report.fwPh != null ? String(report.fwPh) : '',
      fwTds: report.fwTds != null ? String(report.fwTds) : '',
      fwHardness: report.fwHardness != null ? String(report.fwHardness) : '',
      bwTemperature: report.bwTemperature != null ? String(report.bwTemperature) : '',
      bwPh: report.bwPh != null ? String(report.bwPh) : '',
      bwTds: report.bwTds != null ? String(report.bwTds) : '',
      bwHardness: report.bwHardness != null ? String(report.bwHardness) : '',
      ashContent: report.ashContent != null ? String(report.ashContent) : '',
      avgMoisture: report.avgMoisture || '',
      flueGasTemp: report.flueGasTemp != null ? String(report.flueGasTemp) : '',
      remarks: report.remarks || '',
      operatorName: report.operatorName || '',
      stockEntries: (report.stockEntries || []).map(e => ({
        id: e.id,
        fuelType: e.fuelType,
        openingQty: e.openingQty != null ? String(e.openingQty) : '',
        addedQty: e.addedQty != null ? String(e.addedQty) : '',
        closingQty: e.closingQty != null ? String(e.closingQty) : '',
        consumedQty: e.consumedQty != null ? String(e.consumedQty) : '',
      })),
    });
    setOpen(true);
  };

  // ─── Render Helpers ───

  const fmt = (v: number | string | null | undefined, unit?: string) => {
    if (v == null || v === '') return '—';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(n)) return '—';
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
  };

  // ─── Form Dialog Content ───

  const FormContent = () => (
    <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      {/* Date & Boiler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={form.reportDate} onChange={e => updateField('reportDate', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Boiler</Label>
          <Select value={form.boilerId} onValueChange={v => updateField('boilerId', v)}>
            <SelectTrigger><SelectValue placeholder="Select boiler" /></SelectTrigger>
            <SelectContent>{boilers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Operator Name</Label>
          <Input placeholder="Operator name" value={form.operatorName} onChange={e => updateField('operatorName', e.target.value)} />
        </div>
      </div>

      {/* Main Parameters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Gauge className="h-4 w-4 text-forest" /> Main Parameters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Production Hrs</Label>
            <Input type="number" step="0.1" placeholder="e.g. 24" value={form.productionHours} onChange={e => updateField('productionHours', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Force Outage Hrs</Label>
            <Input type="number" step="0.1" placeholder="0" value={form.forceOutageHours} onChange={e => updateField('forceOutageHours', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Water Consumed</Label>
            <Input type="number" placeholder="lts or m³" value={form.waterConsumed} onChange={e => updateField('waterConsumed', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Biomass Consumed</Label>
            <Input type="number" placeholder="kgs" value={form.biomassConsumed} onChange={e => updateField('biomassConsumed', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Actual Ratio</Label>
            <Input type="number" step="0.1" placeholder="e.g. 2.9" value={form.actualRatio} onChange={e => updateField('actualRatio', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Target Ratio</Label>
            <Input type="number" step="0.1" placeholder="e.g. 4.0" value={form.targetRatio} onChange={e => updateField('targetRatio', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Water Meter Readings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Droplets className="h-4 w-4 text-analytics" /> Water Meter Readings
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={calcWaterFromMeter}>
            <Calculator className="h-3 w-3" /> Auto-Calc Water
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Main Meter Initial</Label>
            <Input type="number" placeholder="e.g. 22559358" value={form.waterMeterInitial} onChange={e => updateField('waterMeterInitial', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Main Meter Final</Label>
            <Input type="number" placeholder="e.g. 22623149" value={form.waterMeterFinal} onChange={e => updateField('waterMeterFinal', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Water Consumed (calc)</Label>
            <Input value={form.waterConsumed || '—'} disabled className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Return Meter Initial</Label>
            <Input type="number" placeholder="e.g. 5860" value={form.returnMeterInitial} onChange={e => updateField('returnMeterInitial', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Return Meter Final</Label>
            <Input type="number" placeholder="e.g. 5860" value={form.returnMeterFinal} onChange={e => updateField('returnMeterFinal', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Steam Meter Readings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Thermometer className="h-4 w-4 text-critical" /> Steam Meter Readings
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={calcSteamFromMeter}>
            <Calculator className="h-3 w-3" /> Auto-Calc Steam
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Initial</Label>
            <Input type="number" placeholder="e.g. 23368754" value={form.steamMeterInitial} onChange={e => updateField('steamMeterInitial', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Final</Label>
            <Input type="number" placeholder="e.g. 23402272" value={form.steamMeterFinal} onChange={e => updateField('steamMeterFinal', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Steam Generated (calc)</Label>
            <Input value={form.steamGenerated || '—'} disabled className="bg-muted" />
          </div>
        </div>
      </div>

      {/* ─── Stock Management ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Package className="h-4 w-4 text-forest" /> Fuel Stock
          </div>
          <Select onValueChange={addStockRow}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="+ Add fuel type..." /></SelectTrigger>
            <SelectContent>
              {ALL_FUELS.filter(f => !form.stockEntries.some(e => e.fuelType === f)).map(f => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.stockEntries.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
            <Package className="h-6 w-6 mx-auto mb-2 opacity-30" />
            Click &quot;+ Add fuel type&quot; to add biomass fuels to track.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[11px] font-semibold">Fuel Type</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Opening (kgs)</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Added (kgs)</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Consumed (kgs)</TableHead>
                  <TableHead className="text-[11px] font-semibold text-right">Closing (kgs)</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.stockEntries.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs font-medium">{FUEL_SHORT[entry.fuelType] || entry.fuelType}</TableCell>
                    <TableCell><Input type="number" className="h-8 text-xs text-right" placeholder="0" value={entry.openingQty} onChange={e => updateStockField(idx, 'openingQty', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" className="h-8 text-xs text-right" placeholder="0" value={entry.addedQty} onChange={e => updateStockField(idx, 'addedQty', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" className="h-8 text-xs text-right" placeholder="0" value={entry.consumedQty} onChange={e => updateStockField(idx, 'consumedQty', e.target.value)} /></TableCell>
                    <TableCell><Input type="number" className="h-8 text-xs text-right" placeholder="0" value={entry.closingQty} onChange={e => updateStockField(idx, 'closingQty', e.target.value)} /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-critical" onClick={() => removeStockRow(idx)}><X className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
                {form.stockEntries.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell className="text-[11px]">TOTAL</TableCell>
                    <TableCell className="text-[11px] text-right font-metric">{fmt(totalOpening)}</TableCell>
                    <TableCell className="text-[11px] text-right font-metric">{fmt(totalAdded)}</TableCell>
                    <TableCell className="text-[11px] text-right font-metric">{fmt(totalConsumed)}</TableCell>
                    <TableCell className="text-[11px] text-right font-metric">{fmt(totalClosing)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Water Analysis */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Beaker className="h-4 w-4 text-analytics" /> Water Analysis
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Feed Water */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed Water</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Temperature (°C)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 79" value={form.fwTemperature} onChange={e => updateField('fwTemperature', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">pH</Label>
                <Input type="number" step="0.01" placeholder="e.g. 10.26" value={form.fwPh} onChange={e => updateField('fwPh', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">TDS (ppm)</Label>
                <Input type="number" placeholder="e.g. 114" value={form.fwTds} onChange={e => updateField('fwTds', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Hardness (ppm)</Label>
                <Input type="number" placeholder="e.g. 25" value={form.fwHardness} onChange={e => updateField('fwHardness', e.target.value)} />
              </div>
            </div>
          </div>
          {/* Boiler Water */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Boiler Water</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Temperature (°C)</Label>
                <Input type="number" step="0.1" placeholder="°C" value={form.bwTemperature} onChange={e => updateField('bwTemperature', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">pH</Label>
                <Input type="number" step="0.01" placeholder="pH" value={form.bwPh} onChange={e => updateField('bwPh', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">TDS (ppm)</Label>
                <Input type="number" placeholder="ppm" value={form.bwTds} onChange={e => updateField('bwTds', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Hardness (ppm)</Label>
                <Input type="number" placeholder="ppm" value={form.bwHardness} onChange={e => updateField('bwHardness', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Other Parameters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flame className="h-4 w-4 text-amber-accent" /> Other Parameters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Ash Content (kgs)</Label>
            <Input type="number" placeholder="kgs" value={form.ashContent} onChange={e => updateField('ashContent', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Avg Moisture (%)</Label>
            <Input placeholder="e.g. MC:22%, PW:high" value={form.avgMoisture} onChange={e => updateField('avgMoisture', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Flue Gas Temp (°C)</Label>
            <Input type="number" step="0.1" placeholder="e.g. 222" value={form.flueGasTemp} onChange={e => updateField('flueGasTemp', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Steam Generated (kgs)</Label>
            <Input type="number" placeholder="kgs" value={form.steamGenerated} onChange={e => updateField('steamGenerated', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <Label>Remarks</Label>
        <Textarea placeholder="Any observations, issues, or notes..." value={form.remarks} onChange={e => updateField('remarks', e.target.value)} rows={2} />
      </div>
    </div>
  );

  // ─── Report Detail Card ───

  const ReportCard = ({ report }: { report: DailyReportData }) => {
    const isExpanded = expandedReport === report.id;
    const hasStock = report.stockEntries && report.stockEntries.length > 0;
    const stockTotal = (report.stockEntries || []).reduce((s, e) => s + (typeof e.consumedQty === 'number' ? e.consumedQty : parseFloat(String(e.consumedQty)) || 0), 0);

    return (
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-3 px-5 pt-5 cursor-pointer" onClick={() => setExpandedReport(isExpanded ? null : report.id)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-forest/[0.07] border border-forest/[0.12] flex items-center justify-center">
                <FileBarChart className="h-4 w-4 text-forest" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">{report.reportDate}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {report.boiler?.name || 'All Boilers'}
                  {report.productionHours != null && ` · ${report.productionHours} hrs`}
                  {hasStock && ` · ${stockTotal.toLocaleString()} kgs consumed`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {report.actualRatio != null && (
                <Badge variant={report.actualRatio > (report.targetRatio || 4) ? 'destructive' : 'default'} className="text-[10px]">
                  Ratio: {report.actualRatio}
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="px-5 pb-5 space-y-5">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Water</p>
                <p className="text-lg font-metric font-semibold text-foreground mt-1">{fmt(report.waterConsumed)}</p>
                <p className="text-[10px] text-muted-foreground">consumed</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Biomass</p>
                <p className="text-lg font-metric font-semibold text-foreground mt-1">{fmt(report.biomassConsumed)}</p>
                <p className="text-[10px] text-muted-foreground">kgs consumed</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual / Target</p>
                <p className="text-lg font-metric font-semibold mt-1">
                  <span className={report.actualRatio != null && report.targetRatio != null && report.actualRatio > report.targetRatio ? 'text-critical' : 'text-forest'}>
                    {fmt(report.actualRatio)}
                  </span>
                  <span className="text-muted-foreground text-sm"> / {fmt(report.targetRatio)}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">ratio</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Steam</p>
                <p className="text-lg font-metric font-semibold text-foreground mt-1">{fmt(report.steamGenerated)}</p>
                <p className="text-[10px] text-muted-foreground">kgs generated</p>
              </div>
            </div>

            {/* Meter Readings */}
            {(report.waterMeterInitial || report.steamMeterInitial) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meter Readings</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {report.waterMeterInitial && <div className="bg-muted/50 rounded-lg p-2.5"><span className="text-muted-foreground">Water: </span>{report.waterMeterInitial} → {report.waterMeterFinal}</div>}
                  {report.returnMeterInitial && <div className="bg-muted/50 rounded-lg p-2.5"><span className="text-muted-foreground">Return: </span>{report.returnMeterInitial} → {report.returnMeterFinal}</div>}
                  {report.steamMeterInitial && <div className="bg-muted/50 rounded-lg p-2.5"><span className="text-muted-foreground">Steam: </span>{report.steamMeterInitial} → {report.steamMeterFinal}</div>}
                </div>
              </div>
            )}

            {/* Stock Table */}
            {hasStock && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fuel Stock</p>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-[11px]">Fuel</TableHead>
                        <TableHead className="text-[11px] text-right">Opening</TableHead>
                        <TableHead className="text-[11px] text-right">Added</TableHead>
                        <TableHead className="text-[11px] text-right">Consumed</TableHead>
                        <TableHead className="text-[11px] text-right">Closing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.stockEntries.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{FUEL_SHORT[e.fuelType] || e.fuelType}</TableCell>
                          <TableCell className="text-xs text-right font-metric">{fmt(e.openingQty)}</TableCell>
                          <TableCell className="text-xs text-right font-metric">{fmt(e.addedQty)}</TableCell>
                          <TableCell className="text-xs text-right font-metric">{fmt(e.consumedQty)}</TableCell>
                          <TableCell className="text-xs text-right font-metric">{fmt(e.closingQty)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Water Analysis */}
            {(report.fwPh != null || report.bwPh != null) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Water Analysis</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Feed Water</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {report.fwTemperature != null && <><span className="text-muted-foreground">Temp:</span><span>{fmt(report.fwTemperature, '°C')}</span></>}
                      {report.fwPh != null && <><span className="text-muted-foreground">pH:</span><span>{fmt(report.fwPh)}</span></>}
                      {report.fwTds != null && <><span className="text-muted-foreground">TDS:</span><span>{fmt(report.fwTds, 'ppm')}</span></>}
                      {report.fwHardness != null && <><span className="text-muted-foreground">Hardness:</span><span>{fmt(report.fwHardness, 'ppm')}</span></>}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Boiler Water</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {report.bwPh != null && <><span className="text-muted-foreground">pH:</span><span>{fmt(report.bwPh)}</span></>}
                      {report.bwTds != null && <><span className="text-muted-foreground">TDS:</span><span>{fmt(report.bwTds, 'ppm')}</span></>}
                      {report.bwHardness != null && <><span className="text-muted-foreground">Hardness:</span><span>{fmt(report.bwHardness, 'ppm')}</span></>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Params + Actions */}
            <div className="flex items-start justify-between gap-4">
              <div className="text-xs text-muted-foreground space-y-1">
                {report.ashContent != null && <p>Ash: {fmt(report.ashContent, 'kgs')}</p>}
                {report.avgMoisture && <p>Moisture: {report.avgMoisture}</p>}
                {report.flueGasTemp != null && <p>Flue Gas: {fmt(report.flueGasTemp, '°C')}</p>}
                {report.operatorName && <p>Operator: {report.operatorName}</p>}
                {report.remarks && <p className="mt-1 italic">{report.remarks}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); startEdit(report); }}>Edit</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-critical hover:text-critical" onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // ─── Main Render ───

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6" /> Daily Reports
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Complete daily boiler operation reports with stock tracking, meter readings, and water analysis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton factoryId={currentFactoryId || ''} dataType="daily-reports" />
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Daily Report</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Daily Report' : 'New Daily Report'}</DialogTitle>
              </DialogHeader>
              <FormContent />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                  {saving ? 'Saving...' : editing ? 'Update Report' : 'Save Report'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="rounded-xl border-border/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Filter by Date</Label>
            <Input type="date" className="w-44" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-secondary animate-pulse rounded-xl" />)}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No reports found for {filterDate}</p>
          <p className="text-xs mt-1">Click &quot;New Daily Report&quot; to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      )}
    </div>
  );
}
