// src/app/api/notifications/mark-read/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request) {
  try {
    const body = await request.json()
    const { notificationIds, factoryId, markAll } = body

    if (markAll && factoryId) {
      const result = await db.notification.updateMany({
        where: { factoryId, isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({
        updated: result.count,
        message: 'Marked ' + result.count + ' notification(s) as read',
      })
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notificationIds array is required (or use markAll with factoryId)' },
        { status: 400 }
      )
    }

    const result = await db.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    })

    return NextResponse.json({
      updated: result.count,
      message: 'Marked ' + result.count + ' notification(s) as read',
    })
  } catch (error) {
    console.error('[PUT /api/notifications/mark-read]', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}
