import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/reports/generate-pdf
 * Body: { factoryId, reportType, dateFrom?, dateTo?, boilerId? }
 * reportType: "inspection" | "maintenance" | "water_chemistry" | "operation_summary" | "efficiency"
 *
 * Returns a professional, print-friendly HTML document that the browser can
 * either save directly or print to PDF. Content-Type: text/html with
 * Content-Disposition: attachment.
 */

// ---------- helpers ----------

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDateRange(dateFrom?: string, dateTo?: string): string {
  if (!dateFrom && !dateTo) return 'All Time';
  if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
  if (dateFrom) return `From ${dateFrom}`;
  return `Up to ${dateTo}`;
}

function safeNum(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function avg(values: number[]): string {
  if (values.length === 0) return '—';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
}

function sum(values: number[]): string {
  return values.reduce((a, b) => a + b, 0).toFixed(2);
}

function buildHtmlDocument(opts: {
  factoryName: string;
  factoryLocation?: string | null;
  reportTitle: string;
  dateRange: string;
  subtitle?: string;
  summaryCards?: { label: string; value: string; hint?: string }[];
  bodyHtml: string;
}): string {
  const { factoryName, factoryLocation, reportTitle, dateRange, subtitle, summaryCards = [], bodyHtml } = opts;
  const generatedOn = new Date().toLocaleString();

  const cardsHtml = summaryCards.length
    ? `<div class="cards">
         ${summaryCards
           .map(
             (c) => `<div class="card">
               <div class="card-label">${escapeHtml(c.label)}</div>
               <div class="card-value">${escapeHtml(c.value)}</div>
               ${c.hint ? `<div class="card-hint">${escapeHtml(c.hint)}</div>` : ''}
             </div>`
           )
           .join('')}
       </div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)} — ${escapeHtml(factoryName)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937; background: #f3f4f6;
      font-size: 13px; line-height: 1.5;
    }
    .page {
      max-width: 1100px; margin: 24px auto; background: #fff;
      padding: 40px 48px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      border-radius: 8px;
    }
    .toolbar {
      max-width: 1100px; margin: 24px auto 0; display: flex; justify-content: flex-end; gap: 8px;
    }
    .toolbar button {
      background: #0f766e; color: #fff; border: none; padding: 9px 18px;
      border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .toolbar button:hover { background: #0d5c55; }
    header.report-header {
      border-bottom: 3px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px;
      display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
    }
    .brand .brand-name { font-size: 22px; font-weight: 700; color: #0f766e; letter-spacing: -0.01em; }
    .brand .brand-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #4b5563; }
    .meta .meta-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .meta .meta-row { margin-top: 2px; }
    .meta .meta-label { color: #6b7280; }
    h2.section-title {
      font-size: 15px; font-weight: 700; color: #111827; margin: 32px 0 12px;
      padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .subtitle { font-size: 13px; color: #4b5563; margin: -16px 0 20px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
    .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; }
    .card-value { font-size: 22px; font-weight: 700; color: #0f766e; margin-top: 6px; }
    .card-hint { font-size: 11px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th {
      background: #0f766e; color: #fff; text-align: left; padding: 9px 10px;
      font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em;
      border: 1px solid #0f766e;
    }
    tbody td { padding: 8px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
    tbody tr:nth-child(even) td { background: #f9fafb; }
    tbody tr:hover td { background: #ecfdf5; }
    .empty { padding: 40px; text-align: center; color: #9ca3af; font-style: italic; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .muted { color: #6b7280; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-pass { background: #d1fae5; color: #065f46; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-info { background: #e0e7ff; color: #3730a3; }
    .trend-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .trend-label { width: 220px; font-size: 11px; color: #4b5563; }
    .trend-track { flex: 1; background: #f3f4f6; border-radius: 4px; height: 14px; position: relative; overflow: hidden; }
    .trend-fill { height: 100%; background: linear-gradient(90deg, #14b8a6, #0f766e); border-radius: 4px; }
    .trend-val { width: 60px; font-size: 11px; font-weight: 600; color: #111827; text-align: right; }
    footer.report-footer {
      margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb;
      display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;
    }
    .signatures { display: flex; justify-content: space-between; margin-top: 60px; gap: 48px; }
    .sig-block { flex: 1; }
    .sig-line { border-top: 1px solid #9ca3af; margin-top: 40px; padding-top: 6px; font-size: 11px; color: #6b7280; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .page { box-shadow: none; margin: 0; max-width: 100%; padding: 0; border-radius: 0; }
      thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .card, .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 18mm 16mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="page">
    <header class="report-header">
      <div class="brand">
        <div class="brand-name">${escapeHtml(factoryName)}</div>
        <div class="brand-sub">Boiler Management System${factoryLocation ? ' • ' + escapeHtml(factoryLocation) : ''}</div>
      </div>
      <div class="meta">
        <div class="meta-title">${escapeHtml(reportTitle)}</div>
        <div class="meta-row"><span class="meta-label">Date Range:</span> ${escapeHtml(dateRange)}</div>
        <div class="meta-row"><span class="meta-label">Generated:</span> ${escapeHtml(generatedOn)}</div>
      </div>
    </header>

    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
    ${cardsHtml}

    ${bodyHtml}

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">Prepared By</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Reviewed By</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Authorized Signature</div>
      </div>
    </div>

    <footer class="report-footer">
      <span>Confidential — ${escapeHtml(factoryName)} Boiler Management System</span>
      <span>Generated on ${escapeHtml(generatedOn)}</span>
    </footer>
  </div>
</body>
</html>`;
}

function tableHtml(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `<div class="empty">No records found for the selected criteria.</div>`;
  }
  return `<table>
    <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`;
}

