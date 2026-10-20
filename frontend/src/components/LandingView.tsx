import React from 'react';
import type { OverviewData } from '../types';
import { Clock, BarChart2, ArrowRight } from 'lucide-react';

interface LandingViewProps {
  overview: OverviewData;
  onSelectMode: (mode: 'timemachine' | 'analytics') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ overview, onSelectMode }) => {
  return (
    <div className="landing-container">
      {/* Lowkey Hero */}
      <div className="landing-hero">
        <h2 className="landing-title">
          See how your 3×3 times would have ranked across every era.
        </h2>
        <p className="landing-subtitle">
          Uses the official World Cube Association database ({overview.metadata.total_333_results.toLocaleString()} results across 25 seasons). Pick an option below to start:
        </p>
      </div>

      {/* Understated Single-Line Telemetry Bar */}
      <div className="landing-telemetry-strip">
        <span className="telemetry-pill">
          <strong>{overview.metadata.total_333_results.toLocaleString()}</strong> results
        </span>
        <span className="telemetry-separator">•</span>
        <span className="telemetry-pill">
          <strong>{overview.metadata.total_competitors.toLocaleString()}</strong> competitors
        </span>
        <span className="telemetry-separator">•</span>
        <span className="telemetry-pill">
          <strong>1982 to 2026</strong>
        </span>
        <span className="telemetry-separator">•</span>
        <span className="telemetry-pill">
          WCA Regulation 9f1 Ao5
        </span>
      </div>

      {/* Two Direct Option Cards */}
      <div className="landing-modes-grid">
        {/* Card 1: Time Machine */}
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
                <Clock size={18} />
              </div>
            </div>

            <h3 className="mode-title">Time Machine</h3>
            <p className="mode-description">
              Do 5 solves with the spacebar timer (or enter times manually). Automatically calculates your trimmed Ao5 and plots your percentile against each historical year.
            </p>
          </div>

          <button
            className="btn-primary mode-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMode('timemachine');
            }}
          >
            <span>Start 5 Solves</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Card 2: Historical Archive */}
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
                <BarChart2 size={18} />
              </div>
            </div>

            <h3 className="mode-title">Historical Archive</h3>
            <p className="mode-description">
              Browse 3×3 speedcubing progression without solving. View median times, top 10% curves, and compare any two competition years side by side.
            </p>
          </div>

          <button
            className="btn-secondary mode-action-btn mode-action-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMode('analytics');
            }}
          >
            <span>Browse History</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Quiet Footnote */}
      <div className="landing-footnote">
        Data from the official World Cube Association export.
      </div>
    </div>
  );
};
