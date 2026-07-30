import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/reports/monthly-summary
 * Body: { factoryId, month }
 *   - factoryId: string (required)
 *   - month: string "YYYY-MM" e.g. "2026-07" (required)
 *
 * Returns a comprehensive monthly summary HTML report covering:
 *   - Operation stats
 *   - Maintenance completed
 *   - Water chemistry compliance
 *   - Efficiency trends
 *
 * Response: text/html with Content-Disposition: attachment.
 */

// ---------- helpers (kept local to avoid touching existing files) ----------

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function monthBounds(month: string): { start: string; end: string; display: string } | null {
  // Accept "YYYY-MM"
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10);
  if (mon < 1 || mon > 12) return null;
  const start = `${year}-${String(mon).padStart(2, '0')}-01`;
  // Last day of month
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const display = new Date(year, mon - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, display };
}

function buildHtmlDocument(opts: {
  factoryName: string;
  factoryLocation?: string | null;
  reportTitle: string;
  monthLabel: string;
  subtitle?: string;
  summaryCards?: { label: string; value: string; hint?: string }[];
  bodyHtml: string;
}): string {
  const { factoryName, factoryLocation, reportTitle, monthLabel, subtitle, summaryCards = [], bodyHtml } = opts;
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
  <title>${escapeHtml(reportTitle)} — ${escapeHtml(monthLabel)} — ${escapeHtml(factoryName)}</title>
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
      background: #b45309; color: #fff; border: none; padding: 9px 18px;
      border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .toolbar button:hover { background: #92400e; }
    header.report-header {
      border-bottom: 3px solid #b45309; padding-bottom: 16px; margin-bottom: 24px;
      display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
    }
    .brand .brand-name { font-size: 22px; font-weight: 700; color: #b45309; letter-spacing: -0.01em; }
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
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .card { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; }
    .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e; font-weight: 600; }
    .card-value { font-size: 22px; font-weight: 700; color: #b45309; margin-top: 6px; }
    .card-hint { font-size: 11px; color: #6b7280; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th {
      background: #b45309; color: #fff; text-align: left; padding: 9px 10px;
      font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em;
      border: 1px solid #b45309;
    }
    tbody td { padding: 8px 10px; border: 1px solid #e5e7eb; vertical-align: top; }
    tbody tr:nth-child(even) td { background: #fefce8; }
    .empty { padding: 32px; text-align: center; color: #9ca3af; font-style: italic; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-pass { background: #d1fae5; color: #065f46; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-info { background: #e0e7ff; color: #3730a3; }
    .trend-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
    .trend-label { width: 180px; font-size: 11px; color: #4b5563; }
    .trend-track { flex: 1; background: #f3f4f6; border-radius: 4px; height: 14px; position: relative; overflow: hidden; }
    .trend-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #b45309); border-radius: 4px; }
    .trend-val { width: 60px; font-size: 11px; font-weight: 600; color: #111827; text-align: right; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 12px 0 24px; }
    .summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
    .summary-box h3 { margin: 0 0 10px; font-size: 13px; color: #b45309; text-transform: uppercase; letter-spacing: 0.04em; }
    .summary-box ul { margin: 0; padding-left: 18px; font-size: 12px; color: #374151; }
    .summary-box li { margin: 4px 0; }
    .summary-box .stat-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #e5e7eb; font-size: 12px; }
    .summary-box .stat-row:last-child { border-bottom: none; }
    .summary-box .stat-label { color: #6b7280; }
    .summary-box .stat-value { font-weight: 600; color: #111827; }
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
      thead th, tbody tr:nth-child(even) td, .card, .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
        <div class="meta-row"><span class="meta-label">Month:</span> ${escapeHtml(monthLabel)}</div>
        <div class="meta-row"><span class="meta-label">Generated:</span> ${escapeHtml(generatedOn)}</div>
      </div>
    </header>

    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
    ${cardsHtml}

    ${bodyHtml}

    <div class="signatures">
      <div class="sig-block"><div class="sig-line">Prepared By</div></div>
      <div class="sig-block"><div class="sig-line">Reviewed By</div></div>
      <div class="sig-block"><div class="sig-line">Plant Manager</div></div>
    </div>

    <footer class="report-footer">
      <span>Confidential — ${escapeHtml(factoryName)} Monthly Boiler Report</span>
      <span>Generated on ${escapeHtml(generatedOn)}</span>
    </footer>
  </div>
</body>
</html>`;
}

function tableHtml(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return `<div class="empty">No records found for this month.</div>`;
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
    const { factoryId, month } = body as { factoryId?: string; month?: string };

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    }
    if (!month) {
      return NextResponse.json({ error: 'month is required (format: YYYY-MM, e.g. 2026-07)' }, { status: 400 });
    }

    const bounds = monthBounds(month);
    if (!bounds) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM (e.g. 2026-07).' }, { status: 400 });
    }

    const factory = await db.factory.findUnique({ where: { id: factoryId } });
    if (!factory) {
      return NextResponse.json({ error: 'Factory not found' }, { status: 404 });
    }

    const dateFilter = { gte: bounds.start, lte: bounds.end };
    const baseWhere = { factoryId };

    // Fetch all relevant data in parallel
    const [operationLogs, maintenanceLogs, waterChemRecords, calcRecords, boilers] = await Promise.all([
      db.operationLog.findMany({
        where: { ...baseWhere, logDate: dateFilter },
        orderBy: [{ logDate: 'desc' }, { hour: 'asc' }],
        include: { boiler: { select: { name: true } } },
      }),
      db.maintenanceLog.findMany({
        where: { ...baseWhere, logDate: dateFilter },
        orderBy: { logDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      }),
      db.waterChemistry.findMany({
        where: { ...baseWhere, testDate: dateFilter },
        orderBy: { testDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      }),
      db.boilerCalculation.findMany({
        where: { ...baseWhere, calcDate: dateFilter },
        orderBy: { calcDate: 'asc' },
        include: { boiler: { select: { name: true } } },
      }),
      db.boiler.findMany({ where: baseWhere, select: { id: true, name: true } }),
    ]);

    const opLogs = operationLogs as unknown as Array<Record<string, unknown>>;
    const mLogs = maintenanceLogs as unknown as Array<Record<string, unknown>>;
    const wcRecords = waterChemRecords as unknown as Array<Record<string, unknown>>;
    const effRecords = calcRecords as unknown as Array<Record<string, unknown>>;

    // ----- Compute summary stats -----

    // Operations
    const pressureVals = opLogs.map((l) => safeNum(l.steamPressure)).filter((n) => n > 0);
    const fuelVals = opLogs.map((l) => safeNum(l.fuelConsumption)).filter((n) => n > 0);
    const flueVals = opLogs.map((l) => safeNum(l.flueGasTemp)).filter((n) => n > 0);
    const blowdownCount = opLogs.filter((l) => l.blowdownDone === 'Yes').length;
    const uniqueOpDates = new Set(opLogs.map((l) => String(l.logDate))).size;
    const uniqueOperators = new Set(
      opLogs.map((l) => l.operatorName).filter((n) => n != null && n !== '')
    ).size;

    // Maintenance
    const maintCompleted = mLogs.filter((l) => l.status === 'Completed').length;
    const maintPending = mLogs.filter((l) => l.status === 'Pending').length;
    const maintInProgress = mLogs.filter((l) => l.status === 'In Progress').length;
    const maintDeferred = mLogs.filter((l) => l.status === 'Deferred').length;
    const maintCost = sum(mLogs.map((l) => safeNum(l.cost)));
    const criticalMaint = mLogs.filter((l) => l.priority === 'Critical').length;

    // Water chemistry
    const wcCompliant = wcRecords.filter((r) => r.withinLimits === 'Yes').length;
    const wcNonCompliant = wcRecords.filter((r) => r.withinLimits === 'No').length;
    const wcCompliancePct = wcRecords.length ? ((wcCompliant / wcRecords.length) * 100).toFixed(1) : '0.0';
    const phValues = wcRecords.map((r) => safeNum(r.ph)).filter((n) => n > 0);
    const condValues = wcRecords.map((r) => safeNum(r.conductivity)).filter((n) => n > 0);
    const tdsValues = wcRecords.map((r) => safeNum(r.totalDissolvedSolids)).filter((n) => n > 0);

    // Efficiency
    const effVals = effRecords.map((c) => safeNum(c.boilerEfficiency)).filter((n) => n > 0);
    const heatInVals = effRecords.map((c) => safeNum(c.heatInput)).filter((n) => n > 0);
    const heatOutVals = effRecords.map((c) => safeNum(c.heatOutput)).filter((n) => n > 0);
    const stackLossVals = effRecords.map((c) => safeNum(c.stackLoss)).filter((n) => n > 0);
    const minEff = effVals.length ? Math.min(...effVals).toFixed(2) : '—';
    const maxEff = effVals.length ? Math.max(...effVals).toFixed(2) : '—';

    // ----- Summary cards -----
    const summaryCards = [
      { label: 'Operation Log Entries', value: String(opLogs.length), hint: `${uniqueOpDates} active days` },
      { label: 'Maintenance Completed', value: `${maintCompleted} / ${mLogs.length}`, hint: `${mLogs.length ? ((maintCompleted / mLogs.length) * 100).toFixed(1) : 0}% completion` },
      { label: 'Water Chemistry Compliance', value: `${wcCompliancePct}%`, hint: `${wcCompliant} of ${wcRecords.length} tests within limits` },
      { label: 'Avg Boiler Efficiency', value: `${avg(effVals)}%`, hint: `Range: ${minEff}% – ${maxEff}%` },
    ];

    // ----- Body: section by section -----

    // 1. Operations summary box + table
    const opSummaryBox = `
      <div class="summary-box">
        <h3>Operations Overview</h3>
        <div class="stat-row"><span class="stat-label">Total log entries</span><span class="stat-value">${opLogs.length}</span></div>
        <div class="stat-row"><span class="stat-label">Active operating days</span><span class="stat-value">${uniqueOpDates}</span></div>
        <div class="stat-row"><span class="stat-label">Operators on duty</span><span class="stat-value">${uniqueOperators}</span></div>
        <div class="stat-row"><span class="stat-label">Avg steam pressure</span><span class="stat-value">${avg(pressureVals)} bar</span></div>
        <div class="stat-row"><span class="stat-label">Total fuel consumed</span><span class="stat-value">${sum(fuelVals)} kg</span></div>
        <div class="stat-row"><span class="stat-label">Avg flue gas temp</span><span class="stat-value">${avg(flueVals)} °C</span></div>
        <div class="stat-row"><span class="stat-label">Blowdown events</span><span class="stat-value">${blowdownCount}</span></div>
      </div>`;

    const opTable = tableHtml(
      ['Date', 'Hour', 'Boiler', 'Shift', 'Pressure (bar)', 'Steam T (°C)', 'Fuel (kg/hr)', 'Flue Gas (°C)', 'Blowdown', 'Operator'],
      opLogs.slice(0, 50).map((l) => {
        const boiler = l.boiler as { name?: string } | null;
        const blowdown = String(l.blowdownDone ?? '');
        return [
          escapeHtml(l.logDate),
          escapeHtml(l.hour),
          escapeHtml(boiler?.name || '—'),
          escapeHtml(l.shift || '—'),
          escapeHtml(l.steamPressure || '—'),
          escapeHtml(l.steamTemp || '—'),
          escapeHtml(l.fuelConsumption || '—'),
          escapeHtml(l.flueGasTemp || '—'),
          `<span class="badge ${blowdown === 'Yes' ? 'badge-pass' : 'badge-info'}">${escapeHtml(blowdown)}</span>`,
          escapeHtml(l.operatorName || '—'),
        ];
      })
    );
    const opNote = opLogs.length > 50
      ? `<p class="empty" style="padding:8px;text-align:left;font-style:normal;color:#6b7280;">Showing first 50 of ${opLogs.length} entries. Full data available in CSV export.</p>`
      : '';

    // 2. Maintenance summary + table
    const maintSummaryBox = `
      <div class="summary-box">
        <h3>Maintenance Overview</h3>
        <div class="stat-row"><span class="stat-label">Total records</span><span class="stat-value">${mLogs.length}</span></div>
        <div class="stat-row"><span class="stat-label">Completed</span><span class="stat-value">${maintCompleted}</span></div>
        <div class="stat-row"><span class="stat-label">In Progress</span><span class="stat-value">${maintInProgress}</span></div>
        <div class="stat-row"><span class="stat-label">Pending</span><span class="stat-value">${maintPending}</span></div>
        <div class="stat-row"><span class="stat-label">Deferred</span><span class="stat-value">${maintDeferred}</span></div>
        <div class="stat-row"><span class="stat-label">Critical priority</span><span class="stat-value">${criticalMaint}</span></div>
        <div class="stat-row"><span class="stat-label">Total maintenance cost</span><span class="stat-value">${maintCost}</span></div>
      </div>`;

    const maintTable = tableHtml(
      ['Date', 'Boiler', 'Type', 'Frequency', 'Task', 'Priority', 'Status', 'Performed By', 'Cost', 'Next Due'],
      mLogs.slice(0, 50).map((l) => {
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
          escapeHtml(l.nextDueDate || '—'),
        ];
      })
    );
    const maintNote = mLogs.length > 50
      ? `<p class="empty" style="padding:8px;text-align:left;font-style:normal;color:#6b7280;">Showing first 50 of ${mLogs.length} records.</p>`
      : '';

    // 3. Water chemistry summary + table
    const wcSummaryBox = `
      <div class="summary-box">
        <h3>Water Chemistry Overview</h3>
        <div class="stat-row"><span class="stat-label">Total tests</span><span class="stat-value">${wcRecords.length}</span></div>
        <div class="stat-row"><span class="stat-label">Within limits</span><span class="stat-value">${wcCompliant} (${wcCompliancePct}%)</span></div>
        <div class="stat-row"><span class="stat-label">Out of range</span><span class="stat-value">${wcNonCompliant}</span></div>
        <div class="stat-row"><span class="stat-label">Avg pH</span><span class="stat-value">${avg(phValues)}</span></div>
        <div class="stat-row"><span class="stat-label">Avg conductivity</span><span class="stat-value">${avg(condValues)}</span></div>
        <div class="stat-row"><span class="stat-label">Avg TDS</span><span class="stat-value">${avg(tdsValues)}</span></div>
      </div>`;

    const wcTable = tableHtml(
      ['Date', 'Boiler', 'Sample Type', 'pH', 'Conductivity', 'T. Hardness', 'Chloride', 'TDS', 'Within Limits', 'Tested By'],
      wcRecords.slice(0, 50).map((r) => {
        const boiler = r.boiler as { name?: string } | null;
        const within = String(r.withinLimits ?? '');
        return [
          escapeHtml(r.testDate),
          escapeHtml(boiler?.name || '—'),
          escapeHtml(r.sampleType),
          escapeHtml(r.ph || '—'),
          escapeHtml(r.conductivity || '—'),
          escapeHtml(r.totalHardness || '—'),
          escapeHtml(r.chloride || '—'),
          escapeHtml(r.totalDissolvedSolids || '—'),
          `<span class="badge ${within === 'Yes' ? 'badge-pass' : 'badge-fail'}">${escapeHtml(within)}</span>`,
          escapeHtml(r.testedBy || '—'),
        ];
      })
    );
    const wcNote = wcRecords.length > 50
      ? `<p class="empty" style="padding:8px;text-align:left;font-style:normal;color:#6b7280;">Showing first 50 of ${wcRecords.length} records.</p>`
      : '';

    // 4. Efficiency trend + table
    const maxEffForScale = effVals.length ? Math.max(...effVals) : 100;
    const trendRows = effRecords
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

    const effSummaryBox = `
      <div class="summary-box">
        <h3>Efficiency Overview</h3>
        <div class="stat-row"><span class="stat-label">Total calculations</span><span class="stat-value">${effRecords.length}</span></div>
        <div class="stat-row"><span class="stat-label">Avg efficiency</span><span class="stat-value">${avg(effVals)}%</span></div>
        <div class="stat-row"><span class="stat-label">Min efficiency</span><span class="stat-value">${minEff}%</span></div>
        <div class="stat-row"><span class="stat-label">Max efficiency</span><span class="stat-value">${maxEff}%</span></div>
        <div class="stat-row"><span class="stat-label">Avg heat input</span><span class="stat-value">${avg(heatInVals)} kW</span></div>
        <div class="stat-row"><span class="stat-label">Avg heat output</span><span class="stat-value">${avg(heatOutVals)} kW</span></div>
        <div class="stat-row"><span class="stat-label">Avg stack loss</span><span class="stat-value">${avg(stackLossVals)}%</span></div>
      </div>`;

    const effTable = tableHtml(
      ['Date', 'Boiler', 'Fuel', 'Efficiency (%)', 'Heat In (kW)', 'Heat Out (kW)', 'Stack Loss (%)', 'CO2 (%)', 'O2 (%)', 'Calc. By'],
      effRecords.slice().reverse().slice(0, 50).map((c) => {
        const boiler = c.boiler as { name?: string } | null;
        const effNum = safeNum(c.boilerEfficiency);
        const hasEff = Boolean(c.boilerEfficiency);
        return [
          escapeHtml(c.calcDate),
          escapeHtml(boiler?.name || '—'),
          escapeHtml(c.fuelType || '—'),
          hasEff
            ? `<span class="badge ${effNum >= 80 ? 'badge-pass' : effNum >= 70 ? 'badge-warn' : 'badge-fail'}">${escapeHtml(c.boilerEfficiency)}%</span>`
            : '—',
          escapeHtml(c.heatInput || '—'),
          escapeHtml(c.heatOutput || '—'),
          escapeHtml(c.stackLoss || '—'),
          escapeHtml(c.co2Percentage || '—'),
          escapeHtml(c.o2Percentage || '—'),
          escapeHtml(c.calculatedBy || '—'),
        ];
      })
    );

    // Boiler fleet summary
    const boilerRows: string[][] = boilers.map((b) => {
      const bId = b.id;
      const opCount = opLogs.filter((l) => l.boilerId === bId).length;
      const maintCount = mLogs.filter((l) => l.boilerId === bId).length;
      const wcCount = wcRecords.filter((r) => r.boilerId === bId).length;
      const effCount = effRecords.filter((c) => c.boilerId === bId).length;
      const boilerEffs = effRecords
        .filter((c) => c.boilerId === bId)
        .map((c) => safeNum(c.boilerEfficiency))
        .filter((n) => n > 0);
      return [
        escapeHtml(b.name),
        String(opCount),
        String(maintCount),
        String(wcCount),
        String(effCount),
        avg(boilerEffs) + (boilerEffs.length ? '%' : ''),
      ];
    });
    const boilerTable = tableHtml(
      ['Boiler', 'Op Logs', 'Maintenance', 'Water Tests', 'Efficiency Calcs', 'Avg Efficiency'],
      boilerRows
    );

    const bodyHtml = `
      <h2 class="section-title">Executive Summary</h2>
      <div class="summary-grid">
        ${opSummaryBox}
        ${maintSummaryBox}
        ${wcSummaryBox}
        ${effSummaryBox}
      </div>

      <h2 class="section-title">Boiler Fleet Overview</h2>
      ${boilerTable}

      <h2 class="section-title">Operation Logs</h2>
      ${opTable}
      ${opNote}

      <h2 class="section-title">Maintenance Logs</h2>
      ${maintTable}
      ${maintNote}

      <h2 class="section-title">Water Chemistry Records</h2>
      ${wcTable}
      ${wcNote}

      ${trendHtml}
      <h2 class="section-title">Efficiency Calculations</h2>
      ${effTable}
    `;

    const html = buildHtmlDocument({
      factoryName: factory.name,
      factoryLocation: factory.location,
      reportTitle: 'Monthly Summary Report',
      monthLabel: bounds.display,
      subtitle: `Comprehensive monthly boiler operations summary covering operations, maintenance, water chemistry, and efficiency for ${bounds.display}.`,
      summaryCards,
      bodyHtml,
    });

    const filename = `monthly-summary-${month}-${new Date().toISOString().split('T')[0]}.html`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Monthly summary report error:', error);
    return NextResponse.json({ error: 'Failed to generate monthly summary report' }, { status: 500 });
  }
}
