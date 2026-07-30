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
import { Plus, Trash2, ClipboardCheck, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { ExportButton } from '@/components/boiler/ExportButton';

interface InspectionRecord {
  id: string;
  boilerId: string | null;
  inspectionDate: string;
  inspectionType: string;
  inspectorName: string | null;
  authority: string | null;
  certificateNo: string | null;
  findings: string | null;
  recommendations: string | null;
  status: string;
  pressureTestResult: string | null;
  hydroTestResult: string | null;
  nextInspectionDate: string | null;
  remarks: string | null;
  boiler?: { name: string } | null;
}

interface Boiler {
  id: string;
  name: string;
}

const inspectionTypes = [
  'Statutory Inspection',
  'Internal Inspection',
  'External Inspection',
  'Hydrostatic Test',
  'Pressure Test',
  'Non-Destructive Testing (NDT)',
  'Safety Valve Testing',
  'Blowdown Valve Inspection',
  'Water Quality Inspection',
  'Annual Comprehensive Inspection',
  'Insurance Inspection',
  'Regulatory Compliance Audit',
];

const inspectionStatuses = ['Scheduled', 'In Progress', 'Passed', 'Failed', 'Conditional Pass', 'Deferred'];

const emptyForm = {
  inspectionDate: new Date().toISOString().split('T')[0],
  boilerId: '',
  inspectionType: 'Statutory Inspection',
  inspectorName: '',
  authority: '',
  certificateNo: '',
  findings: '',
  recommendations: '',
  status: 'Scheduled',
  pressureTestResult: '',
  hydroTestResult: '',
  nextInspectionDate: '',
  remarks: '',
};

export function InspectionRecords() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [boilers, setBoilers] = useState<Boiler[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentFactoryId } = useAppStore();

  const fetchData = useCallback(() => {
    if (!currentFactoryId) return;
    Promise.all([
      fetch(`/api/inspections?factoryId=${currentFactoryId}`).then((r) => r.json()),
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
      nextInspectionDate: form.nextInspectionDate || null,
      factoryId: currentFactoryId,
    };
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing.id, ...payload } : payload;

    const res = await fetch('/api/inspections', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({
        title: editing ? 'Inspection Updated' : 'Inspection Recorded',
        description: `${form.inspectionType} record saved.`,
      });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this inspection record?')) return;
    await fetch(`/api/inspections?id=${id}`, { method: 'DELETE' });
    toast({ title: 'Deleted' });
    fetchData();
  };

  const startEdit = (record: InspectionRecord) => {
    setEditing(record);
    setForm({
      inspectionDate: record.inspectionDate,
      boilerId: record.boilerId || '',
      inspectionType: record.inspectionType,
      inspectorName: record.inspectorName || '',
      authority: record.authority || '',
      certificateNo: record.certificateNo || '',
      findings: record.findings || '',
      recommendations: record.recommendations || '',
      status: record.status,
      pressureTestResult: record.pressureTestResult || '',
      hydroTestResult: record.hydroTestResult || '',
      nextInspectionDate: record.nextInspectionDate || '',
      remarks: record.remarks || '',
    });
    setOpen(true);
  };

  const statusVariant = (s: string) => {
    switch (s) {
      case 'Passed': return 'default' as const;
      case 'Failed': return 'destructive' as const;
      case 'Conditional Pass': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Inspection Records
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Records of all required boiler inspections — statutory, internal, external, NDT, and more.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton factoryId={currentFactoryId || ''} dataType="inspections" />
          <Dialog
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Inspection
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Inspection' : 'New Inspection Record'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Inspection Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.inspectionDate}
                  onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })}
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
                <Label className="text-xs">Inspection Type</Label>
                <Select value={form.inspectionType} onValueChange={(v) => setForm({ ...form, inspectionType: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {inspectionTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {inspectionStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Inspector Name</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Inspector name"
                  value={form.inspectorName}
                  onChange={(e) => setForm({ ...form, inspectorName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Authority</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. OSHA, Insurance Co."
                  value={form.authority}
                  onChange={(e) => setForm({ ...form, authority: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Certificate No.</Label>
                <Input
                  className="h-9 text-sm"
                  placeholder="Certificate number"
                  value={form.certificateNo}
                  onChange={(e) => setForm({ ...form, certificateNo: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pressure Test Result</Label>
                <Select value={form.pressureTestResult} onValueChange={(v) => setForm({ ...form, pressureTestResult: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="N/A" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hydro Test Result</Label>
                <Select value={form.hydroTestResult} onValueChange={(v) => setForm({ ...form, hydroTestResult: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="N/A" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Next Inspection Date</Label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={form.nextInspectionDate}
                  onChange={(e) => setForm({ ...form, nextInspectionDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5 mt-4">
              <Label className="text-xs">Findings</Label>
              <Textarea
                className="text-sm"
                placeholder="Detail the inspection findings..."
                rows={3}
                value={form.findings}
                onChange={(e) => setForm({ ...form, findings: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 mt-3">
              <Label className="text-xs">Recommendations</Label>
              <Textarea
                className="text-sm"
                placeholder="Recommendations for corrective action..."
                rows={2}
                value={form.recommendations}
                onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 mt-3">
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Inspection Records</CardTitle>
          <CardDescription>Statutory, internal, external, NDT, safety valve, and compliance inspections</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No inspection records found.</p>
              <p className="text-xs mt-1">Click &quot;New Inspection&quot; to record an inspection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Date</TableHead>
                    <TableHead className="sticky top-0 bg-background">Boiler</TableHead>
                    <TableHead className="sticky top-0 bg-background">Type</TableHead>
                    <TableHead className="sticky top-0 bg-background">Inspector</TableHead>
                    <TableHead className="sticky top-0 bg-background">Authority</TableHead>
                    <TableHead className="sticky top-0 bg-background">Status</TableHead>
                    <TableHead className="sticky top-0 bg-background">Pressure Test</TableHead>
                    <TableHead className="sticky top-0 bg-background">Hydro Test</TableHead>
                    <TableHead className="sticky top-0 bg-background">Next Insp.</TableHead>
                    <TableHead className="sticky top-0 bg-background">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-sm whitespace-nowrap">{rec.inspectionDate}</TableCell>
                      <TableCell className="text-sm">{rec.boiler?.name || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate" title={rec.inspectionType}>{rec.inspectionType}</TableCell>
                      <TableCell className="text-sm">{rec.inspectorName || '—'}</TableCell>
                      <TableCell className="text-sm">{rec.authority || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(rec.status)} className="text-xs">{rec.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rec.pressureTestResult || '—'}</TableCell>
                      <TableCell className="text-sm">{rec.hydroTestResult || '—'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{rec.nextInspectionDate || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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
    </div>
  );
}
