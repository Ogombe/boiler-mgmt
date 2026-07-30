'use client';

import { useEffect, useState } from 'react';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FileBarChart, Download, Search, Loader2, Share2, Mail, MessageCircle, FileText, CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';

const reportTypes = [
  { value: 'operation', label: 'Daily Operation Logs', icon: '📋' },
  { value: 'efficiency', label: 'Boiler Efficiency', icon: '⚡' },
  { value: 'maintenance', label: 'Maintenance Logs', icon: '🔧' },
  { value: 'inspection', label: 'Inspection Records', icon: '🔍' },
  { value: 'water_chemistry', label: 'Water Chemistry', icon: '💧' },
];

export function Reports() {
  const [reportType, setReportType] = useState('operation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { toast } = useToast();
  const { currentFactoryId, factories } = useAppStore();
  const currentFactory = factories.find(f => f.id === currentFactoryId);

  const generateReport = async () => {
    if (!currentFactoryId) {
      toast({ title: 'No Factory Selected', description: 'Please select a factory.', variant: 'destructive' });
      return;
    }
    setLoading(true); setGenerated(false);
    try {
      const params = new URLSearchParams({ type: reportType, factoryId: currentFactoryId });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      setData(Array.isArray(json.data) ? json.data : []);
      setGenerated(true);
      toast({ title: 'Report Generated', description: `${reportTypes.find(r => r.value === reportType)?.label}: ${Array.isArray(json.data) ? json.data.length : 0} records.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate report.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // Download PDF for sharing
  const downloadPDF = async () => {
    if (!currentFactoryId) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/reports/share-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factoryId: currentFactoryId,
          reportType,
          dateFrom: startDate || undefined,
          dateTo: endDate || undefined,
        }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${currentFactory?.code || 'report'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'PDF Downloaded!', description: 'File saved. You can now share it on WhatsApp or email.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally { setPdfLoading(false); }
  };

  // Share on WhatsApp
  const shareWhatsApp = async () => {
    if (!currentFactoryId) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/reports/share-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryId: currentFactoryId, reportType, dateFrom: startDate || undefined, dateTo: endDate || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const file = new File([blob], `${reportType}_report.pdf`, { type: 'application/pdf' });

      const reportName = reportTypes.find(r => r.value === reportType)?.label || 'Report';
      const period = startDate && endDate ? `${startDate} to ${endDate}` : startDate || endDate || 'All Time';
      const shareText = `📊 *${reportName}*
🏭 ${currentFactory?.name || 'Factory'}
📅 Period: ${period}

Please find the attached PDF report.`;

      // Try Web Share API (works on mobile - can share files to WhatsApp)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${reportName} - ${currentFactory?.name}`,
          text: shareText,
          files: [file],
        });
      } else {
        // Fallback: download PDF + open WhatsApp Web with message
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = file.name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      }
      toast({ title: 'Sharing...', description: 'PDF ready for WhatsApp. Attach it in the chat.' });
    } catch (err) {
      // User cancelled share or error
      if ((err as Error).name !== 'AbortError') {
        toast({ title: 'Error', description: 'Could not share. Try Download PDF instead.', variant: 'destructive' });
      }
    } finally { setPdfLoading(false); }
  };

  // Share via Email
  const shareEmail = async () => {
    if (!currentFactoryId) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/reports/share-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryId: currentFactoryId, reportType, dateFrom: startDate || undefined, dateTo: endDate || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const reportName = reportTypes.find(r => r.value === reportType)?.label || 'Report';
      const period = startDate && endDate ? `${startDate} to ${endDate}` : startDate || endDate || 'All Time';
      const subject = encodeURIComponent(`${reportName} - ${currentFactory?.name} (${period})`);
      const body = encodeURIComponent(`Dear Sir/Madam,\n\nPlease find attached the ${reportName} for ${currentFactory?.name || 'the factory'} covering the period ${period}.\n\nThis report was generated from the Boiler Management System.\n\nBest regards`);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      toast({ title: 'Email Draft Opened', description: 'Attach the downloaded PDF to the email.' });
    } catch {
      toast({ title: 'Error', description: 'Could not open email.', variant: 'destructive' });
    } finally { setPdfLoading(false); }
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt');
    const rows = data.map(row =>
      headers.map(h => { const val = row[h]; return typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? ''); }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${reportType}-report-${startDate || 'all'}-to-${endDate || 'all'}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (data.length === 0) return null;
    const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt' && typeof data[0][k] !== 'object');
    const fmt = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    return (
      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto mt-4">
        <Table>
          <TableHeader>
            <TableRow>{keys.map(k => <TableHead key={k} className="sticky top-0 bg-background text-xs whitespace-nowrap">{fmt(k)}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>{keys.map(k => <TableCell key={k} className="text-xs whitespace-nowrap">{row[k] != null ? String(row[k]) : '—'}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileBarChart className="h-6 w-6" /> Reports
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Generate professional PDF reports and share them via WhatsApp or Email to investors, managers, and stakeholders.
        </p>
      </div>

      {/* Report Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate Report</CardTitle>
          <CardDescription>Select report type and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{reportTypes.map(r => <SelectItem key={r.value} value={r.value}>{r.icon} {r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" className="h-9 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input type="date" className="h-9 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="gap-2 w-full" onClick={generateReport} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBarChart className="h-4 w-4" />}
                Preview Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share & Download Actions */}
      <Card className="border-forest/20 bg-forest/[0.04]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Share2 className="h-5 w-5 text-forest" /> Download & Share Report</CardTitle>
          <CardDescription>Generate a professional PDF branded with your factory name. Share via WhatsApp, Email, or download to your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadPDF} disabled={pdfLoading} className="bg-forest hover:bg-forest text-white gap-2">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </Button>
            <Button onClick={shareWhatsApp} disabled={pdfLoading} variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Share on WhatsApp
            </Button>
            <Button onClick={shareEmail} disabled={pdfLoading} variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Share via Email
            </Button>
            {generated && data.length > 0 && (
              <Button onClick={exportCSV} variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-white rounded-lg p-3 border">
            <CheckCircle className="h-4 w-4 text-forest mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">How sharing works:</p>
              <p className="mt-0.5"><strong>WhatsApp:</strong> On mobile, the PDF attaches directly. On desktop, the file downloads and WhatsApp Web opens — attach it manually.</p>
              <p className="mt-0.5"><strong>Email:</strong> The PDF downloads and your email app opens with a pre-written message. Just attach the PDF and send.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Preview Table */}
      {generated && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Data Preview</CardTitle>
                <CardDescription>{data.length} records</CardDescription>
              </div>
              <Badge variant="secondary">Preview only — use buttons above for shareable PDF</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No records found for the selected criteria.</p>
              </div>
            ) : renderTable()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}