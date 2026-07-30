import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const factoryId = searchParams.get('factoryId');
    if (!factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const baseWhere = { factoryId };

    const [operationLogs, calculations, maintenanceLogs, waterChemistry] =
      await Promise.all([
        db.operationLog.findMany({
          where: { ...baseWhere, logDate: { gte: thirtyDaysAgo } },
          orderBy: [{ logDate: 'asc' }, { hour: 'asc' }],
          include: { boiler: { select: { name: true } } },
        }),
        db.boilerCalculation.findMany({
          where: { ...baseWhere, calcDate: { gte: thirtyDaysAgo } },
          orderBy: { calcDate: 'asc' },
          include: { boiler: { select: { name: true } } },
        }),
        db.maintenanceLog.findMany({
          where: baseWhere,
          orderBy: { logDate: 'desc' },
          include: { boiler: { select: { name: true } } },
        }),
        db.waterChemistry.findMany({
          where: { ...baseWhere, testDate: { gte: thirtyDaysAgo } },
          orderBy: { testDate: 'asc' },
          include: { boiler: { select: { name: true } } },
        }),
      ]);

    const pressureByDate: Record<string, { sum: number; count: number }> = {};
    const fuelByDate: Record<string, { sum: number; count: number }> = {};
    const flueGasByDate: Record<string, { sum: number; count: number }> = {};
    const steamTempByDate: Record<string, { sum: number; count: number }> = {};
    const waterLevelByDate: Record<string, { sum: number; count: number }> = {};

    operationLogs.forEach((log) => {
      const d = log.logDate;
      if (!pressureByDate[d]) pressureByDate[d] = { sum: 0, count: 0 };
      if (!fuelByDate[d]) fuelByDate[d] = { sum: 0, count: 0 };
      if (!flueGasByDate[d]) flueGasByDate[d] = { sum: 0, count: 0 };
      if (!steamTempByDate[d]) steamTempByDate[d] = { sum: 0, count: 0 };
      if (!waterLevelByDate[d]) waterLevelByDate[d] = { sum: 0, count: 0 };

      if (log.steamPressure) { pressureByDate[d].sum += parseFloat(log.steamPressure); pressureByDate[d].count++; }
      if (log.fuelConsumption) { fuelByDate[d].sum += parseFloat(log.fuelConsumption); fuelByDate[d].count++; }
      if (log.flueGasTemp) { flueGasByDate[d].sum += parseFloat(log.flueGasTemp); flueGasByDate[d].count++; }
      if (log.steamTemp) { steamTempByDate[d].sum += parseFloat(log.steamTemp); steamTempByDate[d].count++; }
      if (log.waterLevel) { waterLevelByDate[d].sum += parseFloat(log.waterLevel); waterLevelByDate[d].count++; }
    });

    const pressureTrend = Object.entries(pressureByDate)
      .map(([date, v]) => ({ date, pressure: parseFloat((v.sum / v.count).toFixed(1)) }))
      .slice(-14);
    const fuelTrend = Object.entries(fuelByDate)
      .map(([date, v]) => ({ date, fuel: parseFloat((v.sum / v.count).toFixed(1)) }))
      .slice(-14);
    const flueGasTrend = Object.entries(flueGasByDate)
      .map(([date, v]) => ({ date, flueGas: parseFloat((v.sum / v.count).toFixed(1)) }))
      .slice(-14);
    const steamTempTrend = Object.entries(steamTempByDate)
      .map(([date, v]) => ({ date, steamTemp: parseFloat((v.sum / v.count).toFixed(1)) }))
      .slice(-14);
    const waterLevelTrend = Object.entries(waterLevelByDate)
      .map(([date, v]) => ({ date, waterLevel: parseFloat((v.sum / v.count).toFixed(1)) }))
      .slice(-14);

    const operationalTrend = pressureTrend.map((p) => {
      const f = fuelTrend.find((x) => x.date === p.date);
      const fg = flueGasTrend.find((x) => x.date === p.date);
      const st = steamTempTrend.find((x) => x.date === p.date);
      const wl = waterLevelTrend.find((x) => x.date === p.date);
      return {
        date: p.date,
        steamPressure: p.pressure,
        fuelConsumption: f?.fuel || null,
        flueGasTemp: fg?.flueGas || null,
        steamTemp: st?.steamTemp || null,
        waterLevel: wl?.waterLevel || null,
      };
    });

    const efficiencyTrend = calculations
      .filter((c) => c.boilerEfficiency)
      .map((c) => ({
        date: c.calcDate,
        efficiency: parseFloat(c.boilerEfficiency!),
        stackLoss: c.stackLoss ? parseFloat(c.stackLoss) : null,
        radiationLoss: c.radiationLoss ? parseFloat(c.radiationLoss) : null,
        o2: c.o2Percentage ? parseFloat(c.o2Percentage) : null,
        co2: c.co2Percentage ? parseFloat(c.co2Percentage) : null,
      }));

    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const freqCounts: Record<string, number> = {};
    maintenanceLogs.forEach((m) => {
      statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
      typeCounts[m.maintenanceType] = (typeCounts[m.maintenanceType] || 0) + 1;
      freqCounts[m.frequency] = (freqCounts[m.frequency] || 0) + 1;
    });

    const maintenanceByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const maintenanceByType = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
    const maintenanceByFrequency = Object.entries(freqCounts).map(([name, value]) => ({ name, value }));

    const phByDate: Record<string, Record<string, { sum: number; count: number }>> = {};
    const condByDate: Record<string, Record<string, { sum: number; count: number }>> = {};

    waterChemistry.forEach((w) => {
      const d = w.testDate;
      const st = w.sampleType || 'Unknown';
      if (!phByDate[d]) phByDate[d] = {};
      if (!condByDate[d]) condByDate[d] = {};
      if (!phByDate[d][st]) phByDate[d][st] = { sum: 0, count: 0 };
      if (!condByDate[d][st]) condByDate[d][st] = { sum: 0, count: 0 };
      if (w.ph) { phByDate[d][st].sum += parseFloat(w.ph); phByDate[d][st].count++; }
      if (w.conductivity) { condByDate[d][st].sum += parseFloat(w.conductivity); condByDate[d][st].count++; }
    });

    const phTrend: Array<{ date: string; feedWater: number | null; boilerWater: number | null }> = [];
    const conductivityTrend: Array<{ date: string; feedWater: number | null; boilerWater: number | null }> = [];

    Object.entries(phByDate).forEach(([date, types]) => {
      const entry = { date, feedWater: null as number | null, boilerWater: null as number | null };
      Object.entries(types).forEach(([type, v]) => {
        const avg = parseFloat((v.sum / v.count).toFixed(1));
        if (type.includes('Feed') || type.includes('Make-up')) entry.feedWater = avg;
        else if (type.includes('Boiler') || type.includes('Blowdown')) entry.boilerWater = avg;
      });
      phTrend.push(entry);
    });

    Object.entries(condByDate).forEach(([date, types]) => {
      const entry = { date, feedWater: null as number | null, boilerWater: null as number | null };
      Object.entries(types).forEach(([type, v]) => {
        const avg = parseFloat((v.sum / v.count).toFixed(1));
        if (type.includes('Feed') || type.includes('Make-up')) entry.feedWater = avg;
        else if (type.includes('Boiler') || type.includes('Blowdown')) entry.boilerWater = avg;
      });
      conductivityTrend.push(entry);
    });

    const heatLossBreakdown = calculations
      .filter((c) => c.stackLoss || c.radiationLoss || c.otherLosses)
      .slice(-5)
      .map((c) => ({
        date: c.calcDate,
        stackLoss: c.stackLoss ? parseFloat(c.stackLoss) : 0,
        radiationLoss: c.radiationLoss ? parseFloat(c.radiationLoss) : 0,
        otherLosses: c.otherLosses ? parseFloat(c.otherLosses) : 0,
      }));

    return NextResponse.json({
      operationalTrend,
      efficiencyTrend,
      maintenanceByStatus,
      maintenanceByType,
      maintenanceByFrequency,
      phTrend,
      conductivityTrend,
      heatLossBreakdown,
    });
  } catch (error) {
    console.error('Dashboard charts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 });
  }
}
