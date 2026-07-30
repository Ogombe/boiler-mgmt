import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const frequency = searchParams.get('frequency');
    const status = searchParams.get('status');
    const factoryId = searchParams.get('factoryId');
    const where: Record<string, unknown> = {};
    if (type) where.maintenanceType = type;
    if (frequency) where.frequency = frequency;
    if (status) where.status = status;
    if (factoryId) where.factoryId = factoryId;

    const logs = await db.maintenanceLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
      include: { boiler: { select: { name: true } } },
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch maintenance logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    const log = await db.maintenanceLog.create({ data: body });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create maintenance log' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const log = await db.maintenanceLog.update({ where: { id }, data });
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update maintenance log' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.maintenanceLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete maintenance log' }, { status: 500 });
  }
}