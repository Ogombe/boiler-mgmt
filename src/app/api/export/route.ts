// src/app/api/export/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function toCSV(rows) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (val) => {
    const s = String(val ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s
  }
  const headerLine = headers.map(escape).join(',')
  const dataLines = rows.map((row) =>
    headers.map((h) => escape(row[h])).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

function serialize(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v instanceof Date ? v.toISOString() : v
  }
  return out
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { factoryId, entityType, from, to, boilerId } = body

    if (!factoryId || !entityType) {
      return NextResponse.json(
        { error: 'factoryId and entityType are required' },
        { status: 400 }
      )
    }

    const validTypes = ['OperationLog', 'BoilerCalculation', 'MaintenanceLog', 'InspectionRecord', 'WaterChemistry', 'AuditLog']
    if (!validTypes.includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be one of: ' + validTypes.join(', ') },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { factoryId }
    if (boilerId) where.boilerId = boilerId
    if (from || to) {
      where.createdAt = {} as Record<string, unknown>
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }

    let rows: Record<string, unknown>[] = []

    switch (entityType) {
      case 'OperationLog': {
        const items = await db.operationLog.findMany({ where, orderBy: { logDate: 'desc' } })
        rows = items.map(({ id, createdAt, updatedAt, ...rest }) => serialize(rest))
        break
      }
      case 'BoilerCalculation': {
        const items = await db.boilerCalculation.findMany({ where, orderBy: { calcDate: 'desc' } })
        rows = items.map(({ id, createdAt, updatedAt, ...rest }) => serialize(rest))
        break
      }
      case 'MaintenanceLog': {
        const items = await db.maintenanceLog.findMany({ where, orderBy: { logDate: 'desc' } })
        rows = items.map(({ id, createdAt, updatedAt, ...rest }) => serialize(rest))
        break
      }
      case 'InspectionRecord': {
        const items = await db.inspectionRecord.findMany({ where, orderBy: { inspectionDate: 'desc' } })
        rows = items.map(({ id, createdAt, updatedAt, ...rest }) => serialize(rest))
        break
      }
      case 'WaterChemistry': {
        const items = await db.waterChemistry.findMany({ where, orderBy: { testDate: 'desc' } })
        rows = items.map(({ id, createdAt, updatedAt, ...rest }) => serialize(rest))
        break
      }
      case 'AuditLog': {
        const items = await db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' } })
        rows = items.map(({ id, ...rest }) => serialize(rest))
        break
      }
    }

    const csv = toCSV(rows)
    const filename = entityType + '_' + factoryId + '_' + new Date().toISOString().slice(0, 10) + '.csv'

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
    })
  } catch (error) {
    console.error('[POST /api/export]', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
