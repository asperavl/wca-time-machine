# WCA Time Machine Data Pipeline

Offline data ingestion, validation, and aggregation pipeline using DuckDB and Python.

## Usage

```bash
# Run aggregation pipeline against local WCA export TSVs
uv run python -m src.aggregate

# Run test suite
uv run pytest
```
