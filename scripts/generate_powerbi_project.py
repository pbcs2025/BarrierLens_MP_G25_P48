#!/usr/bin/env python3
"""Generate BarrierLens Power BI Project (.pbip) with TMDL semantic model and 7 report pages."""

from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

POWERBI_ROOT = PROJECT_ROOT / "powerbi"
REPORT_DIR = POWERBI_ROOT / "BarrierLens.Report"
MODEL_DIR = POWERBI_ROOT / "BarrierLens.SemanticModel"
DEF_DIR = MODEL_DIR / "definition"
TABLES_DIR = DEF_DIR / "tables"

# Use forward slashes — Power Query M prefers them on Windows
DATA_PATH = (PROJECT_ROOT / "data" / "dashboard" / "powerbi").as_posix()
CSV_DIR = PROJECT_ROOT / "data" / "dashboard" / "powerbi"

TABLES = [
    "national_kpi_summary",
    "national_barrier_long",
    "state_level_summary",
    "state_barrier_long",
    "demographic_summary",
    "demographic_comparison_long",
    "cluster_summary",
    "cluster_state_distribution",
    "model_comparison_table",
    "stage2_xgboost_results",
]

PAGES = [
    ("NationalOverview", "1. National Overview"),
    ("BasePaperComparison", "2. Base Paper Comparison"),
    ("StateBarrierAnalysis", "3. State-wise Barrier Analysis"),
    ("DemographicAnalysis", "4. Demographic & Socioeconomic"),
    ("RiskArchetypes", "5. Risk Archetypes"),
    ("Stage2OutcomeImpact", "6. Stage 2 Health Outcome Impact"),
    ("ExplainabilityValidation", "7. Model Explainability & Validation"),
]


def _guid() -> str:
    return str(uuid.uuid4())


def _tmdl_object_name(name: str) -> str:
    if name.replace("_", "").isalnum():
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
    df = pd.read_csv(csv_path, nrows=1000)
    return [(col, _infer_tmdl_type(df[col])) for col in df.columns]


def _column_tmdl(name: str, data_type: str) -> str:
    obj_name = _tmdl_object_name(name)
    source_name = _tmdl_object_name(name)
    lines = [
        f"\tcolumn {obj_name}",
        f"\t\tdataType: {data_type}",
        f"\t\tsourceColumn: {source_name}",
        "\t\tsummarizeBy: none",
    ]
    return "\n".join(lines)


def _table_tmdl(table: str) -> str:
    tag = _guid()
    column_blocks = "\n\n".join(
        _column_tmdl(name, data_type) for name, data_type in _columns_from_csv(table)
    )
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


