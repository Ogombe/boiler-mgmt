import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const sampleType = searchParams.get('sampleType');
    const factoryId = searchParams.get('factoryId');
    const where: Record<string, unknown> = {};
    if (date) where.testDate = date;
    if (sampleType) where.sampleType = sampleType;
    if (factoryId) where.factoryId = factoryId;

    const records = await db.waterChemistry.findMany({
      where,
      orderBy: { testDate: 'desc' },
      include: { boiler: { select: { name: true } } },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error('Water chemistry API error:', error);
    return NextResponse.json({ error: 'Failed to fetch water chemistry records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    const record = await db.waterChemistry.create({ data: body });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create water chemistry record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const record = await db.waterChemistry.update({ where: { id }, data });
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update water chemistry record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.waterChemistry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete water chemistry record' }, { status: 500 });
  }
}