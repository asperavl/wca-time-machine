import json
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "pipeline" / "data"


def test_overview_json_exists_and_valid():
    overview_path = DATA_DIR / "overview.json"
    assert overview_path.exists(), "overview.json should exist"
    
    with open(overview_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    assert "metadata" in data
    assert "available_years" in data
    assert "years" in data
    
    meta = data["metadata"]
    assert meta["event"] == "333"
    assert meta["total_competitions"] > 18000
    assert meta["total_valid_singles"] > 1000000
    
    years = data["available_years"]
    assert 1982 in years
    assert 2003 in years
    assert 2024 in years
    assert 2026 in years


def test_1982_historical_benchmark():
    overview_path = DATA_DIR / "overview.json"
    with open(overview_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    y1982 = next(y for y in data["years"] if y["year"] == 1982)
    assert y1982["competitors"] == 19
    assert y1982["single_count"] == 19
    # In 1982, Minh Thai won with 22.95 seconds
    assert y1982["single"]["min"] == 22.95
    # No Ao5 in 1982
    assert y1982["average_count"] == 0
    assert y1982["average"]["median"] is None


def test_yearly_detail_files():
    years_dir = DATA_DIR / "years"
    assert years_dir.exists()
    
    overview_path = DATA_DIR / "overview.json"
    with open(overview_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    for y in data["available_years"]:
        year_file = years_dir / f"{y}.json"
        assert year_file.exists(), f"Detail file for year {y} must exist"
        
        with open(year_file, "r", encoding="utf-8") as yf:
            yd = json.load(yf)
            
        assert yd["year"] == y
        assert "single" in yd
        assert "average" in yd
        assert "histogram" in yd["single"]
        assert len(yd["single"]["histogram"]) > 50
