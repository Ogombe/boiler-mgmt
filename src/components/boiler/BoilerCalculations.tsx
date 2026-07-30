'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Trash2, Calculator, Search, Flame, Cloud, Droplets, Table2, Wrench,
  Zap, TrendingUp, Gauge, Thermometer, Fuel, RotateCcw, Beaker, Pipette,
  ArrowRightLeft, CircleDot, ChevronRight, Info, CalculatorIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { ExportButton } from '@/components/boiler/ExportButton';
import { calcSteamTemp, steamTempFromPressure } from '@/lib/steam-utils';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

interface BoilerCalculation {
  id: string; boilerId: string | null; calcDate: string;
  steamPressure: string | null; steamTemp: string | null;
  feedwaterTemp: string | null; fuelType: string | null;
  fuelConsumption: string | null; steamGenerated: string | null;
  feedwaterUsed: string | null; boilerEfficiency: string | null;
  heatInput: string | null; heatOutput: string | null;
  evaporationRate: string | null; equivalentEvap: string | null;
  factorOfEvap: string | null; co2Percentage: string | null;
  o2Percentage: string | null; coPercentage: string | null;
  flueGasTemp: string | null; stackLoss: string | null;
  radiationLoss: string | null; otherLosses: string | null;
  remarks: string | null; calculatedBy: string | null;
  boiler?: { name: string } | null;
}

interface Boiler { id: string; name: string; }

