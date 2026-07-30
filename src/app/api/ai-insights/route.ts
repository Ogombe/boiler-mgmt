import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ─── Call AI API: tries Groq first, falls back to Gemini ───
async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    throw new Error('No AI API key set. Add GROQ_API_KEY or GEMINI_API_KEY in Vercel Environment Variables.');
  }

  // ── Try Groq first (faster, higher rate limits) ──
  if (groqKey) {
    try {
      return await callGroq(groqKey, systemPrompt, userMessage);
    } catch (err) {
      console.error('[Groq failed, falling back to Gemini]', err);
      if (!geminiKey) throw err;
    }
  }

  // ── Fallback: Gemini ──
  return await callGemini(geminiKey!, systemPrompt, userMessage);
}

async function callGroq(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const reqBody = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.5,
    max_tokens: 4096,
  };

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(reqBody),
    });
    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, (5 + attempt * 10) * 1000));
      continue;
    }
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error('Groq API error ' + response.status + ': ' + errBody);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  }
  throw new Error('Groq API is busy. Please wait a moment and try again.');
}

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  const reqBody = {
    contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userMessage }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
  };

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      let waitSeconds = 60;
      try {
        const errData = await response.json();
        const retryInfo = errData?.error?.details?.[0];
        if (retryInfo) {
          const details = Array.isArray(retryInfo.details) ? retryInfo.details : [];
          for (const d of details) {
            if (d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && d.retryDelay) {
              waitSeconds = Math.ceil(parseFloat(d.retryDelay));
            }
          }
        }
      } catch (_) {}
      waitSeconds = Math.max(waitSeconds, 10);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error('Gemini API error ' + response.status + ': ' + errBody);
    }
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  throw new Error('Gemini API is busy. Please wait a minute and try again.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { focusArea, factoryId } = body;
    if (!factoryId) return NextResponse.json({ error: 'factoryId is required' }, { status: 400 });

    const baseWhere = { factoryId };

    const [boilers, operationLogs, calculations, maintenanceLogs, inspections, waterChemistry] =
      await Promise.all([
        db.boiler.findMany({ where: baseWhere, orderBy: { createdAt: 'desc' } }),
        db.operationLog.findMany({
          where: baseWhere,
          orderBy: [{ logDate: 'desc' }, { hour: 'asc' }],
          take: 100,
          include: { boiler: { select: { name: true } } },
        }),
        db.boilerCalculation.findMany({
          where: baseWhere,
          orderBy: { calcDate: 'desc' },
          take: 50,
          include: { boiler: { select: { name: true } } },
        }),
        db.maintenanceLog.findMany({
          where: baseWhere,
          orderBy: { logDate: 'desc' },
          take: 100,
          include: { boiler: { select: { name: true } } },
        }),
        db.inspectionRecord.findMany({
          where: baseWhere,
          orderBy: { inspectionDate: 'desc' },
          take: 50,
          include: { boiler: { select: { name: true } } },
        }),
        db.waterChemistry.findMany({
          where: baseWhere,
          orderBy: { testDate: 'desc' },
          take: 50,
          include: { boiler: { select: { name: true } } },
        }),
      ]);

    // Build a comprehensive data summary
    const dataSummary = {
      summary: {
        totalBoilers: boilers.length,
        boilerNames: boilers.map((b) => b.name),
        totalOperationLogs: operationLogs.length,
        totalCalculations: calculations.length,
        totalMaintenanceLogs: maintenanceLogs.length,
        pendingMaintenance: maintenanceLogs.filter((m) => m.status === 'Pending').length,
        totalInspections: inspections.length,
        totalWaterTests: waterChemistry.length,
      },
      boilers: boilers.map((b) => ({
        name: b.name,
        manufacturer: b.manufacturer,
        capacity: b.capacity,
        operatingPressure: b.operatingPressure,
        fuelType: b.fuelType,
        status: b.status,
      })),
      operationLogs: operationLogs.map((l) => ({
        date: l.logDate, hour: l.hour, boiler: l.boiler?.name,
        steamPressure: l.steamPressure, steamTemp: l.steamTemp,
        feedwaterTemp: l.feedwaterTemp, waterLevel: l.waterLevel,
        fuelConsumption: l.fuelConsumption, flueGasTemp: l.flueGasTemp,
        blowdownDone: l.blowdownDone, shift: l.shift,
      })),
      calculations: calculations.map((c) => ({
        date: c.calcDate, boiler: c.boiler?.name,
        fuelType: c.fuelType, fuelConsumption: c.fuelConsumption,
        boilerEfficiency: c.boilerEfficiency, heatInput: c.heatInput,
        heatOutput: c.heatOutput, evaporationRate: c.evaporationRate,
        co2Percentage: c.co2Percentage, o2Percentage: c.o2Percentage,
        coPercentage: c.coPercentage, flueGasTemp: c.flueGasTemp,
        stackLoss: c.stackLoss, radiationLoss: c.radiationLoss,
        otherLosses: c.otherLosses,
      })),
      maintenanceLogs: maintenanceLogs.map((m) => ({
        date: m.logDate, boiler: m.boiler?.name,
        type: m.maintenanceType, frequency: m.frequency,
        task: m.taskTitle, status: m.status, priority: m.priority,
        performedBy: m.performedBy, cost: m.cost,
        nextDueDate: m.nextDueDate, remarks: m.remarks,
      })),
      inspections: inspections.map((i) => ({
        date: i.inspectionDate, boiler: i.boiler?.name,
        type: i.inspectionType, inspector: i.inspectorName,
        authority: i.authority, status: i.status,
        pressureTest: i.pressureTestResult, hydroTest: i.hydroTestResult,
        nextInspection: i.nextInspectionDate, findings: i.findings,
      })),
      waterChemistry: waterChemistry.map((w) => ({
        date: w.testDate, boiler: w.boiler?.name,
        sampleType: w.sampleType, ph: w.ph, conductivity: w.conductivity,
        totalHardness: w.totalHardness, totalAlkalinity: w.totalAlkalinity,
        chloride: w.chloride, dissolvedOxygen: w.dissolvedOxygen,
        tds: w.totalDissolvedSolids, silica: w.silica,
        phosphate: w.phosphate, sulphite: w.sulphite,
        hydrazine: w.hydrazine, iron: w.iron, withinLimits: w.withinLimits,
      })),
    };

    // Build the system prompt based on focus area
    let focusInstruction = '';
    if (focusArea && focusArea !== 'all') {
      switch (focusArea) {
        case 'operations':
          focusInstruction =
            'Focus specifically on OPERATIONAL INSIGHTS: steam pressure trends, temperature patterns, fuel consumption efficiency, water level stability, flue gas temperature analysis, and shift-wise performance comparison. Identify any anomalies or concerning trends in hourly log data.';
          break;
        case 'maintenance':
          focusInstruction =
            'Focus specifically on MAINTENANCE INSIGHTS: analyze preventive vs reactive vs predictive maintenance patterns, identify frequently failing components, flag overdue maintenance, suggest optimal maintenance schedules, and recommend cost-saving preventive measures.';
          break;
        case 'water-chemistry':
          focusInstruction =
            'Focus specifically on WATER CHEMISTRY INSIGHTS: analyze feed water and boiler water quality trends, flag any out-of-spec parameters, identify corrosion or scaling risks, review treatment chemical effectiveness, and recommend water treatment adjustments.';
          break;
        case 'efficiency':
          focusInstruction =
            'Focus specifically on EFFICIENCY INSIGHTS: analyze boiler efficiency trends, heat loss breakdown (stack, radiation, other), fuel-to-steam ratios, evaporation rates, and recommend efficiency improvement opportunities with estimated savings.';
          break;
      }
    }

    const systemPrompt =
      'You are an expert boiler engineer and plant operations consultant with 30+ years of experience in industrial boiler systems, water treatment, and predictive maintenance. Analyze the provided boiler operation data and provide actionable, specific, and prioritized insights.\n\n' +
      focusInstruction + '\n\n' +
      'RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):\n' +
      '{\n' +
      '  "summary": "A brief 2-3 sentence overall assessment",\n' +
      '  "insights": [\n' +
      '    {\n' +
      '      "category": "Operations|Maintenance|Water Chemistry|Efficiency|Safety|Compliance",\n' +
      '      "severity": "Critical|High|Medium|Low|Info",\n' +
      '      "title": "Short insight title",\n' +
      '      "description": "Detailed explanation of the finding (2-4 sentences)",\n' +
      '      "recommendation": "Specific actionable recommendation",\n' +
      '      "metric": "Relevant metric or KPI if applicable",\n' +
      '      "affectedBoiler": "Boiler name or All"\n' +
      '    }\n' +
      '  ],\n' +
      '  "trends": [\n' +
      '    {\n' +
      '      "area": "Area being analyzed",\n' +
      '      "observation": "What the data shows",\n' +
      '      "direction": "Improving|Declining|Stable|Concerning",\n' +
      '      "action": "Recommended action"\n' +
      '    }\n' +
      '  ],\n' +
      '  "priorityActions": [\n' +
      '    "Action item 1",\n' +
      '    "Action item 2",\n' +
      '    "Action item 3"\n' +
      '  ]\n' +
      '}\n\n' +
      'If there is very little or no data, provide general best-practice insights for a boiler operation and note that more data is needed for specific recommendations. Always provide useful guidance even with limited data. Keep the total response under 2000 words.';

    const userPrompt = 'Here is the current boiler management system data:\n\n' + JSON.stringify(dataSummary, null, 2) +
      '\n\nPlease analyze this data and provide your expert insights in the specified JSON format.';

    const responseText = await callAI(systemPrompt, userPrompt);

    // Try to parse the JSON response
    let parsed;
    try {
      const cleanText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleanText);
    } catch {
      parsed = {
        summary: responseText,
        insights: [],
        trends: [],
        priorityActions: [],
      };
    }

    return NextResponse.json({
      insights: parsed,
      generatedAt: new Date().toISOString(),
      dataPoints: {
        operationLogs: operationLogs.length,
        calculations: calculations.length,
        maintenanceLogs: maintenanceLogs.length,
        inspections: inspections.length,
        waterTests: waterChemistry.length,
      },
    });
  } catch (error) {
    console.error('AI Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI insights', details: String(error) },
      { status: 500 }
    );
  }
}
