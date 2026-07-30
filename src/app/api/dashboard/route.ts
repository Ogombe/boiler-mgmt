import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');
    const today = new Date().toISOString().split('T')[0];

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    }

    const baseWhere = { factoryId };

    const [boilers, todayLogs, maintenanceLogs, inspections, calculations] =
      await Promise.all([
        db.boiler.count({ where: baseWhere }),
        db.operationLog.count({ where: { ...baseWhere, logDate: today } }),
        db.maintenanceLog.findMany({
          where: { ...baseWhere, status: 'Pending' },
          orderBy: { nextDueDate: 'asc' },
          take: 5,
          include: { boiler: { select: { name: true } } },
        }),
        db.inspectionRecord.findMany({
          where: baseWhere,
          orderBy: { nextInspectionDate: 'asc' },
          take: 5,
          include: { boiler: { select: { name: true } } },
        }),
        db.boilerCalculation.findMany({
          where: baseWhere,
          orderBy: { calcDate: 'desc' },
          take: 5,
          include: { boiler: { select: { name: true } } },
        }),
      ]);

    const [pendingMaint, completedMaint, overdueInspections] = await Promise.all([
      db.maintenanceLog.count({ where: { ...baseWhere, status: 'Pending' } }),
      db.maintenanceLog.count({ where: { ...baseWhere, status: 'Completed' } }),
      db.inspectionRecord.count({
        where: { ...baseWhere, status: 'Scheduled', nextInspectionDate: { lt: today } },
      }),
    ]);

    return NextResponse.json({
      totalBoilers: boilers,
      todayLogCount: todayLogs,
      pendingMaintenance: pendingMaint,
      completedMaintenance: completedMaint,
      overdueInspections,
      upcomingMaintenance: maintenanceLogs,
      recentInspections: inspections,
      recentCalculations: calculations,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
