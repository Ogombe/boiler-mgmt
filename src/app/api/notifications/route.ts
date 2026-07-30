// src/app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const factoryId = searchParams.get('factoryId')
    const userId = searchParams.get('userId')
    const isReadParam = searchParams.get('isRead')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId query parameter is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { factoryId }
    if (userId) where.userId = userId
    if (isReadParam !== null) where.isRead = isReadParam === 'true'
    if (type) where.type = type
    if (priority) where.priority = priority

    const [notifications, unreadCount, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.notification.count({ where: { factoryId, userId: userId ?? null, isRead: false } }),
      db.notification.count({ where }),
    ])

    return NextResponse.json({ notifications, unreadCount, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[GET /api/notifications]', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { factoryId, userId, type, title, message, priority, link } = body

    if (!factoryId || !type || !title || !message) {
      return NextResponse.json({ error: 'factoryId, type, title, and message are required' }, { status: 400 })
    }

    const validTypes = ['maintenance_due', 'chemistry_alert', 'efficiency_drop', 'inspection_due', 'system']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be one of: ' + validTypes.join(', ') }, { status: 400 })
    }

    const validPriorities = ['low', 'medium', 'high', 'critical']
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority. Must be one of: ' + validPriorities.join(', ') }, { status: 400 })
    }

    const notification = await db.notification.create({
      data: { factoryId, userId: userId ?? null, type, title, message, priority: priority ?? 'medium', link: link ?? null },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/notifications]', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}
