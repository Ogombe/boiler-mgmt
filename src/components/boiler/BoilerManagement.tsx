'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Flame, Plus, Pencil, Trash2, Eye, Search, Loader2, X, Thermometer,
  Gauge, Wrench, Zap, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface Boiler {
  id: string;
  factoryId: string;
  name: string;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  boilerType: string | null;
  capacity: string | null;
  capacityUnit: string | null;
  operatingPressure: string | null;
  designPressure: string | null;
  maxAllowableWP: string | null;
  designSteamTemp: string | null;
  designFeedwaterTemp: string | null;
  fuelType: string | null;
  fuelConsumptionRate: string | null;
  heatingSurfaceArea: string | null;
  designEfficiency: string | null;
  numberOfPasses: string | null;
  yearOfManufacture: string | null;
  drumCapacity: string | null;
  superheaterTemp: string | null;
  superheaterPressure: string | null;
  economizerType: string | null;
  installationDate: string | null;
  location: string | null;
  status: string;
  remarks: string | null;
  createdAt: string;
}

const BOILER_TYPES = ['Fire Tube', 'Water Tube', 'Packaged', 'Modular', 'Electric', 'Biomass', 'Combined Cycle', 'Other'];
const FUEL_TYPES = ['Diesel/Furnace Oil', 'Heavy Fuel Oil (HFO)', 'Natural Gas', 'LPG', 'Coal', 'Biomass', 'Electric', 'Dual Fuel', 'Other'];
const ECONOMIZER_TYPES = ['None', 'Bare Tube', 'Finned Tube', 'Cast Iron', 'Condensing', 'Other'];

const emptyForm = {
  name: '', serialNumber: '', manufacturer: '', model: '', boilerType: '',
  capacity: '', capacityUnit: 'kg/hr', operatingPressure: '', designPressure: '',
  maxAllowableWP: '', designSteamTemp: '', designFeedwaterTemp: '',
  fuelType: '', fuelConsumptionRate: '', heatingSurfaceArea: '',
  designEfficiency: '', numberOfPasses: '', yearOfManufacture: '',
  drumCapacity: '', superheaterTemp: '', superheaterPressure: '',
  economizerType: 'None', installationDate: '', location: '', remarks: '',
};

type FormKeys = keyof typeof emptyForm;

