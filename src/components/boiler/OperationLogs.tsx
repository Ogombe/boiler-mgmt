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
import { Plus, Trash2, FileText, Search, CalendarDays, Thermometer, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { calcSteamTemp } from '@/lib/steam-utils';
import { ExportButton } from '@/components/boiler/ExportButton';

interface OperationLog {
  id: string; factoryId: string; boilerId: string | null; logDate: string;
  hour: string; steamPressure: string | null; steamTemp: string | null;
  feedwaterTemp: string | null; waterLevel: string | null;
  fuelConsumption: string | null; flueGasTemp: string | null;
  blowdownDone: string; remarks: string | null;
  operatorName: string | null; shift: string | null;
  boiler?: { name: string } | null;
}

interface Boiler { id: string; name: string; }

const emptyLog = {
  logDate: new Date().toISOString().split('T')[0], hour: '06:00',
  steamPressure: '', steamTemp: '', feedwaterTemp: '', waterLevel: '',
  fuelConsumption: '', flueGasTemp: '', blowdownDone: 'No',
  remarks: '', operatorName: '', shift: '', boilerId: '',
};

export function OperationLogs() {
  const { currentFactoryId } = useAppStore();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OperationLog | null>(null);
  const [form, setForm] = useState(emptyLog);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    if (!currentFactoryId) return;
    Promise.all([
      fetch(`/api/operation-logs?date=${filterDate}&factoryId=${currentFactoryId}`).then((r) => r.json()),
      fetch(`/api/boilers?factoryId=${currentFactoryId}`).then((r) => r.json()),
    ])
      .then(([logsData, boilersData]) => {
        setLogs(Array.isArray(logsData) ? logsData : []);
        setBoilers(Array.isArray(boilersData) ? boilersData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterDate, currentFactoryId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!currentFactoryId) return;
    const payload = { ...form, factoryId: currentFactoryId, boilerId: form.boilerId || null };
    const url = '/api/operation-logs';
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...payload } : payload;
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      toast({ title: editing ? 'Log Updated' : 'Log Created', description: 'Operation log has been saved successfully.' });
      setOpen(false); setEditing(null); setForm(emptyLog); fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this log entry?')) return;
    await fetch(`/api/operation-logs?id=${id}`, { method: 'DELETE' });
    toast({ title: 'Deleted', description: 'Log entry removed.' });
    fetchData();
  };

  const startEdit = (log: OperationLog) => {
    setEditing(log);
    setForm({
      logDate: log.logDate, hour: log.hour, steamPressure: log.steamPressure || '',
      steamTemp: log.steamTemp || '', feedwaterTemp: log.feedwaterTemp || '',
      waterLevel: log.waterLevel || '', fuelConsumption: log.fuelConsumption || '',
      flueGasTemp: log.flueGasTemp || '', blowdownDone: log.blowdownDone,
      remarks: log.remarks || '', operatorName: log.operatorName || '',
      shift: log.shift || '', boilerId: log.boilerId || '',
    });
    setOpen(true);
  };

  // Auto-calculate steam temp when pressure changes
  const handlePressureChange = (val: string) => {
    const updated = { ...form, steamPressure: val };
    const p = parseFloat(val);
    const autoTemp = calcSteamTemp(p, 'barg');
    if (autoTemp !== null) {
      updated.steamTemp = String(autoTemp);
    }
    setForm(updated);
  };

  const autoCalcTemp = form.steamPressure ? calcSteamTemp(parseFloat(form.steamPressure), 'barg') : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" /> Daily Operation Logs
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Record hourly boiler operating parameters. Steam temperature is auto-calculated from pressure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton factoryId={currentFactoryId || ''} dataType="operation-logs" />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyLog); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Add Log Entry</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Log Entry' : 'New Hourly Log Entry'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.logDate} onChange={(e) => setForm({ ...form, logDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={form.hour} onChange={(e) => setForm({ ...form, hour: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Shift (type your shift name)</Label>
                <Input placeholder="e.g. Day Shift, Shift A, 06:00-14:00" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} />
                <p className="text-[10px] text-muted-foreground">Type any shift name your company uses</p>
              </div>
              <div className="space-y-2">
                <Label>Boiler</Label>
                <Select value={form.boilerId} onValueChange={(v) => setForm({ ...form, boilerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select boiler" /></SelectTrigger>
                  <SelectContent>{boilers.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              {/* Steam Pressure with auto-calc indicator */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Steam Pressure (barg)
                  <Calculator className="h-3 w-3 text-forest" />
                </Label>
                <Input
                  type="number" step="0.1" placeholder="e.g. 10.5"
                  value={form.steamPressure}
                  onChange={(e) => handlePressureChange(e.target.value)}
                />
              </div>

              {/* Steam Temp — auto-calculated */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Steam Temp (°C)
                  <Thermometer className="h-3 w-3 text-forest" />
                  {autoCalcTemp && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 bg-forest/[0.07] text-forest border-forest/20">
                      AUTO {autoCalcTemp}°C
                    </Badge>
                  )}
                </Label>
                <Input
                  type="number" step="0.1" placeholder="Auto from pressure"
                  value={form.steamTemp}
                  onChange={(e) => setForm({ ...form, steamTemp: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground">Auto-calculated via Antoine equation. You can override.</p>
              </div>

              <div className="space-y-2">
                <Label>Feedwater Temp (°C)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 80" value={form.feedwaterTemp} onChange={(e) => setForm({ ...form, feedwaterTemp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Water Level (%)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 65" value={form.waterLevel} onChange={(e) => setForm({ ...form, waterLevel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fuel Consumption (kg/hr)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 250" value={form.fuelConsumption} onChange={(e) => setForm({ ...form, fuelConsumption: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Flue Gas Temp (°C)</Label>
                <Input type="number" step="0.1" placeholder="e.g. 180" value={form.flueGasTemp} onChange={(e) => setForm({ ...form, flueGasTemp: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Blowdown Done</Label>
                <Select value={form.blowdownDone} onValueChange={(v) => setForm({ ...form, blowdownDone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator Name</Label>
                <Input placeholder="Operator name" value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Remarks</Label>
              <Textarea placeholder="Any observations or notes..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={3} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={handleSubmit}>{editing ? 'Update' : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Hourly Log Entries</CardTitle>
              <CardDescription>Showing logs for selected date</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input type="date" className="w-44" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => (<div key={i} className="h-12 bg-muted animate-pulse rounded" />))}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No log entries found for this date.</p>
              <p className="text-xs mt-1">Click &quot;Add Log Entry&quot; to record hourly data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Hour</TableHead>
                    <TableHead className="sticky top-0 bg-background">Boiler</TableHead>
                    <TableHead className="sticky top-0 bg-background">Shift</TableHead>
                    <TableHead className="sticky top-0 bg-background">Pressure (bar)</TableHead>
                    <TableHead className="sticky top-0 bg-background">
                      <span className="flex items-center gap-1">Steam T (°C) <Thermometer className="h-3 w-3 text-forest" /></span>
                    </TableHead>
                    <TableHead className="sticky top-0 bg-background">FW T (°C)</TableHead>
                    <TableHead className="sticky top-0 bg-background">Water Lvl (%)</TableHead>
                    <TableHead className="sticky top-0 bg-background">Fuel (kg/hr)</TableHead>
                    <TableHead className="sticky top-0 bg-background">Flue Gas (°C)</TableHead>
                    <TableHead className="sticky top-0 bg-background">Blowdown</TableHead>
                    <TableHead className="sticky top-0 bg-background">Operator</TableHead>
                    <TableHead className="sticky top-0 bg-background">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.hour}</TableCell>
                      <TableCell className="text-sm">{log.boiler?.name || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{log.shift || '—'}</Badge></TableCell>
                      <TableCell className="text-sm font-medium">{log.steamPressure || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <span className={log.steamTemp && log.steamPressure ? 'text-forest' : ''}>
                          {log.steamTemp || '—'}
                        </span>
                        {log.steamPressure && log.steamTemp && (
                          <span className="text-[9px] text-muted-foreground ml-1">sat</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{log.feedwaterTemp || '—'}</TableCell>
                      <TableCell className="text-sm">{log.waterLevel || '—'}</TableCell>
                      <TableCell className="text-sm">{log.fuelConsumption || '—'}</TableCell>
                      <TableCell className="text-sm">{log.flueGasTemp || '—'}</TableCell>
                      <TableCell><Badge variant={log.blowdownDone === 'Yes' ? 'default' : 'secondary'} className="text-xs">{log.blowdownDone}</Badge></TableCell>
                      <TableCell className="text-sm">{log.operatorName || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(log)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-critical hover:text-critical" onClick={() => handleDelete(log.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
