"""
WCA Time Machine - Offline Data Aggregation Pipeline
Uses DuckDB to extract, clean, and aggregate official WCA competition 3x3 results
into lightweight static JSON files for the web application.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

import duckdb


def find_export_dir(repo_root: Path) -> Path:
    """Find the WCA export directory containing TSV files."""
    candidates = list(repo_root.glob("WCA_export_*.tsv")) + list(repo_root.glob("WCA_export*"))
    for candidate in candidates:
        if candidate.is_dir() and (candidate / "WCA_export_results.tsv").exists():
            return candidate
    raise FileNotFoundError("Could not find WCA export directory containing WCA_export_results.tsv")


def load_metadata(export_dir: Path) -> Dict[str, Any]:
    """Read metadata.json from the WCA export folder."""
    meta_path = export_dir / "metadata.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"export_date": "Unknown", "export_format_version": "v2.0"}


def build_aggregates(export_dir: Path, output_dir: Path) -> None:
    """Run DuckDB aggregations and write JSON artifacts."""
    output_dir.mkdir(parents=True, exist_ok=True)
    years_dir = output_dir / "years"
    years_dir.mkdir(parents=True, exist_ok=True)

    meta = load_metadata(export_dir)
    print(f"Loaded export metadata: {meta}")

    results_tsv = (export_dir / "WCA_export_results.tsv").as_posix()
    comps_tsv = (export_dir / "WCA_export_competitions.tsv").as_posix()

    con = duckdb.connect(database=":memory:")
    con.execute("PRAGMA threads=4;")

    print("Querying total competitions...")
    total_comps_row = con.execute(f"""
        SELECT count(distinct id) as total_comps
        FROM read_csv('{comps_tsv}', delim='\\t', header=true, quote='', escape='', ignore_errors=true)
    """).fetchone()
    total_competitions = total_comps_row[0] if total_comps_row else 0
    print(f"Total competitions: {total_competitions}")

    print("Extracting and joining 3x3 results with competitions...")
    # Create temporary table of valid 333 results with year
    con.execute(f"""
        CREATE TEMPORARY TABLE r333 AS
        SELECT 
            r.person_id,
            r.person_name,
            r.person_country_id,
            c.year,
            r.best AS best_cs,
            r.average AS average_cs,
            ROUND(r.best / 100.0, 2) AS single_sec,
            ROUND(r.average / 100.0, 2) AS average_sec
        FROM read_csv('{results_tsv}', delim='\\t', header=true, quote='', escape='', ignore_errors=true) r
        JOIN read_csv('{comps_tsv}', delim='\\t', header=true, quote='', escape='', ignore_errors=true) c
            ON r.competition_id = c.id
        WHERE r.event_id = '333'
    """)

    counts = con.execute("""
        SELECT 
            count(*) as total_rows,
            count(distinct person_id) as total_competitors,
            count(CASE WHEN best_cs > 0 THEN 1 END) as valid_singles,
            count(CASE WHEN average_cs > 0 THEN 1 END) as valid_averages
        FROM r333
    """).fetchone()
    print(f"Total 333 rows: {counts[0]}, Unique competitors: {counts[1]}, Valid singles: {counts[2]}, Valid averages: {counts[3]}")

    years_rows = con.execute("SELECT DISTINCT year FROM r333 ORDER BY year ASC").fetchall()
    available_years = [r[0] for r in years_rows if r[0] is not None and r[0] > 1900]
    print(f"Available years: {available_years}")

    # Compute macro yearly stats
    yearly_stats_query = """
        SELECT 
            year,
            count(DISTINCT person_id) as competitors,
            count(CASE WHEN best_cs > 0 THEN 1 END) as single_count,
            count(CASE WHEN average_cs > 0 THEN 1 END) as average_count,
            
            ROUND(median(CASE WHEN best_cs > 0 THEN single_sec END), 2) as single_median,
            ROUND(avg(CASE WHEN best_cs > 0 THEN single_sec END), 2) as single_mean,
            ROUND(quantile_cont(CASE WHEN best_cs > 0 THEN single_sec END, 0.10), 2) as single_p10,
            ROUND(quantile_cont(CASE WHEN best_cs > 0 THEN single_sec END, 0.25), 2) as single_p25,
            ROUND(quantile_cont(CASE WHEN best_cs > 0 THEN single_sec END, 0.75), 2) as single_p75,
            ROUND(quantile_cont(CASE WHEN best_cs > 0 THEN single_sec END, 0.90), 2) as single_p90,
            min(CASE WHEN best_cs > 0 THEN single_sec END) as single_min,
            
            ROUND(median(CASE WHEN average_cs > 0 THEN average_sec END), 2) as average_median,
            ROUND(avg(CASE WHEN average_cs > 0 THEN average_sec END), 2) as average_mean,
            ROUND(quantile_cont(CASE WHEN average_cs > 0 THEN average_sec END, 0.10), 2) as average_p10,
            ROUND(quantile_cont(CASE WHEN average_cs > 0 THEN average_sec END, 0.25), 2) as average_p25,
            ROUND(quantile_cont(CASE WHEN average_cs > 0 THEN average_sec END, 0.75), 2) as average_p75,
            ROUND(quantile_cont(CASE WHEN average_cs > 0 THEN average_sec END, 0.90), 2) as average_p90,
            min(CASE WHEN average_cs > 0 THEN average_sec END) as average_min
        FROM r333
        GROUP BY year
        ORDER BY year ASC
    """
    yearly_rows = con.execute(yearly_stats_query).fetchall()
    
    overview_years: List[Dict[str, Any]] = []
    
    for row in yearly_rows:
        y = row[0]
        if y not in available_years:
            continue
        
        # Get fastest single and average record holder for the year
        best_single_holder = con.execute(f"""
            SELECT person_name, person_country_id, single_sec
            FROM r333
            WHERE year = {y} AND single_sec = {row[10] if row[10] is not None else -1}
            LIMIT 1
        """).fetchone()

        best_avg_holder = con.execute(f"""
            SELECT person_name, person_country_id, average_sec
            FROM r333
            WHERE year = {y} AND average_sec = {row[17] if row[17] is not None else -1}
            LIMIT 1
        """).fetchone()

        year_summary = {
            "year": int(y),
            "competitors": int(row[1]),
            "single_count": int(row[2]),
            "average_count": int(row[3]),
            "single": {
                "median": float(row[4]) if row[4] is not None else None,
                "mean": float(row[5]) if row[5] is not None else None,
                "p10": float(row[6]) if row[6] is not None else None,
                "p25": float(row[7]) if row[7] is not None else None,
                "p75": float(row[8]) if row[8] is not None else None,
                "p90": float(row[9]) if row[9] is not None else None,
                "min": float(row[10]) if row[10] is not None else None,
                "record_holder": {
                    "name": best_single_holder[0] if best_single_holder else None,
                    "country": best_single_holder[1] if best_single_holder else None,
                    "time": float(best_single_holder[2]) if best_single_holder else None,
                } if best_single_holder else None
            },
            "average": {
                "median": float(row[11]) if row[11] is not None else None,
                "mean": float(row[12]) if row[12] is not None else None,
                "p10": float(row[13]) if row[13] is not None else None,
                "p25": float(row[14]) if row[14] is not None else None,
                "p75": float(row[15]) if row[15] is not None else None,
                "p90": float(row[16]) if row[16] is not None else None,
                "min": float(row[17]) if row[17] is not None else None,
                "record_holder": {
                    "name": best_avg_holder[0] if best_avg_holder else None,
                    "country": best_avg_holder[1] if best_avg_holder else None,
                    "time": float(best_avg_holder[2]) if best_avg_holder else None,
                } if best_avg_holder else None
            }
        }
        overview_years.append(year_summary)

        # Now compute the fine-grained distribution and percentile lookup for this year
        # 1. Percentile table from 1 to 99 in 1-percentile steps
        p_steps = list(range(1, 100))
        p_sql_singles = ", ".join([f"quantile_cont(single_sec, {p/100.0}) as s_{p}" for p in p_steps])
        p_sql_avgs = ", ".join([f"quantile_cont(average_sec, {p/100.0}) as a_{p}" for p in p_steps])
        
        single_p_vals = {}
        if year_summary["single_count"] > 0:
            s_res = con.execute(f"SELECT {p_sql_singles} FROM r333 WHERE year = {y} AND single_sec > 0").fetchone()
            if s_res:
                single_p_vals = {p: round(float(s_res[i]), 2) for i, p in enumerate(p_steps) if s_res[i] is not None}

        avg_p_vals = {}
        if year_summary["average_count"] > 0:
            a_res = con.execute(f"SELECT {p_sql_avgs} FROM r333 WHERE year = {y} AND average_sec > 0").fetchone()
            if a_res:
                avg_p_vals = {p: round(float(a_res[i]), 2) for i, p in enumerate(p_steps) if a_res[i] is not None}

        # 2. Histogram buckets: 0.5s bins from 3.0s to 60.0s (115 bins), plus overflow > 60s
        # Precompute bins via DuckDB
        s_bins = con.execute(f"""
            SELECT 
                floor(single_sec * 2) / 2.0 as bin_start,
                count(*) as count
            FROM r333
            WHERE year = {y} AND single_sec > 0 AND single_sec <= 60.0
            GROUP BY 1
            ORDER BY 1 ASC
        """).fetchall()
        s_bins_dict = {float(r[0]): int(r[1]) for r in s_bins}
        s_overflow = con.execute(f"SELECT count(*) FROM r333 WHERE year = {y} AND single_sec > 60.0").fetchone()[0]

        a_bins = con.execute(f"""
            SELECT 
                floor(average_sec * 2) / 2.0 as bin_start,
                count(*) as count
            FROM r333
            WHERE year = {y} AND average_sec > 0 AND average_sec <= 60.0
            GROUP BY 1
            ORDER BY 1 ASC
        """).fetchall()
        a_bins_dict = {float(r[0]): int(r[1]) for r in a_bins}
        a_overflow = con.execute(f"SELECT count(*) FROM r333 WHERE year = {y} AND average_sec > 60.0").fetchone()[0]

        # Standardize 0.5s intervals from 3.0 to 60.0
        standard_bins_single = []
        cumulative_s = 0
        total_s = year_summary["single_count"]
        for b_i in range(6, 121): # 3.0 to 60.0
            b_start = b_i * 0.5
            b_end = b_start + 0.5
            c = s_bins_dict.get(b_start, 0)
            cumulative_s += c
            standard_bins_single.append({
                "start": round(b_start, 1),
                "end": round(b_end, 1),
                "label": f"{b_start:.1f} - {b_end:.1f}s",
                "count": c,
                "cumulative_pct": round((cumulative_s / total_s) * 100.0, 2) if total_s > 0 else 0.0
            })

        standard_bins_avg = []
        cumulative_a = 0
        total_a = year_summary["average_count"]
        for b_i in range(6, 121):
            b_start = b_i * 0.5
            b_end = b_start + 0.5
            c = a_bins_dict.get(b_start, 0)
            cumulative_a += c
            standard_bins_avg.append({
                "start": round(b_start, 1),
                "end": round(b_end, 1),
                "label": f"{b_start:.1f} - {b_end:.1f}s",
                "count": c,
                "cumulative_pct": round((cumulative_a / total_a) * 100.0, 2) if total_a > 0 else 0.0
            })

        year_detail = {
            "year": int(y),
            "summary": year_summary,
            "single": {
                "percentiles": single_p_vals,
                "histogram": standard_bins_single,
                "overflow_60s": s_overflow
            },
            "average": {
                "percentiles": avg_p_vals,
                "histogram": standard_bins_avg,
                "overflow_60s": a_overflow
            }
        }

        with open(years_dir / f"{y}.json", "w", encoding="utf-8") as f:
            json.dump(year_detail, f, separators=(",", ":"))
        print(f"Generated years/{y}.json")

    overview_payload = {
        "metadata": {
            "title": "WCA Time Machine Historical Dataset",
            "export_date": meta.get("export_date", "2026-10-18"),
            "export_format_version": meta.get("export_format_version", "v2.0.2"),
            "event": "333",
            "event_name": "3x3x3 Cube",
            "years_span": f"{min(available_years)}-{max(available_years)}",
            "total_competitions": total_competitions,
            "total_333_results": counts[0],
            "total_competitors": counts[1],
            "total_valid_singles": counts[2],
            "total_valid_averages": counts[3],
        },
        "available_years": available_years,
        "years": overview_years
    }

    with open(output_dir / "overview.json", "w", encoding="utf-8") as f:
        json.dump(overview_payload, f, indent=2)
    print("Generated overview.json successfully!")


def main():
    repo_root = Path(__file__).resolve().parent.parent.parent
    export_dir = find_export_dir(repo_root)
    print(f"Using export directory: {export_dir}")
    
    # Destination output directories:
    # 1. pipeline/data (local pipeline output)
    # 2. frontend/public/data (static frontend assets)
    pipeline_out = repo_root / "pipeline" / "data"
    frontend_out = repo_root / "frontend" / "public" / "data"

    build_aggregates(export_dir, pipeline_out)
    
    # Also write directly to frontend/public/data
    frontend_out.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copytree(pipeline_out, frontend_out, dirs_exist_ok=True)
    print(f"Synced data to {frontend_out}")


if __name__ == "__main__":
    main()
