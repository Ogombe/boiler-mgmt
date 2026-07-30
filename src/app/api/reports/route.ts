import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'operation';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const factoryId = searchParams.get('factoryId');

    const where: Record<string, unknown> = {};
    if (factoryId) where.factoryId = factoryId;

    if (reportType === 'operation') {
      if (startDate) (where as Record<string, unknown>).logDate = { ...((where.logDate as Record<string, unknown>) || {}), gte: startDate };
      if (endDate) (where as Record<string, unknown>).logDate = { ...((where.logDate as Record<string, unknown>) || {}), lte: endDate };
      const logs = await db.operationLog.findMany({
        where,
        orderBy: [{ logDate: 'desc' }, { hour: 'asc' }],
        include: { boiler: { select: { name: true } } },
      });
      return NextResponse.json({ reportType, data: logs });
    }

    if (reportType === 'maintenance') {
      if (startDate) (where as Record<string, unknown>).logDate = { gte: startDate };
      if (endDate) (where as Record<string, unknown>).logDate = { ...((where.logDate as Record<string, unknown>) || {}), lte: endDate };
      const logs = await db.maintenanceLog.findMany({
        where,
        orderBy: { logDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      });
      return NextResponse.json({ reportType, data: logs });
    }

    if (reportType === 'inspection') {
      if (startDate) (where as Record<string, unknown>).inspectionDate = { gte: startDate };
      if (endDate) (where as Record<string, unknown>).inspectionDate = { ...((where.inspectionDate as Record<string, unknown>) || {}), lte: endDate };
      const records = await db.inspectionRecord.findMany({
        where,
        orderBy: { inspectionDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      });
      return NextResponse.json({ reportType, data: records });
    }

    if (reportType === 'calculations') {
      if (startDate) (where as Record<string, unknown>).calcDate = { gte: startDate };
      if (endDate) (where as Record<string, unknown>).calcDate = { ...((where.calcDate as Record<string, unknown>) || {}), lte: endDate };
      const calcs = await db.boilerCalculation.findMany({
        where,
        orderBy: { calcDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      });
      return NextResponse.json({ reportType, data: calcs });
    }

    if (reportType === 'water-chemistry') {
      if (startDate) (where as Record<string, unknown>).testDate = { gte: startDate };
      if (endDate) (where as Record<string, unknown>).testDate = { ...((where.testDate as Record<string, unknown>) || {}), lte: endDate };
      const chemRecords = await db.waterChemistry.findMany({
        where,
        orderBy: { testDate: 'desc' },
        include: { boiler: { select: { name: true } } },
      });
      return NextResponse.json({ reportType, data: chemRecords });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
