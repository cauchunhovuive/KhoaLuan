# -*- coding: utf-8 -*-
"""
Chuyển BAI_THUYET_TRINH_BAI_BAO_SESSION.md -> PowerPoint (.pptx)

Tái sử dụng toàn bộ engine render của tools/make_pptx.py (16:9, theme
branding, speaker notes nhúng vào Notes, tự co font / tách slide "(tiếp)").

Chạy (từ thư mục gốc dự án):
    .venv-pptx\\Scripts\\python.exe tools\\make_pptx_session.py
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import make_pptx as base
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "BAI_THUYET_TRINH_BAI_BAO_SESSION.md")
OUT = os.path.join(ROOT, "BAI_THUYET_TRINH_BAI_BAO_SESSION.pptx")
TMP = os.path.join(ROOT, "tools", "_tmp_session_prepared.md")

FOOTER_TEXT = "Thuyết trình bài báo — Session-Based Recommendation (HSP & RIC)"
TITLE_BOTTOM = "Thuyết trình bài báo khoa học · Đồ án tốt nghiệp"


# ---------------------------------------------------------- preprocessing
def preprocess_md(src: str, dst: str):
    """Chuẩn hóa markdown trước khi parse:
    - `\\|` trong bảng -> ký tự divides (∣) để không vỡ cột, hiển thị giống '|'
    - link markdown [text](url) -> chỉ giữ text (engine không render link)
    - các heading `# ` SAU tiêu đề đầu -> `## ` (chỉ slide bìa là title;
      engine parse_md không hỗ trợ bullets ngay dưới slide title)
    """
    with open(src, encoding="utf-8") as f:
        text = f.read()
    text = text.replace("\\|", "∣")
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)

    lines = text.split("\n")
    seen_title = False
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            if not seen_title:
                seen_title = True
            else:
                lines[i] = "##" + ln[1:]
    text = "\n".join(lines)

    with open(dst, "w", encoding="utf-8") as f:
        f.write(text)


# ---------------------------------------------------------- title slide
def render_title_session(prs, info):
    """Slide bìa riêng cho bài báo (khác dòng footer của bản kiến trúc)."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0,
                                Inches(base.SLIDE_W), Inches(base.SLIDE_H))
    bg.fill.solid()
    bg.fill.fore_color.rgb = base.PRIMARY_DARK
    bg.line.fill.background()

    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(5.9),
                                   Inches(base.SLIDE_W), Inches(0.08))
    strip.fill.solid()
    strip.fill.fore_color.rgb = base.EMERALD
    strip.line.fill.background()

    # Nhãn nhỏ phía trên
    tb0 = slide.shapes.add_textbox(Inches(0.9), Inches(1.35),
                                   Inches(base.SLIDE_W - 1.8), Inches(0.4))
    p0 = tb0.text_frame.paragraphs[0]
    p0.alignment = PP_ALIGN.CENTER
    base.add_run(p0, "PHẦN THUYẾT TRÌNH BÀI BÁO KHOA HỌC", size=13,
                 color=base.RGBColor(0x93, 0xC5, 0xFD), bold=True)

    # Tiêu đề
    tb = slide.shapes.add_textbox(Inches(0.9), Inches(1.95),
                                  Inches(base.SLIDE_W - 1.8), Inches(2.0))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    title = re.sub(r"^📖\s*", "", info["title"])  # bỏ emoji trang trí
    base.add_run(p, title, size=31, bold=True, color=base.WHITE)

    # Subtitle: trích dẫn bài báo + file cài đặt
    if info["subtitle"]:
        tb2 = slide.shapes.add_textbox(Inches(1.2), Inches(4.05),
                                       Inches(base.SLIDE_W - 2.4), Inches(1.7))
        tf2 = tb2.text_frame
        tf2.word_wrap = True
        for k, line in enumerate(info["subtitle"]):
            p2 = tf2.paragraphs[0] if k == 0 else tf2.add_paragraph()
            p2.alignment = PP_ALIGN.CENTER
            base.add_rich(p2, line, size=14, color=RGBColor(0xBF, 0xDB, 0xFE))

    # Dòng đáy
    tb3 = slide.shapes.add_textbox(Inches(0.9), Inches(6.35),
                                   Inches(base.SLIDE_W - 1.8), Inches(0.5))
    p3 = tb3.text_frame.paragraphs[0]
    p3.alignment = PP_ALIGN.CENTER
    base.add_run(p3, TITLE_BOTTOM, size=13, color=RGBColor(0x93, 0xC5, 0xFD))


# ---------------------------------------------------------- footer
def add_footer_session(slide, number):
    tb = slide.shapes.add_textbox(Inches(base.MARGIN),
                                  Inches(base.SLIDE_H - 0.34),
                                  Inches(9), Inches(0.3))
    p = tb.text_frame.paragraphs[0]
    base.add_run(p, FOOTER_TEXT, size=9, color=base.GRAY)
    if number is not None:
        tb2 = slide.shapes.add_textbox(Inches(base.SLIDE_W - 1.5),
                                       Inches(base.SLIDE_H - 0.34),
                                       Inches(1.05), Inches(0.3))
        p2 = tb2.text_frame.paragraphs[0]
        p2.alignment = PP_ALIGN.RIGHT
        base.add_run(p2, str(number), size=9, color=base.GRAY)


# ---------------------------------------------------------- main
def main():
    preprocess_md(SRC, TMP)
    try:
        slides_info = base.parse_md(TMP)
    finally:
        if os.path.exists(TMP):
            os.remove(TMP)

    # Đổi footer mặc định của engine bằng footer của bản bài báo
    base.add_footer = add_footer_session

    prs = Presentation()
    prs.slide_width = Inches(base.SLIDE_W)
    prs.slide_height = Inches(base.SLIDE_H)

    for info in slides_info:
        if info["kind"] == "title":
            render_title_session(prs, info)
            created = [prs.slides[-1]]
        else:
            created = base.render_content(prs, info)
        if info["notes"] and created:
            created[0].notes_slide.notes_text_frame.text = "\n".join(info["notes"])

    try:
        prs.save(OUT)
        print(f"OK {OUT}: {len(list(prs.slides))} slides")
    except PermissionError:
        # File đang mở trong PowerPoint -> lưu sang tên _v2
        alt = OUT.replace(".pptx", "_v2.pptx")
        prs.save(alt)
        print(f"OK {alt}: {len(list(prs.slides))} slides (file goc dang bi khoa)")


if __name__ == "__main__":
    main()
