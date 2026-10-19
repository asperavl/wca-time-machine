import type { OverviewData, YearDetail } from './types';

let cachedOverview: OverviewData | null = null;
const cachedYearDetails = new Map<number, YearDetail>();

export async function fetchOverview(): Promise<OverviewData> {
  if (cachedOverview) {
    return cachedOverview;
  }
  const response = await fetch('/data/overview.json');
  if (!response.ok) {
    throw new Error(`Failed to load overview data: HTTP ${response.status}`);
  }
  const data: OverviewData = await response.json();
  cachedOverview = data;
  return data;
}

export async function fetchYearDetail(year: number): Promise<YearDetail> {
  if (cachedYearDetails.has(year)) {
    return cachedYearDetails.get(year)!;
  }
  const response = await fetch(`/data/years/${year}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load data for year ${year}: HTTP ${response.status}`);
  }
  const data: YearDetail = await response.json();
  cachedYearDetails.set(year, data);
  return data;
}

/**
 * Calculate user's percentile using precomputed percentile table.
 * Returns the "Top X%" ranking where smaller percentage = faster.
 * (e.g. 5.0% means Top 5% of all competitors that year).
 */
export function calculateTopPercentile(timeSec: number, percentiles: Record<number, number>): number {
  const pKeys = Object.keys(percentiles)
    .map(Number)
    .sort((a, b) => a - b);

  if (pKeys.length === 0) return 50.0;

  const minPTime = percentiles[pKeys[0]];
  const maxPTime = percentiles[pKeys[pKeys.length - 1]];

  if (timeSec <= minPTime) {
    return 0.1; // Faster than 99.9% (Top 0.1%)
  }
  if (timeSec >= maxPTime) {
    return 99.9; // Slower than 99% (Top 99.9%)
  }

  // Find bounding percentiles and interpolate
  for (let i = 0; i < pKeys.length - 1; i++) {
    const p1 = pKeys[i];
    const p2 = pKeys[i + 1];
    const t1 = percentiles[p1];
    const t2 = percentiles[p2];

    if (timeSec >= t1 && timeSec <= t2) {
      if (t2 === t1) return p1;
      const fraction = (timeSec - t1) / (t2 - t1);
      const interpolatedP = p1 + fraction * (p2 - p1);
      return Math.round(interpolatedP * 10) / 10;
    }
  }

  return 50.0;
}
