# WCA Time Machine: Historical 3×3 Performance Intelligence

An offline-first, high-density analytical intelligence system and speedcubing time machine. It ingests the official World Cube Association (WCA) database export and benchmarks your 3×3 performance across all 25 competition eras from 1982 to 2026.

## System Architecture

The project consists of two decoupled layers:

1. **Data Ingestion Pipeline (`pipeline/`)**:
   - Python + DuckDB pipeline that directly queries the official 666MB WCA competition database TSVs (`WCA_export_v2_291_20261018T000015Z.tsv/`).
   - Evaluates 1,880,000+ official 3×3 solve records across 288,000+ competitors and 18,900+ competitions.
   - Computes parametric distributions, deciles, centisecond-binned histograms (0.5s bins), and records.
   - Outputs lean, precomputed JSON artifacts (`overview.json` and 25 per-year files `1982.json` to `2026.json`) into `frontend/public/data/`.

2. **Frontend Application (`frontend/`)**:
   - Vite + React + TypeScript static web app consuming the precomputed JSON.
   - **Time Machine**:
     - Tournament timer with hold-to-ready mechanic (holding red -> 300ms green ready lock -> running white centiseconds) or manual entry fallback.
     - Color-coded facelet move tokens (`U`, `D`, `L`, `R`, `F`, `B`).
     - 5-solve adjudication cassette automatically applying WCA Regulation 9f1 trimming (best and worst times trimmed).
     - "Across the Eras" longitudinal percentile curve tracking your global standing across all 25 seasons.
     - Milestone placement chronicle showing where your Ao5 would rank in historic speedcubing epochs (Budapest 1982, Worlds 2005, DaYan Era 2013, Magnetic Era 2019, Modern Era 2026).
     - Cohort distribution histogram for any selected year with your time marked.
   - **Historical Archive**:
     - All-time macro performance evolution tracking Medians (P50), Elite Top 10% (P10), and Records (Min) from 1982 to 2026.
     - Comparative era waveform overlay (compare any two historical years directly).
     - Official dataset provenance and WCA regulation compliance notes.

---

## Quickstart

### 1. Data Pipeline

```powershell
# Navigate to pipeline directory
cd pipeline

# Activate virtual environment
.\.venv\Scripts\activate

# Run aggregation pipeline against local WCA export TSVs
python -m src.aggregate

# Run automated pipeline tests
pytest
```

### 2. Frontend Web App

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# App will run at http://localhost:5173/

# Build production bundle
npm run build
```

---

## Technical Specifications & Regulation Compliance

- **WCA Regulation 9f1**: Trimmed Average of 5 removes the single fastest and slowest times, averaging the middle three.
- **Historic Format Handling**: Pre-2003 competitions (specifically Budapest 1982) utilized Best-of-3 single formats; Ao5 averages begin with the modern era in 2003.
- **Penalties**: Full support for +2 second penalties and DNF non-finishes.
- **Design System**: Functional Rubik's color mapping (Yellow = Records/Focus, Blue = Median/Baseline, Orange = Top 10%/Compare, Green = Counted/Faster, Red = Trimmed/Penalties, White = Coordinates).
