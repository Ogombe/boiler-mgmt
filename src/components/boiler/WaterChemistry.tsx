'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Droplets, Search, Beaker, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { ExportButton } from '@/components/boiler/ExportButton';

interface WaterChemRecord {
  id: string;
  boilerId: string | null;
  testDate: string;
  sampleType: string;
  ph: string | null;
  conductivity: string | null;
  totalHardness: string | null;
  calciumHardness: string | null;
  magnesiumHardness: string | null;
  totalAlkalinity: string | null;
  pAlkalinity: string | null;
  mAlkalinity: string | null;
  chloride: string | null;
  sulfate: string | null;
  dissolvedOxygen: string | null;
  totalDissolvedSolids: string | null;
  totalSuspendedSolids: string | null;
  silica: string | null;
  phosphate: string | null;
  sulphite: string | null;
  hydrazine: string | null;
  iron: string | null;
  copper: string | null;
  turbidity: string | null;
  color: string | null;
  oilGrease: string | null;
  treatmentChemicals: string | null;
  samplePoint: string | null;
  testedBy: string | null;
  withinLimits: string;
  remarks: string | null;
  boiler?: { name: string } | null;
}

interface Boiler {
  id: string;
  name: string;
}

const emptyForm = {
  testDate: new Date().toISOString().split('T')[0],
  boilerId: '',
  sampleType: 'Feed Water',
  ph: '',
  conductivity: '',
  totalHardness: '',
  calciumHardness: '',
  magnesiumHardness: '',
  totalAlkalinity: '',
  pAlkalinity: '',
  mAlkalinity: '',
  chloride: '',
  sulfate: '',
  dissolvedOxygen: '',
  totalDissolvedSolids: '',
  totalSuspendedSolids: '',
  silica: '',
  phosphate: '',
  sulphite: '',
  hydrazine: '',
  iron: '',
  copper: '',
  turbidity: '',
  color: '',
  oilGrease: '',
  treatmentChemicals: '',
  samplePoint: '',
  testedBy: '',
  withinLimits: 'Yes',
  remarks: '',
};

const sampleTypes = ['Feed Water', 'Boiler Water', 'Condensate Return', 'Make-up Water', 'Blowdown Water'];

/* Typical boiler water chemistry limits for quick reference */
const limitGuide: Record<string, { feed: string; boiler: string }> = {
  ph: { feed: '8.3 - 9.0', boiler: '10.5 - 11.5' },
  conductivity: { feed: '< 10 uS/cm', boiler: '2000 - 4000 uS/cm' },
  totalHardness: { feed: '< 0.02 ppm', boiler: '< 0.02 ppm' },
  totalAlkalinity: { feed: '< 50 ppm', boiler: '200 - 700 ppm' },
  chloride: { feed: '< 10 ppm', boiler: '< 200 ppm' },
  dissolvedOxygen: { feed: '< 0.02 ppm', boiler: 'N/A' },
  silica: { feed: '< 0.02 ppm', boiler: '< 150 ppm' },
  sulphite: { feed: '20 - 40 ppm', boiler: '20 - 40 ppm' },
  phosphate: { feed: 'N/A', boiler: '20 - 40 ppm' },
  hydrazine: { feed: '0.1 - 0.3 ppm', boiler: 'N/A' },
  totalDissolvedSolids: { feed: '< 50 ppm', boiler: '2000 - 3500 ppm' },
  iron: { feed: '< 0.05 ppm', boiler: '< 0.1 ppm' },
  copper: { feed: '< 0.01 ppm', boiler: '< 0.02 ppm' },
};

