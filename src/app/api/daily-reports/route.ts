import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { factoryId };
    if (date) where.reportDate = date;
    if (from && to) {
      where.reportDate = { gte: from, lte: to };
    }

    const reports = await db.dailyReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      include: {
        boiler: { select: { id: true, name: true, capacity: true } },
        stockEntries: true,
      },
    });
    return NextResponse.json(reports);
  } catch (error) {
    console.error('GET /api/daily-reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factoryId, reportDate, boilerId, stockEntries, ...data } = body;

    if (!factoryId || !reportDate) {
      return NextResponse.json({ error: 'factoryId and reportDate are required' }, { status: 400 });
    }

    // Upsert: if a report exists for same factory+date+boiler, update it
    const existing = await db.dailyReport.findFirst({
      where: { factoryId, reportDate, boilerId: boilerId || null },
    });

    if (existing) {
      // Delete old stock entries and recreate
      await db.dailyReportStockEntry.deleteMany({ where: { dailyReportId: existing.id } });
      const updated = await db.dailyReport.update({
        where: { id: existing.id },
        data: {
          ...data,
          boilerId: boilerId || null,
          stockEntries: {
            create: (stockEntries || []).map((e: Record<string, unknown>) => ({
              fuelType: e.fuelType,
              openingQty: e.openingQty ?? null,
              addedQty: e.addedQty ?? null,
              closingQty: e.closingQty ?? null,
              consumedQty: e.consumedQty ?? null,
            })),
          },
        },
        include: { stockEntries: true, boiler: { select: { name: true } } },
      });
      return NextResponse.json(updated);
    }

    const report = await db.dailyReport.create({
      data: {
        factoryId,
        reportDate,
        boilerId: boilerId || null,
        ...data,
        stockEntries: {
          create: (stockEntries || []).map((e: Record<string, unknown>) => ({
            fuelType: e.fuelType,
            openingQty: e.openingQty ?? null,
            addedQty: e.addedQty ?? null,
            closingQty: e.closingQty ?? null,
            consumedQty: e.consumedQty ?? null,
          })),
        },
      },
      include: { stockEntries: true, boiler: { select: { name: true } } },
    });

    // Auto-update FuelStock from closing quantities
    if (stockEntries && Array.isArray(stockEntries)) {
      for (const entry of stockEntries) {
        if (!entry.fuelType || entry.closingQty == null) continue;
        const prev = await db.fuelStock.findUnique({
          where: { factoryId_fuelType: { factoryId, fuelType: entry.fuelType } },
        });
        if (prev) {
          await db.fuelStock.update({
            where: { id: prev.id },
            data: { currentQty: entry.closingQty, lastUpdated: new Date() },
          });
          await db.fuelStockHistory.create({
            data: {
              fuelStockId: prev.id,
              changeType: 'daily_report',
              quantity: entry.closingQty - (prev.currentQty || 0),
              previousQty: prev.currentQty,
              newQty: entry.closingQty,
              reference: report.id,
            },
          });
        } else {
          const newStock = await db.fuelStock.create({
            data: {
              factoryId,
              fuelType: entry.fuelType,
              currentQty: entry.closingQty,
              unit: 'kgs',
            },
          });
          await db.fuelStockHistory.create({
            data: {
              fuelStockId: newStock.id,
              changeType: 'daily_report',
              quantity: entry.closingQty,
              previousQty: 0,
              newQty: entry.closingQty,
              reference: report.id,
            },
          });
        }
      }
    }

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('POST /api/daily-reports error:', error);
    return NextResponse.json({ error: 'Failed to create daily report' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, stockEntries, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.dailyReportStockEntry.deleteMany({ where: { dailyReportId: id } });
    const report = await db.dailyReport.update({
      where: { id },
      data: {
        ...data,
        stockEntries: {
          create: (stockEntries || []).map((e: Record<string, unknown>) => ({
            fuelType: e.fuelType,
            openingQty: e.openingQty ?? null,
            addedQty: e.addedQty ?? null,
            closingQty: e.closingQty ?? null,
            consumedQty: e.consumedQty ?? null,
          })),
        },
      },
      include: { stockEntries: true, boiler: { select: { name: true } } },
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error('PUT /api/daily-reports error:', error);
    return NextResponse.json({ error: 'Failed to update daily report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.dailyReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete daily report' }, { status: 500 });
  }
}