// ---------- main handler ----------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factoryId, reportType, dateFrom, dateTo, boilerId } = body as {
      factoryId?: string;
      reportType?: string;
      dateFrom?: string;
      dateTo?: string;
      boilerId?: string;
    };

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    }
    if (!reportType) {
      return NextResponse.json({ error: 'reportType is required' }, { status: 400 });
    }

    const validTypes = ['inspection', 'maintenance', 'water_chemistry', 'operation_summary', 'efficiency'];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: `Invalid reportType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const factory = await db.factory.findUnique({ where: { id: factoryId } });
    if (!factory) {
      return NextResponse.json({ error: 'Factory not found' }, { status: 404 });
    }

    // Build common where clause with date + boiler filters
    const where: Record<string, unknown> = { factoryId };
    if (boilerId) where.boilerId = boilerId;

    const dateRangeStr = fmtDateRange(dateFrom, dateTo);

    let reportTitle = '';
    let subtitle = '';
    let summaryCards: { label: string; value: string; hint?: string }[] = [];
    let bodyHtml = '';

    if (reportType === 'inspection') {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;
      if (Object.keys(dateFilter).length) where.inspectionDate = dateFilter;

      const records = (await db.inspectionRecord.findMany({
        where,
        orderBy: { inspectionDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      })) as unknown as Array<Record<string, unknown>>;

      reportTitle = 'Inspection Report';
      subtitle = 'Records of statutory, internal, external, NDT, and compliance inspections.';

      const passed = records.filter((r) => r.status === 'Passed').length;
      const failed = records.filter((r) => r.status === 'Failed').length;
      const scheduled = records.filter((r) => r.status === 'Scheduled').length;

      summaryCards = [
        { label: 'Total Inspections', value: String(records.length) },
        { label: 'Passed', value: String(passed), hint: `${records.length ? ((passed / records.length) * 100).toFixed(1) : 0}% pass rate` },
        { label: 'Failed', value: String(failed), hint: 'Requires corrective action' },
        { label: 'Scheduled', value: String(scheduled), hint: 'Upcoming inspections' },
      ];

      const headers = ['Date', 'Boiler', 'Type', 'Inspector', 'Authority', 'Cert. No.', 'Status', 'Pressure Test', 'Hydro Test', 'Next Insp.', 'Findings'];
      const rows = records.map((r) => {
        const boiler = r.boiler as { name?: string } | null;
        const status = String(r.status ?? '');
        return [
          escapeHtml(r.inspectionDate),
          escapeHtml(boiler?.name || '—'),
          escapeHtml(r.inspectionType),
          escapeHtml(r.inspectorName || '—'),
          escapeHtml(r.authority || '—'),
          escapeHtml(r.certificateNo || '—'),
          `<span class="badge ${status === 'Passed' ? 'badge-pass' : status === 'Failed' ? 'badge-fail' : 'badge-info'}">${escapeHtml(status)}</span>`,
          escapeHtml(r.pressureTestResult || '—'),
          escapeHtml(r.hydroTestResult || '—'),
          escapeHtml(r.nextInspectionDate || '—'),
          escapeHtml(r.findings || '—'),
        ];
      });

      bodyHtml = `<h2 class="section-title">Inspection Records</h2>${tableHtml(headers, rows)}`;
    }

    else if (reportType === 'maintenance') {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;
      if (Object.keys(dateFilter).length) where.logDate = dateFilter;

      const logs = (await db.maintenanceLog.findMany({
        where,
        orderBy: { logDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      })) as unknown as Array<Record<string, unknown>>;

      reportTitle = 'Maintenance Report';
      subtitle = 'Preventive, reactive, and predictive maintenance logs.';

      const completed = logs.filter((l) => l.status === 'Completed').length;
      const pending = logs.filter((l) => l.status === 'Pending').length;
      const inProgress = logs.filter((l) => l.status === 'In Progress').length;
      const totalCost = sum(logs.map((l) => safeNum(l.cost)));

      summaryCards = [
        { label: 'Total Records', value: String(logs.length) },
        { label: 'Completed', value: String(completed), hint: `${logs.length ? ((completed / logs.length) * 100).toFixed(1) : 0}% completion` },
        { label: 'Pending / In Progress', value: String(pending + inProgress) },
        { label: 'Total Cost', value: totalCost, hint: 'Currency units' },
      ];

      const headers = ['Date', 'Boiler', 'Type', 'Frequency', 'Task', 'Priority', 'Status', 'Performed By', 'Cost', 'Parts Used', 'Next Due', 'Remarks'];
      const rows = logs.map((l) => {
        const boiler = l.boiler as { name?: string } | null;
        const priority = String(l.priority ?? '');
        const status = String(l.status ?? '');
        return [
          escapeHtml(l.logDate),
          escapeHtml(boiler?.name || '—'),
          escapeHtml(l.maintenanceType),
          escapeHtml(l.frequency),
          escapeHtml(l.taskTitle),
          `<span class="badge ${priority === 'Critical' ? 'badge-fail' : priority === 'High' ? 'badge-warn' : 'badge-info'}">${escapeHtml(priority)}</span>`,
          `<span class="badge ${status === 'Completed' ? 'badge-pass' : status === 'Deferred' ? 'badge-warn' : 'badge-info'}">${escapeHtml(status)}</span>`,
          escapeHtml(l.performedBy || '—'),
          escapeHtml(l.cost || '—'),
          escapeHtml(l.partsUsed || '—'),
          escapeHtml(l.nextDueDate || '—'),
          escapeHtml(l.remarks || '—'),
        ];
      });

      bodyHtml = `<h2 class="section-title">Maintenance Records</h2>${tableHtml(headers, rows)}`;
    }

    else if (reportType === 'water_chemistry') {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;
      if (Object.keys(dateFilter).length) where.testDate = dateFilter;

      const records = (await db.waterChemistry.findMany({
        where,
        orderBy: { testDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      })) as unknown as Array<Record<string, unknown>>;

      reportTitle = 'Water Chemistry Report';
      subtitle = 'Boiler water quality analysis and treatment compliance.';

      const compliant = records.filter((r) => r.withinLimits === 'Yes').length;
      const nonCompliant = records.filter((r) => r.withinLimits === 'No').length;
      const phValues = records.map((r) => safeNum(r.ph)).filter((n) => n > 0);

      summaryCards = [
        { label: 'Total Tests', value: String(records.length) },
        { label: 'Within Limits', value: String(compliant), hint: `${records.length ? ((compliant / records.length) * 100).toFixed(1) : 0}% compliance` },
        { label: 'Out of Range', value: String(nonCompliant), hint: 'Action required' },
        { label: 'Avg pH', value: avg(phValues), hint: 'Target range: 9.5 – 11.0' },
      ];

      const headers = ['Date', 'Boiler', 'Sample Type', 'pH', 'Conductivity', 'T. Hardness', 'T. Alkalinity', 'Chloride', 'TDS', 'Silica', 'Phosphate', 'Within Limits', 'Tested By'];
      const rows = records.map((r) => {
        const boiler = r.boiler as { name?: string } | null;
        const within = String(r.withinLimits ?? '');
        return [
          escapeHtml(r.testDate),
          escapeHtml(boiler?.name || '—'),
          escapeHtml(r.sampleType),
          escapeHtml(r.ph || '—'),
          escapeHtml(r.conductivity || '—'),
          escapeHtml(r.totalHardness || '—'),
          escapeHtml(r.totalAlkalinity || '—'),
          escapeHtml(r.chloride || '—'),
          escapeHtml(r.totalDissolvedSolids || '—'),
          escapeHtml(r.silica || '—'),
          escapeHtml(r.phosphate || '—'),
          `<span class="badge ${within === 'Yes' ? 'badge-pass' : 'badge-fail'}">${escapeHtml(within)}</span>`,
          escapeHtml(r.testedBy || '—'),
        ];
      });

      bodyHtml = `<h2 class="section-title">Water Chemistry Records</h2>${tableHtml(headers, rows)}`;
    }

    else if (reportType === 'operation_summary') {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;
      if (Object.keys(dateFilter).length) where.logDate = dateFilter;

      const logs = (await db.operationLog.findMany({
        where,
        orderBy: [{ logDate: 'desc' }, { hour: 'asc' }],
        include: { boiler: { select: { name: true } } },
      })) as unknown as Array<Record<string, unknown>>;

      reportTitle = 'Operation Summary Report';
      subtitle = 'Hourly boiler operating parameters and shift coverage.';

      const pressureVals = logs.map((l) => safeNum(l.steamPressure)).filter((n) => n > 0);
      const steamTempVals = logs.map((l) => safeNum(l.steamTemp)).filter((n) => n > 0);
      const fuelVals = logs.map((l) => safeNum(l.fuelConsumption)).filter((n) => n > 0);
      const flueVals = logs.map((l) => safeNum(l.flueGasTemp)).filter((n) => n > 0);
      const blowdowns = logs.filter((l) => l.blowdownDone === 'Yes').length;

      summaryCards = [
        { label: 'Total Log Entries', value: String(logs.length) },
        { label: 'Avg Steam Pressure', value: `${avg(pressureVals)} bar` },
        { label: 'Total Fuel Used', value: `${sum(fuelVals)} kg`, hint: 'Sum of hourly consumption' },
        { label: 'Blowdowns', value: String(blowdowns), hint: `${logs.length ? ((blowdowns / logs.length) * 100).toFixed(1) : 0}% of entries` },
      ];

      const headers = ['Date', 'Hour', 'Boiler', 'Shift', 'Pressure (bar)', 'Steam T (°C)', 'FW T (°C)', 'Water Lvl (%)', 'Fuel (kg/hr)', 'Flue Gas (°C)', 'Blowdown', 'Operator', 'Remarks'];
      const rows = logs.map((l) => {
        const boiler = l.boiler as { name?: string } | null;
        const blowdown = String(l.blowdownDone ?? '');
        return [
          escapeHtml(l.logDate),
          escapeHtml(l.hour),
          escapeHtml(boiler?.name || '—'),
          escapeHtml(l.shift || '—'),
          escapeHtml(l.steamPressure || '—'),
          escapeHtml(l.steamTemp || '—'),
          escapeHtml(l.feedwaterTemp || '—'),
          escapeHtml(l.waterLevel || '—'),
          escapeHtml(l.fuelConsumption || '—'),
          escapeHtml(l.flueGasTemp || '—'),
          `<span class="badge ${blowdown === 'Yes' ? 'badge-pass' : 'badge-info'}">${escapeHtml(blowdown)}</span>`,
          escapeHtml(l.operatorName || '—'),
          escapeHtml(l.remarks || '—'),
        ];
      });

      const statsTable = tableHtml(
        ['Metric', 'Average', 'Total', 'Min', 'Max'],
        [
          ['Steam Pressure (bar)', avg(pressureVals), '—', pressureVals.length ? Math.min(...pressureVals).toFixed(2) : '—', pressureVals.length ? Math.max(...pressureVals).toFixed(2) : '—'],
          ['Steam Temp (°C)', avg(steamTempVals), '—', steamTempVals.length ? Math.min(...steamTempVals).toFixed(2) : '—', steamTempVals.length ? Math.max(...steamTempVals).toFixed(2) : '—'],
          ['Fuel Consumption (kg/hr)', avg(fuelVals), sum(fuelVals), fuelVals.length ? Math.min(...fuelVals).toFixed(2) : '—', fuelVals.length ? Math.max(...fuelVals).toFixed(2) : '—'],
          ['Flue Gas Temp (°C)', avg(flueVals), '—', flueVals.length ? Math.min(...flueVals).toFixed(2) : '—', flueVals.length ? Math.max(...flueVals).toFixed(2) : '—'],
        ]
      );

      bodyHtml = `
        <h2 class="section-title">Operating Statistics</h2>
        ${statsTable}
        <h2 class="section-title">Hourly Log Entries</h2>
        ${tableHtml(headers, rows)}
      `;
    }

    else if (reportType === 'efficiency') {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = dateFrom;
      if (dateTo) dateFilter.lte = dateTo;
      if (Object.keys(dateFilter).length) where.calcDate = dateFilter;

      const calcs = (await db.boilerCalculation.findMany({
        where,
        orderBy: { calcDate: 'asc' },
        include: { boiler: { select: { name: true } } },
      })) as unknown as Array<Record<string, unknown>>;

      reportTitle = 'Boiler Efficiency Report';
      subtitle = 'Efficiency calculations, heat balance, and flue gas analysis.';

      const effVals = calcs.map((c) => safeNum(c.boilerEfficiency)).filter((n) => n > 0);
      const heatInVals = calcs.map((c) => safeNum(c.heatInput)).filter((n) => n > 0);
      const heatOutVals = calcs.map((c) => safeNum(c.heatOutput)).filter((n) => n > 0);
      const stackLossVals = calcs.map((c) => safeNum(c.stackLoss)).filter((n) => n > 0);

      const minEff = effVals.length ? Math.min(...effVals).toFixed(2) : '—';
      const maxEff = effVals.length ? Math.max(...effVals).toFixed(2) : '—';

      summaryCards = [
        { label: 'Total Calculations', value: String(calcs.length) },
        { label: 'Avg Efficiency', value: `${avg(effVals)}%`, hint: `Min ${minEff}% • Max ${maxEff}%` },
        { label: 'Avg Heat Input', value: `${avg(heatInVals)} kW` },
        { label: 'Avg Stack Loss', value: `${avg(stackLossVals)}%`, hint: 'Lower is better' },
      ];

      const maxEffForScale = effVals.length ? Math.max(...effVals) : 100;
      const trendRows = calcs
        .filter((c) => safeNum(c.boilerEfficiency) > 0)
        .map((c) => {
          const eff = safeNum(c.boilerEfficiency);
          const boiler = c.boiler as { name?: string } | null;
          const pct = maxEffForScale > 0 ? (eff / maxEffForScale) * 100 : 0;
          return `<div class="trend-row">
            <span class="trend-label">${escapeHtml(c.calcDate)} • ${escapeHtml(boiler?.name || '—')}</span>
            <span class="trend-track"><span class="trend-fill" style="width:${pct.toFixed(1)}%"></span></span>
            <span class="trend-val">${eff.toFixed(2)}%</span>
          </div>`;
        })
        .join('');

      const trendHtml = trendRows
        ? `<h2 class="section-title">Efficiency Trend</h2><div class="trend-chart">${trendRows}</div>`
        : '';

      const headers = ['Date', 'Boiler', 'Fuel', 'Pressure (bar)', 'Efficiency (%)', 'Heat In (kW)', 'Heat Out (kW)', 'Evap. Rate', 'CO2 (%)', 'O2 (%)', 'Stack Loss (%)', 'Rad. Loss (%)', 'Calc. By'];
      const rows = calcs
        .slice()
        .reverse()
        .map((c) => {
          const boiler = c.boiler as { name?: string } | null;
          const effNum = safeNum(c.boilerEfficiency);
          const hasEff = Boolean(c.boilerEfficiency);
          return [
            escapeHtml(c.calcDate),
            escapeHtml(boiler?.name || '—'),
            escapeHtml(c.fuelType || '—'),
            escapeHtml(c.steamPressure || '—'),
            hasEff
              ? `<span class="badge ${effNum >= 80 ? 'badge-pass' : effNum >= 70 ? 'badge-warn' : 'badge-fail'}">${escapeHtml(c.boilerEfficiency)}%</span>`
              : '—',
            escapeHtml(c.heatInput || '—'),
            escapeHtml(c.heatOutput || '—'),
            escapeHtml(c.evaporationRate || '—'),
            escapeHtml(c.co2Percentage || '—'),
            escapeHtml(c.o2Percentage || '—'),
            escapeHtml(c.stackLoss || '—'),
            escapeHtml(c.radiationLoss || '—'),
            escapeHtml(c.calculatedBy || '—'),
          ];
        });

      const heatBalance = tableHtml(
        ['Heat Balance Item', 'Average', 'Total'],
        [
          ['Heat Input (kW)', avg(heatInVals), sum(heatInVals)],
          ['Heat Output (kW)', avg(heatOutVals), sum(heatOutVals)],
          ['Stack Loss (%)', avg(stackLossVals), '—'],
          ['Boiler Efficiency (%)', avg(effVals), '—'],
        ]
      );

      bodyHtml = `
        ${trendHtml}
        <h2 class="section-title">Heat Balance Summary</h2>
        ${heatBalance}
        <h2 class="section-title">Efficiency Calculation Records</h2>
        ${tableHtml(headers, rows)}
      `;
    }

    const html = buildHtmlDocument({
      factoryName: factory.name,
      factoryLocation: factory.location,
      reportTitle,
      dateRange: dateRangeStr,
      subtitle,
      summaryCards,
      bodyHtml,
    });

    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('PDF report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 });
  }
}
