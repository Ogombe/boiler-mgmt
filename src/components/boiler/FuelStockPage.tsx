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
  Package, Plus, Trash2, Search, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';

interface FuelStockItem {
  id: string;
  factoryId: string;
  fuelType: string;
  currentQty: number;
  unit: string;
  lastUpdated: string;
  lowStockThreshold: number | null;
  remarks: string | null;
}

interface StockHistoryItem {
  id: string;
  fuelStockId: string;
  changeType: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reference: string | null;
  remarks: string | null;
  changedBy: string | null;
  createdAt: string;
  fuelStock: { fuelType: string };
}

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

export function FuelStockPage() {
  const { currentFactoryId } = useAppStore();
  const [stocks, setStocks] = useState<FuelStockItem[]>([]);
  const [history, setHistory] = useState<StockHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState<FuelStockItem | null>(null);
  const { toast } = useToast();

  const emptyAdd = { fuelType: '', currentQty: '', unit: 'kgs', lowStockThreshold: '', remarks: '' };
  const [addForm, setAddForm] = useState(emptyAdd);

  const fetchData = useCallback(() => {
    if (!currentFactoryId) return;
    setLoading(true);
    fetch(`/api/fuel-stock?factoryId=${currentFactoryId}`)
      .then(r => r.json())
      .then(data => {
        setStocks(data.stocks || []);
        setHistory(data.history || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentFactoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddOrUpdate = async () => {
    if (!currentFactoryId || !addForm.fuelType) return;
    const res = await fetch('/api/fuel-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        factoryId: currentFactoryId,
        fuelType: addForm.fuelType,
        currentQty: addForm.currentQty ? parseFloat(addForm.currentQty) : 0,
        unit: addForm.unit,
        lowStockThreshold: addForm.lowStockThreshold ? parseFloat(addForm.lowStockThreshold) : null,
        remarks: addForm.remarks || null,
      }),
    });
    if (res.ok) {
      toast({ title: 'Stock Updated', description: `${addForm.fuelType} stock saved.` });
      setAddOpen(false); setAddForm(emptyAdd); fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fuel stock entry?')) return;
    await fetch(`/api/fuel-stock?id=${id}`, { method: 'DELETE' });
    toast({ title: 'Deleted' });
    fetchData();
  };

  const lowStockCount = stocks.filter(s => s.lowStockThreshold != null && s.currentQty <= s.lowStockThreshold).length;
  const totalKgs = stocks.reduce((sum, s) => sum + s.currentQty, 0);

  const changeIcon = (type: string) => {
    if (type === 'added') return <ArrowUpRight className="h-3 w-3 text-forest" />;
    if (type === 'consumed') return <ArrowDownRight className="h-3 w-3 text-critical" />;
    return <Minus className="h-3 w-3 text-amber-accent" />;
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" /> Fuel Stock
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track current biomass and fuel stock levels. Updated automatically from daily reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) setAddForm(emptyAdd); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add / Update Stock</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add or Update Fuel Stock</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Fuel Type</Label>
                  <Select value={addForm.fuelType} onValueChange={v => setAddForm(f => ({ ...f, fuelType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select fuel type..." /></SelectTrigger>
                    <SelectContent>
                      {ALL_FUELS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Current Quantity</Label>
                    <Input type="number" placeholder="e.g. 50000" value={addForm.currentQty} onChange={e => setAddForm(f => ({ ...f, currentQty: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={addForm.unit} onValueChange={v => setAddForm(f => ({ ...f, unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kgs">Kilograms (kgs)</SelectItem>
                        <SelectItem value="litres">Litres</SelectItem>
                        <SelectItem value="tonnes">Tonnes</SelectItem>
                        <SelectItem value="m3">Cubic Metres (m³)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert Threshold</Label>
                  <Input type="number" placeholder="e.g. 10000 (alert when below this)" value={addForm.lowStockThreshold} onChange={e => setAddForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea placeholder="e.g. Stock received from supplier X" value={addForm.remarks} onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))} rows={2} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddOrUpdate}>Save Stock</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl border-border/60">
          <CardContent className="p-5">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Fuel Types Tracked</p>
            <p className="text-[28px] font-metric font-semibold mt-2 tracking-tight">{stocks.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60">
          <CardContent className="p-5">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Stock</p>
            <p className="text-[28px] font-metric font-semibold mt-2 tracking-tight">{totalKgs.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">kgs combined</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60">
          <CardContent className="p-5">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Low Stock Alerts</p>
            <p className={`text-[28px] font-metric font-semibold mt-2 tracking-tight ${lowStockCount > 0 ? 'text-critical' : 'text-forest'}`}>{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60">
          <CardContent className="p-5">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Stock Entries</p>
            <p className="text-[28px] font-metric font-semibold mt-2 tracking-tight">{history.length}</p>
            <p className="text-[10px] text-muted-foreground">changes recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Stock Table */}
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Current Stock Levels</CardTitle>
          <CardDescription className="text-xs">Latest stock quantities per fuel type</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No stock entries yet.</p>
              <p className="text-xs mt-1">Add stock manually or create a daily report to auto-populate.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px]">Fuel Type</TableHead>
                    <TableHead className="text-[11px] text-right">Current Qty</TableHead>
                    <TableHead className="text-[11px]">Unit</TableHead>
                    <TableHead className="text-[11px] text-right">Low Threshold</TableHead>
                    <TableHead className="text-[11px]">Status</TableHead>
                    <TableHead className="text-[11px]">Last Updated</TableHead>
                    <TableHead className="text-[11px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map(s => {
                    const isLow = s.lowStockThreshold != null && s.currentQty <= s.lowStockThreshold;
                    return (
                      <TableRow key={s.id} className={isLow ? 'bg-critical/[0.03]' : ''}>
                        <TableCell className="text-xs font-medium">{FUEL_SHORT[s.fuelType] || s.fuelType}</TableCell>
                        <TableCell className="text-xs text-right font-metric font-semibold">{s.currentQty.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.unit}</TableCell>
                        <TableCell className="text-xs text-right font-metric">{s.lowStockThreshold != null ? s.lowStockThreshold.toLocaleString() : '—'}</TableCell>
                        <TableCell>
                          {isLow ? (
                            <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" /> Low</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-forest border-forest/30">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(s.lastUpdated).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                              setSelectedFuel(s);
                              setAddForm({ fuelType: s.fuelType, currentQty: String(s.currentQty), unit: s.unit, lowStockThreshold: s.lowStockThreshold != null ? String(s.lowStockThreshold) : '', remarks: s.remarks || '' });
                              setAddOpen(true);
                            }}>Edit</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-critical hover:text-critical" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock History */}
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Stock Change History</CardTitle>
          <CardDescription className="text-xs">Recent stock additions, consumption, and adjustments</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {history.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No stock changes recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[11px]">Date</TableHead>
                    <TableHead className="text-[11px]">Fuel</TableHead>
                    <TableHead className="text-[11px]">Change</TableHead>
                    <TableHead className="text-[11px] text-right">Qty</TableHead>
                    <TableHead className="text-[11px] text-right">Previous</TableHead>
                    <TableHead className="text-[11px] text-right">New</TableHead>
                    <TableHead className="text-[11px]">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.slice(0, 20).map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs font-medium">{FUEL_SHORT[h.fuelStock?.fuelType] || h.fuelStock?.fuelType || '—'}</TableCell>
                      <TableCell><div className="flex items-center gap-1.5 text-xs">{changeIcon(h.changeType)} <span className="capitalize">{h.changeType.replace('_', ' ')}</span></div></TableCell>
                      <TableCell className={`text-xs text-right font-metric font-semibold ${h.quantity > 0 ? 'text-forest' : h.quantity < 0 ? 'text-critical' : ''}`}>{h.quantity > 0 ? '+' : ''}{h.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right font-metric text-muted-foreground">{h.previousQty.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right font-metric font-medium">{h.newQty.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{h.remarks || '—'}</TableCell>
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
