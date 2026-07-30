'use client';

import { useState } from 'react';
import { Download, Loader2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  /** Active factory id (exports are scoped to this factory). */
  factoryId: string;
  /** Export data type. Accepts kebab-case ("operation-logs") or
   *  underscore ("operation_logs"); normalized to the API's underscore form. */
  dataType: string;
}

// The data pages pass kebab-case labels (e.g. "operation-logs"); the
// /api/export route expects underscore keys (e.g. "operation_logs").
// Normalize here so both forms work.
const TYPE_ALIASES: Record<string, string> = {
  'operation-logs': 'operation_logs',
  'water-chemistry': 'water_chemistry',
  operation_logs: 'operation_logs',
  water_chemistry: 'water_chemistry',
  maintenance: 'maintenance',
  inspections: 'inspections',
  calculations: 'calculations',
};

function resolveApiType(dataType: string): string | null {
  if (TYPE_ALIASES[dataType]) return TYPE_ALIASES[dataType];
  const normalized = dataType.replace(/-/g, '_');
  return TYPE_ALIASES[normalized] ?? null;
}

function parseFilename(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

export function ExportButton({ factoryId, dataType }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownloadCsv = async () => {
    if (!factoryId) {
      toast({
        title: 'No factory selected',
        description: 'Please select a factory before exporting.',
        variant: 'destructive',
      });
      return;
    }
    const apiType = resolveApiType(dataType);
    if (!apiType) {
      toast({
        title: 'Export not supported',
        description: `Unknown data type "${dataType}".`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/export?type=${encodeURIComponent(apiType)}&factoryId=${encodeURIComponent(factoryId)}`
      );
      if (!res.ok) {
        let msg = `Export failed (${res.status})`;
        try {
          const err = await res.json();
          if (err?.error) msg = err.error;
        } catch {
          /* response wasn't JSON */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const fallback = `${dataType}-export-${new Date().toISOString().split('T')[0]}.csv`;
      const filename = parseFilename(res.headers.get('Content-Disposition'), fallback);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Export complete',
        description: `${filename} downloaded successfully.`,
      });
    } catch (err) {
      console.error('Export error:', err);
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Could not download the export. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadCsv} disabled={loading}>
          <FileDown className="h-4 w-4 mr-2" />
          Download CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
