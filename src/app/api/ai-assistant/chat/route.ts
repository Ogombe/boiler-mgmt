import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════
// BOILER ENGINEERING KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════

const BOILER_KNOWLEDGE = `
## BOILER FUNDAMENTALS

### Types of Boilers
- **Fire-tube boilers**: Hot gases pass through tubes surrounded by water. Common types: Cochran, Lancashire, locomotive, Scotch marine. Typically 10-250 HP, pressures up to 20 bar. Good for small to medium steam demands.
- **Water-tube boilers**: Water circulates inside tubes with hot gases outside. Types: D-type, O-type, A-type, bent-tube. Higher pressures (up to 200+ bar), larger capacities. Used in power plants and large process plants.
- **Package boilers**: Complete factory-assembled units, quick to install. Common in medium-scale operations.
- **Electric boilers**: Use resistance heating elements. Clean, compact, but high operating cost.

### Boiler Mountings and Accessories
**Mountings (safety-critical, mandatory):** Safety valves, water level indicators, pressure gauges, steam stop valve, feed check valve, blowdown valve, low-water cutoff, fusible plug.
**Accessories (operational):** Economizer (preheats feedwater using flue gas, saves 5-10% fuel), Superheater (increases steam temperature/energy), Air preheater (preheats combustion air, saves 2-5% fuel), Feed pump, Injector, Steam trap, Deaerator.

### Steam Properties
- Saturated steam: At boiling point for given pressure. Temperature and pressure are directly related.
- Dry saturated: No water droplets. Enthalpy = hf + hfg.
- Wet steam: Contains water droplets. Quality (dryness fraction) x = mass of dry steam / total mass.
- Superheated steam: Heated above saturation temperature. More energy per kg, no moisture.
- Enthalpy of evaporation (hfg) at atmospheric pressure is approximately 2257 kJ/kg.
- Every 5.5 degrees C reduction in flue gas temperature improves boiler efficiency by approximately 1%.

### Combustion and Efficiency
**Stoichiometric air:** Theoretical air required for complete combustion of fuel.
- Natural gas: approximately 9.5 m3 air/m3 gas
- Diesel/HFO: approximately 14.5 kg air/kg fuel
- Coal: approximately 6-8 kg air/kg fuel

**Excess air:** In practice, 15-30% excess air is needed for complete combustion.
- Too little causes incomplete combustion, CO, soot, smoke
- Too much carries heat away in flue gas, reduces efficiency

**Boiler Efficiency:**
- Direct method: efficiency = (m_s x (h_s - h_fw)) / (m_f x GCV) x 100%
- Indirect method (losses method): efficiency = 100 - (stack loss + radiation loss + moisture loss + unburnt fuel loss + other losses)

**Key losses:**
- Dry flue gas loss (biggest loss, typically 10-18%): Depends on flue gas temp and excess air (O2%)
- Radiation/convection loss: 1-3% depending on boiler size and insulation
- Moisture in fuel: 3-7% for coal, negligible for gas
- Unburnt carbon in ash: 1-5% for coal
- Hydrogen in fuel burning to water vapor: 3-5%

### Water Treatment
**Feedwater quality targets:**
- Hardness: < 1 ppm as CaCO3 (to prevent scale)
- pH: 8.5-9.5 (to prevent corrosion)
- Dissolved oxygen: < 0.02 ppm (to prevent pitting corrosion)
- Total dissolved solids (TDS): < 200 ppm in feedwater, 2000-3500 ppm in boiler water
- Iron: < 0.1 ppm
- Silica: < 0.02 ppm in steam (to prevent turbine deposits)

**Common problems:**
- Scale (calcium/magnesium deposits): Reduces heat transfer, increases fuel consumption 2-5% per mm of scale, can cause tube overheating and failure
- Corrosion (oxygen pitting, acid attack): Causes metal thinning, tube leaks, premature failure
- Carryover (water droplets in steam): Contaminates steam, damages turbines and heat exchangers
- Foaming: Causes unstable water level, carryover

**Treatment chemicals:**
- Oxygen scavenger (sodium sulphite/hydrazine): Removes dissolved oxygen
- Phosphate (TSP/TKPP): Precipitates calcium hardness as soft sludge
- Amine (morpholine/cyclohexylamine): Raises condensate pH to prevent corrosion
- Polymer/antiscalant: Prevents scale formation
- Coagulant: Helps settle suspended solids

### Blowdown
**Purpose:** Control TDS level in boiler water by discharging concentrated water and replacing with fresh feedwater.
**Types:**
- Intermittent (surface/skimming): Removes floating impurities, done 1-2 times per shift
- Continuous (bottom): Maintains steady TDS, more fuel-efficient

**Calculation:** Blowdown % = (TDS_feed / (TDS_boiler - TDS_feed)) x 100
- Example: Feed TDS 200 ppm, Boiler TDS 3500 ppm gives BD = 200/(3500-200) x 100 = 6.06%
- Blowdown heat recovery can save 1-3% fuel

### Troubleshooting Guide
**Low water level:**
- Check feed pump operation and pressure
- Check feed control valve
- Check for leaks (blowdown, safety valve, trap failure)
- If water visible in gauge glass: increase feed, reduce load
- If water NOT visible: SHUTDOWN immediately, do NOT add water to hot boiler

**Low steam pressure:**
- Check fuel supply pressure and flow
- Check burner operation (flame pattern, fuel/air ratio)
- Check for excess load demand
- Check for scaling on heat transfer surfaces
- Check flue gas temperature (high = fouling)

**High flue gas temperature:**
- Indicates fouling (soot on fireside, scale on waterside)
- Clean fireside tubes, check for soot blower operation
- Check waterside for scale, consider acid cleaning if needed
- Check economizer/air preheater for fouling

**Water carryover / priming:**
- High TDS in boiler water: increase blowdown
- High water level: reduce feed rate
- Sudden load changes: stabilize demand
- Check for foaming: reduce organics, increase blowdown

**Safety valve lifting:**
- Check pressure gauge accuracy
- Check burner fuel/air ratio (over-firing?)
- Check for blocked steam outlet or closed valve downstream
- Never plug or restrict a safety valve

**Fuel-related issues:**
- Poor atomization (fuel oil): Check fuel temperature (HFO needs 80-120 degrees C), check atomizer, check fuel viscosity
- Flame instability: Check fuel pressure, air supply, electrode/spark
- Black smoke: Excess fuel / insufficient air: adjust air damper
- White smoke: Excess air / poor combustion temperature

### Steam Distribution
**Pipe sizing:** Based on steam flow rate (kg/hr) and acceptable velocity (25-40 m/s for saturated steam, 30-60 m/s for superheated).
**Steam traps:** Remove condensate from steam lines. Types: mechanical (bucket), thermostatic (bimetal), thermodynamic (disc). Failed traps = major energy loss (a 3mm hole in 10 bar steam loses approximately 50 kg/hr).
**Pressure reducing stations (PRS):** Reduce steam pressure for process use. Must be correctly sized with adequate upstream/downstream pressure.
**Condensate recovery:** Return hot condensate to feed tank. Every 6 degrees C rise in feedwater temperature saves approximately 1% fuel. Target 80-90% condensate return.

### Safety Standards
- Safety valves must be tested and certified annually
- Pressure vessels must be inspected per local regulations (typically every 1-2 years)
- Hydrostatic test at 1.5x design pressure
- All operators must be trained and certified
- Emergency shutdown procedures must be posted and drilled
- PPE: heat-resistant gloves, face shield, safety boots when operating boilers
`;