interface ToolDef {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

interface GroupDef {
  id: string;
  name: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  border: string;
  bg: string;
  text: string;
  tools: ToolDef[];
}

/* ═══════════════════════════════════════════════════════════════════
   CALCULATOR GROUPS & TOOLS
   ═══════════════════════════════════════════════════════════════════ */

const GROUPS: GroupDef[] = [
  {
    id: 'boilers', name: 'Boilers', icon: Flame,
    gradient: 'from-forest to-red-500', accent: 'text-forest', border: 'border-forest/20', bg: 'bg-forest/[0.04]', text: 'text-forest',
    tools: [
      { id: 'boiler-efficiency', name: 'Boiler Efficiency', icon: TrendingUp, description: 'Direct & indirect method efficiency calculation' },
      { id: 'fa-rating', name: 'F&A Rating', icon: Gauge, description: 'From & At rating of a boiler' },
      { id: 'fuel-consumption', name: 'Fuel Consumption', icon: Fuel, description: 'Estimate fuel required for steam output' },
      { id: 'blowdown', name: 'Boiler Blowdown', icon: RotateCcw, description: 'Calculate blowdown rate from TDS levels' },
      { id: 'feed-tank', name: 'Feed Tank Calculations', icon: Beaker, description: 'Energy balance for feed water tank' },
      { id: 'fuel-properties', name: 'Fuel Properties', icon: Info, description: 'GCV, NCV, and fuel analysis reference' },
      { id: 'boiler-guidelines', name: 'Guidelines', icon: CalculatorIcon, description: 'Best practices and efficiency targets' },
    ],
  },
  {
    id: 'steam-dist', name: 'Steam Distribution', icon: Cloud,
    gradient: 'from-analytics to-sage', accent: 'text-analytics', border: 'border-analytics/20', bg: 'bg-analytics/[0.07]', text: 'text-analytics',
    tools: [
      { id: 'pipe-sizing', name: 'Pipe Sizing', icon: ArrowRightLeft, description: 'Steam pipe diameter from flow & velocity' },
      { id: 'prs-sizing', name: 'PRS Sizing', icon: Gauge, description: 'Pressure Reducing Station sizing' },
      { id: 'startup-losses', name: 'Startup Losses', icon: Zap, description: 'Heat lost warming up steam pipes' },
      { id: 'running-losses', name: 'Running Losses', icon: TrendingUp, description: 'Steady-state heat loss from pipework' },
      { id: 'heating-load', name: 'Heating Load', icon: Thermometer, description: 'Calculate heat required for a space or process' },
      { id: 'steam-leak', name: 'Steam Leak', icon: CircleDot, description: 'Estimate steam loss from an orifice' },
      { id: 'valve-selection', name: 'Valve Selection', icon: ArrowRightLeft, description: 'Select correct valve type for application' },
      { id: 'valve-kv', name: 'Valve Kv', icon: Gauge, description: 'Calculate flow coefficient (Kv/Cv)' },
      { id: 'trap-selection', name: 'Trap Selection', icon: Droplets, description: 'Choose the right steam trap' },
    ],
  },
  {
    id: 'condensate', name: 'Condensate Recovery', icon: Droplets,
    gradient: 'from-teal-500 to-emerald-500', accent: 'text-teal-600', border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-700',
    tools: [
      { id: 'flash-steam', name: 'Flash Steam', icon: Cloud, description: 'Flash steam percentage from pressure drop' },
      { id: 'condensate-pipe', name: 'Condensate Pipe Sizing', icon: Pipette, description: 'Pipe size for condensate return lines' },
      { id: 'fuel-savings-flash', name: 'Fuel Savings - Flash', icon: TrendingUp, description: 'Savings from flash steam recovery' },
      { id: 'fuel-savings-condensate', name: 'Fuel Savings - Condensate', icon: Fuel, description: 'Savings from condensate recovery' },
      { id: 'stall', name: 'Stall', icon: Gauge, description: 'Check for heat exchanger stall condition' },
    ],
  },
  {
    id: 'steam-tables', name: 'Steam Tables', icon: Table2,
    gradient: 'from-forest to-sage', accent: 'text-forest', border: 'border-forest/20', bg: 'bg-forest/[0.07]', text: 'text-forest',
    tools: [
      { id: 'sat-steam-table', name: 'Saturated Steam Table', icon: Table2, description: 'Properties of saturated steam by pressure' },
      { id: 'superheated-steam', name: 'Superheated Steam Table', icon: Thermometer, description: 'Properties of superheated steam' },
      { id: 'unit-conversions', name: 'Unit Conversions', icon: ArrowRightLeft, description: 'Convert between pressure, temp, energy, flow' },
    ],
  },
  {
    id: 'tech-tools', name: 'Technical Tools', icon: Wrench,
    gradient: 'from-muted-foreground to-gray-600', accent: 'text-muted-foreground', border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-foreground',
    tools: [
      { id: 'ip-ratings', name: 'IP Ratings', icon: Info, description: 'Ingress Protection classification reference' },
      { id: 'fluid-velocities', name: 'Fluid Velocities', icon: TrendingUp, description: 'Recommended velocities for pipes' },
      { id: 'pipe-specs', name: 'Standard Pipe Specifications', icon: ArrowRightLeft, description: 'Pipe sizes, schedules, and dimensions' },
      { id: 'material-specs', name: 'Material Specifications', icon: Beaker, description: 'Common material properties reference' },
      { id: 'volume-area', name: 'Volume & Surface Area', icon: CalculatorIcon, description: 'Calculate volumes and areas of shapes' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   FUEL PROPERTIES REFERENCE DATA
   ═══════════════════════════════════════════════════════════════════ */

const FUEL_DATA: Record<string, { gcv: number; ncv: number; unit: string; density: number; }> = {
  'Diesel':        { gcv: 45500, ncv: 42800, unit: 'kJ/kg',  density: 840 },
  'HFO':          { gcv: 42500, ncv: 40000, unit: 'kJ/kg',  density: 970 },
  'LFO':          { gcv: 44500, ncv: 41800, unit: 'kJ/kg',  density: 870 },
  'Natural Gas':  { gcv: 38900, ncv: 35100, unit: 'kJ/m³',  density: 0.8 },
  'LPG':          { gcv: 91000, ncv: 84000, unit: 'kJ/kg',  density: 550 },
  'Coal':         { gcv: 28000, ncv: 26500, unit: 'kJ/kg',  density: 1200 },
  'Biomass':      { gcv: 18000, ncv: 16000, unit: 'kJ/kg',  density: 400 },
  'Electric':     { gcv: 3600,  ncv: 3600,  unit: 'kJ/kWh', density: 0 },
};

/* Extended steam table with enthalpy data (approximate IAPWS) */
const SAT_STEAM_DATA: { p: number; t: number; hf: number; hfg: number; hg: number; sg: number; vg: number }[] = [
  { p: 1,   t: 120.2,  hf: 504.7,  hfg: 2201.6, hg: 2706.3, sg: 7.359, vg: 0.885 },
  { p: 2,   t: 133.5,  hf: 561.5,  hfg: 2163.8, hg: 2725.3, sg: 7.127, vg: 0.454 },
  { p: 3,   t: 143.6,  hf: 604.7,  hfg: 2133.0, hg: 2737.7, sg: 6.992, vg: 0.309 },
  { p: 5,   t: 158.8,  hf: 670.6,  hfg: 2086.3, hg: 2756.9, sg: 6.821, vg: 0.187 },
  { p: 7,   t: 170.4,  hf: 721.1,  hfg: 2050.0, hg: 2771.1, sg: 6.707, vg: 0.134 },
  { p: 10,  t: 184.1,  hf: 781.2,  hfg: 2000.0, hg: 2781.2, sg: 6.586, vg: 0.094 },
  { p: 14,  t: 198.3,  hf: 844.7,  hfg: 1947.3, hg: 2792.0, sg: 6.469, vg: 0.068 },
  { p: 17,  t: 207.2,  hf: 884.6,  hfg: 1912.0, hg: 2796.6, sg: 6.395, vg: 0.056 },
  { p: 20,  t: 215.0,  hf: 920.0,  hfg: 1880.0, hg: 2800.0, sg: 6.340, vg: 0.047 },
  { p: 25,  t: 226.0,  hf: 975.0,  hfg: 1834.0, hg: 2809.0, sg: 6.257, vg: 0.038 },
  { p: 30,  t: 235.8,  hf: 1025.0, hfg: 1794.0, hg: 2819.0, sg: 6.186, vg: 0.032 },
  { p: 40,  t: 253.0,  hf: 1101.0, hfg: 1725.0, hg: 2826.0, sg: 6.070, vg: 0.024 },
  { p: 50,  t: 266.9,  hf: 1163.0, hfg: 1671.0, hg: 2834.0, sg: 5.973, vg: 0.019 },
  { p: 60,  t: 279.0,  hf: 1213.0, hfg: 1627.0, hg: 2840.0, sg: 5.890, vg: 0.016 },
  { p: 80,  t: 297.9,  hf: 1305.0, hfg: 1557.0, hg: 2862.0, sg: 5.744, vg: 0.012 },
  { p: 100, t: 311.1, hf: 1376.0, hfg: 1502.0, hg: 2878.0, sg: 5.615, vg: 0.010 },
];

/* ═══════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════ */

function n(val: string | null | undefined): number {
  const v = parseFloat(String(val ?? ''));
  return Number.isFinite(v) ? v : 0;
}

function fmt(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(decimals);
}

function lookupSteam(pBarg: number) {
  let closest = SAT_STEAM_DATA[0];
  for (const row of SAT_STEAM_DATA) {
    if (row.p >= pBarg) { closest = row; break; }
    closest = row;
  }
  return closest;
}

function interpolateSteam(pBarg: number) {
  if (pBarg <= SAT_STEAM_DATA[0].p) return SAT_STEAM_DATA[0];
  if (pBarg >= SAT_STEAM_DATA[SAT_STEAM_DATA.length - 1].p) return SAT_STEAM_DATA[SAT_STEAM_DATA.length - 1];
  for (let i = 1; i < SAT_STEAM_DATA.length; i++) {
    if (pBarg <= SAT_STEAM_DATA[i].p) {
      const a = SAT_STEAM_DATA[i - 1], b = SAT_STEAM_DATA[i];
      const f = (pBarg - a.p) / (b.p - a.p);
      return {
        p: pBarg,
        t: a.t + f * (b.t - a.t),
        hf: a.hf + f * (b.hf - a.hf),
        hfg: a.hfg + f * (b.hfg - a.hfg),
        hg: a.hg + f * (b.hg - a.hg),
        sg: a.sg + f * (b.sg - a.sg),
        vg: a.vg + f * (b.vg - a.vg),
      };
    }
  }
  return SAT_STEAM_DATA[SAT_STEAM_DATA.length - 1];
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

const emptyForm = {
  calcDate: new Date().toISOString().split('T')[0], boilerId: '', steamPressure: '',
  steamTemp: '', feedwaterTemp: '', fuelType: 'Diesel', fuelConsumption: '',
  steamGenerated: '', feedwaterUsed: '', boilerEfficiency: '', heatInput: '',
  heatOutput: '', evaporationRate: '', equivalentEvap: '', factorOfEvap: '',
  co2Percentage: '', o2Percentage: '', coPercentage: '', flueGasTemp: '',
  stackLoss: '', radiationLoss: '', otherLosses: '', remarks: '', calculatedBy: '',
};

export function BoilerCalculations() {
  const [calcs, setCalcs] = useState<BoilerCalculation[]>([]);
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BoilerCalculation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [autoSteamTemp, setAutoSteamTemp] = useState(false);
  const { toast } = useToast();
  const { currentFactoryId } = useAppStore();

  // Tool calculator state
  const [activeGroup, setActiveGroup] = useState('boilers');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [toolInputs, setToolInputs] = useState<Record<string, string>>({});
  const [toolResults, setToolResults] = useState<Record<string, string>>({});
  const [toolCalcDone, setToolCalcDone] = useState(false);

  // ─── Fetch saved calculation records ───
  const fetchData = useCallback(() => {
    if (!currentFactoryId) return;
    Promise.all([
      fetch(`/api/calculations?factoryId=${currentFactoryId}`).then((r) => r.json()),
      fetch(`/api/boilers?factoryId=${currentFactoryId}`).then((r) => r.json()),
    ])
      .then(([cData, bData]) => {
        setCalcs(Array.isArray(cData) ? cData : []);
        setBoilers(Array.isArray(bData) ? bData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentFactoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Saved record CRUD ───
  const handleSubmit = async () => {
    const payload = { ...form, boilerId: form.boilerId || null, factoryId: currentFactoryId };
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...payload } : payload;
    const res = await fetch('/api/calculations', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { toast({ title: editing ? 'Updated' : 'Saved' }); setOpen(false); setEditing(null); setForm(emptyForm); fetchData(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    await fetch(`/api/calculations?id=${id}`, { method: 'DELETE' });
    toast({ title: 'Deleted' }); fetchData();
  };

  const startEdit = (calc: BoilerCalculation) => {
    setEditing(calc);
    setForm({
      calcDate: calc.calcDate, boilerId: calc.boilerId || '', steamPressure: calc.steamPressure || '',
      steamTemp: calc.steamTemp || '', feedwaterTemp: calc.feedwaterTemp || '',
      fuelType: calc.fuelType || 'Diesel', fuelConsumption: calc.fuelConsumption || '',
      steamGenerated: calc.steamGenerated || '', feedwaterUsed: calc.feedwaterUsed || '',
      boilerEfficiency: calc.boilerEfficiency || '', heatInput: calc.heatInput || '',
      heatOutput: calc.heatOutput || '', evaporationRate: calc.evaporationRate || '',
      equivalentEvap: calc.equivalentEvap || '', factorOfEvap: calc.factorOfEvap || '',
      co2Percentage: calc.co2Percentage || '', o2Percentage: calc.o2Percentage || '',
      coPercentage: calc.coPercentage || '', flueGasTemp: calc.flueGasTemp || '',
      stackLoss: calc.stackLoss || '', radiationLoss: calc.radiationLoss || '',
      otherLosses: calc.otherLosses || '', remarks: calc.remarks || '', calculatedBy: calc.calculatedBy || '',
    });
    setOpen(true);
  };

  const handlePressureChange = (val: string) => {
    const p = parseFloat(val);
    const t = calcSteamTemp(p, 'barg');
    if (t !== null) { setForm((prev) => ({ ...prev, steamPressure: val, steamTemp: String(t) })); setAutoSteamTemp(true); }
    else { setForm((prev) => ({ ...prev, steamPressure: val })); setAutoSteamTemp(false); }
  };

  // ─── Tool Calculator Logic ───
  const openTool = (toolId: string) => {
    setActiveTool(toolId);
    setToolInputs({});
    setToolResults({});
    setToolCalcDone(false);
  };

  const runCalculation = () => {
    const i = toolInputs;
    const results: Record<string, string> = {};

    switch (activeTool) {
      case 'boiler-efficiency': {
        const ms = n(i.steamGen), fw_t = n(i.fwTemp), p = n(i.pressure), mf = n(i.fuelCons);
        const fuel = i.fuelType || 'Diesel';
        const gcv = FUEL_DATA[fuel]?.gcv || 45500;
        const st = interpolateSteam(p);
        const hs = st.hg, hfw = fw_t * 4.186; // approx enthalpy of water
        const qSteam = (ms / 3600) * (hs - hfw);
        const qFuel = (mf / 3600) * gcv;
        const eff = qFuel > 0 ? (qSteam / qFuel) * 100 : 0;
        results['Steam Enthalpy (hg)'] = `${fmt(hs)} kJ/kg`;
        results['Feedwater Enthalpy'] = `${fmt(hfw)} kJ/kg`;
        results['Heat Output (Q steam)'] = `${fmt(qSteam)} kW`;
        results['Heat Input (Q fuel)'] = `${fmt(qFuel)} kW`;
        results['Boiler Efficiency'] = `${fmt(eff)} %`;
        break;
      }
      case 'fa-rating': {
        const ms = n(i.evapRate), fw_t = n(i.fwTemp), p = n(i.pressure);
        const st = interpolateSteam(p);
        const fa = ms * (st.hg - fw_t * 4.186) / 2257;
        results['Saturated Steam Temp'] = `${fmt(st.t, 1)} °C`;
        results['Steam Enthalpy'] = `${fmt(st.hg)} kJ/kg`;
        results['F&A Rating'] = `${fmt(fa)} kg/hr`;
        break;
      }
      case 'fuel-consumption': {
        const ms = n(i.steamGen), p = n(i.pressure), fw_t = n(i.fwTemp), eff = n(i.efficiency);
        const fuel = i.fuelType || 'Diesel';
        const gcv = FUEL_DATA[fuel]?.gcv || 45500;
        const st = interpolateSteam(p);
        const qSteam = (ms / 3600) * (st.hg - fw_t * 4.186);
        const qFuel = eff > 0 ? qSteam / (eff / 100) : 0;
        const mf = gcv > 0 ? (qFuel / gcv) * 3600 : 0;
        results['Heat Required'] = `${fmt(qSteam)} kW`;
        results['Fuel Consumption'] = `${fmt(mf)} kg/hr`;
        results['Annual Fuel (8000 hrs)'] = `${fmt(mf * 8000)} ${FUEL_DATA[fuel]?.unit?.replace('kJ/', '') || 'kg'}`;
        break;
      }
      case 'blowdown': {
        const tdsFw = n(i.tdsFw), tdsBw = n(i.tdsBw), ms = n(i.steamGen);
        const bdPct = tdsBw > tdsFw ? (tdsFw / (tdsBw - tdsFw)) * 100 : 0;
        const bdRate = ms * bdPct / 100;
        results['Blowdown Percentage'] = `${fmt(bdPct)} %`;
        results['Blowdown Rate'] = `${fmt(bdRate)} kg/hr`;
        results['Total Feedwater'] = `${fmt(ms + bdRate)} kg/hr`;
        results['Ratio Steam:Blowdown'] = bdRate > 0 ? `${fmt(ms / bdRate)} : 1` : '—';
        break;
      }
      case 'feed-tank': {
        const condReturn = n(i.condReturn), makeUp = 100 - condReturn;
        const condTemp = n(i.condTemp), makeUpTemp = n(i.makeUpTemp), targetFwTemp = n(i.targetFwTemp);
        const mixedTemp = condReturn > 0 ? (condReturn * condTemp + makeUp * makeUpTemp) / 100 : makeUpTemp;
        const heatNeeded = (targetFwTemp - mixedTemp) * 4.186; // kJ/kg
        const pctOfSteam = targetFwTemp > 0 ? (heatNeeded / 2257) * 100 : 0;
        results['Mixed Temperature'] = `${fmt(mixedTemp, 1)} °C`;
        results['Heat Needed per kg FW'] = `${fmt(heatNeeded)} kJ/kg`;
        results['% Steam for Feed Heating'] = `${fmt(pctOfSteam)} %`;
        break;
      }
      case 'pipe-sizing': {
        const flow = n(i.flowRate), vel = n(i.velocity), p = n(i.pressure);
        const st = interpolateSteam(p);
        const rho = 1 / st.vg; // density kg/m³
        const d = rho > 0 && vel > 0 ? Math.sqrt((4 * (flow / 3600)) / (Math.PI * rho * vel)) * 1000 : 0;
        const actualVel = rho > 0 && d > 0 ? (4 * (flow / 3600)) / (Math.PI * rho * Math.pow(d / 1000, 2)) : 0;
        results['Steam Density'] = `${fmt(rho, 3)} kg/m³`;
        results['Calculated Pipe Dia'] = `${fmt(d, 1)} mm`;
        results['Recommended NB Size'] = d <= 15 ? 'DN15 (1/2\"\)' : d <= 25 ? 'DN25 (1\"\)' : d <= 32 ? 'DN32 (1.25\"\)' : d <= 50 ? 'DN50 (2\"\)' : d <= 80 ? 'DN80 (3\"\)' : d <= 100 ? 'DN100 (4\"\)' : d <= 150 ? 'DN150 (6\"\)' : `DN200+ (${fmt(d, 0)} mm)`;
        results['Actual Velocity'] = `${fmt(actualVel, 1)} m/s`;
        break;
      }
      case 'steam-leak': {
        const orificeDia = n(i.orificeDia), p = n(i.pressure);
        const area = Math.PI * Math.pow(orificeDia / 2, 2);
        const leakRate = 0.0196 * area * (p + 1.01325);
        const st = interpolateSteam(p);
        const energyLoss = (leakRate / 3600) * (st.hg - 4.186 * 25); // assume 25°C feed
        const costPerYear = energyLoss * 8000 / 3600000 * 0.12; // $0.12/kWh
        results['Leak Area'] = `${fmt(area, 2)} mm²`;
        results['Steam Leak Rate'] = `${fmt(leakRate)} kg/hr`;
        results['Energy Loss'] = `${fmt(energyLoss)} kW`;
        results['Est. Annual Cost'] = `$${fmt(costPerYear)}`;
        break;
      }
      case 'flash-steam': {
        const hp = n(i.highPressure), lp = n(i.lowPressure), condFlow = n(i.condFlow);
        const stHP = interpolateSteam(hp), stLP = interpolateSteam(lp);
        const flashPct = ((stHP.hf - stLP.hf) / stLP.hfg) * 100;
        const flashFlow = condFlow * flashPct / 100;
        results['Flash Steam %'] = `${fmt(flashPct)} %`;
        results['Flash Steam Flow'] = `${fmt(flashFlow)} kg/hr`;
        results['Remaining Condensate'] = `${fmt(condFlow - flashFlow)} kg/hr`;
        results['HP Enthalpy (hf)'] = `${fmt(stHP.hf)} kJ/kg`;
        results['LP Enthalpy (hf)'] = `${fmt(stLP.hf)} kJ/kg`;
        results['LP Latent Heat (hfg)'] = `${fmt(stLP.hfg)} kJ/kg`;
        break;
      }
      case 'heating-load': {
        const area = n(i.area), deltaT = n(i.deltaT), uVal = n(i.uValue);
        const heatLoad = uVal * area * deltaT / 1000; // kW
        const steamFlow = heatLoad > 0 ? (heatLoad * 3600) / 2257 : 0;
        results['Heat Load'] = `${fmt(heatLoad)} kW`;
        results['Heat Load'] = `${fmt(heatLoad * 1000)} W`;
        results['Steam Flow Required'] = `${fmt(steamFlow)} kg/hr`;
        break;
      }
      case 'startup-losses': {
        const pipeLen = n(i.pipeLen), pipeDia = n(i.pipeDia), steamP = n(i.pressure);
        const st = interpolateSteam(steamP);
        const pipeMass = Math.PI * (pipeDia / 1000) * 0.005 * pipeLen * 7850; // 5mm wall, steel density
        const insulationMass = Math.PI * ((pipeDia / 1000) + 0.05) * 0.05 * pipeLen * 50; // 50mm insulation
        const heatPipe = pipeMass * 0.5 * (st.t - 20);
        const heatInsul = insulationMass * 0.84 * (st.t - 20);
        const totalHeat = (heatPipe + heatInsul) / 1000;
        const steamNeeded = totalHeat > 0 ? (totalHeat * 3600) / st.hfg : 0;
        results['Pipe Steel Mass'] = `${fmt(pipeMass)} kg`;
        results['Insulation Mass'] = `${fmt(insulationMass)} kg`;
        results['Heat to Warm Pipe'] = `${fmt(totalHeat)} kJ`;
        results['Steam Needed'] = `${fmt(steamNeeded)} kg`;
        break;
      }
      case 'running-losses': {
        const pipeLen = n(i.pipeLen), pipeDia = n(i.pipeDia), steamP = n(i.pressure);
        const insulated = i.insulated === 'yes';
        const st = interpolateSteam(steamP);
        const uVal = insulated ? 10 : 50; // W/m²K approx
        const surfaceArea = Math.PI * ((pipeDia / 1000) + (insulated ? 0.1 : 0)) * pipeLen;
        const loss = uVal * surfaceArea * (st.t - 25) / 1000;
        const steamLoss = loss > 0 ? (loss * 3600) / st.hfg : 0;
        results['Surface Area'] = `${fmt(surfaceArea, 2)} m²`;
        results['U-Value Used'] = `${uVal} W/m²K`;
        results['Heat Loss'] = `${fmt(loss)} kW`;
        results['Steam Loss'] = `${fmt(steamLoss)} kg/hr`;
        results['Annual Loss (8000 hrs)'] = `${fmt(steamLoss * 8000)} kg`;
        break;
      }
      case 'valve-kv': {
        const flow = n(i.flowRate), dp = n(i.pressureDrop), rho = n(i.density);
        const kv = rho > 0 && dp > 0 ? flow / Math.sqrt(dp / rho) : 0;
        const cv = kv * 1.156;
        results['Kv (metric)'] = `${fmt(kv, 2)} m³/hr`;
        results['Cv (imperial)'] = `${fmt(cv, 2)} USGPM`;
        break;
      }
      case 'fuel-savings-flash': {
        const flashPct = n(i.flashPct), condFlow = n(i.condFlow), fuel = i.fuelType || 'Diesel';
        const gcv = FUEL_DATA[fuel]?.gcv || 45500;
        const flashSteam = condFlow * flashPct / 100;
        const energySaved = (flashSteam / 3600) * 2257;
        const fuelSaved = gcv > 0 ? (energySaved / gcv) * 3600 : 0;
        const annualFuel = fuelSaved * 8000;
        results['Flash Steam Recovered'] = `${fmt(flashSteam)} kg/hr`;
        results['Energy Saved'] = `${fmt(energySaved)} kW`;
        results['Fuel Saved'] = `${fmt(fuelSaved)} kg/hr`;
        results['Annual Fuel Saved'] = `${fmt(annualFuel)} kg`;
        break;
      }
      case 'fuel-savings-condensate': {
        const condPct = n(i.condReturn), steamGen = n(i.steamGen), fwTemp = n(i.fwTemp), fuel = i.fuelType || 'Diesel';
        const gcv = FUEL_DATA[fuel]?.gcv || 45500;
        const st = interpolateSteam(n(i.pressure));
        const condensateTemp = st.t - 10; // approx
        const mixTemp = (condPct * condensateTemp + (100 - condPct) * 25) / 100;
        const heatSavedPerKg = (condensateTemp - 25) * 4.186 * condPct / 100;
        const totalEnergySaved = (steamGen / 3600) * heatSavedPerKg;
        const fuelSaved = gcv > 0 ? (totalEnergySaved / gcv) * 3600 : 0;
        results['Condensate Temp'] = `${fmt(condensateTemp, 1)} °C`;
        results['Mixed Feed Temp'] = `${fmt(mixTemp, 1)} °C`;
        results['Heat Saved per kg Steam'] = `${fmt(heatSavedPerKg)} kJ/kg`;
        results['Energy Saved'] = `${fmt(totalEnergySaved)} kW`;
        results['Fuel Saved'] = `${fmt(fuelSaved)} kg/hr`;
        results['Annual Fuel Saved'] = `${fmt(fuelSaved * 8000)} kg`;
        break;
      }
      case 'stall': {
        const steamP = n(i.steamPressure), bp = n(i.backPressure), ua = n(i.uaValue);
        const stSteam = interpolateSteam(steamP), stBP = interpolateSteam(bp);
        const maxDT = stSteam.t - stBP.t;
        const minLoad = maxDT > 0 ? (ua * 1) / maxDT : 0; // simplified
        results['Steam Sat Temp'] = `${fmt(stSteam.t, 1)} °C`;
        results['Back Pressure Sat Temp'] = `${fmt(stBP.t, 1)} °C`;
        results['Max Available DT'] = `${fmt(maxDT, 1)} °C`;
        results['Stall Condition'] = maxDT < 5 ? 'LIKELY — consider steam trap bypass' : maxDT < 15 ? 'POSSIBLE — monitor at low loads' : 'UNLIKELY — system should operate normally';
        break;
      }
      case 'condensate-pipe': {
        const flow = n(i.flowRate);
        const d = flow <= 500 ? 15 : flow <= 1500 ? 20 : flow <= 3000 ? 25 : flow <= 6000 ? 32 : flow <= 12000 ? 40 : flow <= 20000 ? 50 : 65;
        const vel = d > 0 ? (flow / 3600) / (Math.PI * Math.pow(d / 1000 / 2, 2) * 1000) : 0;
        results['Recommended Pipe Size'] = `DN${d}`;
        results['Approximate Velocity'] = `${fmt(vel, 2)} m/s`;
        break;
      }
      case 'volume-area': {
        const shape = i.shape || 'cylinder';
        if (shape === 'cylinder') {
          const r = n(i.radius) / 1000, h = n(i.height) / 1000;
          const vol = Math.PI * r * r * h;
          const sa = 2 * Math.PI * r * (r + h);
          results['Volume'] = `${fmt(vol * 1000, 1)} litres (${fmt(vol, 4)} m³)`;
          results['Surface Area'] = `${fmt(sa, 3)} m²`;
        } else if (shape === 'sphere') {
          const r = n(i.radius) / 1000;
          const vol = (4 / 3) * Math.PI * r * r * r;
          const sa = 4 * Math.PI * r * r;
          results['Volume'] = `${fmt(vol * 1000, 1)} litres (${fmt(vol, 4)} m³)`;
          results['Surface Area'] = `${fmt(sa, 3)} m²`;
        } else if (shape === 'tank-horizontal') {
          const r = n(i.radius) / 1000, l = n(i.height) / 1000;
          const vol = Math.PI * r * r * l;
          const sa = 2 * Math.PI * r * l + 2 * Math.PI * r * r;
          results['Volume'] = `${fmt(vol * 1000, 1)} litres (${fmt(vol, 4)} m³)`;
          results['Surface Area'] = `${fmt(sa, 3)} m²`;
        }
        break;
      }
      case 'unit-conversions': {
        const val = n(i.convertValue);
        const from = i.fromUnit || 'bar';
        const to = i.toUnit || 'psi';
        let result = 0;
        const toBar: Record<string, number> = { 'bar': 1, 'psi': 0.0689476, 'kPa': 0.01, 'MPa': 10, 'atm': 1.01325, 'mmHg': 0.00133322 };
        const toC: Record<string, number> = { '°C': 1, '°F': 0.5556 };
        const toKg: Record<string, number> = { 'kg/hr': 1, 'lb/hr': 0.4536, 'ton/hr': 1000 };
        const toKw: Record<string, number> = { 'kW': 1, 'kcal/hr': 0.001163, 'BTU/hr': 0.000293, 'HP': 0.7457, 'MW': 1000 };
        if (toBar[from] && toBar[to]) result = val * toBar[from] / toBar[to];
        else if (from === '°C' && to === '°F') result = val * 9 / 5 + 32;
        else if (from === '°F' && to === '°C') result = (val - 32) * 5 / 9;
        else if (toKg[from] && toKg[to]) result = val * toKg[from] / toKg[to];
        else if (toKw[from] && toKw[to]) result = val * toKw[from] / toKw[to];
        else result = val;
        results['Result'] = `${fmt(result, 4)} ${to}`;
        break;
      }
      default:
        results['Info'] = 'See reference data below.';
    }

    setToolResults(results);
    setToolCalcDone(true);
  };

  // ─── Get active group def ───
  const currentGroup = useMemo(() => GROUPS.find(g => g.id === activeGroup), [activeGroup]);
  const currentToolDef = useMemo(() => currentGroup?.tools.find(t => t.id === activeTool), [currentGroup, activeTool]);

  // ─── Tool input field helper ───
  const tInput = (label: string, key: string, unit?: string, placeholder?: string, type = 'number') => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label} {unit && <span className="text-muted-foreground">({unit})</span>}</Label>
      <Input type={type} step="0.01" placeholder={placeholder || '0'} className="h-9 text-sm" value={toolInputs[key] || ''} onChange={(e) => setToolInputs({ ...toolInputs, [key]: e.target.value })} />
    </div>
  );

  // ─── Render tool form fields per tool ───
  const renderToolForm = () => {
    switch (activeTool) {
      case 'boiler-efficiency': return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tInput('Steam Pressure', 'pressure', 'barg', 'e.g. 10')}
          {tInput('Feedwater Temp', 'fwTemp', '°C', 'e.g. 80')}
          {tInput('Steam Generated', 'steamGen', 'kg/hr', 'e.g. 5000')}
          {tInput('Fuel Consumption', 'fuelCons', 'kg/hr', 'e.g. 350')}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fuel Type</Label>
            <Select value={toolInputs.fuelType || 'Diesel'} onValueChange={(v) => setToolInputs({ ...toolInputs, fuelType: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(FUEL_DATA).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      );
      case 'fa-rating': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Steam Pressure', 'pressure', 'barg', 'e.g. 10')}
          {tInput('Evaporation Rate', 'evapRate', 'kg/hr', 'e.g. 5000')}
          {tInput('Feedwater Temp', 'fwTemp', '°C', 'e.g. 80')}
        </div>
      );
      case 'fuel-consumption': return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tInput('Steam Pressure', 'pressure', 'barg')}
          {tInput('Feedwater Temp', 'fwTemp', '°C')}
          {tInput('Steam Generated', 'steamGen', 'kg/hr')}
          {tInput('Boiler Efficiency', 'efficiency', '%', 'e.g. 85')}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fuel Type</Label>
            <Select value={toolInputs.fuelType || 'Diesel'} onValueChange={(v) => setToolInputs({ ...toolInputs, fuelType: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(FUEL_DATA).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      );
      case 'blowdown': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('TDS in Feedwater', 'tdsFw', 'ppm', 'e.g. 200')}
          {tInput('TDS in Boiler Water', 'tdsBw', 'ppm', 'e.g. 3500')}
          {tInput('Steam Output', 'steamGen', 'kg/hr')}
        </div>
      );
      case 'feed-tank': return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tInput('Condensate Return', 'condReturn', '%', 'e.g. 75')}
          {tInput('Condensate Temp', 'condTemp', '°C')}
          {tInput('Make-up Water Temp', 'makeUpTemp', '°C', 'e.g. 25')}
          {tInput('Target Feedwater Temp', 'targetFwTemp', '°C', 'e.g. 90')}
        </div>
      );
      case 'pipe-sizing': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Steam Flow Rate', 'flowRate', 'kg/hr')}
          {tInput('Design Velocity', 'velocity', 'm/s', 'e.g. 30')}
          {tInput('Steam Pressure', 'pressure', 'barg')}
        </div>
      );
      case 'prs-sizing': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Upstream Pressure', 'upstreamP', 'barg')}
          {tInput('Downstream Pressure', 'downstreamP', 'barg')}
          {tInput('Steam Flow', 'flowRate', 'kg/hr')}
        </div>
      );
      case 'startup-losses': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Pipe Length', 'pipeLen', 'm')}
          {tInput('Pipe Diameter (NB)', 'pipeDia', 'mm')}
          {tInput('Steam Pressure', 'pressure', 'barg')}
        </div>
      );
      case 'running-losses': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Pipe Length', 'pipeLen', 'm')}
          {tInput('Pipe Diameter (NB)', 'pipeDia', 'mm')}
          {tInput('Steam Pressure', 'pressure', 'barg')}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Insulated?</Label>
            <Select value={toolInputs.insulated || 'yes'} onValueChange={(v) => setToolInputs({ ...toolInputs, insulated: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      );
      case 'heating-load': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Area', 'area', 'm²')}
          {tInput('Temperature Difference', 'deltaT', '°C')}
          {tInput('U-Value', 'uValue', 'W/m²K', 'e.g. 25')}
        </div>
      );
      case 'steam-leak': return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tInput('Orifice Diameter', 'orificeDia', 'mm', 'e.g. 3')}
          {tInput('Steam Pressure', 'pressure', 'barg', 'e.g. 10')}
        </div>
      );
      case 'valve-kv': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Flow Rate', 'flowRate', 'm³/hr')}
          {tInput('Pressure Drop', 'pressureDrop', 'bar')}
          {tInput('Fluid Density', 'density', 'kg/m³')}
        </div>
      );
      case 'flash-steam': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('High Pressure (condensate)', 'highPressure', 'barg', 'e.g. 10')}
          {tInput('Low Pressure (flash to)', 'lowPressure', 'barg', 'e.g. 0')}
          {tInput('Condensate Flow', 'condFlow', 'kg/hr')}
        </div>
      );
      case 'condensate-pipe': return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tInput('Condensate Flow Rate', 'flowRate', 'kg/hr')}
        </div>
      );
      case 'fuel-savings-flash': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Flash Steam %', 'flashPct', '%')}
          {tInput('Condensate Flow', 'condFlow', 'kg/hr')}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fuel Type</Label>
            <Select value={toolInputs.fuelType || 'Diesel'} onValueChange={(v) => setToolInputs({ ...toolInputs, fuelType: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(FUEL_DATA).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      );
      case 'fuel-savings-condensate': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Condensate Return %', 'condReturn', '%', 'e.g. 80')}
          {tInput('Steam Generation', 'steamGen', 'kg/hr')}
          {tInput('Steam Pressure', 'pressure', 'barg')}
          {tInput('Current Feedwater Temp', 'fwTemp', '°C')}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Fuel Type</Label>
            <Select value={toolInputs.fuelType || 'Diesel'} onValueChange={(v) => setToolInputs({ ...toolInputs, fuelType: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(FUEL_DATA).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      );
      case 'stall': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Steam Pressure', 'steamPressure', 'barg')}
          {tInput('Back Pressure', 'backPressure', 'barg')}
          {tInput('UA Value', 'uaValue', 'W/K', 'e.g. 5000')}
        </div>
      );
      case 'volume-area': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Shape</Label>
            <Select value={toolInputs.shape || 'cylinder'} onValueChange={(v) => setToolInputs({ ...toolInputs, shape: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cylinder">Vertical Cylinder</SelectItem>
                <SelectItem value="tank-horizontal">Horizontal Cylinder (Tank)</SelectItem>
                <SelectItem value="sphere">Sphere</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tInput('Radius / Diameter', 'radius', 'mm')}
          {tInput('Height / Length', 'height', 'mm')}
        </div>
      );
      case 'unit-conversions': return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tInput('Value', 'convertValue', '', 'e.g. 10')}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">From</Label>
            <Select value={toolInputs.fromUnit || 'bar'} onValueChange={(v) => setToolInputs({ ...toolInputs, fromUnit: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">bar</SelectItem><SelectItem value="psi">psi</SelectItem><SelectItem value="kPa">kPa</SelectItem>
                <SelectItem value="MPa">MPa</SelectItem><SelectItem value="atm">atm</SelectItem>
                <SelectItem value="°C">°C</SelectItem><SelectItem value="°F">°F</SelectItem>
                <SelectItem value="kg/hr">kg/hr</SelectItem><SelectItem value="lb/hr">lb/hr</SelectItem>
                <SelectItem value="kW">kW</SelectItem><SelectItem value="BTU/hr">BTU/hr</SelectItem><SelectItem value="kcal/hr">kcal/hr</SelectItem><SelectItem value="HP">HP</SelectItem><SelectItem value="MW">MW</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">To</Label>
            <Select value={toolInputs.toUnit || 'psi'} onValueChange={(v) => setToolInputs({ ...toolInputs, toUnit: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">bar</SelectItem><SelectItem value="psi">psi</SelectItem><SelectItem value="kPa">kPa</SelectItem>
                <SelectItem value="MPa">MPa</SelectItem><SelectItem value="atm">atm</SelectItem>
                <SelectItem value="°C">°C</SelectItem><SelectItem value="°F">°F</SelectItem>
                <SelectItem value="kg/hr">kg/hr</SelectItem><SelectItem value="lb/hr">lb/hr</SelectItem>
                <SelectItem value="kW">kW</SelectItem><SelectItem value="BTU/hr">BTU/hr</SelectItem><SelectItem value="kcal/hr">kcal/hr</SelectItem><SelectItem value="HP">HP</SelectItem><SelectItem value="MW">MW</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
      // ─── Reference tools (no calculation form needed) ───
      default: return null;
    }
  };

  // ─── Render reference tables for non-calculator tools ───
  const renderReferenceContent = () => {
    switch (activeTool) {
      case 'fuel-properties': return (
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Fuel</TableHead><TableHead>GCV</TableHead><TableHead>NCV</TableHead><TableHead>Unit</TableHead><TableHead>Density</TableHead>
          </TableRow></TableHeader><TableBody>
            {Object.entries(FUEL_DATA).map(([name, d]) => (
              <TableRow key={name}><TableCell className="font-medium">{name}</TableCell><TableCell>{d.gcv.toLocaleString()}</TableCell><TableCell>{d.ncv.toLocaleString()}</TableCell><TableCell>{d.unit}</TableCell><TableCell>{d.density || '—'}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'sat-steam-table': return (
        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead className="sticky top-0 bg-background">P (bar)</TableHead><TableHead className="sticky top-0 bg-background">T (°C)</TableHead><TableHead className="sticky top-0 bg-background">hf (kJ/kg)</TableHead><TableHead className="sticky top-0 bg-background">hfg (kJ/kg)</TableHead><TableHead className="sticky top-0 bg-background">hg (kJ/kg)</TableHead><TableHead className="sticky top-0 bg-background">sg (kJ/kgK)</TableHead><TableHead className="sticky top-0 bg-background">vg (m³/kg)</TableHead>
          </TableRow></TableHeader><TableBody>
            {SAT_STEAM_DATA.map((r) => (
              <TableRow key={r.p}><TableCell className="font-mono">{r.p}</TableCell><TableCell className="font-mono">{r.t}</TableCell><TableCell className="font-mono">{r.hf}</TableCell><TableCell className="font-mono">{r.hfg}</TableCell><TableCell className="font-mono">{r.hg}</TableCell><TableCell className="font-mono">{r.sg}</TableCell><TableCell className="font-mono">{r.vg}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'superheated-steam': return (
        <div className="text-center py-8 text-muted-foreground">
          <Thermometer className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Superheated Steam Table</p>
          <p className="text-xs mt-1">Enter a pressure and superheat temperature to get properties.</p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-4">
            {tInput('Pressure', 'pressure', 'barg')}
            {tInput('Superheat Temp', 'superHeatTemp', '°C')}
            <div className="col-span-2"><Button className="w-full" onClick={runCalculation}>Look Up</Button></div>
          </div>
          {toolCalcDone && toolResults['Info'] && <p className="mt-3 text-sm">{toolResults['Info']}</p>}
        </div>
      );
      case 'valve-selection': return (
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Valve Type</TableHead><TableHead>Application</TableHead><TableHead>Pressure Range</TableHead><TableHead>Temp Range</TableHead></TableRow></TableHeader><TableBody>
            {[
              ['Gate Valve', 'Isolation (fully open/closed)', 'Up to 250 barg', '-196 to 600°C'],
              ['Globe Valve', 'Throttling / regulation', 'Up to 400 barg', '-196 to 600°C'],
              ['Ball Valve', 'Isolation, quick shutoff', 'Up to 500 barg', '-200 to 500°C'],
              ['Butterfly Valve', 'Isolation, large diameter', 'Up to 25 barg', '-30 to 400°C'],
              ['Check Valve', 'Prevent backflow', 'Up to 400 barg', '-196 to 600°C'],
              ['Safety Valve', 'Overpressure protection', 'Set pressure dependent', 'Up to 600°C'],
              ['Pressure Reducing', 'Pressure reduction', 'Up to 40 barg', '-20 to 350°C'],
            ].map(([type, app, pr, tr]) => (
              <TableRow key={type}><TableCell className="font-medium">{type}</TableCell><TableCell>{app}</TableCell><TableCell>{pr}</TableCell><TableCell>{tr}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'trap-selection': return (
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Trap Type</TableHead><TableHead>Best For</TableHead><TableHead>Max Pressure</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>
            {[
              ['Mechanical (Bucket)', 'Drip / tracing / process', '25 barg', 'Robust, handles dirt well'],
              ['Thermostatic (Bimetal)', 'Low to medium load', '17 barg', 'Slow to open, good for variable loads'],
              ['Thermodynamic (Disc)', 'Steam mains / tracing', '25 barg', 'Compact, can discharge air'],
              ['Float (FT)', 'Process / heat exchangers', '25 barg', 'Continuous discharge, best efficiency'],
              ['Inverted Bucket', 'Drip legs / tracing', '25 barg', 'Resistant to waterhammer'],
            ].map(([type, best, mp, notes]) => (
              <TableRow key={type}><TableCell className="font-medium">{type}</TableCell><TableCell>{best}</TableCell><TableCell>{mp}</TableCell><TableCell className="text-xs text-muted-foreground">{notes}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'ip-ratings': return (
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Rating</TableHead><TableHead>Solid Objects</TableHead><TableHead>Liquids</TableHead></TableRow></TableHeader><TableBody>
            {[
              ['IP20', 'Fingers (>12.5mm)', 'No protection'],
              ['IP44', 'Solid objects (>1mm)', 'Splashing water'],
              ['IP54', 'Dust protected', 'Splashing water'],
              ['IP55', 'Dust protected', 'Water jets'],
              ['IP56', 'Dust protected', 'Powerful water jets'],
              ['IP65', 'Dust-tight', 'Water jets'],
              ['IP66', 'Dust-tight', 'Powerful water jets'],
              ['IP67', 'Dust-tight', 'Immersion up to 1m'],
              ['IP68', 'Dust-tight', 'Immersion beyond 1m'],
            ].map(([r, s, l]) => (
              <TableRow key={r}><TableCell className="font-bold font-mono">{r}</TableCell><TableCell>{s}</TableCell><TableCell>{l}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'fluid-velocities': return (
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Fluid / Application</TableHead><TableHead>Velocity (m/s)</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>
            {[
              ['Saturated Steam (main)', '25 – 40', 'Higher for superheated'],
              ['Saturated Steam (branch)', '15 – 25', '—'],
              ['Compressed Air', '6 – 10', '—'],
              ['Feedwater (pump discharge)', '2 – 3', '—'],
              ['Feedwater (suction)', '0.5 – 1.5', 'Avoid cavitation'],
              ['Condensate (pipe)', '0.5 – 1.5', '—'],
              ['Cooling Water', '1.5 – 3', '—'],
              ['Fuel Oil (HFO)', '0.5 – 1.5', 'Heated lines'],
              ['Fuel Oil (Diesel/LFO)', '1 – 2', '—'],
              ['Natural Gas', '10 – 20', '—'],
            ].map(([f, v, n]) => (
              <TableRow key={f}><TableCell className="font-medium">{f}</TableCell><TableCell className="font-mono">{v}</TableCell><TableCell className="text-xs text-muted-foreground">{n}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'pipe-specs': return (
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>DN (mm)</TableHead><TableHead>NPS (inches)</TableHead><TableHead>OD (mm)</TableHead><TableHead>Wall Sch 40 (mm)</TableHead><TableHead>ID Sch 40 (mm)</TableHead></TableRow></TableHeader><TableBody>
            {[
              ['DN15', '1/2"', '21.3', '2.77', '15.8'], ['DN20', '3/4"', '26.7', '2.87', '20.9'],
              ['DN25', '1"', '33.4', '3.38', '26.6'], ['DN32', '1.25"', '42.2', '3.56', '35.1'],
              ['DN40', '1.5"', '48.3', '3.68', '40.9'], ['DN50', '2"', '60.3', '3.91', '52.5'],
              ['DN65', '2.5"', '73.0', '5.16', '62.7'], ['DN80', '3"', '88.9', '5.49', '77.9'],
              ['DN100', '4"', '114.3', '6.02', '102.3'], ['DN150', '6"', '168.3', '7.11', '154.1'],
              ['DN200', '8"', '219.1', '8.18', '202.7'], ['DN250', '10"', '273.0', '9.27', '254.5'],
              ['DN300', '12"', '323.8', '10.31', '303.2'], ['DN400', '16"', '406.4', '12.70', '381.0'],
            ].map(([dn, nps, od, wall, id]) => (
              <TableRow key={dn}><TableCell className="font-mono font-medium">{dn}</TableCell><TableCell>{nps}</TableCell><TableCell className="font-mono">{od}</TableCell><TableCell className="font-mono">{wall}</TableCell><TableCell className="font-mono">{id}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'material-specs': return (
        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Density (kg/m³)</TableHead><TableHead>Spec</TableHead><TableHead>Max Temp (°C)</TableHead><TableHead>Common Use</TableHead></TableRow></TableHeader><TableBody>
            {[
              ['Carbon Steel (A106 Gr.B)', '7850', 'ASTM A106', '425', 'Steam pipes, headers'],
              ['Stainless Steel 304', '8000', 'ASTM A312', '870', 'Corrosive service, food'],
              ['Stainless Steel 316', '8000', 'ASTM A312', '870', 'High corrosion resistance'],
              ['Copper', '8900', 'ASTM B88', '200', 'Water lines, HVAC'],
              ['Cast Iron', '7200', 'ASTM A126', '230', 'Valves, fittings'],
              ['Carbon Steel (A333 Gr.6)', '7850', 'ASTM A333', '-45', 'Low temperature service'],
            ].map(([m, d, s, t, u]) => (
              <TableRow key={m}><TableCell className="font-medium text-xs">{m}</TableCell><TableCell className="font-mono">{d}</TableCell><TableCell className="font-mono text-xs">{s}</TableCell><TableCell className="font-mono">{t}</TableCell><TableCell className="text-xs">{u}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </div>
      );
      case 'boiler-guidelines': return (
        <div className="space-y-4">
          {[
            { title: 'Boiler Efficiency Targets', items: ['Natural Gas boiler: > 85%', 'Diesel/HFO boiler: > 82%', 'Coal/biomass: > 75%', 'Target O2 in flue gas: 3-5%'] },
            { title: 'Blowdown Management', items: ['TDS in boiler water: 2000-3500 ppm', 'TDS in feedwater: < 200 ppm', 'Blowdown heat recovery recommended', 'Monitor daily'] },
            { title: 'Water Treatment', items: ['pH of feedwater: 8.5 - 9.5', 'Hardness: < 1 ppm as CaCO3', 'Oxygen scavenger dosing required', 'Weekly water chemistry tests'] },
            { title: 'Maintenance Schedule', items: ['Daily: visual inspection, water level checks', 'Weekly: burner inspection, blowdown valve test', 'Monthly: safety valve testing, gauge calibration', 'Annually: full inspection, hydro test'] },
          ].map((section) => (
            <Card key={section.title} className="border-l-4 border-l-amber-accent">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">{section.title}</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4"><ul className="space-y-1">{section.items.map((item) => <li key={item} className="text-xs text-muted-foreground flex items-start gap-2"><ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-amber-accent" />{item}</li>)}</ul></CardContent>
            </Card>
          ))}
        </div>
      );
      default: return null;
    }
  };

  const isReferenceTool = ['fuel-properties', 'sat-steam-table', 'superheated-steam', 'valve-selection', 'trap-selection', 'ip-ratings', 'fluid-velocities', 'pipe-specs', 'material-specs', 'boiler-guidelines'].includes(activeTool || '');

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6" /> Boiler Calculations
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Comprehensive engineering calculators, steam tables, and technical references — all in one place.
        </p>
      </div>

      {/* ─── Tool Groups Tabs ─── */}
      <Tabs value={activeGroup} onValueChange={(v) => { setActiveGroup(v); setActiveTool(null); }}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            return (
              <TabsTrigger key={g.id} value={g.id} className="flex items-center gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Icon className={cn('h-3.5 w-3.5', g.accent)} />
                <span className="hidden sm:inline">{g.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {GROUPS.map((group) => (
          <TabsContent key={group.id} value={group.id} className="mt-4">
            {/* Tool Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {group.tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => openTool(tool.id)}
                    className={cn(
                      'group relative text-left p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md cursor-pointer',
                      isActive
                        ? `${group.border} ${group.bg} shadow-md ring-1 ring-offset-1`
                        : 'border-transparent bg-card hover:border-muted-foreground/20 hover:bg-muted/30'
                    )}
                  >
                    <div className={cn('inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 bg-gradient-to-br text-white', group.gradient)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className={cn('text-sm font-semibold leading-tight', isActive ? group.text : 'text-foreground')}>{tool.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight line-clamp-2">{tool.description}</p>
                    {isActive && (
                      <div className={cn('absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-br', group.gradient)} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ─── Active Tool Panel ─── */}
            {currentGroup?.id === group.id && currentToolDef && (
              <Card className={cn('mt-4 border-2', group.border)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br text-white', group.gradient)}>
                        {(() => { const Ic = currentToolDef.icon; return <Ic className="h-4 w-4" />; })()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{currentToolDef.name}</CardTitle>
                        <CardDescription className="text-xs">{currentToolDef.description}</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setActiveTool(null); setToolResults({}); setToolCalcDone(false); }}>Close</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!isReferenceTool && (
                    <>
                      <div className="mb-4">{renderToolForm()}</div>
                      <Button className={cn('gap-2 bg-gradient-to-r text-white', group.gradient)} onClick={runCalculation}>
                        <Calculator className="h-4 w-4" /> Calculate
                      </Button>
                      {toolCalcDone && Object.keys(toolResults).length > 0 && (
                        <div className={cn('mt-4 p-4 rounded-xl border-2', group.bg, group.border)}>
                          <p className={cn('text-xs font-bold uppercase tracking-wider mb-3', group.text)}>Results</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Object.entries(toolResults).map(([label, value]) => (
                              <div key={label} className="bg-white rounded-lg p-3 border shadow-sm">
                                <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
                                <p className={cn('text-lg font-bold mt-0.5', group.accent)}>{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {isReferenceTool && renderReferenceContent()}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* ─── Divider ─── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saved Calculation Records</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ─── Saved Records Section ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Database records of past boiler efficiency calculations.</p>
        <div className="flex items-center gap-2">
          <ExportButton factoryId={currentFactoryId || ''} dataType="calculations" />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button className="gap-2" size="sm"><Plus className="h-4 w-4" /> New Record</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? 'Edit Calculation Record' : 'New Boiler Calculation Record'}</DialogTitle></DialogHeader>
              <div className="space-y-5 mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" className="h-9 text-sm" value={form.calcDate} onChange={(e) => setForm({ ...form, calcDate: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Boiler</Label><Select value={form.boilerId} onValueChange={(v) => setForm({ ...form, boilerId: v })}><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{boilers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1"><Label className="text-xs">Fuel Type</Label><Select value={form.fuelType} onValueChange={(v) => setForm({ ...form, fuelType: v })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(FUEL_DATA).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1"><Label className="text-xs">Calculated By</Label><Input className="h-9 text-sm" placeholder="Engineer" value={form.calculatedBy} onChange={(e) => setForm({ ...form, calculatedBy: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Steam Pressure (bar)</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.steamPressure} onChange={(e) => handlePressureChange(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Steam Temp (°C) {autoSteamTemp && <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1 bg-forest/[0.07] text-forest">AUTO</Badge>}</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.steamTemp} onChange={(e) => { setForm({ ...form, steamTemp: e.target.value }); setAutoSteamTemp(false); }} /></div>
                  <div className="space-y-1"><Label className="text-xs">Feedwater Temp (°C)</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.feedwaterTemp} onChange={(e) => setForm({ ...form, feedwaterTemp: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Fuel Consumption (kg/hr)</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.fuelConsumption} onChange={(e) => setForm({ ...form, fuelConsumption: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Steam Generated (kg/hr)</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.steamGenerated} onChange={(e) => setForm({ ...form, steamGenerated: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Boiler Efficiency (%)</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.boilerEfficiency} onChange={(e) => setForm({ ...form, boilerEfficiency: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Heat Input (kW)</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.heatInput} onChange={(e) => setForm({ ...form, heatInput: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Heat Output (kW)</Label><Input type="number" step="0.01" className="h-9 text-sm" value={form.heatOutput} onChange={(e) => setForm({ ...form, heatOutput: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">CO2 (%)</Label><Input type="number" step="0.1" className="h-9 text-sm" value={form.co2Percentage} onChange={(e) => setForm({ ...form, co2Percentage: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">O2 (%)</Label><Input type="number" step="0.1" className="h-9 text-sm" value={form.o2Percentage} onChange={(e) => setForm({ ...form, o2Percentage: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Stack Loss (%)</Label><Input type="number" step="0.1" className="h-9 text-sm" value={form.stackLoss} onChange={(e) => setForm({ ...form, stackLoss: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs">Radiation Loss (%)</Label><Input type="number" step="0.1" className="h-9 text-sm" value={form.radiationLoss} onChange={(e) => setForm({ ...form, radiationLoss: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Remarks</Label><Textarea className="text-sm" placeholder="Notes..." rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
                <Button onClick={handleSubmit}>{editing ? 'Update' : 'Save Record'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : calcs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No calculation records yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="sticky top-0 bg-background">Date</TableHead>
                  <TableHead className="sticky top-0 bg-background">Boiler</TableHead>
                  <TableHead className="sticky top-0 bg-background">Fuel</TableHead>
                  <TableHead className="sticky top-0 bg-background">Efficiency</TableHead>
                  <TableHead className="sticky top-0 bg-background">Heat In</TableHead>
                  <TableHead className="sticky top-0 bg-background">Heat Out</TableHead>
                  <TableHead className="sticky top-0 bg-background">CO2/O2</TableHead>
                  <TableHead className="sticky top-0 bg-background">By</TableHead>
                  <TableHead className="sticky top-0 bg-background">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {calcs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{c.calcDate}</TableCell>
                      <TableCell className="text-xs">{c.boiler?.name || '—'}</TableCell>
                      <TableCell className="text-xs">{c.fuelType}</TableCell>
                      <TableCell>
                        {c.boilerEfficiency ? <Badge variant={Number(c.boilerEfficiency) >= 80 ? 'default' : 'secondary'} className="text-xs">{c.boilerEfficiency}%</Badge> : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{c.heatInput || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{c.heatOutput || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{c.co2Percentage || '—'}/{c.o2Percentage || '—'}</TableCell>
                      <TableCell className="text-xs">{c.calculatedBy || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(c)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-critical" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
