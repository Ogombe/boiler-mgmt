// src/app/api/alert-rules/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const factoryId = searchParams.get('factoryId')
    const ruleType = searchParams.get('ruleType')

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId query parameter is required' }, { status: 400 })
    }

    const where: Record<string, string> = { factoryId }
    if (ruleType) where.ruleType = ruleType

    const rules = await db.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ rules })
  } catch (error) {
    console.error('[GET /api/alert-rules]', error)
    return NextResponse.json({ error: 'Failed to fetch alert rules' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { factoryId, ruleType, enabled, threshold, notifyEmail, notifyInApp } = body

    if (!factoryId || !ruleType) {
      return NextResponse.json({ error: 'factoryId and ruleType are required' }, { status: 400 })
    }

    const validRuleTypes = ['maintenance_overdue', 'chemistry_out_of_range', 'efficiency_below', 'inspection_due']
    if (!validRuleTypes.includes(ruleType)) {
      return NextResponse.json(
        { error: 'Invalid ruleType. Must be one of: ' + validRuleTypes.join(', ') },
        { status: 400 }
      )
    }

    const rule = await db.alertRule.create({
      data: {
        factoryId,
        ruleType,
        enabled: enabled !== undefined ? enabled : true,
        threshold: threshold ?? null,
        notifyEmail: notifyEmail !== undefined ? notifyEmail : true,
        notifyInApp: notifyInApp !== undefined ? notifyInApp : true,
      },
    })

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/alert-rules]', error)
    return NextResponse.json({ error: 'Failed to create alert rule' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, enabled, threshold, notifyEmail, notifyInApp } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (enabled !== undefined) data.enabled = enabled
    if (threshold !== undefined) data.threshold = threshold
    if (notifyEmail !== undefined) data.notifyEmail = notifyEmail
    if (notifyInApp !== undefined) data.notifyInApp = notifyInApp

    const rule = await db.alertRule.update({ where: { id }, data })
    return NextResponse.json({ rule })
  } catch (error) {
    console.error('[PATCH /api/alert-rules]', error)
    return NextResponse.json({ error: 'Failed to update alert rule' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    await db.alertRule.delete({ where: { id } })
    return NextResponse.json({ message: 'Alert rule deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/alert-rules]', error)
    return NextResponse.json({ error: 'Failed to delete alert rule' }, { status: 500 })
  }
}
