import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch current pricing config + fuel prices + recent price history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');
    if (!factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });

    const [config, fuelPrices] = await Promise.all([
      db.pricingConfig.findUnique({ where: { factoryId } }),
      db.fuelPriceConfig.findMany({
        where: { factoryId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Also get fuel price history
    const fuelPriceIds = fuelPrices.map((fp) => fp.id);
    const fuelPriceHistories = fuelPriceIds.length > 0
      ? await db.fuelPriceHistory.findMany({
          where: { fuelPriceConfigId: { in: fuelPriceIds } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      : [];

    return NextResponse.json({
      config: config ? {
        steamPrice: config.steamPrice,
        steamUnit: config.steamUnit,
        waterPrice: config.waterPrice,
        waterUnit: config.waterUnit,
        updatedAt: config.updatedAt,
      } : null,
      fuelPrices: fuelPrices.map((fp) => ({
        id: fp.id,
        fuelType: fp.fuelType,
        price: fp.price,
        unit: fp.unit,
        updatedAt: fp.updatedAt,
      })),
      fuelPriceHistories,
    });
  } catch (error) {
    console.error('GET /api/pricing/config error:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing config' }, { status: 500 });
  }
}

// PUT: Update pricing (creates config if not exists, logs history, audit logs)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { factoryId, steamPrice, steamUnit, waterPrice, waterUnit, fuelPrices, changedBy, changedByName } = body;

    if (!factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });

    // ── Update or create PricingConfig ──
    const existing = await db.pricingConfig.findUnique({ where: { factoryId } });

    if (existing) {
      // Log steam price change if different
      if (steamPrice !== undefined && steamPrice !== existing.steamPrice) {
        // Steam price change logged to audit only (no separate priceHistory model)
        void steamPrice;
      }

      // Log water price change if different
      if (waterPrice !== undefined && waterPrice !== existing.waterPrice) {
        // Water price change logged to audit only (no separate priceHistory model)
        void waterPrice;
      }

      await db.pricingConfig.update({
        where: { factoryId },
        data: {
          ...(steamPrice !== undefined ? { steamPrice } : {}),
          ...(steamUnit !== undefined ? { steamUnit } : {}),
          ...(waterPrice !== undefined ? { waterPrice } : {}),
          ...(waterUnit !== undefined ? { waterUnit } : {}),
        },
      });
    } else {
      await db.pricingConfig.create({
        data: { factoryId, steamPrice: steamPrice || 0, steamUnit: steamUnit || 'tonne', waterPrice: waterPrice || 0, waterUnit: waterUnit || 'm3' },
      });
    }

    // ── Update fuel prices ──
    if (Array.isArray(fuelPrices)) {
      for (const fp of fuelPrices) {
        const { fuelType, price, unit } = fp;
        if (!fuelType || price === undefined) continue;

        const existingFuel = await db.fuelPriceConfig.findUnique({
          where: { factoryId_fuelType: { factoryId, fuelType } },
        });

        if (existingFuel) {
          if (price !== existingFuel.price) {
            await db.fuelPriceHistory.create({
              data: {
                fuelPriceConfigId: existingFuel.id,
                oldPrice: existingFuel.price,
                newPrice: price,
                unit: unit || existingFuel.unit,
                changedBy,
                changedByName,
              },
            });
          }
          await db.fuelPriceConfig.update({
            where: { id: existingFuel.id },
            data: { price, ...(unit ? { unit } : {}) },
          });
        } else {
          await db.fuelPriceConfig.create({
            data: { factoryId, fuelType, price, unit: unit || 'litre' },
          });
        }
      }
    }

    // ── Audit log ──
    await db.auditLog.create({
      data: {
        factoryId,
        userId: changedBy || null,
        action: 'UPDATE_PRICING',
        entityType: 'PricingConfig',
        details: JSON.stringify({ steamPrice, waterPrice, fuelPrices }),
      },
    });

    return NextResponse.json({ success: true, message: 'Pricing updated successfully' });
  } catch (error) {
    console.error('PUT /api/pricing/config error:', error);
    return NextResponse.json({ error: 'Failed to update pricing config' }, { status: 500 });
  }
}
