import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');
    const period = searchParams.get('period') || 'month'; // day, week, month

    if (!factoryId) {
      return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });
    }

    // Determine date range based on period
    const now = new Date();
    let startDate: Date;
    let trendDays: number;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        trendDays = 7; // 7 days of daily trend
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        trendDays = 30; // 4 weeks
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        trendDays = 90; // 3 months
        break;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];
    const trendStartStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - trendDays).toISOString().split('T')[0];
    const baseWhere = { factoryId };

    // ── Fetch all needed data in parallel ──
    const [operationLogs, calculations, pricingConfig, fuelPriceConfigs, maintenanceCosts] =
      await Promise.all([
        // Operation logs for the period + trend period
        db.operationLog.findMany({
          where: { ...baseWhere, logDate: { gte: trendStartStr } },
          orderBy: [{ logDate: 'asc' }, { hour: 'asc' }],
          include: { boiler: { select: { name: true, fuelType: true } } },
        }),
        // Calculations (has steamGenerated, feedwaterUsed, fuelConsumption with fuel type)
        db.boilerCalculation.findMany({
          where: { ...baseWhere, calcDate: { gte: trendStartStr } },
          orderBy: { calcDate: 'asc' },
          include: { boiler: { select: { name: true, fuelType: true } } },
        }),
        // Pricing config
        db.pricingConfig.findUnique({ where: { factoryId } }),
        // Fuel prices
        db.fuelPriceConfig.findMany({
          where: { factoryId },
          orderBy: { updatedAt: 'desc' },
        }),
        // Maintenance costs in period
        db.maintenanceLog.findMany({
          where: { ...baseWhere, logDate: { gte: startDateStr, lte: todayStr }, status: 'Completed', cost: { not: null } },
          select: { cost: true },
        }),
      ]);

    // ── Build fuel price map ──
    const fuelPriceMap: Record<string, { price: number; unit: string }> = {};
    for (const fp of fuelPriceConfigs) {
      const fuelType = fp.fuelType.toLowerCase();
      fuelPriceMap[fuelType] = { price: fp.price, unit: fp.unit };
    }

    // ── Process calculations for production metrics ──
    // Use BoilerCalculation data as the primary source for steam/fuel/water
    // since it has steamGenerated, fuelConsumption, feedwaterUsed with fuel type
    const periodCalcs = calculations.filter((c) => c.calcDate >= startDateStr && c.calcDate <= todayStr);
    const trendCalcs = calculations;

    // Aggregate by date for the selected period
    const dailyMetrics: Record<string, { steam: number; fuel: Record<string, number>; water: number; count: number }> = {};
    const trendDailyMetrics: Record<string, { steam: number; fuel: Record<string, number>; water: number; steamToFuel: number; count: number }> = {};

    for (const calc of calculations) {
      const d = calc.calcDate;
      const steam = parseFloat(calc.steamGenerated || '0');
      const fuel = parseFloat(calc.fuelConsumption || '0');
      const water = parseFloat(calc.feedwaterUsed || '0');
      const fuelType = (calc.fuelType || calc.boiler?.fuelType || 'diesel').toLowerCase();

      if (steam <= 0 && fuel <= 0) continue;

      if (!trendDailyMetrics[d]) {
        trendDailyMetrics[d] = { steam: 0, fuel: {}, water: 0, steamToFuel: 0, count: 0 };
      }
      trendDailyMetrics[d].steam += steam;
      trendDailyMetrics[d].water += water;
      trendDailyMetrics[d].fuel[fuelType] = (trendDailyMetrics[d].fuel[fuelType] || 0) + fuel;
      trendDailyMetrics[d].count += 1;

      // Also populate period-specific
      if (calc.calcDate >= startDateStr && calc.calcDate <= todayStr) {
        if (!dailyMetrics[d]) {
          dailyMetrics[d] = { steam: 0, fuel: {}, water: 0, count: 0 };
        }
        dailyMetrics[d].steam += steam;
        dailyMetrics[d].water += water;
        dailyMetrics[d].fuel[fuelType] = (dailyMetrics[d].fuel[fuelType] || 0) + fuel;
        dailyMetrics[d].count += 1;
      }
    }

    // Also pull from operation logs for fuel consumption (in case calculations are sparse)
    // Operation logs have fuelConsumption but no fuel type per entry — use boiler's fuel type
    if (operationLogs.length > 0 && calculations.length === 0) {
      for (const log of operationLogs) {
        const d = log.logDate;
        const fuel = parseFloat(log.fuelConsumption || '0');
        const fuelType = (log.boiler?.fuelType || 'diesel').toLowerCase();

        if (fuel <= 0) continue;

        if (!trendDailyMetrics[d]) {
          trendDailyMetrics[d] = { steam: 0, fuel: {}, water: 0, steamToFuel: 0, count: 0 };
        }
        trendDailyMetrics[d].fuel[fuelType] = (trendDailyMetrics[d].fuel[fuelType] || 0) + fuel;
        trendDailyMetrics[d].count += 1;

        if (d >= startDateStr && d <= todayStr) {
          if (!dailyMetrics[d]) {
            dailyMetrics[d] = { steam: 0, fuel: {}, water: 0, count: 0 };
          }
          dailyMetrics[d].fuel[fuelType] = (dailyMetrics[d].fuel[fuelType] || 0) + fuel;
          dailyMetrics[d].count += 1;
        }
      }
    }

    // ── Calculate period totals ──
    let totalSteamProduced = 0;
    let totalWaterConsumed = 0;
    const totalFuelByType: Record<string, number> = {};

    for (const d of Object.values(dailyMetrics)) {
      totalSteamProduced += d.steam;
      totalWaterConsumed += d.water;
      for (const [ft, amt] of Object.entries(d.fuel)) {
        totalFuelByType[ft] = (totalFuelByType[ft] || 0) + amt;
      }
    }

    // Steam-to-fuel ratio: kg steam per kg/litre fuel
    let totalFuelAll = 0;
    for (const amt of Object.values(totalFuelByType)) totalFuelAll += amt;
    const steamToFuelRatio = totalFuelAll > 0 ? totalSteamProduced / totalFuelAll : 0;
    const waterPerTonneSteam = totalSteamProduced > 0 ? (totalWaterConsumed / totalSteamProduced) * 1000 : 0;

    // ── Cost calculations ──
    const steamPrice = pricingConfig?.steamPrice || 0;
    const waterPrice = pricingConfig?.waterPrice || 0;
    const steamUnit = pricingConfig?.steamUnit || 'tonne';
    const waterUnit = pricingConfig?.waterUnit || 'm3';

    // Fuel cost: sum of (fuel consumed * price per unit) per fuel type
    let totalFuelCost = 0;
    const fuelCostBreakdown: Array<{ fuelType: string; consumed: number; unit: string; pricePerUnit: number; cost: number }> = [];
    for (const [fuelType, consumed] of Object.entries(totalFuelByType)) {
      const fp = fuelPriceMap[fuelType] || { price: 0, unit: 'litre' };
      const cost = consumed * fp.price;
      totalFuelCost += cost;
      fuelCostBreakdown.push({
        fuelType: fuelType.charAt(0).toUpperCase() + fuelType.slice(1),
        consumed,
        unit: fp.unit,
        pricePerUnit: fp.price,
        cost,
      });
    }

    // Water cost (water consumed is in same unit as feedwaterUsed — assume litres)
    // If waterUnit is m3, convert litres to m3 (divide by 1000)
    const waterConsumedForCost = waterUnit === 'm3' ? totalWaterConsumed / 1000 : totalWaterConsumed;
    const totalWaterCost = waterConsumedForCost * waterPrice;

    // Maintenance costs
    let totalMaintenanceCost = 0;
    for (const m of maintenanceCosts) {
      totalMaintenanceCost += parseFloat(m.cost || '0');
    }

    const totalOperationalCost = totalFuelCost + totalWaterCost + totalMaintenanceCost;

    // Steam in tonnes (if stored in kg, divide by 1000)
    const steamInTonnes = steamUnit === 'tonne' ? totalSteamProduced / 1000 : totalSteamProduced;
    const revenue = steamInTonnes * steamPrice;
    const grossMargin = revenue - totalOperationalCost;
    const costPerTonne = steamInTonnes > 0 ? totalOperationalCost / steamInTonnes : 0;

    // Break-even fuel efficiency: what steam-to-fuel ratio covers the non-fuel costs?
    // At break-even: revenue = total_cost
    // (steam/1000) * steamPrice = (steam/ratio) * avgFuelPrice + waterCost + maintCost
    // ratio = (steam * avgFuelPrice) / ((steam/1000) * steamPrice - waterCost - maintCost)
    const nonFuelCost = totalWaterCost + totalMaintenanceCost;
    const netSteamRevenue = steamInTonnes * steamPrice;
    let breakEvenRatio = 0;
    if (netSteamRevenue > nonFuelCost && totalFuelAll > 0) {
      const avgFuelPrice = totalFuelCost / totalFuelAll;
      breakEvenRatio = (totalSteamProduced * avgFuelPrice) / (netSteamRevenue - nonFuelCost);
    }

    // ── Build trend data ──
    const trendDates = Object.keys(trendDailyMetrics).sort();
    const steamProductionTrend = trendDates.map((d) => ({
      date: d,
      steam: parseFloat((trendDailyMetrics[d].steam / 1000).toFixed(2)), // in tonnes
    }));

    const steamToFuelTrend = trendDates
      .map((d) => {
        const m = trendDailyMetrics[d];
        let totalFuel = 0;
        for (const amt of Object.values(m.fuel)) totalFuel += amt;
        const ratio = totalFuel > 0 ? m.steam / totalFuel : 0;
        return { date: d, ratio: parseFloat(ratio.toFixed(2)) };
      });

    // ── Cost breakdown for pie/bar chart ──
    const costBreakdown = [
      { name: 'Fuel', value: parseFloat(totalFuelCost.toFixed(2)), color: '#f97316' },
      { name: 'Water', value: parseFloat(totalWaterCost.toFixed(2)), color: '#3b82f6' },
      { name: 'Maintenance', value: parseFloat(totalMaintenanceCost.toFixed(2)), color: '#8b5cf6' },
    ].filter((c) => c.value > 0);

    // ── Daily efficiency for the period (for spotting degradation) ──
    const periodDates = Object.keys(dailyMetrics).sort();
    const dailyFuelEfficiency = periodDates.map((d) => {
      const m = dailyMetrics[d];
      let totalFuel = 0;
      for (const amt of Object.values(m.fuel)) totalFuel += amt;
      const ratio = totalFuel > 0 ? m.steam / totalFuel : 0;
      return {
        date: d,
        steam: parseFloat((m.steam / 1000).toFixed(2)),
        fuel: parseFloat(totalFuel.toFixed(2)),
        ratio: parseFloat(ratio.toFixed(2)),
        water: parseFloat(m.water.toFixed(1)),
      };
    });

    return NextResponse.json({
      period,
      startDate: startDateStr,
      endDate: todayStr,

      // Core metrics
      totalSteamProduced: parseFloat(totalSteamProduced.toFixed(1)),
      totalSteamTonnes: parseFloat(steamInTonnes.toFixed(2)),
      totalWaterConsumed: parseFloat(totalWaterConsumed.toFixed(1)),
      totalFuelByType,
      totalFuelAll: parseFloat(totalFuelAll.toFixed(1)),

      // Key ratios (THE two most important numbers)
      steamToFuelRatio: parseFloat(steamToFuelRatio.toFixed(2)),
      costPerTonne: parseFloat(costPerTonne.toFixed(2)),
      waterPerTonneSteam: parseFloat(waterPerTonneSteam.toFixed(2)),

      // Cost breakdown
      totalFuelCost: parseFloat(totalFuelCost.toFixed(2)),
      totalWaterCost: parseFloat(totalWaterCost.toFixed(2)),
      totalMaintenanceCost: parseFloat(totalMaintenanceCost.toFixed(2)),
      totalOperationalCost: parseFloat(totalOperationalCost.toFixed(2)),
      fuelCostBreakdown,

      // Derived / CEO numbers
      revenue: parseFloat(revenue.toFixed(2)),
      grossMargin: parseFloat(grossMargin.toFixed(2)),
      marginPercent: revenue > 0 ? parseFloat(((grossMargin / revenue) * 100).toFixed(1)) : 0,
      breakEvenRatio: parseFloat(breakEvenRatio.toFixed(2)),

      // Pricing info (read-only for display)
      steamPrice,
      steamUnit,
      waterPrice,
      waterUnit,

      // Trends
      steamProductionTrend,
      steamToFuelTrend,
      costBreakdown,
      dailyFuelEfficiency,

      // Data availability
      dataPoints: {
        calculations: periodCalcs.length,
        operationLogs: operationLogs.filter((l) => l.logDate >= startDateStr && l.logDate <= todayStr).length,
      },
    });
  } catch (error) {
    console.error('Executive dashboard metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch executive dashboard metrics' }, { status: 500 });
  }
}
