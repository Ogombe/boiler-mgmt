import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const factoryId = searchParams.get('factoryId');
    const where: Record<string, unknown> = {};
    if (date) where.calcDate = date;
    if (factoryId) where.factoryId = factoryId;

    const calcs = await db.boilerCalculation.findMany({
      where,
      orderBy: { calcDate: 'desc' },
      include: { boiler: { select: { name: true } } },
    });
    return NextResponse.json(calcs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch calculations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    const calc = await db.boilerCalculation.create({ data: body });
    return NextResponse.json(calc, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create calculation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const calc = await db.boilerCalculation.update({ where: { id }, data });
    return NextResponse.json(calc);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update calculation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.boilerCalculation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete calculation' }, { status: 500 });
  }
}