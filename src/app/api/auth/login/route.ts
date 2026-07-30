import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { factories: { include: { factory: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const factories = user.factories.map((uf) => ({
      id: uf.factory.id,
      name: uf.factory.name,
      code: uf.factory.code,
      location: uf.factory.location,
      city: uf.factory.city,
      status: uf.factory.status,
      factoryRole: uf.role,
    }));

    // Determine the highest factory role as the effective role
    const factoryRoles = user.factories.map(uf => uf.role);
    const effectiveRole = factoryRoles[0] || user.role || 'Boiler Operator';

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      factories,
      effectiveRole,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
