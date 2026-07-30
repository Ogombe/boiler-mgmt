import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const factoryId = searchParams.get('factoryId');
    const where: Record<string, unknown> = {};
    if (type) where.inspectionType = type;
    if (status) where.status = status;
    if (factoryId) where.factoryId = factoryId;

    const records = await db.inspectionRecord.findMany({
      where,
      orderBy: { inspectionDate: 'desc' },
      include: { boiler: { select: { name: true } } },
    });
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    const record = await db.inspectionRecord.create({ data: body });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const record = await db.inspectionRecord.update({ where: { id }, data });
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.inspectionRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete inspection' }, { status: 500 });
  }
}