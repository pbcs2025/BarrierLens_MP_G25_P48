#!/usr/bin/env python3
"""Generate BarrierLens Power BI Project (.pbip) — semantic model, DAX, and 7 report pages."""

from __future__ import annotations

import json
import shutil
import sys
import uuid
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.powerbi_dax import render_metrics_tmdl
from scripts.powerbi_layout import PAGE_BUILDERS

POWERBI_ROOT = PROJECT_ROOT / "powerbi"
REPORT_DIR = POWERBI_ROOT / "BarrierLens.Report"
MODEL_DIR = POWERBI_ROOT / "BarrierLens.SemanticModel"
DEF_DIR = MODEL_DIR / "definition"
TABLES_DIR = DEF_DIR / "tables"

DATA_PATH = (PROJECT_ROOT / "data" / "dashboard" / "powerbi").as_posix()
MASTER_PATH = (PROJECT_ROOT / "data" / "dashboard").as_posix()
CSV_DIR = PROJECT_ROOT / "data" / "dashboard" / "powerbi"
IMAGES_SRC = CSV_DIR / "images"

# Core fact/dim tables (CSV stems under powerbi/)
STATIC_TABLES = [
    "national_kpi_summary",
    "national_barrier_long",
    "national_barrier_predicted_mix",
    "state_level_summary",
    "state_barrier_long",
    "state_ranking_long",
    "state_top10_long",
    "state_bottom10_long",
    "demographic_summary",
    "demographic_comparison_long",
    "demographic_dimension_long",
    "demographic_education_long",
    "demographic_wealth_long",
    "demographic_residence_long",
    "demographic_religion_long",
    "demographic_occupation_long",
    "demographic_caste_long",
    "demographic_age_group_long",
    "base_paper_reference",
    "base_paper_barrier_long",
    "cluster_summary",
    "cluster_state_distribution",
    "cluster_radar_long",
    "model_comparison_table",
    "stage2_xgboost_results",
    "stage2_outcome_long",
    "stage1_model_comparison",
    "stage1_barrier_rates_long",
    "shap_top20",
    "shap_importance",
    "classification_report_display",
    "hyperparameters_display",
]

PAGES = [
    ("NationalOverview", "1. National Overview"),
    ("StateAnalysis", "2. State Analysis"),
    ("DemographicAnalysis", "3. Demographic Analysis"),
    ("Stage2Outcomes", "4. Stage 2 Health Outcomes"),
    ("ClusterAnalysis", "5. Cluster Analysis"),
    ("ModelPerformance", "6. Model Performance"),
    ("Explainability", "7. Explainability"),
]


def _guid() -> str:
    return str(uuid.uuid4())


def _tmdl_object_name(name: str) -> str:
    if name.replace("_", "").replace("-", "").isalnum():
        return name
    escaped = name.replace("'", "''")
    return f"'{escaped}'"


