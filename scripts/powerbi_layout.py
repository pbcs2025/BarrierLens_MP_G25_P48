"""Build Power BI report page.json visualContainers with bound prototypeQuery fields."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = PROJECT_ROOT / "data" / "dashboard" / "powerbi" / "images"

# Human-readable titles for ML evaluation PNG assets (Page 6)
IMAGE_TITLES: dict[str, str] = {
    "roc_curve_target_unmet_fp.png": "ROC Curve — Unmet Family Planning",
    "pr_curve_target_unmet_fp.png": "Precision-Recall Curve",
    "gain_curve_target_unmet_fp.png": "Cumulative Gain Curve",
    "lift_curve_target_unmet_fp.png": "Lift Curve",
    "calibration_target_unmet_fp.png": "Calibration Curve",
    "confusion_matrix_target_unmet_fp.png": "Confusion Matrix",
    "confusion_matrix_normalised_target_unmet_fp.png": "Normalised Confusion Matrix",
    "decision_threshold_target_unmet_fp.png": "Decision Threshold Analysis",
    "top20_features_target_unmet_fp.png": "Top 20 Features — Unmet FP",
    "barrier_uplift_comparison.png": "Barrier Uplift Comparison",
    "cluster_profiles.png": "Cluster Profiles",
    "rf_bar_household.png": "Stage 1 RF Feature Importance — Household",
    "rf_bar_logistic.png": "Stage 1 RF Feature Importance — Logistic",
    "rf_bar_facility.png": "Stage 1 RF Feature Importance — Facility",
    "rf_summary_household.png": "Stage 1 RF SHAP Summary — Household",
    "rf_summary_logistic.png": "Stage 1 RF SHAP Summary — Logistic",
    "rf_summary_facility.png": "Stage 1 RF SHAP Summary — Facility",
    "shap_summary_target_unmet_fp.png": "SHAP Summary — Unmet FP",
    "shap_bar_target_unmet_fp.png": "SHAP Bar — Unmet FP",
    "shap_waterfall_target_unmet_fp.png": "SHAP Waterfall — Unmet FP",
    "shap_dependence_target_unmet_fp.png": "SHAP Dependence — Unmet FP",
    "shap_heatmap_target_unmet_fp.png": "SHAP Heatmap — Unmet FP",
    "rf_shap_bar_target_unmet_fp.png": "Stage 2 RF SHAP Bar — Unmet FP",
    "rf_shap_beeswarm_target_unmet_fp.png": "Stage 2 RF SHAP Beeswarm — Unmet FP",
    "rf_shap_group_comparison_target_unmet_fp.png": "Stage 2 RF SHAP Group Comparison",
}

EXPLAINABILITY_IMAGES = [
    "rf_shap_bar_target_unmet_fp.png",
    "rf_shap_beeswarm_target_unmet_fp.png",
    "rf_shap_group_comparison_target_unmet_fp.png",
]

NAV_PAGES = [
    ("NationalOverview", "National"),
    ("StateAnalysis", "States"),
    ("DemographicAnalysis", "Demographics"),
    ("Stage2Outcomes", "Stage 2"),
    ("ClusterAnalysis", "Clusters"),
    ("ModelPerformance", "Models"),
    ("Explainability", "SHAP"),
]


def _uid() -> str:
    return str(uuid.uuid4())


def _source_ref(alias: str) -> dict[str, Any]:
    return {"SourceRef": {"Source": alias}}


def _select_column(table: str, column: str, alias: str | None = None) -> dict[str, Any]:
    a = alias or table[0]
    ref = f"{table}.{column}"
    return {
        "Column": {
            "Expression": _source_ref(a),
            "Property": column,
        },
        "Name": ref,
        "NativeReferenceName": column,
    }


def _select_measure(table: str, measure: str, alias: str | None = None) -> dict[str, Any]:
    a = alias or table[0]
    ref = f"{table}.{measure}"
    return {
        "Measure": {
            "Expression": _source_ref(a),
            "Property": measure,
        },
        "Name": ref,
        "NativeReferenceName": measure,
    }


def _prototype_query(
    table: str,
    selects: list[dict[str, Any]],
    alias: str | None = None,
) -> dict[str, Any]:
    a = alias or table[0]
    return {
        "Version": 2,
        "From": [{"Name": a, "Entity": table, "Type": 0}],
        "Select": selects,
    }


def _visual_config(
    visual_type: str,
    projections: dict[str, list[dict[str, str]]],
    prototype_query: dict[str, Any],
    title: str | None = None,
    visual_name: str | None = None,
) -> str:
    single: dict[str, Any] = {
        "visualType": visual_type,
        "projections": projections,
        "prototypeQuery": prototype_query,
        "drillFilterOtherVisuals": True,
    }
    if title:
        single["vcObjects"] = {
            "title": [
                {
                    "properties": {
                        "show": {"expr": {"Literal": {"Value": "true"}}},
                        "text": {"expr": {"Literal": {"Value": f"'{title}'"}}},
                        "fontColor": {
                            "solid": {"color": {"expr": {"Literal": {"Value": "'#1D3557'"}}}}
                        },
                    }
                }
            ],
            "dropShadow": [
                {
                    "properties": {
                        "show": {"expr": {"Literal": {"Value": "true"}}},
                    }
                }
            ],
        }
    payload = {
        "name": visual_name or _uid(),
        "layouts": [
            {
                "id": 0,
                "position": {"x": 0, "y": 0, "z": 0, "width": 100, "height": 100},
            }
        ],
        "singleVisual": single,
    }
    return json.dumps(payload, separators=(",", ":"))


def textbox_config(text: str, font_size: str = "11pt", color: str = "#1D3557") -> str:
    payload = {
        "name": _uid(),
        "singleVisual": {
            "visualType": "textbox",
            "objects": {
                "general": [
                    {
                        "properties": {
                            "paragraphs": [
                                {
                                    "textRuns": [
                                        {
                                            "value": text,
                                            "style": {
                                                "fontFamily": "Segoe UI",
                                                "fontSize": font_size,
                                                "color": color,
                                            },
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            },
        },
    }
    return json.dumps(payload, separators=(",", ":"))


def page_header(title: str, subtitle: str) -> list[dict[str, Any]]:
    return [
        {
            "x": 0,
            "y": 0,
            "z": 10000,
            "width": 1280,
            "height": 44,
            "config": textbox_config(title, font_size="16pt", color="#FFFFFF"),
            "filters": "[]",
        },
        {
            "x": 16,
            "y": 48,
            "z": 9999,
            "width": 900,
            "height": 24,
            "config": textbox_config(subtitle, font_size="10pt", color="#A8DADC"),
            "filters": "[]",
        },
    ]


def nav_buttons(y: int = 76) -> list[dict[str, Any]]:
    """Compact page navigation labels (configure page navigation in Desktop if needed)."""
    visuals: list[dict[str, Any]] = []
    x = 16
    w = 168
    for _, label in NAV_PAGES:
        visuals.append(
            {
                "x": x,
                "y": y,
                "z": 9998,
                "width": w,
                "height": 28,
                "config": textbox_config(f"▸ {label}", font_size="9pt", color="#457B9D"),
                "filters": "[]",
            }
        )
        x += w + 8
    return visuals


def global_slicers(y: int = 112) -> list[dict[str, Any]]:
    specs = [
        ("state_level_summary", "state_name", "State", 16, 148),
        ("woman_level_master", "residence", "Residence", 172, 120),
        ("woman_level_master", "education_tier", "Education", 300, 120),
        ("woman_level_master", "occupation_group", "Occupation", 428, 132),
        ("woman_level_master", "religion", "Religion", 568, 120),
        ("woman_level_master", "wealth_tier", "Wealth", 696, 108),
        ("state_barrier_long", "barrier_type", "Barrier Type", 812, 132),
        ("stage2_outcome_long", "outcome", "Stage 2 Target", 952, 148),
        ("cluster_summary", "archetype_name", "Cluster", 1108, 156),
    ]
    out: list[dict[str, Any]] = []
    for table, col, title, x, w in specs:
        out.append(slicer_visual(x, y, w, 64, table, col, title, z=200))
    return out


def card_visual(
    x: int,
    y: int,
    w: int,
    h: int,
    measure_table: str,
    measure: str,
    title: str,
    z: int = 100,
) -> dict[str, Any]:
    pq = _prototype_query(measure_table, [_select_measure(measure_table, measure)])
    ref = f"{measure_table}.{measure}"
    cfg = _visual_config("card", {"Values": [{"queryRef": ref}]}, pq, title=title)
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def slicer_visual(
    x: int,
    y: int,
    w: int,
    h: int,
    table: str,
    column: str,
    title: str,
    z: int = 50,
) -> dict[str, Any]:
    ref = f"{table}.{column}"
    pq = _prototype_query(table, [_select_column(table, column)])
    cfg = _visual_config("slicer", {"Values": [{"queryRef": ref}]}, pq, title=title)
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def clustered_bar(
    x: int,
    y: int,
    w: int,
    h: int,
    category_table: str,
    category_col: str,
    legend_table: str,
    legend_col: str,
    value_table: str,
    value_col: str,
    title: str,
    is_measure: bool = False,
    z: int = 10,
) -> dict[str, Any]:
    cat_ref = f"{category_table}.{category_col}"
    leg_ref = f"{legend_table}.{legend_col}"
    val_ref = f"{value_table}.{value_col}"
    selects = [
        _select_column(category_table, category_col),
        _select_column(legend_table, legend_col),
    ]
    if is_measure:
        selects.append(_select_measure(value_table, value_col))
    else:
        selects.append(_select_column(value_table, value_col))
    pq = _prototype_query(category_table, selects)
    cfg = _visual_config(
        "clusteredBarChart",
        {
            "Category": [{"queryRef": cat_ref}],
            "Series": [{"queryRef": leg_ref}],
            "Y": [{"queryRef": val_ref}],
        },
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def clustered_column(
    x: int,
    y: int,
    w: int,
    h: int,
    category_table: str,
    category_col: str,
    legend_table: str,
    legend_col: str,
    value_table: str,
    value_col: str,
    title: str,
    is_measure: bool = False,
    z: int = 10,
) -> dict[str, Any]:
    cat_ref = f"{category_table}.{category_col}"
    leg_ref = f"{legend_table}.{legend_col}"
    val_ref = f"{value_table}.{value_col}"
    selects = [
        _select_column(category_table, category_col),
        _select_column(legend_table, legend_col),
    ]
    if is_measure:
        selects.append(_select_measure(value_table, value_col))
    else:
        selects.append(_select_column(value_table, value_col))
    pq = _prototype_query(category_table, selects)
    cfg = _visual_config(
        "clusteredColumnChart",
        {
            "Category": [{"queryRef": cat_ref}],
            "Series": [{"queryRef": leg_ref}],
            "Y": [{"queryRef": val_ref}],
        },
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def donut_chart(
    x: int,
    y: int,
    w: int,
    h: int,
    legend_table: str,
    legend_col: str,
    value_table: str,
    value_col: str,
    title: str,
    is_measure: bool = False,
    z: int = 10,
) -> dict[str, Any]:
    leg_ref = f"{legend_table}.{legend_col}"
    val_ref = f"{value_table}.{value_col}"
    selects = [_select_column(legend_table, legend_col)]
    if is_measure:
        selects.append(_select_measure(value_table, value_col))
    else:
        selects.append(_select_column(value_table, value_col))
    pq = _prototype_query(legend_table, selects)
    cfg = _visual_config(
        "donutChart",
        {"Category": [{"queryRef": leg_ref}], "Y": [{"queryRef": val_ref}]},
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def filled_map(
    x: int,
    y: int,
    w: int,
    h: int,
    location_table: str,
    location_col: str,
    value_table: str,
    value_col: str,
    title: str,
    is_measure: bool = True,
    z: int = 10,
) -> dict[str, Any]:
    loc_ref = f"{location_table}.{location_col}"
    val_ref = f"{value_table}.{value_col}"
    selects = [_select_column(location_table, location_col)]
    if is_measure:
        selects.append(_select_measure(value_table, value_col))
    else:
        selects.append(_select_column(value_table, value_col))
    pq = _prototype_query(location_table, selects)
    cfg = _visual_config(
        "filledMap",
        {"Location": [{"queryRef": loc_ref}], "Size": [{"queryRef": val_ref}]},
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def bar_chart_horizontal(
    x: int,
    y: int,
    w: int,
    h: int,
    category_table: str,
    category_col: str,
    value_table: str,
    value_col: str,
    title: str,
    is_measure: bool = True,
    z: int = 10,
) -> dict[str, Any]:
    cat_ref = f"{category_table}.{category_col}"
    val_ref = f"{value_table}.{value_col}"
    selects = [_select_column(category_table, category_col)]
    if is_measure:
        selects.append(_select_measure(value_table, value_col))
    else:
        selects.append(_select_column(value_table, value_col))
    pq = _prototype_query(category_table, selects)
    cfg = _visual_config(
        "barChart",
        {"Category": [{"queryRef": cat_ref}], "Y": [{"queryRef": val_ref}]},
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def matrix_visual(
    x: int,
    y: int,
    w: int,
    h: int,
    row_table: str,
    row_col: str,
    col_table: str,
    col_col: str,
    value_table: str,
    value_col: str,
    title: str,
    is_measure: bool = True,
    z: int = 10,
) -> dict[str, Any]:
    row_ref = f"{row_table}.{row_col}"
    col_ref = f"{col_table}.{col_col}"
    val_ref = f"{value_table}.{value_col}"
    selects = [
        _select_column(row_table, row_col),
        _select_column(col_table, col_col),
    ]
    if is_measure:
        selects.append(_select_measure(value_table, value_col))
    else:
        selects.append(_select_column(value_table, value_col))
    pq = _prototype_query(row_table, selects)
    cfg = _visual_config(
        "matrix",
        {
            "Rows": [{"queryRef": row_ref}],
            "Columns": [{"queryRef": col_ref}],
            "Values": [{"queryRef": val_ref}],
        },
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def table_visual(
    x: int,
    y: int,
    w: int,
    h: int,
    columns: list[tuple[str, str]],
    title: str,
    z: int = 10,
) -> dict[str, Any]:
    if not columns:
        raise ValueError("columns required")
    table = columns[0][0]
    selects = [_select_column(t, c) for t, c in columns]
    projections = {"Values": [{"queryRef": f"{t}.{c}"} for t, c in columns]}
    pq = _prototype_query(table, selects)
    cfg = _visual_config("tableEx", projections, pq, title=title)
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def line_chart(
    x: int,
    y: int,
    w: int,
    h: int,
    category_table: str,
    category_col: str,
    legend_table: str,
    legend_col: str,
    value_table: str,
    value_col: str,
    title: str,
    is_measure: bool = False,
    z: int = 10,
) -> dict[str, Any]:
    cat_ref = f"{category_table}.{category_col}"
    leg_ref = f"{legend_table}.{legend_col}"
    val_ref = f"{value_table}.{value_col}"
    selects = [
        _select_column(category_table, category_col),
        _select_column(legend_table, legend_col),
    ]
    if is_measure:
        selects.append(_select_measure(value_table, value_col))
    else:
        selects.append(_select_column(value_table, value_col))
    pq = _prototype_query(category_table, selects)
    cfg = _visual_config(
        "lineChart",
        {
            "Category": [{"queryRef": cat_ref}],
            "Series": [{"queryRef": leg_ref}],
            "Y": [{"queryRef": val_ref}],
        },
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def treemap_visual(
    x: int,
    y: int,
    w: int,
    h: int,
    group_table: str,
    group_col: str,
    detail_table: str,
    detail_col: str,
    size_table: str,
    size_col: str,
    title: str,
    z: int = 10,
) -> dict[str, Any]:
    g_ref = f"{group_table}.{group_col}"
    d_ref = f"{detail_table}.{detail_col}"
    s_ref = f"{size_table}.{size_col}"
    pq = _prototype_query(
        group_table,
        [
            _select_column(group_table, group_col),
            _select_column(detail_table, detail_col),
            _select_column(size_table, size_col),
        ],
    )
    cfg = _visual_config(
        "treemap",
        {
            "Group": [{"queryRef": g_ref}],
            "Details": [{"queryRef": d_ref}],
            "Values": [{"queryRef": s_ref}],
        },
        pq,
        title=title,
    )
    return {"x": x, "y": y, "z": z, "width": w, "height": h, "config": cfg, "filters": "[]"}


def image_visual(
    x: int,
    y: int,
    w: int,
    h: int,
    image_name: str,
    title: str,
    z: int = 10,
) -> list[dict[str, Any]]:
    """Image visual + caption textbox."""
    payload = {
        "name": _uid(),
        "singleVisual": {
            "visualType": "image",
            "objects": {
                "general": [
                    {
                        "properties": {
                            "imageUrl": {
                                "expr": {
                                    "ResourcePackageItem": {
                                        "PackageName": "RegisteredResources",
                                        "PackageType": 1,
                                        "ItemName": image_name,
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            "drillFilterOtherVisuals": True,
            "vcObjects": {
                "title": [
                    {
                        "properties": {
                            "show": {"expr": {"Literal": {"Value": "true"}}},
                            "text": {"expr": {"Literal": {"Value": f"'{title}'"}}},
                            "fontColor": {
                                "solid": {
                                    "color": {"expr": {"Literal": {"Value": "'#1D3557'"}}}
                                }
                            },
                        }
                    }
                ],
                "dropShadow": [
                    {"properties": {"show": {"expr": {"Literal": {"Value": "true"}}}}}
                ],
            },
        },
    }
    return [
        {
            "x": x,
            "y": y,
            "z": z,
            "width": w,
            "height": h,
            "config": json.dumps(payload, separators=(",", ":")),
            "filters": "[]",
        }
    ]


def page_shell(
    name: str,
    display_name: str,
    visual_containers: list[dict[str, Any]],
    height: int = 720,
) -> dict:
    return {
        "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
        "name": name,
        "displayName": display_name,
        "displayOption": "FitToPage",
        "height": height,
        "width": 1280,
        "objects": {
            "background": [
                {
                    "properties": {
                        "color": {
                            "solid": {
                                "color": {"expr": {"Literal": {"Value": "'#F8FAFC'"}}}
                            }
                        },
                        "transparency": {"expr": {"Literal": {"Value": "0"}}},
                    }
                }
            ]
        },
        "visualContainers": visual_containers,
    }


def _page_chrome(title: str, subtitle: str) -> list[dict[str, Any]]:
    visuals: list[dict[str, Any]] = []
    visuals.extend(page_header(title, subtitle))
    visuals.extend(nav_buttons())
    visuals.extend(global_slicers())
    return visuals


def build_national_overview_page() -> dict:
    visuals = _page_chrome(
        "BarrierLens — National Overview",
        "NFHS-5 India | Stage 1 OOF barrier predictions | ML pipeline executive summary",
    )
    y_kpi = 188
    kpi_w = 200
    gap = 8
    xs = [16 + i * (kpi_w + gap) for i in range(6)]
    visuals.extend(
        [
            card_visual(xs[0], y_kpi, kpi_w, 88, "_Metrics", "Total Women Analysed", "Total Women Analysed"),
            card_visual(
                xs[1],
                y_kpi,
                kpi_w,
                88,
                "_Metrics",
                "Predicted Household Barrier Probability",
                "Household Barrier %",
            ),
            card_visual(
                xs[2],
                y_kpi,
                kpi_w,
                88,
                "_Metrics",
                "Predicted Logistical Barrier Probability",
                "Logistic Barrier %",
            ),
            card_visual(
                xs[3],
                y_kpi,
                kpi_w,
                88,
                "_Metrics",
                "Predicted Health Facility Barrier Probability",
                "Facility Barrier %",
            ),
            card_visual(
                xs[4],
                y_kpi,
                kpi_w,
                88,
                "_Metrics",
                "Mean Stage 2 ANC Prediction",
                "Mean Stage 2 ANC Prediction",
            ),
            card_visual(
                xs[5],
                y_kpi,
                kpi_w,
                88,
                "_Metrics",
                "Mean Unmet FP Prediction",
                "Mean Unmet FP Prediction",
            ),
            filled_map(
                16,
                292,
                420,
                396,
                "state_level_summary",
                "state_name",
                "_Metrics",
                "State Mean Predicted Composite Barrier",
                "India Risk Map — Mean Predicted Barrier %",
            ),
            donut_chart(
                448,
                292,
                380,
                396,
                "national_barrier_predicted_mix",
                "barrier_type",
                "national_barrier_predicted_mix",
                "value",
                "Barrier Distribution — Predicted Mix",
            ),
            clustered_bar(
                840,
                292,
                424,
                396,
                "national_barrier_long",
                "barrier_type",
                "national_barrier_long",
                "metric_type",
                "national_barrier_long",
                "value",
                "National Predicted vs Observed Barrier %",
            ),
        ]
    )
    return page_shell("NationalOverview", "1. National Overview", visuals)


def build_state_analysis_page() -> dict:
    visuals = _page_chrome(
        "State Analysis — Spatial Risk Profiling",
        "36 States & UTs | Ranked by mean predicted composite barrier score",
    )
    visuals.extend(
        [
            filled_map(
                16,
                188,
                520,
                300,
                "state_level_summary",
                "state_name",
                "_Metrics",
                "State Mean Predicted Composite Barrier",
                "India — Mean Predicted Barrier %",
            ),
            bar_chart_horizontal(
                552,
                188,
                360,
                300,
                "state_top10_long",
                "state_name",
                "state_top10_long",
                "pred_composite_barrier_score",
                "Top 10 High-Risk States",
                is_measure=False,
                z=20,
            ),
            bar_chart_horizontal(
                928,
                188,
                336,
                300,
                "state_bottom10_long",
                "state_name",
                "state_bottom10_long",
                "pred_composite_barrier_score",
                "Bottom 10 Low-Risk States",
                is_measure=False,
                z=20,
            ),
            table_visual(
                16,
                504,
                520,
                192,
                [
                    ("state_level_summary", "state_name"),
                    ("state_level_summary", "N"),
                    ("state_level_summary", "pred_composite_barrier_score"),
                    ("state_level_summary", "pred_household_prob"),
                    ("state_level_summary", "pred_logistic_prob"),
                    ("state_level_summary", "pred_facility_prob"),
                ],
                "State Ranking Table",
            ),
            clustered_bar(
                552,
                504,
                712,
                192,
                "state_barrier_long",
                "state_name",
                "state_barrier_long",
                "barrier_type",
                "state_barrier_long",
                "mean_predicted_prob",
                "Trend Bars — State × Barrier Type (Predicted)",
                is_measure=False,
            ),
        ]
    )
    return page_shell("StateAnalysis", "2. State Analysis", visuals)


def build_demographic_page() -> dict:
    visuals = _page_chrome(
        "Demographic Analysis — Equity Lens",
        "Observed any-barrier rate vs composite predicted score by population segment",
    )
    dim_specs = [
        ("demographic_education_long", "Education", 16, 188, 300, 196),
        ("demographic_wealth_long", "Wealth", 332, 188, 300, 196),
        ("demographic_religion_long", "Religion", 648, 188, 300, 196),
        ("demographic_residence_long", "Residence", 964, 188, 300, 196),
        ("demographic_occupation_long", "Occupation", 16, 400, 620, 148),
        ("demographic_caste_long", "Caste", 648, 400, 620, 148),
        ("demographic_age_group_long", "Age Group", 16, 564, 1248, 140),
    ]
    for table, dim, x, y, w, h in dim_specs:
        visuals.append(
            clustered_bar(
                x,
                y,
                w,
                h,
                table,
                "category",
                table,
                "metric_type",
                table,
                "value",
                f"{dim} — Observed vs Predicted",
            )
        )
    return page_shell("DemographicAnalysis", "3. Demographic Analysis", visuals)


def build_stage2_page() -> dict:
    visuals = _page_chrome(
        "Stage 2 Health Outcomes — Impact Modeling",
        "XGBoost outcome models | Unmet FP (N=466,859) | ANC gap when analytic sample available",
    )
    visuals.extend(
        [
            clustered_column(
                16,
                188,
                620,
                280,
                "stage2_outcome_long",
                "outcome",
                "stage2_outcome_long",
                "metric_type",
                "stage2_outcome_long",
                "value",
                "ANC Gap vs Unmet FP — Observed vs Predicted",
            ),
            line_chart(
                652,
                188,
                612,
                280,
                "stage2_outcome_long",
                "outcome",
                "stage2_outcome_long",
                "metric_type",
                "stage2_outcome_long",
                "value",
                "Stage 2 Outcome Trends",
            ),
            matrix_visual(
                16,
                484,
                1248,
                212,
                "stage2_outcome_long",
                "state_name",
                "stage2_outcome_long",
                "metric_type",
                "stage2_outcome_long",
                "value",
                "Heatmap — State × Metric Type (Predicted / Observed)",
                is_measure=False,
            ),
        ]
    )
    return page_shell("Stage2Outcomes", "4. Stage 2 Health Outcomes", visuals)


def build_cluster_page() -> dict:
    visuals = _page_chrome(
        "Cluster Analysis — Risk Archetypes",
        "K-Means (k=2) population segmentation from cluster profiles",
    )
    visuals.extend(
        [
            line_chart(
                16,
                188,
                400,
                280,
                "cluster_radar_long",
                "metric_label",
                "cluster_radar_long",
                "risk_tier",
                "cluster_radar_long",
                "value",
                "Cluster Profile — Radar View",
                is_measure=False,
            ),
            treemap_visual(
                432,
                188,
                400,
                280,
                "cluster_summary",
                "risk_tier",
                "cluster_summary",
                "archetype_name",
                "cluster_summary",
                "n_women",
                "Cluster Distribution — Women by Archetype",
            ),
            donut_chart(
                848,
                188,
                416,
                280,
                "cluster_summary",
                "archetype_name",
                "cluster_summary",
                "share_of_total",
                "Cluster Share of Total",
            ),
            clustered_column(
                16,
                484,
                620,
                212,
                "cluster_state_distribution",
                "state_name",
                "cluster_state_distribution",
                "risk_tier",
                "cluster_state_distribution",
                "n_women",
                "Stacked Bar — State-wise Cluster Distribution",
            ),
            table_visual(
                652,
                484,
                612,
                212,
                [
                    ("cluster_summary", "risk_tier"),
                    ("cluster_summary", "archetype_name"),
                    ("cluster_summary", "n_women"),
                    ("cluster_summary", "share_of_total"),
                    ("cluster_summary", "composite_barrier_score_mean"),
                ],
                "Cluster Profile Summary",
            ),
        ]
    )
    return page_shell("ClusterAnalysis", "5. Cluster Analysis", visuals)


def _model_performance_images() -> list[dict[str, Any]]:
    visuals: list[dict[str, Any]] = []
    if not IMAGES_DIR.is_dir():
        return visuals
    pngs = sorted(IMAGES_DIR.glob("*.png"))
    cols = 4
    img_w = 300
    img_h = 200
    x0, y0 = 16, 188
    gap_x, gap_y = 12, 12
    for idx, png in enumerate(pngs):
        row, col = divmod(idx, cols)
        x = x0 + col * (img_w + gap_x)
        y = y0 + row * (img_h + gap_y)
        title = IMAGE_TITLES.get(png.name, png.stem.replace("_", " ").title())
        visuals.extend(image_visual(x, y, img_w, img_h, png.name, title, z=10 + idx))
    return visuals


def build_model_performance_page() -> dict:
    visuals = _page_chrome(
        "Model Performance — Evaluation Gallery",
        "Stage 1 & Stage 2 ML pipeline diagnostics | All evaluation plots from outputs",
    )
    visuals.extend(_model_performance_images())
    rows = max(1, (len(list(IMAGES_DIR.glob("*.png"))) + 3) // 4) if IMAGES_DIR.is_dir() else 1
    height = max(720, 188 + rows * 212 + 32)
    return page_shell("ModelPerformance", "6. Model Performance", visuals, height=height)


def build_explainability_page() -> dict:
    visuals = _page_chrome(
        "Explainability — SHAP & Model Comparison",
        "Random Forest SHAP attributions | Stage 1 & Stage 2 model benchmarking",
    )
    visuals.extend(
        [
            bar_chart_horizontal(
                16,
                188,
                620,
                248,
                "shap_top20",
                "feature",
                "shap_top20",
                "mean_abs_shap",
                "Top 20 Features — Mean |SHAP|",
                is_measure=False,
            ),
            bar_chart_horizontal(
                16,
                448,
                620,
                256,
                "shap_importance",
                "feature",
                "shap_importance",
                "mean_abs_shap",
                "Feature Importance Ranking — Full SHAP Table",
                is_measure=False,
            ),
            table_visual(
                652,
                188,
                612,
                140,
                [
                    ("model_comparison_table", "Model"),
                    ("model_comparison_table", "Target"),
                    ("model_comparison_table", "Accuracy"),
                    ("model_comparison_table", "ROC-AUC"),
                    ("model_comparison_table", "F1-Score"),
                    ("model_comparison_table", "Barrier_Uplift"),
                ],
                "Model Comparison Table — Stage 2",
            ),
            table_visual(
                652,
                340,
                612,
                100,
                [
                    ("stage1_model_comparison", "Model"),
                    ("stage1_model_comparison", "Target"),
                    ("stage1_model_comparison", "ROC-AUC"),
                    ("stage1_model_comparison", "F1-Score"),
                ],
                "Model Comparison Table — Stage 1",
            ),
        ]
    )
    if (IMAGES_DIR / EXPLAINABILITY_IMAGES[0]).exists():
        visuals.extend(
            image_visual(652, 456, 612, 120, EXPLAINABILITY_IMAGES[0], "SHAP Bar — Stage 2 RF")
        )
    if (IMAGES_DIR / EXPLAINABILITY_IMAGES[1]).exists():
        visuals.extend(
            image_visual(652, 588, 300, 116, EXPLAINABILITY_IMAGES[1], "SHAP Beeswarm")
        )
    if (IMAGES_DIR / EXPLAINABILITY_IMAGES[2]).exists():
        visuals.extend(
            image_visual(964, 588, 300, 116, EXPLAINABILITY_IMAGES[2], "SHAP Group Comparison")
        )
    return page_shell("Explainability", "7. Explainability", visuals)


PAGE_BUILDERS = {
    "NationalOverview": build_national_overview_page,
    "StateAnalysis": build_state_analysis_page,
    "DemographicAnalysis": build_demographic_page,
    "Stage2Outcomes": build_stage2_page,
    "ClusterAnalysis": build_cluster_page,
    "ModelPerformance": build_model_performance_page,
    "Explainability": build_explainability_page,
}
