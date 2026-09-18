# -*- coding: utf-8 -*-
"""
Gộp slide bài báo session vào CUỐI deck kiến trúc chung.

Input:
    Kien_truc_he_thong.pptx                       (deck kiến trúc — giữ nguyên)
    BAI_THUYET_TRINH_BAI_BAO_SESSION[_v2].pptx    (deck bài báo, tự chọn file mới nhất)

Output:
    BAI_THUYET_TRINH_TONG_HOP.pptx
    = 32 slides kiến trúc + 1 slide chuyển phần + toàn bộ slides bài báo

Chạy (từ thư mục gốc dự án):
    .venv-pptx\\Scripts\\python.exe tools\\merge_pptx_session.py
"""
import copy
import os
import sys

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.opc.constants import RELATIONSHIP_TYPE as RT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_PPTX = os.path.join(ROOT, "Kien_truc_he_thong.pptx")
SESSION_CANDIDATES = [
    os.path.join(ROOT, "BAI_THUYET_TRINH_BAI_BAO_SESSION_v2.pptx"),
    os.path.join(ROOT, "BAI_THUYET_TRINH_BAI_BAO_SESSION.pptx"),
]
OUT = os.path.join(ROOT, "BAI_THUYET_TRINH_TONG_HOP.pptx")

R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

PRIMARY_DARK = RGBColor(0x1E, 0x3A, 0x8A)
EMERALD = RGBColor(0x10, 0xB9, 0x81)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BLUE = RGBColor(0x93, 0xC5, 0xFD)
PALE_BLUE = RGBColor(0xBF, 0xDB, 0xFE)

SLIDE_W = 13.333
SLIDE_H = 7.5


def newest_session_pptx():
    existing = [p for p in SESSION_CANDIDATES if os.path.exists(p)]
    if not existing:
        raise SystemExit("Khong tim thay file pptx bai bao session!")
    # Chon file moi nhat theo thoi gian sua (file _v2 xuat hien khi file goc bi khoa)
    return max(existing, key=os.path.getmtime)


def add_divider_slide(prs):
    """Slide chuyển phần: kiến trúc -> bài báo (nền xanh đậm như slide bìa)."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])

    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0,
                                Inches(SLIDE_W), Inches(SLIDE_H))
    bg.fill.solid()
    bg.fill.fore_color.rgb = PRIMARY_DARK
    bg.line.fill.background()

    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(5.9),
                                   Inches(SLIDE_W), Inches(0.08))
    strip.fill.solid()
    strip.fill.fore_color.rgb = EMERALD
    strip.line.fill.background()

    tb0 = slide.shapes.add_textbox(Inches(0.9), Inches(1.35),
                                   Inches(SLIDE_W - 1.8), Inches(0.4))
    p0 = tb0.text_frame.paragraphs[0]
    p0.alignment = PP_ALIGN.CENTER
    run = p0.add_run()
    run.text = "PHẦN 2 — THUYẾT TRÌNH BÀI BÁO KHOA HỌC"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = LIGHT_BLUE

    tb = slide.shapes.add_textbox(Inches(0.9), Inches(1.95),
                                  Inches(SLIDE_W - 1.8), Inches(2.0))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = "Session-Based Recommendation (HSP & RIC)"
    run.font.size = Pt(30)
    run.font.bold = True
    run.font.color.rgb = WHITE

    tb2 = slide.shapes.add_textbox(Inches(1.2), Inches(4.05),
                                   Inches(SLIDE_W - 2.4), Inches(1.3))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    for k, line in enumerate([
        "Bài báo: Delianidi, O. và cộng sự — “Session-Based Recommendations for "
        "e-Commerce with Graph-Based Data Modeling”",
        "Applied Sciences 2023, 13(1), 394 · DOI: 10.3390/app13010394",
    ]):
        p2 = tf2.paragraphs[0] if k == 0 else tf2.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        run = p2.add_run()
        run.text = line
        run.font.size = Pt(13)
        run.font.color.rgb = PALE_BLUE

    tb3 = slide.shapes.add_textbox(Inches(0.9), Inches(6.35),
                                   Inches(SLIDE_W - 1.8), Inches(0.5))
    p3 = tb3.text_frame.paragraphs[0]
    p3.alignment = PP_ALIGN.CENTER
    run = p3.add_run()
    run.text = "Cài đặt: backend/ml/session · Demo live: python -m session.demo_paper"
    run.font.size = Pt(12)
    run.font.color.rgb = LIGHT_BLUE

    return slide


def clone_slide(prs, src_slide):
    """Chép 1 slide từ package khác sang prs (blank layout), giữ shapes + rels + notes."""
    new_slide = prs.slides.add_slide(prs.slide_layouts[6])

    # 1) Background tường minh (nếu slide nguồn có <p:bg>)
    src_cSld = src_slide._element.cSld
    bg_el = src_cSld.find(
        "{http://schemas.openxmlformats.org/presentationml/2006/main}bg")
    if bg_el is not None:
        new_cSld = new_slide._element.cSld
        new_cSld.insert(0, copy.deepcopy(bg_el))

    # 2) Chép toàn bộ shapes
    for shape in src_slide.shapes:
        new_slide.shapes._spTree.append(copy.deepcopy(shape._element))

    # 3) Chép quan hệ (bỏ layout & notesSlide — notes chép tay bên dưới)
    mapping = {}
    for rId, rel in list(src_slide.part.rels.items()):
        if rel.reltype in (RT.SLIDE_LAYOUT, RT.NOTES_SLIDE):
            continue
        if rel.is_external:
            new_rid = new_slide.part.rels.get_or_add_ext_rel(
                rel.reltype, rel.target_ref)
        else:
            new_rid = new_slide.part.relate_to(rel.target_part, rel.reltype)
        if new_rid != rId:
            mapping[rId] = new_rid

    # 4) Đổi rId trong XML cho khớp mapping mới (ảnh, hyperlink, ...)
    if mapping:
        for el in new_slide._element.iter():
            for attr in list(el.attrib):
                if attr.startswith("{%s}" % R_NS):
                    old = el.attrib[attr]
                    if old in mapping:
                        el.attrib[attr] = mapping[old]

    # 5) Speaker notes
    if src_slide.has_notes_slide:
        text = src_slide.notes_slide.notes_text_frame.text
        if text.strip():
            new_slide.notes_slide.notes_text_frame.text = text

    return new_slide


def main():
    session_pptx = newest_session_pptx()
    print(f"Deck goc   : {os.path.basename(BASE_PPTX)}")
    print(f"Deck bai bao: {os.path.basename(session_pptx)}")

    prs = Presentation(BASE_PPTX)
    n_base = len(prs.slides._sldIdLst)

    add_divider_slide(prs)

    src = Presentation(session_pptx)
    for src_slide in src.slides:
        clone_slide(prs, src_slide)

    n_total = len(prs.slides._sldIdLst)
    try:
        prs.save(OUT)
    except PermissionError:
        alt = OUT.replace(".pptx", "_v2.pptx")
        prs.save(alt)
        print(f"!!! File dich dang bi khoa -> da luu sang {alt}")
        OUT_v2 = alt
    else:
        OUT_v2 = OUT

    print(f"OK {OUT_v2}: {n_total} slides "
          f"({n_base} kien truc + 1 chuyen phan + {n_total - n_base - 1} bai bao)")


if __name__ == "__main__":
    main()
