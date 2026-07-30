// src/app/api/reports/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function buildReportHTML(params) {
  const sectionsHTML = params.sections
    .map((section) => {
      if (section.rows.length === 0) return ''
      const keys = Object.keys(section.rows[0])
      const headerCells = keys
        .map((k) => '<th style="border:1px solid #ddd;padding:8px;text-align:left;background:#f5f5f5;font-weight:600;">' + k.replace(/([A-Z])/g, ' $1').trim() + '</th>')
        .join('')
      const bodyRows = section.rows
        .map(
          (row) =>
            '<tr>' +
            keys.map((k) => '<td style="border:1px solid #ddd;padding:6px;">' + (row[k] ?? '-') + '</td>').join('') +
            '</tr>'
        )
        .join('')
      return (
        '<h2 style="margin-top:24px;color:#333;">' + section.heading + '</h2>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>' + headerCells + '</tr></thead><tbody>' + bodyRows + '</tbody></table>'
      )
    })
    .join('')

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>' + params.title + '</title>' +
    '<style>@page { margin: 20mm; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #222; } h1 { font-size: 20px; margin-bottom: 4px; } .meta { color: #666; font-size: 13px; margin-bottom: 20px; }</style>' +
    '</head><body><h1>' + params.title + '</h1>' +
    '<div class="meta">Factory: ' + params.factoryName + ' &middot; Generated: ' + params.generatedAt + '</div>' +
    (sectionsHTML || '<p>No data found for the selected criteria.</p>') +
    '</body></html>'
}

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const factoryId = searchParams.get('factoryId')
    const reportType = searchParams.get('reportType') || 'operation'
    const boilerId = searchParams.get('boilerId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId query parameter is required' }, { status: 400 })
    }

    const factory = await db.factory.findUnique({ where: { id: factoryId } })
    if (!factory) {
      return NextResponse.json({ error: 'Factory not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { factoryId }
    if (boilerId) where.boilerId = boilerId
    if (from || to) {
      const dateFilter: Record<string, unknown> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.createdAt = dateFilter
    }

    let sections: Record<string, unknown>[] = []
    let title = 'Report'

    switch (reportType) {
      case 'operation': {
        title = 'Operation Logs Report'
        const logs = await db.operationLog.findMany({ where, orderBy: { logDate: 'desc' }, take: 500 })
        sections = [{ heading: 'Operation Logs', rows: logs.map((l) => ({ 'Log Date': l.logDate, Hour: l.hour, 'Steam Pressure': l.steamPressure, 'Steam Temp': l.steamTemp, 'Feedwater Temp': l.feedwaterTemp, 'Water Level': l.waterLevel, 'Fuel Consumption': l.fuelConsumption, 'Flue Gas Temp': l.flueGasTemp, Blowdown: l.blowdownDone, Operator: l.operatorName, Shift: l.shift, Remarks: l.remarks })) }]
        break
      }
      case 'efficiency': {
        title = 'Boiler Efficiency Report'
        const calcs = await db.boilerCalculation.findMany({ where, orderBy: { calcDate: 'desc' }, take: 500 })
        sections = [{ heading: 'Efficiency Calculations', rows: calcs.map((c) => ({ Date: c.calcDate, 'Steam Pressure': c.steamPressure, 'Steam Temp': c.steamTemp, 'Fuel Type': c.fuelType, 'Fuel Consumption': c.fuelConsumption, 'Steam Generated': c.steamGenerated, Efficiency: c.boilerEfficiency, 'Heat Input': c.heatInput, 'Heat Output': c.heatOutput, 'CO2%': c.co2Percentage, 'O2%': c.o2Percentage, 'Flue Gas Temp': c.flueGasTemp, 'Stack Loss': c.stackLoss, 'Radiation Loss': c.radiationLoss, 'Calc By': c.calculatedBy, Remarks: c.remarks })) }]
        break
      }
      case 'maintenance': {
        title = 'Maintenance Log Report'
        const logs = await db.maintenanceLog.findMany({ where, orderBy: { logDate: 'desc' }, take: 500 })
        sections = [{ heading: 'Maintenance Records', rows: logs.map((l) => ({ Date: l.logDate, Type: l.maintenanceType, Frequency: l.frequency, Task: l.taskTitle, 'Performed By': l.performedBy, Status: l.status, Priority: l.priority, 'Parts Used': l.partsUsed, Cost: l.cost, 'Next Due': l.nextDueDate, 'Completed': l.completedDate, Remarks: l.remarks })) }]
        break
      }
      case 'water-chemistry': {
        title = 'Water Chemistry Report'
        const tests = await db.waterChemistry.findMany({ where, orderBy: { testDate: 'desc' }, take: 500 })
        sections = [{ heading: 'Water Chemistry Tests', rows: tests.map((t) => ({ Date: t.testDate, 'Sample Type': t.sampleType, pH: t.ph, Conductivity: t.conductivity, 'Total Hardness': t.totalHardness, 'Total Alkalinity': t.totalAlkalinity, Chloride: t.chloride, Sulfate: t.sulfate, DO: t.dissolvedOxygen, TDS: t.totalDissolvedSolids, Silica: t.silica, Phosphate: t.phosphate, Sulphite: t.sulphite, 'Within Limits': t.withinLimits, 'Tested By': t.testedBy, Remarks: t.remarks })) }]
        break
      }
      case 'inspection': {
        title = 'Inspection Records Report'
        const records = await db.inspectionRecord.findMany({ where, orderBy: { inspectionDate: 'desc' }, take: 500 })
        sections = [{ heading: 'Inspection Records', rows: records.map((r) => ({ Date: r.inspectionDate, Type: r.inspectionType, Inspector: r.inspectorName, Authority: r.authority, 'Cert No': r.certificateNo, Findings: r.findings, Recommendations: r.recommendations, Status: r.status, 'Pressure Test': r.pressureTestResult, 'Hydro Test': r.hydroTestResult, 'Next Inspection': r.nextInspectionDate, Remarks: r.remarks })) }]
        break
      }
      default:
        return NextResponse.json(
          { error: 'Invalid reportType. Use: operation, efficiency, maintenance, water-chemistry, inspection' },
          { status: 400 }
        )
    }

    const html = buildReportHTML({ title, factoryName: factory.name, generatedAt: new Date().toISOString(), sections })
    const filename = reportType + '_report_' + factory.code + '_' + new Date().toISOString().slice(0, 10) + '.html'

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline; filename="' + filename + '"',
      },
    })
  } catch (error) {
    console.error('[GET /api/reports/pdf]', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