def _write_semantic_model() -> None:
    DEF_DIR.mkdir(parents=True, exist_ok=True)
    TABLES_DIR.mkdir(parents=True, exist_ok=True)

    (DEF_DIR / "database.tmdl").write_text(
        "database\n\tcompatibilityLevel: 1567\n",
        encoding="utf-8",
    )

    model_refs = "\n".join(f"ref table {t}" for t in TABLES + ["_Metrics"])
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
        "\tannotation PBI_ResultType = Text\n",
        encoding="utf-8",
    )

    for table in TABLES:
        (TABLES_DIR / f"{table}.tmdl").write_text(_table_tmdl(table) + "\n", encoding="utf-8")

    metrics_tag = _guid()
    placeholder_tag = _guid()
    (TABLES_DIR / "_Metrics.tmdl").write_text(
        "table _Metrics\n"
        f"\tlineageTag: {metrics_tag}\n"
        "\n"
        "\tmeasure 'Total Women' = MAX(national_kpi_summary[total_women])\n"
        "\t\tformatString: #,0\n"
        "\n"
        "\tmeasure 'Observed Any Barrier Rate' = MAX(national_kpi_summary[observed_any_barrier_rate])\n"
        "\t\tformatString: 0.0%\n"
        "\n"
        "\tmeasure 'Observed Household Rate' = MAX(national_kpi_summary[observed_household_rate])\n"
        "\t\tformatString: 0.0%\n"
        "\n"
        "\tmeasure 'Predicted Household Prob' = MAX(national_kpi_summary[pred_household_prob])\n"
        "\t\tformatString: 0.0%\n"
        "\n"
        "\tmeasure 'Stage 2 Unmet FP N' = MAX(national_kpi_summary[stage2_unmet_fp_N])\n"
        "\t\tformatString: #,0\n"
        "\n"
        "\tmeasure 'Stage 2 Unmet FP Rate' = MAX(national_kpi_summary[stage2_unmet_fp_observed_rate])\n"
        "\t\tformatString: 0.0%\n"
        "\n"
        "\tmeasure 'Avg State Predicted Facility' = AVERAGE(state_barrier_long[mean_predicted_prob])\n"
        "\t\tformatString: 0.0%\n"
        "\n"
        "\tmeasure 'Avg Barrier Uplift' = AVERAGE(model_comparison_table[Barrier_Uplift])\n"
        "\t\tformatString: +0.0000;-0.0000\n"
        "\n"
        "\tmeasure 'Best Stage 2 ROC-AUC' = MAX(model_comparison_table[ROC-AUC])\n"
        "\t\tformatString: 0.0000\n"
        "\n"
        "\tcolumn Placeholder\n"
        "\t\tisHidden\n"
        f"\t\tlineageTag: {placeholder_tag}\n"
        "\t\tdataType: string\n"
        "\t\tsourceColumn: Placeholder\n"
        "\n"
        "\tpartition _Metrics = calculated\n"
        "\t\tmode: import\n"
        '\t\tsource = ROW("Placeholder", BLANK())\n',
        encoding="utf-8",
    )

    rel1 = _guid()
    rel2 = _guid()
    rel3 = _guid()
    (DEF_DIR / "relationships.tmdl").write_text(
        f"relationship {rel1}\n"
        "\tfromColumn: state_barrier_long.state_name\n"
        "\ttoColumn: state_level_summary.state_name\n"
        "\n"
        f"relationship {rel2}\n"
        "\tfromColumn: cluster_state_distribution.cluster_id\n"
        "\ttoColumn: cluster_summary.cluster_id\n"
        "\n"
        f"relationship {rel3}\n"
        "\tcrossFilteringBehavior: bothDirections\n"
        "\tfromColumn: cluster_state_distribution.state_name\n"
        "\ttoColumn: state_level_summary.state_name\n",
        encoding="utf-8",
    )

    (DEF_DIR / "cultures").mkdir(parents=True, exist_ok=True)
    (DEF_DIR / "cultures" / "en-US.tmdl").write_text(
        "cultureInfo en-US\n",
        encoding="utf-8",
    )

    (MODEL_DIR / "definition.pbism").write_text(
        json.dumps({"version": "4.0", "settings": {}}, indent=2),
        encoding="utf-8",
    )


def _write_report_shell() -> None:
    report_def = REPORT_DIR / "definition"
    pages_dir = report_def / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

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
        (page_dir / "page.json").write_text(
            json.dumps(
                {
                    "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json",
                    "name": name,
                    "displayName": display,
                    "displayOption": 1,
                    "height": 720,
                    "width": 1280,
                    "objects": {
                        "background": [
                            {
                                "properties": {
                                    "color": {
                                        "solid": {"color": {"expr": {"Literal": {"Value": "'#F8FAFC'"}}}}
                                    }
                                }
                            }
                        ]
                    },
                },
                indent=2,
            ),
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
                        "items": [
                            {
                                "name": "BarrierLensTheme.json",
                                "path": "BarrierLensTheme.json",
                                "type": "CustomTheme",
                            }
                        ],
                    }
                ],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

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
    }
    (theme_dir / "BarrierLensTheme.json").write_text(json.dumps(theme, indent=2), encoding="utf-8")


def _write_pbip_pointer() -> None:
    (POWERBI_ROOT / "BarrierLens.pbip").write_text(
        json.dumps(
            {
                "$schema": "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
                "version": "1.0",
                "artifacts": [{"report": {"path": "BarrierLens.Report"}}],
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
    _write_report_shell()
    _write_pbip_pointer()
    print(f"Power BI project generated -> {POWERBI_ROOT / 'BarrierLens.pbip'}")
    print("Open this file in Power BI Desktop (double-click or File > Open).")


if __name__ == "__main__":
    main()
