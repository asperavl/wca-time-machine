import React, { useState, useEffect } from 'react';
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
import { TrendingUp, BarChart2, GitCompare, Info, ArrowLeft, ArrowRight } from 'lucide-react';

interface AnalyticsViewProps {
  overview: OverviewData;
  initialYear?: number;
}

type SubTab = 'trends' | 'deepdive' | 'compare' | 'coverage';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ overview, initialYear = 2024 }) => {
  const [subTab, setSubTab] = useState<SubTab>('trends');
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
    if (subTab === 'compare') {
      fetchYearDetail(yearA).then(setDetailA);
      fetchYearDetail(yearB).then(setDetailB);
    }
  }, [subTab, yearA, yearB]);

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
  const compareOverlayData = React.useMemo(() => {
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
        label: `${binA.start}s`,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric:</span>
          <div className="nav-tabs">
            <button
              className={`nav-tab-btn ${metric === 'average' ? 'active' : ''}`}
              onClick={() => setMetric('average')}
            >
              Average (Ao5)
            </button>
            <button
              className={`nav-tab-btn ${metric === 'single' ? 'active' : ''}`}
              onClick={() => setMetric('single')}
            >
              Single Time
            </button>
          </div>
        </div>

        {/* Sub-modes Navigation */}
        <div className="nav-tabs">
          <button
            className={`nav-tab-btn ${subTab === 'trends' ? 'active' : ''}`}
            onClick={() => setSubTab('trends')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} /> All-Time Trends
            </span>
          </button>
          <button
            className={`nav-tab-btn ${subTab === 'deepdive' ? 'active' : ''}`}
            onClick={() => setSubTab('deepdive')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={14} /> Year Deep-Dive
            </span>
          </button>
          <button
            className={`nav-tab-btn ${subTab === 'compare' ? 'active' : ''}`}
            onClick={() => setSubTab('compare')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <GitCompare size={14} /> Compare Two Years
            </span>
          </button>
          <button
            className={`nav-tab-btn ${subTab === 'coverage' ? 'active' : ''}`}
            onClick={() => setSubTab('coverage')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Info size={14} /> Data Coverage
            </span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: ALL-TIME TRENDS */}
      {subTab === 'trends' && (
        <div>
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Historical 3x3 Performance Evolution (1982:2026)
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Tracking the progression of {metric === 'average' ? 'Ao5 averages' : 'single times'} across official WCA competitions.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--accent-lime)' }}>Line: Median (P50)</span>
                <span style={{ color: 'var(--accent-cyan)' }}>Line: Top 10% (P10)</span>
                <span style={{ color: 'var(--text-secondary)' }}>Line: World Record (Min)</span>
              </div>
            </div>

            <div style={{ height: 380, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid stroke="#202329" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="year"
                    stroke="#6F7580"
                    tick={{ fill: '#9A9FA9', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: '#30333A' }}
                  />
                  <YAxis
                    stroke="#6F7580"
                    unit="s"
                    tick={{ fill: '#9A9FA9', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: '#30333A' }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#17191E', border: '1px solid #30333A', borderRadius: 4, padding: '10px 14px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                          <div style={{ fontWeight: 600, color: '#F0F1F3', marginBottom: 6 }}>Year {label}</div>
                          <div style={{ color: '#C4F56A' }}>Median (P50): {formatTime(data.median)}s</div>
                          <div style={{ color: '#65D6E8' }}>Top 10% (P10): {formatTime(data.p10)}s</div>
                          <div style={{ color: '#A8D97C' }}>Best Time: {formatTime(data.min)}s</div>
                          <div style={{ color: '#9A9FA9', marginTop: 4, fontSize: 11 }}>Competitors: {data.competitors?.toLocaleString()}</div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="median"
                    name="Median (P50)"
                    stroke="#C4F56A"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#C4F56A' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="p10"
                    name="Top 10% (P10)"
                    stroke="#65D6E8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: '#65D6E8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="min"
                    name="Year Best"
                    stroke="#F0F1F3"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: YEAR DEEP-DIVE */}
      {subTab === 'deepdive' && (
        <div>
          {/* Year Scrubber Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  const idx = availableYears.indexOf(selectedYear);
                  if (idx > 0) setSelectedYear(availableYears[idx - 1]);
                }}
                disabled={selectedYear === availableYears[0]}
                title="Previous Year"
              >
                <ArrowLeft size={14} />
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
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Sample: {currentYearSummary?.competitors.toLocaleString()} competitors ({metric === 'average' ? currentYearSummary?.average_count.toLocaleString() : currentYearSummary?.single_count.toLocaleString()} rounds)
            </div>
          </div>

          {isAo5Unavailable ? (
            <div className="surface-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                Average of 5 format was not conducted in 1982.
              </p>
              <p style={{ fontSize: 13 }}>
                The 1982 World Championship in Budapest utilized a Best-of-3 format. Switch the metric to <strong>Single Time</strong> above to inspect 1982 results.
              </p>
            </div>
          ) : (
            <>
              {/* Statistical Summary Panel Strip */}
              <div className="stat-grid">
                <div className="stat-item">
                  <div className="stat-label">Historical Median</div>
                  <div className="stat-value" style={{ color: 'var(--accent-lime)' }}>
                    {formatTime(currentStats?.median)}s
                  </div>
                  <div className="stat-subtext">50% solved faster than this</div>
                </div>

                <div className="stat-item">
                  <div className="stat-label">Elite Threshold (Top 10%)</div>
                  <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                    {formatTime(currentStats?.p10)}s
                  </div>
                  <div className="stat-subtext">Top decile cutoff</div>
                </div>

                <div className="stat-item">
                  <div className="stat-label">Mathematical Mean</div>
                  <div className="stat-value">
                    {formatTime(currentStats?.mean)}s
                  </div>
                  <div className="stat-subtext">Average of all valid attempts</div>
                </div>

                <div className="stat-item">
                  <div className="stat-label">Fastest of {selectedYear}</div>
                  <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                    {formatTime(currentStats?.min)}s
                  </div>
                  <div className="stat-subtext">
                    {currentStats?.record_holder?.name || 'WCA Record'} ({currentStats?.record_holder?.country || 'WCA'})
                  </div>
                </div>
              </div>

              {/* Distribution Histogram */}
              <div className="surface-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>
                    {selectedYear} Performance Distribution ({metric === 'average' ? 'Ao5' : 'Single'})
                  </h3>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    Bin width: 0.5 seconds
                  </div>
                </div>

                <div style={{ height: 340, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={yearDetail ? (metric === 'average' ? yearDetail.average.histogram : yearDetail.single.histogram) : []}
                      margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                    >
                      <CartesianGrid stroke="#202329" vertical={false} />
                      <XAxis
                        dataKey="start"
                        unit="s"
                        stroke="#6F7580"
                        interval={9}
                        tick={{ fill: '#9A9FA9', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      />
                      <YAxis
                        stroke="#6F7580"
                        tick={{ fill: '#9A9FA9', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const bin = payload[0].payload;
                          return (
                            <div style={{ background: '#17191E', border: '1px solid #30333A', borderRadius: 4, padding: '8px 12px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                              <div style={{ fontWeight: 600, color: '#F0F1F3', marginBottom: 4 }}>Time: {bin.label}</div>
                              <div style={{ color: '#C4F56A' }}>Solves: {bin.count.toLocaleString()}</div>
                              <div style={{ color: '#9A9FA9', fontSize: 11 }}>Cumulative: Top {bin.cumulative_pct}%</div>
                            </div>
                          );
                        }}
                      />
                      {currentStats?.median && (
                        <ReferenceLine
                          x={Math.floor(currentStats.median * 2) / 2.0}
                          stroke="#C4F56A"
                          strokeDasharray="4 4"
                          label={{ value: `Median ${currentStats.median}s`, fill: '#C4F56A', position: 'top', fontSize: 11 }}
                        />
                      )}
                      <Bar dataKey="count" fill="#202329" stroke="#30333A" activeBar={{ fill: '#C4F56A' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 3: COMPARE TWO YEARS */}
      {subTab === 'compare' && (
        <div>
          {/* Year Comparison Selectors */}
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>Era A (Cool Cyan)</span>
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
                  <span style={{ fontSize: 12, color: 'var(--accent-lime)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4 }}>Era B (Electric Lime)</span>
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
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  Median Shift: <span style={{ color: 'var(--accent-lime)', fontWeight: 600 }}>
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

          {/* Overlaid Distribution Chart */}
          <div className="surface-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>
                Distribution Density Comparison (% of Field)
              </h3>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>Year {yearA}</span>
                <span style={{ color: 'var(--accent-lime)' }}>Year {yearB}</span>
              </div>
            </div>

            <div style={{ height: 340, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compareOverlayData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid stroke="#202329" vertical={false} />
                  <XAxis
                    dataKey="start"
                    unit="s"
                    interval={9}
                    stroke="#6F7580"
                    tick={{ fill: '#9A9FA9', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    stroke="#6F7580"
                    unit="%"
                    tick={{ fill: '#9A9FA9', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: '#17191E', border: '1px solid #30333A', borderRadius: 4, padding: '8px 12px', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                          <div style={{ fontWeight: 600, color: '#F0F1F3', marginBottom: 4 }}>Time Bracket: {d.label}</div>
                          <div style={{ color: 'var(--accent-cyan)' }}>Year {yearA}: {d[`${yearA}_pct`]}% of field ({d[`${yearA}_count`]?.toLocaleString()} solves)</div>
                          <div style={{ color: 'var(--accent-lime)' }}>Year {yearB}: {d[`${yearB}_pct`]}% of field ({d[`${yearB}_count`]?.toLocaleString()} solves)</div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${yearA}_pct`}
                    name={`Year ${yearA}`}
                    stroke="#65D6E8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={`${yearB}_pct`}
                    name={`Year ${yearB}`}
                    stroke="#C4F56A"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: DATA COVERAGE & PROVENANCE */}
      {subTab === 'coverage' && (
        <div className="surface-card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
            Dataset Provenance and Coverage Specifications
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Every statistic, distribution, and percentile in this tool is derived strictly from official World Cube Association competition records.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--surface-elevated)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>WCA Database Snapshot</div>
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{overview.metadata.export_date}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Export Schema {overview.metadata.export_format_version}</div>
            </div>

            <div style={{ background: 'var(--surface-elevated)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Competitions Indexed</div>
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{overview.metadata.total_competitions.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Official WCA Sanctioned Events</div>
            </div>

            <div style={{ background: 'var(--surface-elevated)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Unique 3x3 Competitors</div>
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{overview.metadata.total_competitors.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Individual athletes represented</div>
            </div>

            <div style={{ background: 'var(--surface-elevated)', padding: 14, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Total 3x3 Results Evaluated</div>
              <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{overview.metadata.total_333_results.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{overview.metadata.total_valid_averages.toLocaleString()} valid Ao5s</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>Methodological Notes</h4>
            <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
              <li><strong>Population Inclusion:</strong> Only valid official results (centiseconds &gt; 0) are factored into distribution charts and percentile calculations.</li>
              <li><strong>Non-Finishes (DNF / DNS):</strong> Competitor rounds ending in DNF (value -1) or DNS (value -2) are recorded in participation totals but excluded from solve time distributions.</li>
              <li><strong>Format Differences:</strong> Competitions prior to 2003 (specifically the 1982 World Championship) followed Best-of-3 formats. Trimmed average of five (Ao5) statistics begin with the modern era in 2003.</li>
              <li><strong>Percentile Interpolation:</strong> Percentiles are calculated using linear rank interpolation across cumulative frequency distributions, ensuring continuous precision rather than stepped rounding.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