export function WaterChemistry() {
  const [records, setRecords] = useState<WaterChemRecord[]>([]);
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WaterChemRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [detailRecord, setDetailRecord] = useState<WaterChemRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();
  const { currentFactoryId } = useAppStore();

  const fetchData = useCallback(() => {
    if (!currentFactoryId) return;
    Promise.all([
      fetch(`/api/water-chemistry?factoryId=${currentFactoryId}`).then((r) => r.json()),
      fetch(`/api/boilers?factoryId=${currentFactoryId}`).then((r) => r.json()),
    ])
      .then(([rData, bData]) => {
        setRecords(Array.isArray(rData) ? rData : []);
        setBoilers(Array.isArray(bData) ? bData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentFactoryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    const payload = {
      ...form,
      boilerId: form.boilerId || null,
      factoryId: currentFactoryId,
    };
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...payload } : payload;

    const res = await fetch('/api/water-chemistry', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({
        title: editing ? 'Record Updated' : 'Record Saved',
        description: `${form.sampleType} chemistry record saved.`,
      });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this water chemistry record?')) return;
    await fetch(`/api/water-chemistry?id=${id}`, { method: 'DELETE' });
    toast({ title: 'Deleted' });
    fetchData();
  };

  const startEdit = (rec: WaterChemRecord) => {
    setEditing(rec);
    setForm({
      testDate: rec.testDate,
      boilerId: rec.boilerId || '',
      sampleType: rec.sampleType,
      ph: rec.ph || '',
      conductivity: rec.conductivity || '',
      totalHardness: rec.totalHardness || '',
      calciumHardness: rec.calciumHardness || '',
      magnesiumHardness: rec.magnesiumHardness || '',
      totalAlkalinity: rec.totalAlkalinity || '',
      pAlkalinity: rec.pAlkalinity || '',
      mAlkalinity: rec.mAlkalinity || '',
      chloride: rec.chloride || '',
      sulfate: rec.sulfate || '',
      dissolvedOxygen: rec.dissolvedOxygen || '',
      totalDissolvedSolids: rec.totalDissolvedSolids || '',
      totalSuspendedSolids: rec.totalSuspendedSolids || '',
      silica: rec.silica || '',
      phosphate: rec.phosphate || '',
      sulphite: rec.sulphite || '',
      hydrazine: rec.hydrazine || '',
      iron: rec.iron || '',
      copper: rec.copper || '',
      turbidity: rec.turbidity || '',
      color: rec.color || '',
      oilGrease: rec.oilGrease || '',
      treatmentChemicals: rec.treatmentChemicals || '',
      samplePoint: rec.samplePoint || '',
      testedBy: rec.testedBy || '',
      withinLimits: rec.withinLimits,
      remarks: rec.remarks || '',
    });
    setOpen(true);
  };

  const viewDetail = (rec: WaterChemRecord) => {
    setDetailRecord(rec);
    setDetailOpen(true);
  };

  const filteredRecords = records.filter((r) => {
    if (activeTab === 'all') return true;
    return r.sampleType === activeTab;
  });

  const inputField = (label: string, key: keyof typeof form, unit?: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {unit && <span className="text-muted-foreground ml-1">({unit})</span>}
      </Label>
      <Input
        type="number"
        step="0.001"
        className="h-9 text-sm"
        placeholder={placeholder || '0.00'}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  const detailField = (label: string, value: string | null | undefined, unit?: string) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label} {unit ? <span>({unit})</span> : ''}</span>
      <span className="text-xs font-medium">{value || '—'}</span>
    </div>
  );

  const feedRecords = records.filter((r) => r.sampleType === 'Feed Water');
  const boilerRecords = records.filter((r) => r.sampleType === 'Boiler Water');
  const outOfLimits = records.filter((r) => r.withinLimits === 'No');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Droplets className="h-6 w-6" />
            Feed & Boiler Water Chemistry
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Record and track water quality parameters for feed water, boiler water, condensate, and make-up water.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton factoryId={currentFactoryId || ''} dataType="water-chemistry" />
          <Dialog
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Test Record
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Test Record' : 'New Water Chemistry Test'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-4">
              {/* General Info */}
              <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Test Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Test Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={form.testDate}
                      onChange={(e) => setForm({ ...form, testDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Boiler</Label>
                    <Select value={form.boilerId} onValueChange={(v) => setForm({ ...form, boilerId: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {boilers.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sample Type</Label>
                    <Select value={form.sampleType} onValueChange={(v) => setForm({ ...form, sampleType: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sampleTypes.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Within Limits?</Label>
                    <Select value={form.withinLimits} onValueChange={(v) => setForm({ ...form, withinLimits: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sample Point</Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="e.g. Feed tank outlet"
                      value={form.samplePoint}
                      onChange={(e) => setForm({ ...form, samplePoint: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tested By</Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="Lab technician"
                      value={form.testedBy}
                      onChange={(e) => setForm({ ...form, testedBy: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Treatment Chemicals</Label>
                    <Input
                      className="h-9 text-sm"
                      placeholder="e.g. Phosphate, Sulphite"
                      value={form.treatmentChemicals}
                      onChange={(e) => setForm({ ...form, treatmentChemicals: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Physical & General Tests */}
              <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Physical & General Tests</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {inputField('pH', 'ph')}
                  {inputField('Conductivity', 'conductivity', 'uS/cm')}
                  {inputField('Turbidity', 'turbidity', 'NTU')}
                  {inputField('Color', 'color', 'APHA')}
                </div>
              </div>

              {/* Hardness */}
              <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Hardness (ppm CaCO3)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {inputField('Total Hardness', 'totalHardness', 'ppm')}
                  {inputField('Calcium Hardness', 'calciumHardness', 'ppm')}
                  {inputField('Magnesium Hardness', 'magnesiumHardness', 'ppm')}
                </div>
              </div>

              {/* Alkalinity */}
              <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Alkalinity (ppm CaCO3)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {inputField('Total Alkalinity (T)', 'totalAlkalinity', 'ppm')}
                  {inputField('P Alkalinity', 'pAlkalinity', 'ppm')}
                  {inputField('M Alkalinity', 'mAlkalinity', 'ppm')}
                </div>
              </div>

              {/* Ions & Dissolved Solids */}
              <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Ions & Dissolved Solids</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {inputField('Chloride', 'chloride', 'ppm')}
                  {inputField('Sulfate', 'sulfate', 'ppm')}
                  {inputField('Silica (SiO2)', 'silica', 'ppm')}
                  {inputField('Dissolved Oxygen', 'dissolvedOxygen', 'ppm')}
                  {inputField('Total Dissolved Solids', 'totalDissolvedSolids', 'ppm')}
                  {inputField('Total Suspended Solids', 'totalSuspendedSolids', 'ppm')}
                </div>
              </div>

              {/* Treatment Chemicals Residuals */}
              <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Treatment Chemical Residuals</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {inputField('Phosphate (PO4)', 'phosphate', 'ppm')}
                  {inputField('Sulphite (SO3)', 'sulphite', 'ppm')}
                  {inputField('Hydrazine (N2H4)', 'hydrazine', 'ppm')}
                </div>
              </div>

              {/* Metals & Contaminants */}
              <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Metals & Contaminants</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {inputField('Iron (Fe)', 'iron', 'ppm')}
                  {inputField('Copper (Cu)', 'copper', 'ppm')}
                  {inputField('Oil & Grease', 'oilGrease', 'ppm')}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Remarks</Label>
                <Textarea
                  className="text-sm"
                  placeholder="Additional observations or corrective actions taken..."
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={handleSubmit}>{editing ? 'Update' : 'Save Record'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Tests</p>
                <p className="text-2xl font-bold mt-1">{records.length}</p>
              </div>
              <div className="bg-sky-50 p-2.5 rounded-lg">
                <Beaker className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Feed Water Tests</p>
                <p className="text-2xl font-bold mt-1">{feedRecords.length}</p>
              </div>
              <div className="bg-forest/[0.07] p-2.5 rounded-lg">
                <Droplets className="h-5 w-5 text-forest" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Boiler Water Tests</p>
                <p className="text-2xl font-bold mt-1">{boilerRecords.length}</p>
              </div>
              <div className="bg-forest/[0.04] p-2.5 rounded-lg">
                <FlaskConical className="h-5 w-5 text-forest" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Out of Limits</p>
                <p className="text-2xl font-bold mt-1">{outOfLimits.length}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${outOfLimits.length > 0 ? 'bg-critical/[0.07]' : 'bg-forest/[0.07]'}`}>
                <div className={`h-2.5 w-2.5 rounded-full ${outOfLimits.length > 0 ? 'bg-critical' : 'bg-forest'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Type Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All ({records.length})</TabsTrigger>
          <TabsTrigger value="Feed Water" className="text-xs">Feed Water ({feedRecords.length})</TabsTrigger>
          <TabsTrigger value="Boiler Water" className="text-xs">Boiler Water ({boilerRecords.length})</TabsTrigger>
          <TabsTrigger value="Condensate Return" className="text-xs">Condensate</TabsTrigger>
          <TabsTrigger value="Make-up Water" className="text-xs">Make-up</TabsTrigger>
          <TabsTrigger value="Blowdown Water" className="text-xs">Blowdown</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Water Chemistry Records</CardTitle>
              <CardDescription>Showing {filteredRecords.length} of {records.length} test records</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No water chemistry records found.</p>
              <p className="text-xs mt-1">Click &quot;New Test Record&quot; to log a water test.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Date</TableHead>
                    <TableHead className="sticky top-0 bg-background">Boiler</TableHead>
                    <TableHead className="sticky top-0 bg-background">Sample Type</TableHead>
                    <TableHead className="sticky top-0 bg-background">pH</TableHead>
                    <TableHead className="sticky top-0 bg-background">Conductivity</TableHead>
                    <TableHead className="sticky top-0 bg-background">T. Hardness</TableHead>
                    <TableHead className="sticky top-0 bg-background">T. Alkalinity</TableHead>
                    <TableHead className="sticky top-0 bg-background">Chloride</TableHead>
                    <TableHead className="sticky top-0 bg-background">Silica</TableHead>
                    <TableHead className="sticky top-0 bg-background">D.O.</TableHead>
                    <TableHead className="sticky top-0 bg-background">TDS</TableHead>
                    <TableHead className="sticky top-0 bg-background">Limits</TableHead>
                    <TableHead className="sticky top-0 bg-background">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((rec) => (
                    <TableRow key={rec.id} className="cursor-pointer hover:bg-muted/80">
                      <TableCell className="text-sm whitespace-nowrap" onClick={() => viewDetail(rec)}>{rec.testDate}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.boiler?.name || '—'}</TableCell>
                      <TableCell onClick={() => viewDetail(rec)}>
                        <Badge variant="outline" className="text-xs">{rec.sampleType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono" onClick={() => viewDetail(rec)}>{rec.ph || '—'}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.conductivity || '—'}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.totalHardness || '—'}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.totalAlkalinity || '—'}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.chloride || '—'}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.silica || '—'}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.dissolvedOxygen || '—'}</TableCell>
                      <TableCell className="text-sm" onClick={() => viewDetail(rec)}>{rec.totalDissolvedSolids || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={rec.withinLimits === 'Yes' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {rec.withinLimits}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(rec)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-critical hover:text-critical" onClick={() => handleDelete(rec.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Typical Limits Reference Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Typical Water Chemistry Limits Reference</CardTitle>
          <CardDescription>Standard guideline values — adjust to your boiler manufacturer specifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Feed Water Limit</TableHead>
                  <TableHead>Boiler Water Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(limitGuide).map(([key, limits]) => (
                  <TableRow key={key}>
                    <TableCell className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</TableCell>
                    <TableCell className="text-sm font-mono">{limits.feed}</TableCell>
                    <TableCell className="text-sm font-mono">{limits.boiler}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Water Test Details — {detailRecord?.sampleType}
            </DialogTitle>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-x-6">
                <div className="col-span-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Boiler</p>
                  <p className="text-sm font-medium">{detailRecord.boiler?.name || 'N/A'}</p>
                </div>
                {detailField('Test Date', detailRecord.testDate)}
                {detailField('Sample Type', detailRecord.sampleType)}
                {detailField('Sample Point', detailRecord.samplePoint)}
                {detailField('Tested By', detailRecord.testedBy)}
                {detailField('Treatment Chemicals', detailRecord.treatmentChemicals)}
              </div>
              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Test Results</h4>
                <div className="grid grid-cols-2 gap-x-6">
                  {detailField('pH', detailRecord.ph)}
                  {detailField('Conductivity', detailRecord.conductivity, 'uS/cm')}
                  {detailField('Turbidity', detailRecord.turbidity, 'NTU')}
                  {detailField('Color', detailRecord.color, 'APHA')}
                  {detailField('Total Hardness', detailRecord.totalHardness, 'ppm')}
                  {detailField('Calcium Hardness', detailRecord.calciumHardness, 'ppm')}
                  {detailField('Magnesium Hardness', detailRecord.magnesiumHardness, 'ppm')}
                  {detailField('Total Alkalinity (T)', detailRecord.totalAlkalinity, 'ppm')}
                  {detailField('P Alkalinity', detailRecord.pAlkalinity, 'ppm')}
                  {detailField('M Alkalinity', detailRecord.mAlkalinity, 'ppm')}
                  {detailField('Chloride', detailRecord.chloride, 'ppm')}
                  {detailField('Sulfate', detailRecord.sulfate, 'ppm')}
                  {detailField('Silica (SiO2)', detailRecord.silica, 'ppm')}
                  {detailField('Dissolved Oxygen', detailRecord.dissolvedOxygen, 'ppm')}
                  {detailField('TDS', detailRecord.totalDissolvedSolids, 'ppm')}
                  {detailField('TSS', detailRecord.totalSuspendedSolids, 'ppm')}
                  {detailField('Phosphate (PO4)', detailRecord.phosphate, 'ppm')}
                  {detailField('Sulphite (SO3)', detailRecord.sulphite, 'ppm')}
                  {detailField('Hydrazine (N2H4)', detailRecord.hydrazine, 'ppm')}
                  {detailField('Iron (Fe)', detailRecord.iron, 'ppm')}
                  {detailField('Copper (Cu)', detailRecord.copper, 'ppm')}
                  {detailField('Oil & Grease', detailRecord.oilGrease, 'ppm')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Within Limits:</span>
                <Badge variant={detailRecord.withinLimits === 'Yes' ? 'default' : 'destructive'}>
                  {detailRecord.withinLimits}
                </Badge>
              </div>
              {detailRecord.remarks && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                  <p className="text-sm">{detailRecord.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
