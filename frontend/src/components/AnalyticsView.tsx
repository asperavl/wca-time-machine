import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { OverviewData, YearDetail, MetricType } from '../types';
import { fetchYearDetail } from '../api';
import { formatTime } from '../utils/wca';
import { TrendingUp, GitCompare, ArrowLeft, ArrowRight, Database } from 'lucide-react';

interface AnalyticsViewProps {
  overview: OverviewData;
  initialYear?: number;
}

type ArchiveMode = 'evolution' | 'compare';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ overview, initialYear = 2024 }) => {
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>('evolution');
  const [metric, setMetric] = useState<MetricType>('average');
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [yearDetail, setYearDetail] = useState<YearDetail | null>(null);

  // Compare mode states
  const [yearA, setYearA] = useState<number>(2010);
  const [yearB, setYearB] = useState<number>(2024);
  const [detailA, setDetailA] = useState<YearDetail | null>(null);
  const [detailB, setDetailB] = useState<YearDetail | null>(null);

  useEffect(() => {
    fetchYearDetail(selectedYear)
      .then((data) => {
        setYearDetail(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [selectedYear]);

  useEffect(() => {
    if (archiveMode === 'compare') {
      fetchYearDetail(yearA).then(setDetailA);
      fetchYearDetail(yearB).then(setDetailB);
    }
  }, [archiveMode, yearA, yearB]);

  const availableYears = overview.available_years;

  // Transform overview years for trend chart
  const trendChartData = overview.years.map((y) => {
    const stats = metric === 'average' ? y.average : y.single;
    return {
      year: y.year,
      median: stats.median,
      p10: stats.p10,
      p90: stats.p90,
      mean: stats.mean,
      min: stats.min,
      competitors: y.competitors,
    };
  });

  const currentYearSummary = overview.years.find((y) => y.year === selectedYear);
  const currentStats = currentYearSummary
    ? metric === 'average'
      ? currentYearSummary.average
      : currentYearSummary.single
    : null;

  const isAo5Unavailable = metric === 'average' && selectedYear === 1982;

  // Prepare overlaid compare data
  const compareOverlayData = useMemo(() => {
    if (!detailA || !detailB) return [];
    const histA = metric === 'average' ? detailA.average.histogram : detailA.single.histogram;
    const histB = metric === 'average' ? detailB.average.histogram : detailB.single.histogram;

    const countA = metric === 'average' ? detailA.summary.average_count : detailA.summary.single_count;
    const countB = metric === 'average' ? detailB.summary.average_count : detailB.summary.single_count;

    return histA.map((binA, idx) => {
      const binB = histB[idx] || { count: 0 };
      const pctA = countA > 0 ? (binA.count / countA) * 100 : 0;
      const pctB = countB > 0 ? (binB.count / countB) * 100 : 0;

      return {
        label: binA.label,
        start: binA.start,
        [`${yearA}_count`]: binA.count,
        [`${yearA}_pct`]: Number(pctA.toFixed(2)),
        [`${yearB}_count`]: binB.count,
        [`${yearB}_pct`]: Number(pctB.toFixed(2)),
      };
    });
  }, [detailA, detailB, metric, yearA, yearB]);

  return (
    <div className="analytics-view">
      {/* View Header with Metric & Subtab Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {/* Metric Selector (Average vs Single) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            STATISTICAL METRIC:
          </span>
          <div className="nav-tabs">
            <button
              className={`nav-tab-btn ${metric === 'average' ? 'active' : ''}`}
              onClick={() => setMetric('average')}
            >
              Average of 5 (Ao5)
            </button>
            <button
              className={`nav-tab-btn ${metric === 'single' ? 'active' : ''}`}
              onClick={() => setMetric('single')}
            >
              Single Time
            </button>
          </div>
        </div>

        {/* Mode Navigation */}
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${archiveMode === 'evolution' ? 'active' : ''}`}
            onClick={() => setArchiveMode('evolution')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={13} style={{ color: archiveMode === 'evolution' ? 'var(--cube-blue)' : 'inherit' }} />
              Macro Evolution & Deep-Dive
            </span>
          </button>
          <button
            className={`nav-tab-btn ${archiveMode === 'compare' ? 'active' : ''}`}
            onClick={() => setArchiveMode('compare')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <GitCompare size={13} style={{ color: archiveMode === 'compare' ? 'var(--cube-orange)' : 'inherit' }} />
              Compare Two Eras
            </span>
          </button>
        </div>
      </div>

      {/* MODE 1: MACRO EVOLUTION & YEAR DEEP-DIVE */}
      {archiveMode === 'evolution' && (
        <div>
          {/* All-Time Trends Chart */}
          <div className="surface-card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                  All-Time Performance Compression (1982 to 2026)
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Tracking the downward progression of official {metric === 'average' ? 'Ao5 averages' : 'single times'} across 25 WCA seasons.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, fontFamily: 'var(--font-mono)', alignItems: 'center' }}>
                <span style={{ color: 'var(--cube-blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  ● Median (P50)
                </span>
                <span style={{ color: 'var(--cube-orange)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  ■ Elite Top 10% (P10)
                </span>
                <span style={{ color: 'var(--cube-yellow)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  — Year Record (Min)
                </span>
              </div>
            </div>

            <div style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 28, right: 28, left: 0, bottom: 20 }}>
                  <CartesianGrid stroke="#1E2536" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#475569"
                    tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    stroke="#475569"
                    unit="s"
                    tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#111520', border: '1px solid #2B354C', borderRadius: 4, padding: '10px 14px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                          <div style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>WCA Season {label}</div>
                          <div style={{ color: 'var(--cube-blue)' }}>Median (P50): {formatTime(data.median)}s</div>
                          <div style={{ color: 'var(--cube-orange)' }}>Top 10% (P10): {formatTime(data.p10)}s</div>
                          <div style={{ color: 'var(--cube-yellow)' }}>Fastest Record: {formatTime(data.min)}s</div>
                          <div style={{ color: '#94A3B8', marginTop: 4, fontSize: 11 }}>Competitors: {data.competitors?.toLocaleString()}</div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    x={selectedYear}
                    stroke="#EAB308"
                    strokeDasharray="3 3"
                    label={{
                      value: `Inspecting ${selectedYear}`,
                      fill: '#EAB308',
                      position: 'top',
                      fontSize: 11,
                      offset: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="median"
                    name="Median (P50)"
                    stroke="#3B82F6"
                    strokeWidth={2.4}
                    dot={{ r: 3, fill: '#3B82F6' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="p10"
                    name="Top 10% (P10)"
                    stroke="#F97316"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: '#F97316' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="min"
                    name="Year Best"
                    stroke="#EAB308"
                    strokeWidth={1.8}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year Scrubber & Deep-Dive Distribution */}
          <div className="surface-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Inspect Season:</span>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    const idx = availableYears.indexOf(selectedYear);
                    if (idx > 0) setSelectedYear(availableYears[idx - 1]);
                  }}
                  disabled={selectedYear === availableYears[0]}
                  title="Previous Year"
                >
                  <ArrowLeft size={13} />
                </button>

                <select
                  className="select-input"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))}
                </select>

                <button
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    const idx = availableYears.indexOf(selectedYear);
                    if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
                  }}
                  disabled={selectedYear === availableYears[availableYears.length - 1]}
                  title="Next Year"
                >
                  <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Field: {currentYearSummary?.competitors.toLocaleString()} competitors ({metric === 'average' ? currentYearSummary?.average_count.toLocaleString() : currentYearSummary?.single_count.toLocaleString()} official results)
              </div>
            </div>

            {isAo5Unavailable ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Average of 5 was not conducted in 1982.
                </p>
                <p style={{ fontSize: 13 }}>
                  The 1982 World Championship in Budapest utilized a Best-of-3 single format. Switch the metric to <strong>Single Time</strong> above to inspect 1982 data.
                </p>
              </div>
            ) : (
              <>
                {/* 4 Stat Boxes with Functional Color Borders */}
                <div className="benchmark-card-grid">
                  <div className="stat-box border-blue">
                    <div className="stat-box-label">Historical Median (P50)</div>
                    <div className="stat-box-val" style={{ color: 'var(--cube-blue)' }}>
                      {formatTime(currentStats?.median)}s
                    </div>
                    <div className="stat-box-sub">50% solved faster than this</div>
                  </div>

                  <div className="stat-box border-orange">
                    <div className="stat-box-label">Elite Threshold (Top 10%)</div>
                    <div className="stat-box-val" style={{ color: 'var(--cube-orange)' }}>
                      {formatTime(currentStats?.p10)}s
                    </div>
                    <div className="stat-box-sub">Top decile cutoff</div>
                  </div>

                  <div className="stat-box border-green">
                    <div className="stat-box-label">Mathematical Mean</div>
                    <div className="stat-box-val" style={{ color: 'var(--cube-green)' }}>
                      {formatTime(currentStats?.mean)}s
                    </div>
                    <div className="stat-box-sub">Average across all attempts</div>
                  </div>

                  <div className="stat-box border-yellow">
                    <div className="stat-box-label">Fastest of {selectedYear}</div>
                    <div className="stat-box-val" style={{ color: 'var(--cube-yellow)' }}>
                      {formatTime(currentStats?.min)}s
                    </div>
                    <div className="stat-box-sub">
                      {currentStats?.record_holder?.name || 'WCA Record'} ({currentStats?.record_holder?.country || 'WCA'})
                    </div>
                  </div>
                </div>

                {/* Distribution Histogram */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                      {selectedYear} Population Histogram ({metric === 'average' ? 'Ao5' : 'Single'})
                    </h3>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      Bin width: 0.5s centisecond resolution
                    </div>
                  </div>

                  <div style={{ height: 260, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={yearDetail ? (metric === 'average' ? yearDetail.average.histogram : yearDetail.single.histogram) : []}
                        margin={{ top: 28, right: 15, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid stroke="#1E2536" vertical={false} />
                        <XAxis
                          dataKey="start"
                          unit="s"
                          stroke="#475569"
                          interval={9}
                          tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                        />
                        <YAxis
                          stroke="#475569"
                          tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const bin = payload[0].payload;
                            return (
                              <div style={{ background: '#111520', border: '1px solid #2B354C', borderRadius: 4, padding: '8px 12px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                                <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: 4 }}>Bracket: {bin.label}</div>
                                <div style={{ color: 'var(--cube-blue)' }}>Rounds: {bin.count.toLocaleString()}</div>
                                <div style={{ color: '#94A3B8', fontSize: 11 }}>Cumulative: Top {bin.cumulative_pct}%</div>
                              </div>
                            );
                          }}
                        />
                        {currentStats?.median && (
                          <ReferenceLine
                            x={Math.floor(currentStats.median * 2) / 2.0}
                            stroke="#3B82F6"
                            strokeDasharray="4 4"
                            label={{
                              value: `Median ${currentStats.median}s`,
                              fill: '#3B82F6',
                              position: 'top',
                              fontSize: 11,
                              offset: 8,
                            }}
                          />
                        )}
                        <Bar dataKey="count" fill="#1C2333" stroke="#2B374F" activeBar={{ fill: '#3B82F6' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: COMPARE TWO ERAS */}
      {archiveMode === 'compare' && (
        <div>
          {/* Era Selectors & Median Delta Readout */}
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--cube-blue)', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Era A (Cube Blue)
                  </span>
                  <select
                    className="select-input"
                    value={yearA}
                    onChange={(e) => setYearA(Number(e.target.value))}
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: 18, color: 'var(--text-tertiary)', paddingTop: 16 }}>vs</div>

                <div>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--cube-orange)', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Era B (Cube Orange)
                  </span>
                  <select
                    className="select-input"
                    value={yearB}
                    onChange={(e) => setYearB(Number(e.target.value))}
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {detailA && detailB && (
                <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  Median Progression:{' '}
                  <span style={{ color: 'var(--cube-green)', fontWeight: 700 }}>
                    {metric === 'average'
                      ? (detailA.summary.average.median && detailB.summary.average.median
                          ? `${(detailB.summary.average.median - detailA.summary.average.median).toFixed(2)}s (${(
                              ((detailB.summary.average.median - detailA.summary.average.median) /
                                detailA.summary.average.median) *
                              100
                            ).toFixed(1)}%)`
                          : '-')
                      : (detailA.summary.single.median && detailB.summary.single.median
                          ? `${(detailB.summary.single.median - detailA.summary.single.median).toFixed(2)}s`
                          : '-')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Overlaid Waveform Comparison */}
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  Population Distribution Waveform Shift (% of Field)
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Showing the historic leftward migration of speedcubing solve times between Year {yearA} and Year {yearB}.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--cube-blue)', fontWeight: 600 }}>● Year {yearA}</span>
                <span style={{ color: 'var(--cube-orange)', fontWeight: 600 }}>● Year {yearB}</span>
              </div>
            </div>

            <div style={{ height: 340, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareOverlayData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid stroke="#1E2536" vertical={false} />
                  <XAxis
                    dataKey="start"
                    unit="s"
                    interval={9}
                    stroke="#475569"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    stroke="#475569"
                    unit="%"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#111520', border: '1px solid #2B354C', borderRadius: 4, padding: '8px 12px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                          <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: 4 }}>Bracket: {d.label}</div>
                          <div style={{ color: 'var(--cube-blue)' }}>Year {yearA}: {d[`${yearA}_pct`]}% of field ({d[`${yearA}_count`]?.toLocaleString()} solves)</div>
                          <div style={{ color: 'var(--cube-orange)' }}>Year {yearB}: {d[`${yearB}_pct`]}% of field ({d[`${yearB}_count`]?.toLocaleString()} solves)</div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${yearA}_pct`}
                    name={`Year ${yearA}`}
                    stroke="#3B82F6"
                    strokeWidth={2.4}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${yearB}_pct`}
                    name={`Year ${yearB}`}
                    stroke="#F97316"
                    strokeWidth={2.4}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Structured WCA Dataset Provenance Drawer */}
      <div className="surface-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Database size={16} style={{ color: 'var(--cube-yellow)' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Official WCA Archival Provenance & Coverage</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Database Export Date</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{overview.metadata.export_date}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>WCA TSV Schema {overview.metadata.export_format_version}</div>
          </div>

          <div style={{ background: 'var(--surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Competitions</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{overview.metadata.total_competitions.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Sanctioned Tournaments</div>
          </div>

          <div style={{ background: 'var(--surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Unique Competitors</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{overview.metadata.total_competitors.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Individual Athletes</div>
          </div>

          <div style={{ background: 'var(--surface-elevated)', padding: 12, borderRadius: 'var(--radius-xs)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total 3×3 Results</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{overview.metadata.total_333_results.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{overview.metadata.total_valid_averages.toLocaleString()} Valid Ao5 Rounds</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong>Regulation Note:</strong> All statistics strictly conform to official World Cube Association rules. Average of 5 calculations apply Regulation 9f1 trimming (best and worst times discarded, middle three averaged). DNF and DNS non-finishes are recorded in participation tallies but excluded from solve time distributions.
        </div>
      </div>
    </div>
  );
};
