/**
 * Steam utility functions for automatic temperature calculation from pressure.
 * Provides both steam table interpolation and Antoine equation methods.
 */

import { steamTempFromPressure } from './steam-tables';

/**
 * Calculate saturated steam temperature from pressure.
 * Supports multiple unit inputs.
 *
 * @param pressure - Pressure value
 * @param unit - Unit: 'barg' (gauge bar), 'barg' (default), 'kpa', 'psig'
 * @returns Temperature in °C, or null if invalid
 */
export function calcSteamTemp(pressure: number, unit: string = 'barg'): number | null {
  if (isNaN(pressure) || !isFinite(pressure)) return null;

  let pressureBarg: number;

  switch (unit.toLowerCase()) {
    case 'barg':
    case 'bar':
      pressureBarg = pressure;
      break;
    case 'kpa':
      pressureBarg = pressure / 100;
      break;
    case 'psig':
      pressureBarg = pressure * 0.0689476;
      break;
    default:
      pressureBarg = pressure;
  }

  return steamTempFromPressure(pressureBarg);
}

/**
 * Also export for direct use */
export { steamTempFromPressure, formatSteamTemp } from './steam-tables';
