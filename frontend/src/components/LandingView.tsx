import React from 'react';
import type { OverviewData } from '../types';
import { Clock, BarChart2, ArrowRight, TrendingDown } from 'lucide-react';

interface LandingViewProps {
  overview: OverviewData;
  onSelectMode: (mode: 'timemachine' | 'analytics') => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ overview, onSelectMode }) => {
  return (
    <div className="landing-container">
      {/* Clean Header */}
      <div className="landing-hero">
        <h2 className="landing-title">
          See how your 3×3 times would have ranked across every era.
        </h2>
        <p className="landing-subtitle">
          Benchmarked against {overview.metadata.total_333_results.toLocaleString()} official results from the World Cube Association database (1982 to 2026). Choose an option:
        </p>
      </div>

      {/* Two Interactive Preview Cards */}
      <div className="landing-previews-grid">
        {/* Card 1: Time Machine with Micro-Cassette Preview */}
        <div
          className="preview-card card-tm"
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
            <div className="preview-card-header">
              <div className="preview-icon-title">
                <div className="preview-icon icon-tm">
                  <Clock size={16} />
                </div>
                <h3 className="preview-title">Time Machine</h3>
              </div>
              <span className="preview-tag tag-tm">5 Solves (Ao5)</span>
            </div>

            <p className="preview-description">
              Do 5 solves using the spacebar timer (or enter your times). Trims your fastest and slowest solves and compares your Ao5 across all 25 competition years.
            </p>

            {/* Micro-Cassette Visual Mockup */}
            <div className="micro-cassette-box">
              <div className="micro-cassette-label">SAMPLE 5-SOLVE SESSION (AO5)</div>
              <div className="micro-cassette-pods">
                <div className="micro-pod">
                  <span className="mp-idx">#1</span>
                  <span className="mp-time">12.40</span>
                </div>
                <div className="micro-pod mp-best" title="Fastest solve (trimmed from average)">
                  <span className="mp-idx">#2</span>
                  <span className="mp-time">(9.85)</span>
                </div>
                <div className="micro-pod">
                  <span className="mp-idx">#3</span>
                  <span className="mp-time">11.90</span>
                </div>
                <div className="micro-pod mp-worst" title="Slowest solve (trimmed from average)">
                  <span className="mp-idx">#4</span>
                  <span className="mp-time">(15.20)</span>
                </div>
                <div className="micro-pod">
                  <span className="mp-idx">#5</span>
                  <span className="mp-time">12.10</span>
                </div>
              </div>
              <div className="micro-cassette-footer">
                <span>Result: <strong>12.13s Ao5</strong></span>
                <span className="mcf-tag">Top 3.2% in 2013</span>
              </div>
            </div>
          </div>

          <button
            className="btn-primary preview-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelectMode('timemachine');
            }}
          >
            <span>Start 5 Solves</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Card 2: Historical Archive with Micro-Trendline Preview */}
        <div
          className="preview-card card-archive"
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
            <div className="preview-card-header">
              <div className="preview-icon-title">
                <div className="preview-icon icon-archive">
                  <BarChart2 size={16} />
                </div>
                <h3 className="preview-title">Historical Archive</h3>
              </div>
              <span className="preview-tag tag-archive">1982 to 2026</span>
            </div>

            <p className="preview-description">
              Explore how 3×3 times dropped over four decades without solving. Check median times, top 10% cutoffs, and compare any two years side by side.
            </p>

            {/* Micro-Progression Timeline Mockup */}
            <div className="micro-archive-box">
              <div className="micro-archive-label">
                <span>MEDIAN TIME BY YEAR</span>
                <span className="micro-archive-delta">
                  <TrendingDown size={12} /> -52.7%
                </span>
              </div>
              <div className="micro-progression-row">
                <div className="prog-step">
                  <span className="ps-val">29.1s</span>
                  <div className="ps-bar" style={{ height: 28 }} />
                  <span className="ps-year">'82</span>
                </div>
                <div className="prog-step">
                  <span className="ps-val">25.4s</span>
                  <div className="ps-bar" style={{ height: 24 }} />
                  <span className="ps-year">'05</span>
                </div>
                <div className="prog-step">
                  <span className="ps-val">18.2s</span>
                  <div className="ps-bar" style={{ height: 18 }} />
                  <span className="ps-year">'13</span>
                </div>
                <div className="prog-step">
                  <span className="ps-val">16.0s</span>
                  <div className="ps-bar" style={{ height: 15 }} />
                  <span className="ps-year">'19</span>
                </div>
                <div className="prog-step prog-current">
                  <span className="ps-val">13.8s</span>
                  <div className="ps-bar" style={{ height: 12 }} />
                  <span className="ps-year">'26</span>
                </div>
              </div>
              <div className="micro-archive-footer">
                <span>1982: <strong>29.11s</strong></span>
                <span>Season 2026: <strong>13.77s</strong></span>
              </div>
            </div>
          </div>

          <button
            className="btn-secondary preview-action-btn"
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
        Official competition data courtesy of the World Cube Association.
      </div>
    </div>
  );
};
