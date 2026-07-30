/**
 * Saturated Steam Tables — Gauge Pressure (bar) ↔ Temperature (°C)
 * Based on standard IAPWS-IF97 saturated steam data.
 * Provides automatic steam temperature calculation from steam pressure.
 */

// Lookup table: gauge pressure in bar → saturated steam temperature in °C
const STEAM_TABLE: [number, number][] = [
  [0, 100],
  [0.5, 111.4],
  [1, 120.2],
  [1.5, 127.4],
  [2, 133.5],
  [2.5, 138.9],
  [3, 143.6],
  [3.5, 147.9],
  [4, 151.8],
  [4.5, 155.5],
  [5, 158.8],
  [5.5, 162.0],
  [6, 164.9],
  [6.5, 167.7],
  [7, 170.4],
  [7.5, 172.9],
  [8, 175.4],
  [8.5, 177.6],
  [9, 179.9],
  [9.5, 181.9],
  [10, 184.1],
  [10.5, 186.0],
  [11, 187.9],
  [11.5, 189.8],
  [12, 191.6],
  [12.5, 193.3],
  [13, 194.9],
  [13.5, 196.6],
  [14, 198.3],
  [14.5, 199.8],
  [15, 201.4],
  [15.5, 202.8],
  [16, 204.3],
  [16.5, 205.8],
  [17, 207.2],
  [17.5, 208.5],
  [18, 209.9],
  [18.5, 211.2],
  [19, 212.5],
  [19.5, 213.7],
  [20, 215.0],
  [21, 217.3],
  [22, 219.7],
  [23, 221.8],
  [24, 224.1],
  [25, 226.0],
  [26, 228.1],
  [27, 230.0],
  [28, 232.0],
  [29, 233.8],
  [30, 235.8],
  [32, 239.5],
  [34, 243.1],
  [36, 246.6],
  [38, 249.9],
  [40, 253.0],
  [42, 256.0],
  [44, 258.9],
  [45, 260.3],
  [46, 261.7],
  [48, 264.4],
  [50, 266.9],
  [55, 273.3],
  [60, 279.0],
  [65, 284.2],
  [70, 289.1],
  [75, 293.6],
  [80, 297.9],
  [85, 301.8],
  [90, 305.5],
  [95, 308.9],
  [100, 311.1],
  [110, 316.6],
  [120, 321.5],
  [130, 325.8],
  [140, 329.8],
  [150, 333.4],
];

/**
 * Calculate saturated steam temperature from gauge pressure.
 * Uses linear interpolation between steam table entries.
 * 
 * @param pressureGauge - Gauge pressure in bar (e.g., 10 for 10 bar)
 * @returns Temperature in °C, or null if pressure is out of range/negative
 */
export function steamTempFromPressure(pressureGauge: number): number | null {
  if (pressureGauge < 0 || isNaN(pressureGauge) || !isFinite(pressureGauge)) return null;

  // Clamp to table range
  if (pressureGauge <= STEAM_TABLE[0][0]) return STEAM_TABLE[0][1];
  if (pressureGauge >= STEAM_TABLE[STEAM_TABLE.length - 1][0]) {
    return STEAM_TABLE[STEAM_TABLE.length - 1][1];
  }

  // Find bracketing entries
  for (let i = 1; i < STEAM_TABLE.length; i++) {
    if (pressureGauge <= STEAM_TABLE[i][0]) {
      const [p0, t0] = STEAM_TABLE[i - 1];
      const [p1, t1] = STEAM_TABLE[i];
      // Linear interpolation
      const frac = (pressureGauge - p0) / (p1 - p0);
      return Math.round((t0 + frac * (t1 - t0)) * 10) / 10;
    }
  }

  return null;
}

/**
 * Format temperature value for display.
 */
export function formatSteamTemp(temp: number | null): string {
  if (temp === null) return '';
  return temp.toFixed(1);
}
