# WCA Time Machine

See how your Rubik's Cube 3×3 times would have ranked across every era of speedcubing history, from 1982 to 2026.

Uses the official World Cube Association (WCA) database export (1.88M+ results across 288K competitors).

## How it works

### Pipeline (`pipeline/`)
- Uses DuckDB to query the raw WCA TSVs (`WCA_export_Results.tsv` and `WCA_export_Competitions.tsv`) directly without loading the full dump into memory.
- Filters for official 3×3 events (`eventId = '333'`) across 18,900+ competitions and groups results by year (1982 to 2026).
- Aggregates 1.88M valid singles and 1.86M trimmed averages into empirical percentiles (P1–P99), 0.5-second binned histograms, and historical records.
- Compresses ~690 MB of raw exports down to ~555 KB of static JSON (>99.9% reduction) across `overview.json` and per-year `years/{year}.json`, writing directly to `frontend/public/data/` so the app runs entirely client-side.

### Frontend (`frontend/`)
- Static React + Vite app with a 5-solve timer (or manual entry).
- Trims your solves according to WCA Regulation 9f1 (drops the fastest and slowest, averages the remaining three).
- Evaluates your Ao5 against each era using linear interpolation between empirical percentiles.

## Setup & Running

### Data Pipeline (Python)

```bash
cd pipeline

# Create virtual environment and install dependencies
uv venv
uv pip install -e .

# Run aggregation against local WCA export TSVs
uv run python -m src.aggregate

# Run tests
uv run pytest
```

Precomputed JSON files are saved to `pipeline/data/` and mirrored to `frontend/public/data/`.

### Frontend (React + Vite)

```bash
cd frontend

npm install
npm run dev
```

Open `http://localhost:5173`.

To build static assets for production:

```bash
npm run build
```

The output in `frontend/dist/` can be deployed to any static host (Cloudflare Pages, Vercel, Netlify, etc.) with zero backend needed.

## License & Attribution

- **Code**: Licensed under the [MIT License](LICENSE).
- **Scrambles**: WCA random-state 3×3 scrambles are powered by [cubing.js](https://github.com/cubing/cubing.js) (Mozilla Public License 2.0).
- **Data**: Historical speedcubing statistics are derived from the official [World Cube Association](https://www.worldcubeassociation.org/) public export, used under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

