import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, factoryName, factoryCode, factoryLocation, factoryCity } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let factoryId: string | undefined;

    if (factoryName) {
      const code = factoryCode || factoryName.toUpperCase().replace(/\s+/g, '_').slice(0, 10);
      // Make sure code is unique
      let finalCode = code;
      let tries = 0;
      while (true) {
        const exists = await db.factory.findUnique({ where: { code: finalCode } });
        if (!exists) break;
        tries++;
        finalCode = `${code}_${tries}`;
      }
      const factory = await db.factory.create({
        data: {
          name: factoryName,
          code: finalCode,
          location: factoryLocation || null,
          city: factoryCity || null,
        },
      });
      factoryId = factory.id;
    }

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: 'CEO',
        ...(factoryId ? {
          factories: {
            create: {
              factoryId,
              role: 'CEO',
            },
          },
        } : {}),
      },
      include: { factories: { include: { factory: true } } },
    });

    const factories = user.factories.map((uf) => ({
      id: uf.factory.id,
      name: uf.factory.name,
      code: uf.factory.code,
      location: uf.factory.location,
      city: uf.factory.city,
      status: uf.factory.status,
      factoryRole: uf.role,
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      factories,
      effectiveRole: 'CEO',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
