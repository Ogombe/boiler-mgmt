import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Get factories for a specific user
      const userFactories = await db.userFactory.findMany({
        where: { userId },
        include: { factory: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(userFactories.map((uf) => ({
        id: uf.factory.id,
        name: uf.factory.name,
        code: uf.factory.code,
        location: uf.factory.location,
        city: uf.factory.city,
        state: uf.factory.state,
        country: uf.factory.country,
        contactPerson: uf.factory.contactPerson,
        contactEmail: uf.factory.contactEmail,
        contactPhone: uf.factory.contactPhone,
        status: uf.factory.status,
        userRole: uf.role,
        boilerCount: 0,
        createdAt: uf.factory.createdAt,
      })));
    }

    // Admin: get all factories with boiler counts
    const factories = await db.factory.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { boilers: true, userFactories: true } },
      },
    });

    return NextResponse.json(factories.map((f) => ({
      ...f,
      boilerCount: f._count.boilers,
      userCount: f._count.userFactories,
      _count: undefined,
    })));
  } catch (error) {
    console.error('Factories API error:', error);
    return NextResponse.json({ error: 'Failed to fetch factories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userRole, ...factoryData } = body;

    const factory = await db.factory.create({ data: factoryData });

    // If userId provided, link user to factory
    if (userId) {
      await db.userFactory.create({
        data: { userId, factoryId: factory.id, role: userRole || 'Admin' },
      });
    }

    return NextResponse.json(factory, { status: 201 });
  } catch (error) {
    console.error('Create factory error:', error);
    return NextResponse.json({ error: 'Failed to create factory' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const factory = await db.factory.update({ where: { id }, data });
    return NextResponse.json(factory);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update factory' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.factory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete factory' }, { status: 500 });
  }
}