import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const VALID_ROLES = ['CEO', 'Manager', 'Plant Engineer', 'Shift Engineer', 'Supervisor', 'Boiler Operator'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');

    if (factoryId) {
      const users = await db.userFactory.findMany({
        where: { factoryId },
        include: { user: { select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(users.map((uf) => ({ ...uf.user, factoryRole: uf.role })));
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, factoryId, role } = await request.json();
    if (!email || !password || !factoryId) {
      return NextResponse.json({ error: 'Email, password, and factory are required' }, { status: 400 });
    }

    const assignedRole = VALID_ROLES.includes(role) ? role : 'Boiler Operator';

    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await db.user.create({
        data: { email, password: hashedPassword, name: name || email.split('@')[0], role: assignedRole, phone: phone || null },
      });
    }

    // Link user to factory if not already linked
    const existing = await db.userFactory.findUnique({
      where: { userId_factoryId: { userId: user.id, factoryId } },
    });
    if (!existing) {
      await db.userFactory.create({
        data: { userId: user.id, factoryId, role: assignedRole },
      });
    } else {
      // Update role if already linked
      await db.userFactory.update({
        where: { userId_factoryId: { userId: user.id, factoryId } },
        data: { role: assignedRole },
      });
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const factoryId = searchParams.get('factoryId');
    if (!id || !factoryId) return NextResponse.json({ error: 'ID and factoryId required' }, { status: 400 });
    await db.userFactory.delete({ where: { userId_factoryId: { userId: id, factoryId } } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
  }
}