export function BoilerManagement() {
  const { currentFactoryId } = useAppStore();
  const factoryRole = useAppStore(s => s.getFactoryRole());

  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [filtered, setFiltered] = useState<Boiler[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBoiler, setEditBoiler] = useState<Boiler | null>(null);
  const [viewBoiler, setViewBoiler] = useState<Boiler | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [specsSection, setSpecsSection] = useState(false);

  const fetchBoilers = useCallback(async () => {
    if (!currentFactoryId) return;
    try {
      const res = await fetch(`/api/boilers?factoryId=${currentFactoryId}`);
      const data = await res.json();
      setBoilers(data);
      setFiltered(data);
    } catch (err) {
      console.error('Failed to fetch boilers:', err);
    }
    setLoading(false);
  }, [currentFactoryId]);

  useEffect(() => { fetchBoilers(); }, [fetchBoilers]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(boilers); return; }
    const q = search.toLowerCase();
    setFiltered(boilers.filter(b =>
      b.name.toLowerCase().includes(q) || (b.serialNumber || '').toLowerCase().includes(q) ||
      (b.manufacturer || '').toLowerCase().includes(q) || (b.model || '').toLowerCase().includes(q) ||
      (b.boilerType || '').toLowerCase().includes(q)
    ));
  }, [search, boilers]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditBoiler(null);
    setSpecsSection(false);
    setDialogOpen(true);
  };

  const openEdit = (b: Boiler) => {
    setForm({
      name: b.name, serialNumber: b.serialNumber || '', manufacturer: b.manufacturer || '',
      model: b.model || '', boilerType: b.boilerType || '', capacity: b.capacity || '',
      capacityUnit: b.capacityUnit || 'kg/hr', operatingPressure: b.operatingPressure || '',
      designPressure: b.designPressure || '', maxAllowableWP: b.maxAllowableWP || '',
      designSteamTemp: b.designSteamTemp || '', designFeedwaterTemp: b.designFeedwaterTemp || '',
      fuelType: b.fuelType || '', fuelConsumptionRate: b.fuelConsumptionRate || '',
      heatingSurfaceArea: b.heatingSurfaceArea || '', designEfficiency: b.designEfficiency || '',
      numberOfPasses: b.numberOfPasses || '', yearOfManufacture: b.yearOfManufacture || '',
      drumCapacity: b.drumCapacity || '', superheaterTemp: b.superheaterTemp || '',
      superheaterPressure: b.superheaterPressure || '', economizerType: b.economizerType || 'None',
      installationDate: b.installationDate || '', location: b.location || '', remarks: b.remarks || '',
    });
    setEditBoiler(b);
    setSpecsSection(true);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !currentFactoryId) return;
    setSaving(true);
    try {
      if (editBoiler) {
        await fetch('/api/boilers', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editBoiler.id, ...form, factoryId: currentFactoryId }),
        });
      } else {
        await fetch('/api/boilers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, factoryId: currentFactoryId }),
        });
      }
      setDialogOpen(false);
      fetchBoilers();
    } catch (err) {
      console.error('Save boiler error:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this boiler and ALL its data (logs, calculations, maintenance, inspections)?')) return;
    await fetch(`/api/boilers?id=${id}`, { method: 'DELETE' });
    fetchBoilers();
  };

  const setField = (key: FormKeys, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const canManage = can(factoryRole, 'manageBoilers');

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Boiler Management</h2>
          <p className="text-muted-foreground">Add and manage boilers with full nameplate specifications. {boilers.length} boiler{boilers.length !== 1 ? 's' : ''} registered.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="bg-forest hover:bg-forest text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Boiler
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search boilers by name, serial no, manufacturer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Flame className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No boilers yet</p>
          <p className="text-sm mt-1">Add your first boiler with all nameplate specifications</p>
          {canManage && (
            <Button onClick={openCreate} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" /> Add Your First Boiler
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((boiler) => (
          <Card key={boiler.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-forest/[0.07] flex items-center justify-center shrink-0">
                    <Flame className="h-5 w-5 text-forest" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{boiler.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{boiler.boilerType || 'Boiler'} {boiler.serialNumber ? `| S/N: ${boiler.serialNumber}` : ''}</p>
                  </div>
                </div>
                <Badge variant={boiler.status === 'Active' ? 'default' : 'secondary'} className={boiler.status === 'Active' ? 'bg-emerald-100 text-forest' : ''}>
                  {boiler.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {boiler.manufacturer && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Mfg:</span> {boiler.manufacturer} {boiler.model ? `(${boiler.model})` : ''}</p>}
              {boiler.capacity && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Capacity:</span> {boiler.capacity} {boiler.capacityUnit || ''}</p>}
              {boiler.operatingPressure && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Op. Pressure:</span> {boiler.operatingPressure} bar</p>}
              {boiler.designSteamTemp && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Design Steam Temp:</span> {boiler.designSteamTemp} °C</p>}
              {boiler.fuelType && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Fuel:</span> {boiler.fuelType}</p>}
              {boiler.yearOfManufacture && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Year:</span> {boiler.yearOfManufacture}</p>}
              <div className="flex items-center gap-2 pt-2 border-t mt-2">
                <Button variant="outline" size="sm" onClick={() => setViewBoiler(boiler)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>
                {canManage && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEdit(boiler)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-critical hover:text-critical hover:bg-critical/[0.07]" onClick={() => handleDelete(boiler.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editBoiler ? 'Edit Boiler' : 'Add New Boiler'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Boiler Name / Number *</Label>
                <Input placeholder="e.g. Boiler #1" value={form.name} onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input placeholder="Manufacturer S/N" value={form.serialNumber} onChange={(e) => setField('serialNumber', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input placeholder="e.g. Babcock & Wilcox" value={form.manufacturer} onChange={(e) => setField('manufacturer', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input placeholder="e.g. D-type" value={form.model} onChange={(e) => setField('model', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Boiler Type</Label>
                <Select value={form.boilerType} onValueChange={(v) => setField('boilerType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{BOILER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year of Manufacture</Label>
                <Input placeholder="e.g. 2020" value={form.yearOfManufacture} onChange={(e) => setField('yearOfManufacture', e.target.value)} />
              </div>
            </div>

            {/* Expandable Nameplate Specs */}
            <div className="border rounded-lg">
              <button type="button" onClick={() => setSpecsSection(!specsSection)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/50 rounded-lg">
                <span className="flex items-center gap-2"><Info className="h-4 w-4 text-forest" /> Nameplate Specifications</span>
                <span className="text-xs text-muted-foreground">{specsSection ? 'Collapse' : 'Expand'}</span>
              </button>
              {specsSection && (
                <div className="px-4 pb-4 space-y-4 border-t">
                  {/* Pressure & Temp */}
                  <div className="pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1"><Gauge className="h-3 w-3" /> Pressure & Temperature</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Design Pressure (bar)</Label><Input className="h-9" placeholder="e.g. 10" value={form.designPressure} onChange={(e) => setField('designPressure', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Max Allowable WP (bar)</Label><Input className="h-9" placeholder="e.g. 11" value={form.maxAllowableWP} onChange={(e) => setField('maxAllowableWP', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Operating Pressure (bar)</Label><Input className="h-9" placeholder="e.g. 8" value={form.operatingPressure} onChange={(e) => setField('operatingPressure', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Design Steam Temp (°C)</Label><Input className="h-9" placeholder="e.g. 180" value={form.designSteamTemp} onChange={(e) => setField('designSteamTemp', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Design Feedwater Temp (°C)</Label><Input className="h-9" placeholder="e.g. 105" value={form.designFeedwaterTemp} onChange={(e) => setField('designFeedwaterTemp', e.target.value)} /></div>
                    </div>
                  </div>
                  {/* Capacity */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1"><Thermometer className="h-3 w-3" /> Capacity & Efficiency</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Capacity</Label><Input className="h-9" placeholder="e.g. 5000" value={form.capacity} onChange={(e) => setField('capacity', e.target.value)} /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Capacity Unit</Label>
                        <Select value={form.capacityUnit} onValueChange={(v) => setField('capacityUnit', v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg/hr">kg/hr</SelectItem>
                            <SelectItem value="tons/hr">tons/hr</SelectItem>
                            <SelectItem value="MW">MW</SelectItem>
                            <SelectItem value="kW">kW</SelectItem>
                            <SelectItem value="HP">HP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Design Efficiency (%)</Label><Input className="h-9" placeholder="e.g. 85" value={form.designEfficiency} onChange={(e) => setField('designEfficiency', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Heating Surface Area (m²)</Label><Input className="h-9" placeholder="e.g. 200" value={form.heatingSurfaceArea} onChange={(e) => setField('heatingSurfaceArea', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Number of Passes</Label><Input className="h-9" placeholder="e.g. 3" value={form.numberOfPasses} onChange={(e) => setField('numberOfPasses', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Drum Capacity (L)</Label><Input className="h-9" placeholder="e.g. 5000" value={form.drumCapacity} onChange={(e) => setField('drumCapacity', e.target.value)} /></div>
                    </div>
                  </div>
                  {/* Fuel */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1"><Zap className="h-3 w-3" /> Fuel System</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Fuel Type</Label>
                        <Select value={form.fuelType} onValueChange={(v) => setField('fuelType', v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select fuel" /></SelectTrigger>
                          <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Fuel Consumption Rate</Label><Input className="h-9" placeholder="e.g. 300 L/hr" value={form.fuelConsumptionRate} onChange={(e) => setField('fuelConsumptionRate', e.target.value)} /></div>
                    </div>
                  </div>
                  {/* Superheater & Economizer */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1"><Wrench className="h-3 w-3" /> Superheater & Economizer</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Superheater Temp (°C)</Label><Input className="h-9" placeholder="e.g. 400" value={form.superheaterTemp} onChange={(e) => setField('superheaterTemp', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Superheater Pressure (bar)</Label><Input className="h-9" placeholder="e.g. 10" value={form.superheaterPressure} onChange={(e) => setField('superheaterPressure', e.target.value)} /></div>
                      <div className="space-y-1">
                        <Label className="text-xs">Economizer Type</Label>
                        <Select value={form.economizerType} onValueChange={(v) => setField('economizerType', v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{ECONOMIZER_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Location & Installation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Installation Date</Label>
                <Input type="date" value={form.installationDate} onChange={(e) => setField('installationDate', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location in Plant</Label>
                <Input placeholder="e.g. Boiler House A" value={form.location} onChange={(e) => setField('location', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input placeholder="Any additional notes" value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-forest hover:bg-forest text-white" disabled={!form.name.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editBoiler ? 'Update' : 'Add'} Boiler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DIALOG */}
      <Dialog open={!!viewBoiler} onOpenChange={(open) => { if (!open) setViewBoiler(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-forest" /> {viewBoiler?.name} — Nameplate Details</DialogTitle>
          </DialogHeader>
          {viewBoiler && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['Serial Number', viewBoiler.serialNumber],
                  ['Manufacturer', viewBoiler.manufacturer],
                  ['Model', viewBoiler.model],
                  ['Boiler Type', viewBoiler.boilerType],
                  ['Year of Manufacture', viewBoiler.yearOfManufacture],
                  ['Capacity', viewBoiler.capacity ? `${viewBoiler.capacity} ${viewBoiler.capacityUnit || ''}`.trim() : null],
                  ['Design Pressure', viewBoiler.designPressure ? `${viewBoiler.designPressure} bar` : null],
                  ['Max Allowable WP', viewBoiler.maxAllowableWP ? `${viewBoiler.maxAllowableWP} bar` : null],
                  ['Operating Pressure', viewBoiler.operatingPressure ? `${viewBoiler.operatingPressure} bar` : null],
                  ['Design Steam Temp', viewBoiler.designSteamTemp ? `${viewBoiler.designSteamTemp} °C` : null],
                  ['Design Feedwater Temp', viewBoiler.designFeedwaterTemp ? `${viewBoiler.designFeedwaterTemp} °C` : null],
                  ['Fuel Type', viewBoiler.fuelType],
                  ['Fuel Consumption Rate', viewBoiler.fuelConsumptionRate],
                  ['Heating Surface Area', viewBoiler.heatingSurfaceArea ? `${viewBoiler.heatingSurfaceArea} m²` : null],
                  ['Design Efficiency', viewBoiler.designEfficiency ? `${viewBoiler.designEfficiency}%` : null],
                  ['Number of Passes', viewBoiler.numberOfPasses],
                  ['Drum Capacity', viewBoiler.drumCapacity ? `${viewBoiler.drumCapacity} L` : null],
                  ['Superheater Temp', viewBoiler.superheaterTemp ? `${viewBoiler.superheaterTemp} °C` : null],
                  ['Superheater Pressure', viewBoiler.superheaterPressure ? `${viewBoiler.superheaterPressure} bar` : null],
                  ['Economizer Type', viewBoiler.economizerType],
                  ['Installation Date', viewBoiler.installationDate],
                  ['Location', viewBoiler.location],
                  ['Status', viewBoiler.status],
                ].filter(([_, val]) => val).map(([label, val]) => (
                  <div key={label as string}>
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    <p className="text-sm font-medium">{val as string}</p>
                  </div>
                ))}
              </div>
              {viewBoiler.remarks && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm">{viewBoiler.remarks}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewBoiler(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
