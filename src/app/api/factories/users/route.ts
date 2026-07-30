// src/app/api/factories/users/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_ROLES = ['CEO', 'Manager', 'Plant Engineer', 'Shift Engineer', 'Supervisor', 'Boiler Operator']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const factoryId = searchParams.get('factoryId')

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId query parameter is required' }, { status: 400 })
    }

    const userFactories = await db.userFactory.findMany({
      where: { factoryId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const users = userFactories.map((uf) => ({
      id: uf.id,
      userId: uf.userId,
      factoryId: uf.factoryId,
      factoryRole: uf.role,
      assignedAt: uf.createdAt,
      user: uf.user,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[GET /api/factories/users]', error)
    return NextResponse.json({ error: 'Failed to fetch factory users' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { factoryId, userId, role } = body

    if (!factoryId || !userId) {
      return NextResponse.json({ error: 'factoryId and userId are required' }, { status: 400 })
    }

    const factoryRole = VALID_ROLES.includes(role) ? role : 'Boiler Operator'

    const userFactory = await db.userFactory.upsert({
      where: { userId_factoryId: { userId, factoryId } },
      update: { role: factoryRole },
      create: { userId, factoryId, role: factoryRole },
    })

    return NextResponse.json({ userFactory })
  } catch (error) {
    console.error('[PUT /api/factories/users]', error)
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }
}
