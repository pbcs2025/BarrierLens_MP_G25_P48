"""
Build Complete Chapter 5 Implementation Deliverables for Major Project Report (P48).
Generates:
1. reports/Chapter_5_Implementation.docx
2. reports/Chapter_5_Implementation.md
3. reports/Chapter_5_Source_Audit.md
"""

import sys
import os
from pathlib import Path
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

DOCX_PATH = REPORTS_DIR / "Chapter_5_Implementation.docx"
MD_PATH = REPORTS_DIR / "Chapter_5_Implementation.md"
AUDIT_PATH = REPORTS_DIR / "Chapter_5_Source_Audit.md"

# Style Helpers for Word Document
def set_cell_shading(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def style_table(table, col_widths=None):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Header row styling
    hdr_cells = table.rows[0].cells
    for i, cell in enumerate(hdr_cells):
        set_cell_shading(cell, "1D3557") # Dark navy header
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.font.size = Pt(9)
            run.font.name = "Arial"
    
    # Body row styling
    for r_idx, row in enumerate(table.rows[1:], start=1):
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for i, cell in enumerate(row.cells):
            set_cell_shading(cell, bg_color)
            p = cell.paragraphs[0]
            for run in p.runs:
                run.font.size = Pt(8.5)
                run.font.name = "Arial"
                run.font.color.rgb = RGBColor(15, 23, 42)
            if col_widths and i < len(col_widths):
                cell.width = Inches(col_widths[i])

print("Building Chapter 5 Implementation Document...")