def _infer_tmdl_type(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    non_null = series.dropna()
    if non_null.empty:
        return "string"
    if pd.api.types.is_integer_dtype(series):
        return "int64"
    if pd.api.types.is_float_dtype(series):
        return "double"
    numeric = pd.to_numeric(non_null, errors="coerce")
    if numeric.notna().all():
        return "int64" if (numeric % 1 == 0).all() else "double"
    return "string"


def _columns_from_csv(table: str) -> list[tuple[str, str]]:
    csv_path = CSV_DIR / f"{table}.csv"
    if not csv_path.exists():
        return []
    df = pd.read_csv(csv_path, nrows=2000, low_memory=False)
    return [(col, _infer_tmdl_type(df[col])) for col in df.columns]


def _column_tmdl(name: str, data_type: str) -> str:
    obj_name = _tmdl_object_name(name)
    source_name = _tmdl_object_name(name)
    return (
        f"\tcolumn {obj_name}\n"
        f"\t\tdataType: {data_type}\n"
        f"\t\tsourceColumn: {source_name}\n"
        "\t\tsummarizeBy: none"
    )


def _table_tmdl_csv(table: str) -> str:
    tag = _guid()
    cols = _columns_from_csv(table)
    if not cols:
        raise FileNotFoundError(f"Missing or empty CSV for table: {table}")
    column_blocks = "\n\n".join(_column_tmdl(n, t) for n, t in cols)
    return (
        f"table {table}\n"
        f"\tlineageTag: {tag}\n"
        "\n"
        f"{column_blocks}\n"
        "\n"
        f"\tpartition {table} = m\n"
        "\t\tmode: import\n"
        "\t\tsource =\n"
        "\t\t\tlet\n"
        f"\t\t\t\tSource = Csv.Document(\n"
        f'\t\t\t\t\tFile.Contents(DashboardDataPath & "/{table}.csv"),\n'
        '\t\t\t\t\t[Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]\n'
        "\t\t\t\t),\n"
        '\t\t\t\t#"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalars=true])\n'
        "\t\t\tin\n"
        '\t\t\t\t#"Promoted Headers"\n'
    )


def _table_tmdl_woman_level() -> str:
    table = "woman_level_master"
    tag = _guid()
    csv_path = PROJECT_ROOT / "data" / "dashboard" / "woman_level_master.csv"
    df = pd.read_csv(csv_path, nrows=5000, low_memory=False)
    cols = [(col, _infer_tmdl_type(df[col])) for col in df.columns]
    column_blocks = "\n\n".join(_column_tmdl(n, t) for n, t in cols)
    return (
        f"table {table}\n"
        f"\tlineageTag: {tag}\n"
        "\n"
        f"{column_blocks}\n"
        "\n"
        f"\tpartition {table} = m\n"
        "\t\tmode: import\n"
        "\t\tsource =\n"
        "\t\t\tlet\n"
        f"\t\t\t\tSource = Csv.Document(\n"
        f'\t\t\t\t\tFile.Contents(DashboardMasterPath & "/woman_level_master.csv"),\n'
        '\t\t\t\t\t[Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]\n'
        "\t\t\t\t),\n"
        '\t\t\t\t#"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),\n'
        '\t\t\t\t#"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers", {}, "en-US")\n'
        "\t\t\tin\n"
        '\t\t\t\t#"Promoted Headers"\n'
    )


def _write_semantic_model() -> None:
    DEF_DIR.mkdir(parents=True, exist_ok=True)
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    (DEF_DIR / "database.tmdl").write_text(
        "database\n\tcompatibilityLevel: 1567\n",
        encoding="utf-8",
    )

    tables = STATIC_TABLES + ["woman_level_master", "_Metrics"]
    model_refs = "\n".join(f"ref table {t}" for t in tables if t != "_Metrics")
    model_refs += "\nref table _Metrics"
    (DEF_DIR / "model.tmdl").write_text(
        "model Model\n"
        "\tculture: en-US\n"
        "\tdefaultPowerBIDataSourceVersion: powerBI_V3\n"
        "\tsourceQueryCulture: en-US\n"
        "\n"
        f"{model_refs}\n"
        "\n"
        "ref cultureInfo en-US\n",
        encoding="utf-8",
    )

    (DEF_DIR / "expressions.tmdl").write_text(
        f'expression DashboardDataPath = "{DATA_PATH}" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]\n'
        f"\tlineageTag: {_guid()}\n"
        "\n"
        "\tannotation PBI_NavigationStepName = Navigation\n"
        "\n"
        "\tannotation PBI_ResultType = Text\n"
        "\n"
        f'expression DashboardMasterPath = "{MASTER_PATH}" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]\n'
        f"\tlineageTag: {_guid()}\n"
        "\n"
        "\tannotation PBI_NavigationStepName = Navigation\n"
        "\n"
        "\tannotation PBI_ResultType = Text\n",
        encoding="utf-8",
    )

    for table in STATIC_TABLES:
        (TABLES_DIR / f"{table}.tmdl").write_text(_table_tmdl_csv(table) + "\n", encoding="utf-8")

    (TABLES_DIR / "woman_level_master.tmdl").write_text(_table_tmdl_woman_level() + "\n", encoding="utf-8")

    (TABLES_DIR / "_Metrics.tmdl").write_text(
        render_metrics_tmdl(_guid(), _guid()),
        encoding="utf-8",
    )

    rels = [
        ("state_barrier_long", "state_name", "state_level_summary", "state_name", None),
        ("state_top10_long", "state_name", "state_level_summary", "state_name", None),
        ("state_bottom10_long", "state_name", "state_level_summary", "state_name", None),
        ("cluster_state_distribution", "cluster_id", "cluster_summary", "cluster_id", None),
        (
            "cluster_state_distribution",
            "state_name",
            "state_level_summary",
            "state_name",
            "bothDirections",
        ),
        ("woman_level_master", "state_name", "state_level_summary", "state_name", None),
        ("woman_level_master", "cluster_id", "cluster_summary", "cluster_id", None),
    ]
    rel_blocks = []
    for fr, fc, tt, tc, cross in rels:
        block = f"relationship {_guid()}\n\tfromColumn: {fr}.{fc}\n\ttoColumn: {tt}.{tc}\n"
        if cross:
            block = f"relationship {_guid()}\n\tcrossFilteringBehavior: {cross}\n\tfromColumn: {fr}.{fc}\n\ttoColumn: {tt}.{tc}\n"
        rel_blocks.append(block)
    (DEF_DIR / "relationships.tmdl").write_text("\n".join(rel_blocks), encoding="utf-8")

    (DEF_DIR / "cultures" / "en-US.tmdl").write_text("cultureInfo en-US\n", encoding="utf-8")
    (MODEL_DIR / "definition.pbism").write_text(
        json.dumps({"version": "4.0", "settings": {}}, indent=2),
        encoding="utf-8",
    )


def _write_theme() -> None:
    theme_dir = REPORT_DIR / "StaticResources" / "RegisteredResources"
    theme_dir.mkdir(parents=True, exist_ok=True)
    theme = {
        "name": "BarrierLens Theme",
        "dataColors": ["#1D3557", "#E63946", "#457B9D", "#2A9D8F", "#F4A261", "#A8DADC"],
        "background": "#F8FAFC",
        "foreground": "#1D3557",
        "tableAccent": "#457B9D",
        "good": "#2A9D8F",
        "bad": "#E63946",
        "neutral": "#457B9D",
        "visualStyles": {
            "card": {
                "*": {
                    "labels": [{"color": {"solid": {"color": "#1D3557"}}}],
                    "categoryLabels": [{"color": {"solid": {"color": "#457B9D"}}}],
                    "background": [{"show": True, "color": {"solid": {"color": "#FFFFFF"}}}],
                    "dropShadow": [{"show": True}],
                    "border": [{"show": True, "color": {"solid": {"color": "#A8DADC"}}}],
                    "padding": [{"top": 8, "bottom": 8, "left": 12, "right": 12}],
                }
            },
            "clusteredBarChart": {
                "*": {
                    "title": [{"fontColor": {"solid": {"color": "#1D3557"}}}],
                    "dropShadow": [{"show": True}],
                }
            },
            "clusteredColumnChart": {
                "*": {
                    "title": [{"fontColor": {"solid": {"color": "#1D3557"}}}],
                    "dropShadow": [{"show": True}],
                }
            },
            "donutChart": {
                "*": {
                    "title": [{"fontColor": {"solid": {"color": "#1D3557"}}}],
                    "dropShadow": [{"show": True}],
                }
            },
            "filledMap": {
                "*": {
                    "title": [{"fontColor": {"solid": {"color": "#1D3557"}}}],
                    "dropShadow": [{"show": True}],
                }
            },
            "tableEx": {
                "*": {
                    "title": [{"fontColor": {"solid": {"color": "#1D3557"}}}],
                }
            },
        },
    }
    (theme_dir / "BarrierLensTheme.json").write_text(json.dumps(theme, indent=2), encoding="utf-8")

    if IMAGES_SRC.is_dir():
        for png in IMAGES_SRC.glob("*.png"):
            shutil.copy2(png, theme_dir / png.name)


def _cleanup_stale_pages(pages_dir: Path) -> None:
    """Remove report page folders not in the current PAGES manifest."""
    keep = {name for name, _ in PAGES}
    if not pages_dir.is_dir():
        return
    for child in pages_dir.iterdir():
        if child.is_dir() and child.name not in keep:
            shutil.rmtree(child)


def _write_report() -> None:
    report_def = REPORT_DIR / "definition"
    pages_dir = report_def / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)
    _cleanup_stale_pages(pages_dir)

    (REPORT_DIR / "definition.pbir").write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
                "version": "4.0",
                "datasetReference": {"byPath": {"path": "../BarrierLens.SemanticModel"}},
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    pages_meta = []
    for idx, (name, display) in enumerate(PAGES):
        pages_meta.append({"name": name, "displayName": display, "ordinal": idx})
        page_dir = pages_dir / name
        page_dir.mkdir(parents=True, exist_ok=True)
        builder = PAGE_BUILDERS[name]
        (page_dir / "page.json").write_text(
            json.dumps(builder(), indent=2),
            encoding="utf-8",
        )

    (pages_dir / "pages.json").write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json",
                "activePageName": PAGES[0][0],
                "pages": pages_meta,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    (report_def / "version.json").write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
                "version": "2.0.0",
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    resource_items = [
        {
            "name": "BarrierLensTheme.json",
            "path": "BarrierLensTheme.json",
            "type": "CustomTheme",
        }
    ]
    if IMAGES_SRC.is_dir():
        for png in sorted(IMAGES_SRC.glob("*.png")):
            resource_items.append(
                {"name": png.name, "path": png.name, "type": "Image"}
            )

    (report_def / "report.json").write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.1.0/schema.json",
                "themeCollection": {
                    "baseTheme": {
                        "name": "CY24SU10",
                        "reportVersionAtImport": {
                            "visual": "2.6.0",
                            "report": "3.1.0",
                            "page": "2.3.0",
                        },
                        "type": "SharedResources",
                    },
                    "customTheme": {
                        "name": "BarrierLensTheme.json",
                        "reportVersionAtImport": {
                            "visual": "2.6.0",
                            "report": "3.1.0",
                            "page": "2.3.0",
                        },
                        "type": "RegisteredResources",
                    },
                },
                "resourcePackages": [
                    {
                        "name": "RegisteredResources",
                        "type": "RegisteredResources",
                        "items": resource_items,
                    }
                ],
                "settings": {
                    "useStylableVisualContainerHeader": True,
                    "exportDataMode": 1,
                },
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    # Bookmarks placeholder for navigation (reset slicers + home page)
    bookmarks_path = report_def / "bookmarks.json"
    bookmarks_path.write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/bookmarksMetadata/1.0.0/schema.json",
                "items": [
                    {
                        "name": "Bookmark_Reset_Filters",
                        "displayName": "Reset All Filters",
                    },
                    {
                        "name": "Bookmark_National_Overview",
                        "displayName": "Go to National Overview",
                    },
                    {
                        "name": "Bookmark_State_Analysis",
                        "displayName": "Go to State Analysis",
                    },
                    {
                        "name": "Bookmark_Model_Performance",
                        "displayName": "Go to Model Performance",
                    },
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def _write_pbip() -> None:
    (POWERBI_ROOT / "BarrierLens.pbip").write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
                "version": "1.0",
                "artifacts": [
                    {"report": {"path": "BarrierLens.Report"}}
                ],
                "settings": {"enableAutoRecovery": True},
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def main() -> None:
    from scripts.build_powerbi_tables import main as build_tables

    build_tables()
    _write_semantic_model()
    _write_theme()
    _write_report()
    _write_pbip()

    from scripts.apply_display_names import process_all_tables

    print("\nApplying display names to semantic model...")
    process_all_tables()

    print(f"\nPower BI project generated -> {POWERBI_ROOT / 'BarrierLens.pbip'}")
    print("Open in Power BI Desktop. Enable Azure Maps for state choropleth if prompted.")


if __name__ == "__main__":
    main()