// ─── Call AI API: tries Groq first, falls back to Gemini ───
async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    throw new Error('No AI API key set. Add GROQ_API_KEY or GEMINI_API_KEY in Vercel Environment Variables.');
  }

  // ── Try Groq (faster, higher rate limits) ──
  if (groqKey) {
    try {
      return await callGroq(groqKey, messages);
    } catch (err) {
      console.error('[Groq failed, falling back to Gemini]', err);
      if (!geminiKey) throw err;
    }
  }

  // ── Fallback: Gemini ──
  return await callGemini(geminiKey!, messages);
}

async function callGroq(apiKey: string, messages: { role: string; content: string }[]): Promise<string> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const reqBody = {
    model: 'llama-3.3-70b-versatile',
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    temperature: 0.7,
    max_tokens: 4096,
  };

  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify(reqBody),
    });

    if (response.status === 429 && attempt < MAX_RETRIES - 1) {
      const waitSeconds = 5 + attempt * 10;
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error('Groq API error ' + response.status + ': ' + errBody);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || 'No response generated.';
  }

  throw new Error('Groq API is busy. Please wait a moment and try again.');
}

async function callGemini(apiKey: string, messages: { role: string; content: string }[]): Promise<string> {
  let systemText = '';
  const geminiContents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemText = msg.content;
    } else {
      geminiContents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  if (systemText && geminiContents.length > 0 && geminiContents[0].role === 'user') {
    geminiContents[0].parts[0].text = systemText + '\n\n' + geminiContents[0].parts[0].text;
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

  const reqBody = {
    contents: geminiContents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
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
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  }

  throw new Error('Gemini API is busy. Please wait a minute and try again.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, factoryId, history = [] } = body;
    if (!factoryId || !message) {
      return NextResponse.json({ error: 'factoryId and message required' }, { status: 400 });
    }

    // Fetch factory data for context
    const [factory, boilers, recentLogs, recentCalcs, pendingMaintenance, overdueInspections, recentWaterTests] =
      await Promise.all([
        db.factory.findUnique({ where: { id: factoryId } }),
        db.boiler.findMany({ where: { factoryId }, orderBy: { createdAt: 'desc' } }),
        db.operationLog.findMany({ where: { factoryId }, orderBy: { logDate: 'desc' }, take: 30, include: { boiler: { select: { name: true } } } }),
        db.boilerCalculation.findMany({ where: { factoryId }, orderBy: { calcDate: 'desc' }, take: 10, include: { boiler: { select: { name: true } } } }),
        db.maintenanceLog.findMany({ where: { factoryId, status: 'Pending' }, orderBy: { logDate: 'desc' }, take: 15, include: { boiler: { select: { name: true } } } }),
        db.inspectionRecord.findMany({ where: { factoryId, status: { not: 'Completed' } }, orderBy: { inspectionDate: 'desc' }, take: 10, include: { boiler: { select: { name: true } } } }),
        db.waterChemistry.findMany({ where: { factoryId }, orderBy: { testDate: 'desc' }, take: 10, include: { boiler: { select: { name: true } } } }),
      ]);

    const boilerSpecs = boilers.map((b) => ({
      name: b.name, manufacturer: b.manufacturer, model: b.model, boilerType: b.boilerType,
      capacity: b.capacity, capacityUnit: b.capacityUnit, operatingPressure: b.operatingPressure,
      designPressure: b.designPressure, maxAllowableWP: b.maxAllowableWP, designSteamTemp: b.designSteamTemp,
      designFeedwaterTemp: b.designFeedwaterTemp, fuelType: b.fuelType, fuelConsumptionRate: b.fuelConsumptionRate,
      heatingSurfaceArea: b.heatingSurfaceArea, designEfficiency: b.designEfficiency, numberOfPasses: b.numberOfPasses,
      yearOfManufacture: b.yearOfManufacture, drumCapacity: b.drumCapacity, superheaterTemp: b.superheaterTemp,
      superheaterPressure: b.superheaterPressure, economizerType: b.economizerType, installationDate: b.installationDate,
      status: b.status,
    }));

    const recentLogsSummary = recentLogs.slice(0, 15).map((l) => ({
      date: l.logDate, time: l.hour, boiler: l.boiler?.name, pressure: l.steamPressure,
      steamTemp: l.steamTemp, fwTemp: l.feedwaterTemp, waterLevel: l.waterLevel,
      fuel: l.fuelConsumption, flueGas: l.flueGasTemp, blowdown: l.blowdownDone,
      operator: l.operatorName, shift: l.shift,
    }));

    const calcSummary = recentCalcs.map((c) => ({
      date: c.calcDate, boiler: c.boiler?.name, fuel: c.fuelType, efficiency: c.boilerEfficiency,
      co2: c.co2Percentage, o2: c.o2Percentage, stackLoss: c.stackLoss, radLoss: c.radiationLoss,
    }));

    const maintenanceUrgent = pendingMaintenance.map((m) => ({
      task: m.taskTitle, boiler: m.boiler?.name, priority: m.priority, dueDate: m.nextDueDate,
      frequency: m.frequency, type: m.maintenanceType,
    }));

    const overdueInsp = overdueInspections.map((i) => ({
      type: i.inspectionType, boiler: i.boiler?.name, dueDate: i.nextInspectionDate,
      status: i.status, findings: i.findings,
    }));

    const waterSummary = recentWaterTests.map((w) => ({
      date: w.testDate, boiler: w.boiler?.name, ph: w.ph, conductivity: w.conductivity,
      hardness: w.totalHardness, alkalinity: w.totalAlkalinity, chloride: w.chloride,
      tds: w.totalDissolvedSolids, oxygen: w.dissolvedOxygen, silica: w.silica,
      phosphate: w.phosphate, withinLimits: w.withinLimits,
    }));

    // Build context block - using string concatenation to avoid Turbopack parsing issues with special chars in template literals
    const waterLines = waterSummary.length > 0
      ? waterSummary.map((w) => {
          const parts = [
            '[' + w.date + '] ' + (w.boiler || '?'),
            'pH: ' + (w.ph || '-'),
            'Cond: ' + (w.conductivity || '-') + ' uS',
            'Hardness: ' + (w.hardness || '-'),
            'Alk: ' + (w.alkalinity || '-'),
            'Cl: ' + (w.chloride || '-'),
            'TDS: ' + (w.tds || '-'),
            'O2: ' + (w.oxygen || '-'),
            'Silica: ' + (w.silica || '-'),
            'PO4: ' + (w.phosphate || '-'),
            'Limits: ' + (w.withinLimits || '-'),
          ];
          return parts.join(' | ');
        }).join('\n')
      : 'No water tests recorded yet.';

    const logLines = recentLogsSummary.length > 0
      ? recentLogsSummary.map((l) => {
          return '[' + l.date + ' ' + l.time + '] ' + (l.boiler || '?') +
            ' | P: ' + (l.pressure || '-') + ' bar' +
            ' | Steam T: ' + (l.steamTemp || '-') + ' C' +
            ' | FW T: ' + (l.fwTemp || '-') + ' C' +
            ' | Water Lvl: ' + (l.waterLevel || '-') + '%' +
            ' | Fuel: ' + (l.fuel || '-') + ' kg/hr' +
            ' | Flue Gas: ' + (l.flueGas || '-') + ' C' +
            ' | BD: ' + l.blowdown +
            ' | Shift: ' + (l.shift || '-') +
            ' | Op: ' + (l.operator || '-');
        }).join('\n')
      : 'No operation logs recorded yet.';

    const calcLines = calcSummary.length > 0
      ? calcSummary.map((c) => {
          return '[' + c.date + '] ' + (c.boiler || '?') +
            ' | ' + c.fuel +
            ' | Efficiency: ' + (c.efficiency || '-') + '%' +
            ' | CO2: ' + (c.co2 || '-') + '%' +
            ' | O2: ' + (c.o2 || '-') + '%' +
            ' | Stack Loss: ' + (c.stackLoss || '-') + '%' +
            ' | Rad Loss: ' + (c.radLoss || '-') + '%';
        }).join('\n')
      : 'No calculations recorded yet.';

    const maintLines = maintenanceUrgent.length > 0
      ? maintenanceUrgent.map((m) => {
          return '- [' + m.priority + '] ' + m.task + ' (' + (m.boiler || 'All') + ')' +
            ' - Due: ' + (m.dueDate || 'N/A') +
            ', Frequency: ' + m.frequency +
            ', Type: ' + m.type;
        }).join('\n')
      : 'No pending maintenance tasks.';

    const inspLines = overdueInsp.length > 0
      ? overdueInsp.map((i) => {
          return '- ' + i.type + ' (' + (i.boiler || 'All') + ')' +
            ' - Due: ' + (i.dueDate || 'N/A') +
            ', Status: ' + i.status +
            (i.findings ? ', Findings: ' + i.findings : '');
        }).join('\n')
      : 'All inspections up to date.';

    const boilerLines = boilerSpecs.map((b) => {
      return '- **' + b.name + '**: ' + (b.boilerType || 'Boiler') +
        ', ' + (b.capacity || '?') + ' ' + (b.capacityUnit || 'kg/hr') +
        ', Design Pressure: ' + (b.designPressure || '?') + ' bar' +
        ', Design Temp: ' + (b.designSteamTemp || '?') + ' C' +
        ', Fuel: ' + (b.fuelType || '?') +
        ', Design Efficiency: ' + (b.designEfficiency || '?') + '%' +
        ', Status: ' + (b.status || 'Unknown') +
        ', Manufacturer: ' + (b.manufacturer || '?') +
        ', Year: ' + (b.yearOfManufacture || '?') +
        ', Heating Surface: ' + (b.heatingSurfaceArea || '?') + ' m2' +
        ', Passes: ' + (b.numberOfPasses || '?');
    }).join('\n');

    const dataContext =
      '## CURRENT FACTORY: ' + (factory?.name || 'Unknown') + '\n' +
      (factory?.city ? 'Location: ' + factory.city + ', ' + (factory.country || '') + '\n' : '') +
      '\n## BOILERS IN THIS FACTORY (' + boilers.length + ')\n' +
      boilerLines +
      '\n\n## RECENT OPERATION LOGS (last 15 entries)\n' +
      logLines +
      '\n\n## RECENT EFFICIENCY CALCULATIONS\n' +
      calcLines +
      '\n\n## PENDING MAINTENANCE (' + maintenanceUrgent.length + ' tasks)\n' +
      maintLines +
      '\n\n## OVERDUE/PENDING INSPECTIONS (' + overdueInsp.length + ')\n' +
      inspLines +
      '\n\n## RECENT WATER CHEMISTRY TESTS\n' +
      waterLines;

    const systemPrompt =
      'You are "BoilerBot", an AI Technical Assistant built into a Boiler Management System SaaS platform. You serve boiler operators, shift engineers, and plant engineers.\n\n' +
      '## YOUR ROLE\n' +
      'You are a knowledgeable, patient, and safety-first technical advisor. You help boiler operators:\n' +
      '1. **Troubleshoot issues** - diagnose problems from symptoms, suggest step-by-step fixes\n' +
      '2. **Operate efficiently** - advise on optimal settings, fuel efficiency, water treatment\n' +
      '3. **Understand their data** - interpret readings, identify trends, flag anomalies\n' +
      '4. **Learn theory** - explain boiler principles, steam properties, combustion science\n' +
      '5. **Work autonomously** - give operators enough knowledge to handle common situations without calling an engineer\n' +
      '6. **Know when to escalate** - clearly tell the operator when to stop and call the engineer\n\n' +
      '## IMPORTANT RULES\n' +
      '- **SAFETY FIRST**: If the operator describes a dangerous situation (low water, safety valve issues, unusual noises, leaks, gas smell), immediately prioritize safety. Tell them to follow their site emergency procedures.\n' +
      '- **BE SPECIFIC**: Reference the actual data from their factory. Use boiler names, actual readings, and dates from the data provided.\n' +
      '- **BE PRACTICAL**: Give step-by-step instructions operators can follow. Use simple language.\n' +
      '- **BE HONEST**: If you are not sure about something, say so. Recommend consulting a qualified engineer.\n' +
      '- **BE CONCISE**: Keep answers focused and actionable. Use bullet points and numbered steps.\n' +
      '- **NEVER suggest bypassing safety devices** or operating outside design parameters.\n' +
      '- **Format**: Use markdown for readability. Use bold for emphasis, numbered lists for procedures, bullet points for options.\n\n' +
      '## YOUR KNOWLEDGE\n' +
      'You have deep expertise in:\n' +
      BOILER_KNOWLEDGE +
      '\n\n## THE OPERATORS FACTORY DATA\n' +
      dataContext +
      '\n\nRespond helpfully to the operators question or concern.';

    // Build conversation messages
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 messages for context)
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const responseText = await callAI(messages);

    return NextResponse.json({
      response: responseText,
      dataAvailable: {
        boilers: boilers.length,
        operationLogs: recentLogs.length,
        calculations: recentCalcs.length,
        pendingMaintenance: pendingMaintenance.length,
        overdueInspections: overdueInspections.length,
        waterTests: recentWaterTests.length,
      },
    });
  } catch (error) {
    console.error('[POST /api/ai-assistant/chat]', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: String(error) },
      { status: 500 }
    );
  }
}
