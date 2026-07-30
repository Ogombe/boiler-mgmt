import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const factoryId = searchParams.get('factoryId');
    const where: Record<string, unknown> = {};
    if (date) where.logDate = date;
    if (factoryId) where.factoryId = factoryId;

    const logs = await db.operationLog.findMany({
      where,
      orderBy: [{ logDate: 'desc' }, { hour: 'asc' }],
      include: { boiler: { select: { name: true } } },
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch operation logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    const log = await db.operationLog.create({ data: body });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create operation log' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const log = await db.operationLog.update({ where: { id }, data });
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update operation log' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.operationLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete operation log' }, { status: 500 });
  }
}