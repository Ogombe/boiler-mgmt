import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    }

    const [stocks, history] = await Promise.all([
      db.fuelStock.findMany({
        where: { factoryId },
        orderBy: { fuelType: 'asc' },
      }),
      db.fuelStockHistory.findMany({
        where: { fuelStock: { factoryId } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { fuelStock: { select: { fuelType: true } } },
      }),
    ]);

    return NextResponse.json({ stocks, history });
  } catch (error) {
    console.error('GET /api/fuel-stock error:', error);
    return NextResponse.json({ error: 'Failed to fetch fuel stock' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { factoryId, fuelType, currentQty, unit, lowStockThreshold, remarks, changedBy } = body;

    if (!factoryId || !fuelType) {
      return NextResponse.json({ error: 'factoryId and fuelType are required' }, { status: 400 });
    }

    const prev = await db.fuelStock.findUnique({
      where: { factoryId_fuelType: { factoryId, fuelType } },
    });

    let stock;
    if (prev) {
      stock = await db.fuelStock.update({
        where: { id: prev.id },
        data: {
          currentQty: currentQty ?? prev.currentQty,
          unit: unit ?? prev.unit,
          lowStockThreshold: lowStockThreshold ?? prev.lowStockThreshold,
          remarks: remarks ?? prev.remarks,
          lastUpdated: new Date(),
          updatedBy: changedBy || null,
        },
      });
    } else {
      stock = await db.fuelStock.create({
        data: { factoryId, fuelType, currentQty: currentQty || 0, unit: unit || 'kgs', lowStockThreshold, remarks, updatedBy: changedBy || null },
      });
    }

    // Log history
    const oldQty = prev?.currentQty || 0;
    const newQty = currentQty ?? oldQty;
    await db.fuelStockHistory.create({
      data: {
        fuelStockId: stock.id,
        changeType: remarks?.includes('added') || remarks?.includes('received') ? 'added' : 'adjusted',
        quantity: newQty - oldQty,
        previousQty: oldQty,
        newQty,
        remarks: remarks || null,
        changedBy: changedBy || null,
      },
    });

    return NextResponse.json(stock, { status: prev ? 200 : 201 });
  } catch (error) {
    console.error('POST /api/fuel-stock error:', error);
    return NextResponse.json({ error: 'Failed to update fuel stock' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const prev = await db.fuelStock.findUnique({ where: { id } });
    const stock = await db.fuelStock.update({ where: { id }, data: { ...data, lastUpdated: new Date() } });

    if (prev && prev.currentQty !== (data.currentQty ?? prev.currentQty)) {
      await db.fuelStockHistory.create({
        data: {
          fuelStockId: id,
          changeType: 'adjusted',
          quantity: (data.currentQty ?? prev.currentQty) - prev.currentQty,
          previousQty: prev.currentQty,
          newQty: data.currentQty ?? prev.currentQty,
          remarks: data.remarks || null,
          changedBy: data.changedBy || null,
        },
      });
    }

    return NextResponse.json(stock);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update fuel stock' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.fuelStock.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete fuel stock' }, { status: 500 });
  }
}
