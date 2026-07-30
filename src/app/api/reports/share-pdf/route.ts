import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

function safeNum(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function avg(values: number[]): string {
  if (values.length === 0) return '—';
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

export async function POST(request: NextRequest) {
  try {
    const { factoryId, reportType, dateFrom, dateTo } = await request.json();
    if (!factoryId || !reportType) {
      return NextResponse.json({ error: 'factoryId and reportType required' }, { status: 400 });
    }

    const factory = await db.factory.findUnique({ where: { id: factoryId } });
    if (!factory) return NextResponse.json({ error: 'Factory not found' }, { status: 404 });

    const where: Record<string, unknown> = { factoryId };
    if (dateFrom || dateTo) {
      where.logDate = {} as Record<string, unknown>;
      if (dateFrom) (where.logDate as Record<string, unknown>).gte = dateFrom;
      if (dateTo) (where.logDate as Record<string, unknown>).lte = dateTo;
    }

    const buffers: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    doc.on('data', (chunk) => buffers.push(chunk));

    // === HEADER ===
    doc.rect(0, 0, doc.page.width, 70).fill('#EA580C'); // forest
    doc.fill('#FFFFFF').fontSize(22).font('Helvetica-Bold')
      .text(factory.name.toUpperCase(), 50, 18, { width: doc.page.width - 100 });
    doc.fontSize(9).font('Helvetica').fill('#FED7AA')
      .text(`${factory.city ? factory.city + ', ' : ''}${factory.country || 'Kenya'}  |  ${factory.contactEmail || ''}  |  ${factory.contactPhone || ''}`, 50, 48);

    // Report title bar
    const titles: Record<string, string> = {
      operation: 'DAILY OPERATION LOGS REPORT',
      maintenance: 'MAINTENANCE LOG REPORT',
      inspection: 'INSPECTION RECORDS REPORT',
      water_chemistry: 'WATER CHEMISTRY REPORT',
      efficiency: 'BOILER EFFICIENCY REPORT',
    };
    const title = titles[reportType] || 'REPORT';
    doc.rect(0, 70, doc.page.width, 28).fill('#1E293B'); // foreground
    doc.fill('#FFFFFF').fontSize(12).font('Helvetica-Bold')
      .text(title, 50, 77);
    doc.fontSize(8).font('Helvetica').fill('#CBD5E1')
      .text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}  |  Period: ${dateFrom || 'All'} to ${dateTo || 'All'}`, 320, 78);

    let y = 115;
    const tableLeft = 50;
    const tableWidth = doc.page.width - 100;
    const fontSize = 7.5;
    const rowHeight = 16;

    function addTable(headers: string[], rows: string[][]) {
      if (y + rowHeight * 3 > doc.page.height - 50) { doc.addPage(); y = 50; }

      // Header row
      const colW = tableWidth / headers.length;
      doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#F1F5F9');
      doc.fill('#334155').fontSize(fontSize).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, tableLeft + i * colW + 3, y + 4, { width: colW - 6, height: rowHeight - 4, ellipsis: true });
      });
      y += rowHeight;

      // Data rows
      rows.forEach((row, ri) => {
        if (y + rowHeight > doc.page.height - 50) { doc.addPage(); y = 50; }
        if (ri % 2 === 0) doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#FAFAFA');
        doc.fill('#1E293B').fontSize(fontSize).font('Helvetica');
        row.forEach((cell, i) => {
          doc.text(cell || '—', tableLeft + i * colW + 3, y + 4, { width: colW - 6, height: rowHeight - 4, ellipsis: true });
        });
        y += rowHeight;
      });
      y += 8;
    }

    function addSummaryCards(cards: { label: string; value: string }[]) {
      if (y + 50 > doc.page.height - 50) { doc.addPage(); y = 50; }
      const cardW = (tableWidth - 20) / cards.length;
      cards.forEach((card, i) => {
        const cx = tableLeft + i * (cardW + 5);
        doc.roundedRect(cx, y, cardW, 40, 4).fill('#F8FAFC').stroke('#E2E8F0');
        doc.fill('#64748B').fontSize(7).font('Helvetica').text(card.label, cx + 6, y + 6, { width: cardW - 12 });
        doc.fill('#0F172A').fontSize(14).font('Helvetica-Bold').text(card.value, cx + 6, y + 20, { width: cardW - 12 });
      });
      y += 55;
    }

    // === REPORT DATA ===
    switch (reportType) {
      case 'operation': {
        const logs = await db.operationLog.findMany({
          where: where.logDate ? { factoryId, logDate: where.logDate as Record<string, string> } : { factoryId },
          orderBy: { logDate: 'desc' }, take: 500,
        });
        const pressures = logs.map(l => safeNum(l.steamPressure)).filter(n => n > 0);
        const temps = logs.map(l => safeNum(l.steamTemp)).filter(n => n > 0);
        addSummaryCards([
          { label: 'TOTAL ENTRIES', value: String(logs.length) },
          { label: 'AVG PRESSURE (bar)', value: avg(pressures) },
          { label: 'AVG STEAM TEMP (°C)', value: avg(temps) },
          { label: 'BLOWDOWNS DONE', value: String(logs.filter(l => l.blowdownDone === 'Yes').length) },
        ]);
        addTable(
          ['Date', 'Time', 'Shift', 'Boiler', 'Pressure', 'Steam T', 'FW T', 'Water Lvl', 'Fuel', 'Flue Gas', 'Operator'],
          logs.map(l => [l.logDate, l.hour, l.shift || '', '', l.steamPressure || '', l.steamTemp || '', l.feedwaterTemp || '', l.waterLevel || '', l.fuelConsumption || '', l.flueGasTemp || '', l.operatorName || ''])
        );
        break;
      }
      case 'maintenance': {
        const logs = await db.maintenanceLog.findMany({
          where: where.logDate ? { factoryId, logDate: where.logDate as Record<string, string> } : { factoryId },
          orderBy: { logDate: 'desc' }, take: 500,
        });
        addSummaryCards([
          { label: 'TOTAL TASKS', value: String(logs.length) },
          { label: 'COMPLETED', value: String(logs.filter(l => l.status === 'Completed').length) },
          { label: 'PENDING', value: String(logs.filter(l => l.status === 'Pending').length) },
          { label: 'OVERDUE', value: String(logs.filter(l => { if (!l.nextDueDate) return false; return new Date(l.nextDueDate) < new Date() && l.status !== 'Completed'; }).length) },
        ]);
        addTable(
          ['Date', 'Type', 'Task', 'Frequency', 'Performed By', 'Status', 'Priority', 'Cost', 'Next Due'],
          logs.map(l => [l.logDate, l.maintenanceType, l.taskTitle, l.frequency, l.performedBy || '', l.status, l.priority, l.cost || '', l.nextDueDate || ''])
        );
        break;
      }
      case 'inspection': {
        const records = await db.inspectionRecord.findMany({
          where: where.logDate ? { factoryId, inspectionDate: where.logDate as Record<string, string> } : { factoryId },
          orderBy: { inspectionDate: 'desc' }, take: 500,
        });
        addSummaryCards([
          { label: 'TOTAL INSPECTIONS', value: String(records.length) },
          { label: 'PASSED', value: String(records.filter(r => r.status === 'Passed' || r.status === 'Completed').length) },
          { label: 'SCHEDULED', value: String(records.filter(r => r.status === 'Scheduled').length) },
          { label: 'OVERDUE', value: String(records.filter(r => { if (!r.nextInspectionDate) return false; return new Date(r.nextInspectionDate) < new Date() && r.status !== 'Completed'; }).length) },
        ]);
        addTable(
          ['Date', 'Type', 'Inspector', 'Authority', 'Cert No', 'Status', 'Pressure Test', 'Hydro Test', 'Next Inspection'],
          records.map(r => [r.inspectionDate, r.inspectionType, r.inspectorName || '', r.authority || '', r.certificateNo || '', r.status, r.pressureTestResult || '', r.hydroTestResult || '', r.nextInspectionDate || ''])
        );
        break;
      }
      case 'water_chemistry': {
        const tests = await db.waterChemistry.findMany({
          where: where.logDate ? { factoryId, testDate: where.logDate as Record<string, string> } : { factoryId },
          orderBy: { testDate: 'desc' }, take: 500,
        });
        addSummaryCards([
          { label: 'TOTAL TESTS', value: String(tests.length) },
          { label: 'WITHIN LIMITS', value: String(tests.filter(t => t.withinLimits === 'Yes').length) },
          { label: 'OUT OF LIMITS', value: String(tests.filter(t => t.withinLimits === 'No').length) },
          { label: 'COMPLIANCE %', value: tests.length > 0 ? ((tests.filter(t => t.withinLimits === 'Yes').length / tests.length) * 100).toFixed(1) + '%' : '—' },
        ]);
        addTable(
          ['Date', 'Sample', 'pH', 'Conductivity', 'T.Hardness', 'T.Alkalinity', 'Chloride', 'TDS', 'Silica', 'Phosphate', 'Limits', 'Tested By'],
          tests.map(t => [t.testDate, t.sampleType, t.ph || '', t.conductivity || '', t.totalHardness || '', t.totalAlkalinity || '', t.chloride || '', t.totalDissolvedSolids || '', t.silica || '', t.phosphate || '', t.withinLimits, t.testedBy || ''])
        );
        break;
      }
      case 'efficiency': {
        const calcs = await db.boilerCalculation.findMany({
          where: where.logDate ? { factoryId, calcDate: where.logDate as Record<string, string> } : { factoryId },
          orderBy: { calcDate: 'desc' }, take: 500,
        });
        const effs = calcs.map(c => safeNum(c.boilerEfficiency)).filter(n => n > 0);
        addSummaryCards([
          { label: 'TOTAL CALCULATIONS', value: String(calcs.length) },
          { label: 'AVG EFFICIENCY %', value: avg(effs) },
          { label: 'BEST EFFICIENCY %', value: effs.length > 0 ? String(Math.max(...effs)) : '—' },
          { label: 'LOWEST EFFICIENCY %', value: effs.length > 0 ? String(Math.min(...effs)) : '—' },
        ]);
        addTable(
          ['Date', 'Pressure', 'Steam T', 'Fuel', 'Fuel Used', 'Steam Gen', 'Efficiency %', 'CO2%', 'O2%', 'Stack Loss', 'Rad Loss', 'Calc By'],
          calcs.map(c => [c.calcDate, c.steamPressure || '', c.steamTemp || '', c.fuelType || '', c.fuelConsumption || '', c.steamGenerated || '', c.boilerEfficiency || '', c.co2Percentage || '', c.o2Percentage || '', c.stackLoss || '', c.radiationLoss || '', c.calculatedBy || ''])
        );
        break;
      }
    }

    // === FOOTER ON ALL PAGES ===
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill('#F8FAFC');
      doc.fill('#94A3B8').fontSize(7).font('Helvetica')
        .text(`${factory.name} | Confidential`, 50, doc.page.height - 22, { width: 250 })
        .text(`Page ${i + 1} of ${range.count}`, doc.page.width - 150, doc.page.height - 22, { width: 100, align: 'right' })
        .text('Generated by Boiler Management System', 200, doc.page.height - 22, { width: 200, align: 'center' });
    }

    doc.end();
    await new Promise<void>((resolve) => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(buffers);
    const filename = `${reportType}_${factory.code}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[POST /api/reports/share-pdf]', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
