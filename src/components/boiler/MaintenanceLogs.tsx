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
import { Plus, Trash2, Wrench, Search, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { ExportButton } from '@/components/boiler/ExportButton';

interface MaintenanceLog {
  id: string;
  boilerId: string | null;
  logDate: string;
  maintenanceType: string;
  frequency: string;
  taskTitle: string;
  description: string | null;
  performedBy: string | null;
  status: string;
  priority: string;
  partsUsed: string | null;
  cost: string | null;
  nextDueDate: string | null;
  completedDate: string | null;
  remarks: string | null;
  boiler?: { name: string } | null;
}

interface Boiler {
  id: string;
  name: string;
}

const emptyForm = {
  logDate: new Date().toISOString().split('T')[0],
  boilerId: '',
  maintenanceType: 'Preventive',
  frequency: 'Daily',
  taskTitle: '',
  description: '',
  performedBy: '',
  status: 'Pending',
  priority: 'Medium',
  partsUsed: '',
  cost: '',
  nextDueDate: '',
  completedDate: '',
  remarks: '',
};

const maintenanceTypes = ['Preventive', 'Reactive', 'Predictive'];
const frequencies = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Pending', 'In Progress', 'Completed', 'Deferred'];

export function MaintenanceLogs() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceLog | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [activeFreq, setActiveFreq] = useState('all');
  const { toast } = useToast();
  const { currentFactoryId } = useAppStore();

  const fetchData = useCallback(() => {
    if (!currentFactoryId) return;
    Promise.all([
      fetch(`/api/maintenance?factoryId=${currentFactoryId}`).then((r) => r.json()),
      fetch(`/api/boilers?factoryId=${currentFactoryId}`).then((r) => r.json()),
    ])
      .then(([lData, bData]) => {
        setLogs(Array.isArray(lData) ? lData : []);
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
      nextDueDate: form.nextDueDate || null,
      completedDate: form.completedDate || null,
      factoryId: currentFactoryId,
    };
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...payload } : payload;

    const res = await fetch('/api/maintenance', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({
        title: editing ? 'Maintenance Updated' : 'Maintenance Logged',
        description: `${form.maintenanceType} maintenance record saved.`,
      });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this maintenance record?')) return;
    await fetch(`/api/maintenance?id=${id}`, { method: 'DELETE' });
    toast({ title: 'Deleted' });
    fetchData();
  };

  const startEdit = (log: MaintenanceLog) => {
    setEditing(log);
    setForm({
      logDate: log.logDate,
      boilerId: log.boilerId || '',
      maintenanceType: log.maintenanceType,
      frequency: log.frequency,
      taskTitle: log.taskTitle,
      description: log.description || '',
      performedBy: log.performedBy || '',
      status: log.status,
      priority: log.priority,
      partsUsed: log.partsUsed || '',
      cost: log.cost || '',
      nextDueDate: log.nextDueDate || '',
      completedDate: log.completedDate || '',
      remarks: log.remarks || '',
    });
    setOpen(true);
  };

  const filteredLogs = logs.filter((log) => {
    if (activeType !== 'all' && log.maintenanceType !== activeType) return false;
    if (activeFreq !== 'all' && log.frequency !== activeFreq) return false;
    return true;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'default' as const;
      case 'In Progress': return 'secondary' as const;
      case 'Pending': return 'outline' as const;
      case 'Deferred': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'destructive' as const;
      case 'High': return 'default' as const;
      case 'Medium': return 'secondary' as const;
      case 'Low': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Maintenance Logs
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track preventive, reactive, and predictive maintenance — daily, weekly, monthly, and annual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton factoryId={currentFactoryId || ''} dataType="maintenance" />
          <Dialog
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Maintenance Log
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Maintenance' : 'New Maintenance Log'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.logDate}
                  onChange={(e) => setForm({ ...form, logDate: e.target.value })}
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
                <Label className="text-xs">Maintenance Type</Label>
                <Select value={form.maintenanceType} onValueChange={(v) => setForm({ ...form, maintenanceType: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {frequencies.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label className="text-xs">Task Title</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. Replace safety valve gasket"
                  value={form.taskTitle}
                  onChange={(e) => setForm({ ...form, taskTitle: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label className="text-xs">Description</Label>
                <Textarea
                  className="text-sm"
                  placeholder="Describe the maintenance task..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Performed By</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Technician name"
                  value={form.performedBy}
                  onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parts Used</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. Gasket, O-rings"
                  value={form.partsUsed}
                  onChange={(e) => setForm({ ...form, partsUsed: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-9 text-sm"
                  placeholder="0.00"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Next Due Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.nextDueDate}
                  onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Completed Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.completedDate}
                  onChange={(e) => setForm({ ...form, completedDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <Label className="text-xs">Remarks</Label>
              <Textarea
                className="text-sm"
                placeholder="Additional notes..."
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={handleSubmit}>{editing ? 'Update' : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Type:</span>
        </div>
        <div className="flex gap-1">
          {['all', 'Preventive', 'Reactive', 'Predictive'].map((t) => (
            <Button
              key={t}
              variant={activeType === t ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveType(t)}
            >
              {t === 'all' ? 'All' : t}
            </Button>
          ))}
        </div>
        <div className="w-px bg-border mx-2" />
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium">Frequency:</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {['all', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual'].map((f) => (
            <Button
              key={f}
              variant={activeFreq === f ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveFreq(f)}
            >
              {f === 'all' ? 'All' : f}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Maintenance Records</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No maintenance records found.</p>
              <p className="text-xs mt-1">Click &quot;New Maintenance Log&quot; to record a task.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Date</TableHead>
                    <TableHead className="sticky top-0 bg-background">Boiler</TableHead>
                    <TableHead className="sticky top-0 bg-background">Type</TableHead>
                    <TableHead className="sticky top-0 bg-background">Frequency</TableHead>
                    <TableHead className="sticky top-0 bg-background">Task</TableHead>
                    <TableHead className="sticky top-0 bg-background">Priority</TableHead>
                    <TableHead className="sticky top-0 bg-background">Status</TableHead>
                    <TableHead className="sticky top-0 bg-background">Performed By</TableHead>
                    <TableHead className="sticky top-0 bg-background">Next Due</TableHead>
                    <TableHead className="sticky top-0 bg-background">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">{log.logDate}</TableCell>
                      <TableCell className="text-sm">{log.boiler?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{log.maintenanceType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.frequency}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={log.taskTitle}>{log.taskTitle}</TableCell>
                      <TableCell>
                        <Badge variant={priorityColor(log.priority)} className="text-xs">{log.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(log.status)} className="text-xs">{log.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.performedBy || '—'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{log.nextDueDate || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => startEdit(log)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-critical hover:text-critical" onClick={() => handleDelete(log.id)}>
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
    </div>
  );
}
