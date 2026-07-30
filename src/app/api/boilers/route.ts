import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');
    const where: Record<string, unknown> = {};
    if (factoryId) where.factoryId = factoryId;

    const boilers = await db.boiler.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(boilers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch boilers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    const boiler = await db.boiler.create({ data: body });
    return NextResponse.json(boiler, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create boiler' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const boiler = await db.boiler.update({ where: { id }, data });
    return NextResponse.json(boiler);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update boiler' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.boiler.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete boiler' }, { status: 500 });
  }
}