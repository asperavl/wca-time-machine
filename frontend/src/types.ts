export interface DatasetMetadata {
  title: string;
  export_date: string;
  export_format_version: string;
  event: string;
  event_name: string;
  years_span: string;
  total_competitions: number;
  total_333_results: number;
  total_competitors: number;
  total_valid_singles: number;
  total_valid_averages: number;
}

export interface RecordHolder {
  name: string | null;
  country: string | null;
  time: number | null;
}

export interface MetricStats {
  median: number | null;
  mean: number | null;
  p10: number | null;
  p25: number | null;
  p75: number | null;
  p90: number | null;
  min: number | null;
  record_holder: RecordHolder | null;
}

export interface YearSummary {
  year: number;
  competitors: number;
  single_count: number;
  average_count: number;
  single: MetricStats;
  average: MetricStats;
}

export interface OverviewData {
  metadata: DatasetMetadata;
  available_years: number[];
  years: YearSummary[];
}

export interface HistogramBin {
  start: number;
  end: number;
  label: string;
  count: number;
  cumulative_pct: number;
}

export interface DetailDistribution {
  percentiles: Record<number, number>;
  histogram: HistogramBin[];
  overflow_60s: number;
}

export interface YearDetail {
  year: number;
  summary: YearSummary;
  single: DetailDistribution;
  average: DetailDistribution;
}

export type MetricType = 'average' | 'single';

export interface SolveRecord {
  id: number;
  scramble: string;
  rawTimeSec: number;
  penalty: 'NONE' | '+2' | 'DNF';
  finalTimeSec: number | null; // null if DNF
}

export interface SessionResult {
  year: number;
  solves: SolveRecord[];
  ao5Sec: number | null;
  bestSingleSec: number | null;
  ao5Percentile: number | null;
  bestSinglePercentile: number | null;
}
