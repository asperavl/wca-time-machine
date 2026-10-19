import React from 'react';
import type { OverviewData } from '../types';
import { Clock, BarChart2, ArrowRight, Zap, Database, Trophy, ShieldCheck } from 'lucide-react';

interface LandingViewProps {
  overview: OverviewData;
  onSelectMode: (mode: 'timemachine' | 'analytics') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ overview, onSelectMode }) => {
  return (
    <div className="landing-container">
      {/* Hero Header */}
      <div className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          OFFICIAL WCA 3×3 HISTORICAL INTELLIGENCE (1982:2026)
        </div>
        <h2 className="landing-title">
          Benchmark your 3×3 speed against 25 competition eras.
        </h2>
        <p className="landing-subtitle">
          Derived from the official World Cube Association export database of {overview.metadata.total_333_results.toLocaleString()} rounds across {overview.metadata.total_competitors.toLocaleString()} competitors. Choose how you want to explore:
        </p>
      </div>

      {/* High-Density Telemetry Strip */}
      <div className="landing-telemetry-strip">
        <div className="telemetry-item">
          <div className="telemetry-value">{overview.metadata.total_333_results.toLocaleString()}</div>
          <div className="telemetry-label">Official Rounds</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-value">{overview.metadata.total_competitors.toLocaleString()}</div>
          <div className="telemetry-label">Global Competitors</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-value">{overview.available_years.length} Seasons</div>
          <div className="telemetry-label">1982 to 2026</div>
        </div>
        <div className="telemetry-item">
          <div className="telemetry-value">WCA 9f1</div>
          <div className="telemetry-label">Adjudicated Ao5</div>
        </div>
      </div>

      {/* Two Interactive Mode Doors */}
      <div className="landing-modes-grid">
        {/* Door 1: Time Machine */}
        <div
          className="landing-mode-card mode-card-tm"
          onClick={() => onSelectMode('timemachine')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectMode('timemachine');
            }
          }}
        >
          <div>
            <div className="mode-header">
              <div className="mode-icon-box icon-tm">
                <Clock size={20} />
              </div>
              <span className="mode-tag tag-tm">MODE 01 • ACTIVE SOLVE</span>
            </div>

            <h3 className="mode-title">Speedcubing Time Machine</h3>
            <p className="mode-description">
              Complete a 5-solve 3×3 session or log times manually. We compute your official trimmed Average of 5 (Ao5) and plot your standing curve across all 25 competition eras.
            </p>

            <ul className="mode-feature-list">
              <li>
                <Zap size={14} style={{ color: 'var(--cube-yellow)' }} />
                <span>Spacebar hold-to-ready tournament timer (300ms lock)</span>
              </li>
              <li>
                <ShieldCheck size={14} style={{ color: 'var(--cube-green)' }} />
                <span>WCA Regulation 9f1 trimming (best &amp; worst discarded)</span>
              </li>
              <li>
                <Trophy size={14} style={{ color: 'var(--cube-yellow)' }} />
                <span>Milestone rankings from Budapest 1982 to Modern 2026</span>
              </li>
            </ul>
          </div>

          <button className="btn-primary mode-action-btn" onClick={(e) => { e.stopPropagation(); onSelectMode('timemachine'); }}>
            <span>Launch Time Machine (5 Solves)</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Door 2: Historical Archive */}
        <div
          className="landing-mode-card mode-card-archive"
          onClick={() => onSelectMode('analytics')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectMode('analytics');
            }
          }}
        >
          <div>
            <div className="mode-header">
              <div className="mode-icon-box icon-archive">
                <BarChart2 size={20} />
              </div>
              <span className="mode-tag tag-archive">MODE 02 • MACRO EXPLORER</span>
            </div>

            <h3 className="mode-title">Historical Archive</h3>
            <p className="mode-description">
              Inspect macroevolution across all 25 competition years without solving. Analyze how median times compressed and compare any two eras side by side.
            </p>

            <ul className="mode-feature-list">
              <li>
                <BarChart2 size={14} style={{ color: 'var(--cube-blue)' }} />
                <span>Macro performance evolution: Median (P50), Top 10%, Records</span>
              </li>
              <li>
                <Zap size={14} style={{ color: 'var(--cube-orange)' }} />
                <span>Comparative era waveform overlay (compare any 2 years)</span>
              </li>
              <li>
                <Database size={14} style={{ color: 'var(--cube-blue)' }} />
                <span>Empirical percentiles &amp; 0.5s binned cohort distributions</span>
              </li>
            </ul>
          </div>

          <button className="btn-secondary mode-action-btn mode-action-secondary" onClick={(e) => { e.stopPropagation(); onSelectMode('analytics'); }}>
            <span>Explore Historical Archive</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Engine & Provenance Footnote */}
      <div className="landing-footnote">
        <span>Offline-first static engine powered by DuckDB precomputations.</span>
        <span>Zero server database • Zero user tracking • 100% client-side</span>
      </div>
    </div>
  );
};
