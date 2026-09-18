# -*- coding: utf-8 -*-
"""
Chuyển BAI_THUYET_TRINH_KIEN_TRUC.md -> PowerPoint (.pptx)
- 16:9, theme theo branding dự án (primary #2563eb, emerald #059669)
- Ghi chú diễn giải (speaker notes) nhúng vào Notes của từng slide
- Nếu nội dung quá dài, tự động tách sang slide "(tiếp)"
"""
import math
import re

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION

SRC = "BAI_THUYET_TRINH_KIEN_TRUC.md"
OUT = "BAI_THUYET_TRINH_KIEN_TRUC.pptx"

PRIMARY = RGBColor(0x25, 0x63, 0xEB)
PRIMARY_DARK = RGBColor(0x1E, 0x3A, 0x8A)
EMERALD = RGBColor(0x05, 0x96, 0x69)
DARK = RGBColor(0x1F, 0x29, 0x37)
GRAY = RGBColor(0x64, 0x74, 0x8B)
LIGHT = RGBColor(0xF1, 0xF5, 0xF9)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
CODE_BG = RGBColor(0xF7, 0xF9, 0xFC)
BORDER = RGBColor(0xDD, 0xE3, 0xEC)

BODY_FONT = "Calibri"
MONO_FONT = "Consolas"

SLIDE_W = 13.333
SLIDE_H = 7.5
MARGIN = 0.45
CONTENT_TOP = 1.05
CONTENT_BOTTOM = 0.42
FOOTER_H = 0.30
AVAIL_H = SLIDE_H - CONTENT_TOP - CONTENT_BOTTOM - FOOTER_H  # 5.73
AVAIL_W = SLIDE_W - 2 * MARGIN  # 12.43

BODY_SIZE = 13
HEADING_SIZE = 16
CODE_SIZE = 11
TABLE_SIZE = 11
# Font tối thiểu khi slide quá dày (không nên đọc được dưới mức này)
BODY_MIN = 8.5
CODE_MIN = 6.5
TABLE_MIN = 7.5
HEADING_MIN = 13


# ---------------------------------------------------------------- parsing
def parse_md(path):
    with open(path, encoding="utf-8") as f:
        lines = f.read().split("\n")
    slides = []
    cur = None

    def new_content(title, number=None):
        return {"kind": "content", "number": number, "title": title,
                "blocks": [], "notes": []}

    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        s = line.strip()
        if s.startswith("# "):
            slides.append({"kind": "title", "title": s[2:].strip(),
                           "subtitle": [], "notes": []})
            cur = slides[-1]
            i += 1
            continue
        if s.startswith("## "):
            title = s[3:].strip()
            m = re.match(r"SLIDE (\d+) — (.+)", title)
            number = int(m.group(1)) if m else None
            cur = new_content(m.group(2) if m else title, number)
            slides.append(cur)
            i += 1
            continue
        if cur is None:
            i += 1
            continue
        if s.startswith("### "):
            heading = s[4:].strip()
            if "Ghi chú diễn giải" in heading:
                i += 1
                while i < n and lines[i].startswith("> "):
                    cur["notes"].append(lines[i][2:].strip())
                    i += 1
                continue
            cur["blocks"].append(("heading", heading))
            i += 1
            continue
        if s.startswith("> "):
            if cur["kind"] == "title":
                cur["subtitle"].append(s[2:].strip())
            else:
                cur["notes"].append(s[2:].strip())
            i += 1
            continue
        if s == "---" or s == "":
            i += 1
            continue
        if s.startswith("```"):
            i += 1
            code = []
            while i < n and not lines[i].startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1
            joined = "\n".join(code)
            fence = s[3:].strip()
            if fence.startswith("chart"):
                cur["blocks"].append(("chart", parse_chart(code)))
            elif fence.startswith("diagram"):
                name = fence.split("diagram", 1)[1].strip() or "architecture"
                cur["blocks"].append(("diagram", name))
            elif "NGƯỜI DÙNG" in joined and "FRONTEND" in joined:
                # Sơ đồ kiến trúc tổng thể (tự nhận diện ASCII) -> vẽ bằng shape
                cur["blocks"].append(("diagram", "architecture"))
            elif "ML SERVICE (FastAPI" in joined and "RAG" in joined:
                # Sơ đồ 7 nhóm ML service -> vẽ bằng shape
                cur["blocks"].append(("diagram", "mlservice"))
            else:
                cur["blocks"].append(("code", code))
            continue
        if s.startswith("|"):
            rows = []
            while i < n and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            parsed = [[c.strip() for c in r.strip().strip("|").split("|")]
                      for r in rows]
            header = parsed[0]
            data = [r for r in parsed[1:]
                    if not all(re.fullmatch(r"[-: ]+", c) for c in r)]
            cur["blocks"].append(("table", {"headers": header, "rows": data}))
            continue
        if s.startswith("- ") or s.startswith("* ") or s.startswith("– "):
            bullets = []
            while i < n and lines[i].strip() and (
                    lines[i].lstrip().startswith("- ")
                    or lines[i].lstrip().startswith("* ")
                    or lines[i].lstrip().startswith("– ")):
                raw = lines[i]
                indent = len(raw) - len(raw.lstrip())
                level = min(2, indent // 4)
                content = raw.lstrip()[2:].strip()
                bullets.append((level, content))
                i += 1
            cur["blocks"].append(("bullets", bullets))
            continue
        if cur["kind"] == "title":
            cur["subtitle"].append(s)
        else:
            cur["blocks"].append(("para", s))
        i += 1
    return slides


# ---------------------------------------------------------------- helpers
def add_run(p, text, size=BODY_SIZE, bold=False, color=DARK, font=BODY_FONT):
    r = p.add_run()
    r.text = text
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = color
    r.font.name = font
    return r


def add_rich(p, text, size=BODY_SIZE, color=DARK):
    parts = re.split(r"(\*\*.*?\*\*|`[^`]*`)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            add_run(p, part[2:-2], size=size, bold=True, color=color)
        elif part.startswith("`") and part.endswith("`"):
            add_run(p, part[1:-1], size=max(9, size - 1), color=PRIMARY,
                    font=MONO_FONT)
        else:
            add_run(p, part, size=size, color=color)


def estimate_lines(text, cpl):
    total = 0
    for chunk in text.split("\n"):
        total += max(1, math.ceil(len(chunk) / cpl))
    return total


def add_footer(slide, number):
    tb = slide.shapes.add_textbox(Inches(MARGIN), Inches(SLIDE_H - 0.34),
                                  Inches(8), Inches(0.3))
    p = tb.text_frame.paragraphs[0]
    add_run(p, "KhoaLuan — Hệ thống TMĐT 3 nhánh + AI", size=9, color=GRAY)
    if number is not None:
        tb2 = slide.shapes.add_textbox(Inches(SLIDE_W - 1.5),
                                       Inches(SLIDE_H - 0.34),
                                       Inches(1.05), Inches(0.3))
        p2 = tb2.text_frame.paragraphs[0]
        p2.alignment = PP_ALIGN.RIGHT
        add_run(p2, str(number), size=9, color=GRAY)


# ---------------------------------------------------------------- slides
def render_title(prs, info):
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
    # background
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0,
                                Inches(SLIDE_W), Inches(SLIDE_H))
    bg.fill.solid()
    bg.fill.fore_color.rgb = PRIMARY_DARK
    bg.line.fill.background()
    # accent strip
    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(5.9),
                                   Inches(SLIDE_W), Inches(0.08))
    strip.fill.solid()
    strip.fill.fore_color.rgb = EMERALD
    strip.line.fill.background()

    # title
    tb = slide.shapes.add_textbox(Inches(0.9), Inches(2.1),
                                  Inches(SLIDE_W - 1.8), Inches(1.9))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    add_run(p, info["title"], size=34, bold=True, color=WHITE)

    # subtitle (Đề tài)
    if info["subtitle"]:
        tb2 = slide.shapes.add_textbox(Inches(1.2), Inches(4.15),
                                       Inches(SLIDE_W - 2.4), Inches(1.4))
        tf2 = tb2.text_frame
        tf2.word_wrap = True
        for k, line in enumerate(info["subtitle"]):
            p2 = tf2.paragraphs[0] if k == 0 else tf2.add_paragraph()
            p2.alignment = PP_ALIGN.CENTER
            add_rich(p2, line, size=15, color=RGBColor(0xBF, 0xDB, 0xFE))

    # bottom line
    tb3 = slide.shapes.add_textbox(Inches(0.9), Inches(6.6),
                                   Inches(SLIDE_W - 1.8), Inches(0.5))
    p3 = tb3.text_frame.paragraphs[0]
    p3.alignment = PP_ALIGN.CENTER
    add_run(p3, "Đồ án tốt nghiệp", size=13, color=RGBColor(0x93, 0xC5, 0xFD))


def col_widths(headers, rows, total=AVAIL_W):
    n = len(headers)
    lens = [len(h) for h in headers]
    for r in rows:
        for j in range(min(n, len(r))):
            lens[j] = max(lens[j], len(r[j]))
    total_len = sum(lens) or 1
    return [Emu(int(Inches(total) * (l / total_len))) for l in lens]


def estimate_block_height(block, body_size, code_size, table_size):
    """Ước tính chiều cao thực tế (inch) dựa trên font size thật."""
    if block[0] == "heading":
        return 0.34
    if block[0] == "para":
        return max(0.26, estimate_lines(block[1], 110) *
                   (body_size * 1.30 / 72) + 0.06)
    if block[0] == "bullets":
        h = 0.0
        for lvl, text in block[1]:
            h += max(1, math.ceil((len(text) + 4) / 105)) * (body_size * 1.30 / 72)
        return max(0.2, h + 0.06)
    if block[0] == "code":
        return len(block[1]) * (code_size * 1.32 / 72) + 0.3
    if block[0] == "table":
        row_h = 0.26 if table_size <= 8.5 else (0.30 if table_size <= 10 else 0.34)
        return (1 + len(block[1]["rows"])) * row_h + 0.1
    if block[0] == "chart":
        return 4.0
    if block[0] == "diagram":
        return 5.6 if block[1] == "architecture" else 5.3
    return 0.3


def _est_height(blocks, scale):
    """Chiều cao ước tính của blocks tại một tỉ lệ scale nhất định."""
    body = max(BODY_MIN, BODY_SIZE * scale)
    code = max(CODE_MIN, CODE_SIZE * scale)
    table = max(TABLE_MIN, TABLE_SIZE * scale)
    return sum(estimate_block_height(b, body, code, table) for b in blocks)


def compute_scale(blocks):
    """Binary search: tìm scale lớn nhất (trong [0.55, 1.0]) sao cho nội dung
    vừa khít slide. Ước tính chiều cao tăng đơn điệu theo scale."""
    if _est_height(blocks, 1.0) <= AVAIL_H:
        return 1.0
    lo, hi = 0.55, 1.0
    for _ in range(20):
        mid = (lo + hi) / 2
        if _est_height(blocks, mid) <= AVAIL_H:
            lo = mid
        else:
            hi = mid
    return lo


def chunk_blocks(blocks):
    """Chia blocks thành nhiều chunk, mỗi chunk vừa khít 1 slide.

    Dùng font tối thiểu để ước tính — nếu tổng chiều cao vượt AVAIL_H
    thì bắt đầu chunk mới. Một block duy nhất quá lớn (sơ đồ dài) vẫn
    được giữ nguyên 1 chunk (co font theo compute_scale).
    """
    chunks = []
    cur = []
    cur_est = 0.0
    for b in blocks:
        b_est = estimate_block_height(b, BODY_MIN, CODE_MIN, TABLE_MIN)
        if cur and cur_est + b_est > AVAIL_H + 0.05:
            chunks.append(cur)
            cur = [b]
            cur_est = b_est
        else:
            cur.append(b)
            cur_est += b_est
    if cur:
        chunks.append(cur)
    return chunks


# ---------------------------------------------------------------- charts + diagrams
def parse_chart(lines):
    """Parse nội dung code fence `chart` -> {type, title, rows:[(label, value)]}"""
    info = {"type": "column", "title": "", "rows": []}
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if ":" in s and s.split(":", 1)[0].strip() in ("type", "title"):
            k, v = s.split(":", 1)
            info[k.strip()] = v.strip()
        elif "|" in s:
            parts = s.split("|")
            try:
                info["rows"].append((parts[0].strip(), float(parts[1].strip())))
            except (ValueError, IndexError):
                continue
    return info


CHART_TYPES = {
    "column": XL_CHART_TYPE.COLUMN_CLUSTERED,
    "bar": XL_CHART_TYPE.BAR_CLUSTERED,
    "pie": XL_CHART_TYPE.PIE,
    "line": XL_CHART_TYPE.LINE,
}


def render_chart(slide, info, x, y, w):
    """Vẽ biểu đồ native PowerPoint (có thể chỉnh sửa trong PPT)."""
    h = 4.0
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(0.34))
    p = tb.text_frame.paragraphs[0]
    add_run(p, info["title"], size=14, bold=True, color=PRIMARY_DARK)

    chart_type = CHART_TYPES.get(info["type"], XL_CHART_TYPE.COLUMN_CLUSTERED)
    cdata = CategoryChartData()
    cdata.categories = [r[0] for r in info["rows"]]
    cdata.add_series("Giá trị", [r[1] for r in info["rows"]])
    cy = y + 0.4
    gframe = slide.shapes.add_chart(chart_type, Inches(x), Inches(cy),
                                    Inches(w), Inches(h - 0.5), cdata)
    chart = gframe.chart
    chart.has_title = False
    chart.has_legend = chart_type == XL_CHART_TYPE.PIE
    if chart_type == XL_CHART_TYPE.PIE:
        chart.legend.position = XL_LEGEND_POSITION.RIGHT

    plot = chart.plots[0]
    values = [r[1] for r in info["rows"]]
    try:
        if chart_type in (XL_CHART_TYPE.COLUMN_CLUSTERED,
                          XL_CHART_TYPE.BAR_CLUSTERED):
            plot.gap_width = 80
            plot.has_data_labels = True
            dl = plot.data_labels
            dl.number_format = "0.0%" if all(v < 1 for v in values) else "#,##0"
            dl.number_format_is_linked = False
            try:
                dl.font.size = Pt(9)
            except Exception:
                pass
        elif chart_type == XL_CHART_TYPE.PIE:
            plot.has_data_labels = True
            dl = plot.data_labels
            dl.show_percentage = True
            dl.number_format = "0.0%"
            dl.number_format_is_linked = False
    except Exception:
        pass
    try:
        series = plot.series[0]
        series.format.fill.solid()
        series.format.fill.fore_color.rgb = PRIMARY
    except Exception:
        pass
    try:
        chart.category_axis.tick_labels.font.size = Pt(9)
        chart.value_axis.tick_labels.font.size = Pt(9)
        chart.value_axis.has_major_gridlines = False
    except Exception:
        pass
    return h


def _add_box(slide, x, y, w, h, title, subs=(), fill=PRIMARY_DARK,
             text_color=WHITE, title_size=12, sub_size=9.5,
             shape=MSO_SHAPE.ROUNDED_RECTANGLE):
    box = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    box.fill.solid()
    box.fill.fore_color.rgb = fill
    box.line.color.rgb = RGBColor(0xC7, 0xD5, 0xE8)
    box.line.width = Pt(0.75)
    box.shadow.inherit = False
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.08)
    tf.margin_right = Inches(0.08)
    tf.margin_top = Inches(0.03)
    tf.margin_bottom = Inches(0.03)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    add_run(p, title, size=title_size, bold=True, color=text_color)
    for s in subs:
        if not s:
            continue
        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        add_run(p2, s, size=sub_size, color=text_color)
    return box


def _add_arrow(slide, cx, y1, y2, color=GRAY):
    a = slide.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(cx - 0.11),
                               Inches(y1), Inches(0.22), Inches(max(0.14, y2 - y1)))
    a.fill.solid()
    a.fill.fore_color.rgb = color
    a.line.fill.background()
    a.shadow.inherit = False
    return a


def render_diagram_architecture(slide, x, y, w):
    """Sơ đồ kiến trúc tổng thể 3 tầng (thay ASCII)."""
    bw = (w - 0.6) / 3
    # ---- NGƯỜI DÙNG container
    cont = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y),
                                  Inches(w), Inches(1.02))
    cont.fill.solid()
    cont.fill.fore_color.rgb = RGBColor(0xEA, 0xF0, 0xFD)
    cont.line.color.rgb = BORDER
    cont.line.width = Pt(0.75)
    cont.shadow.inherit = False
    tb = slide.shapes.add_textbox(Inches(x + 0.15), Inches(y + 0.03),
                                  Inches(4), Inches(0.24))
    p = tb.text_frame.paragraphs[0]
    add_run(p, "NGƯỜI DÙNG", size=9, bold=True, color=GRAY)

    names = [("Admin", "Quản trị hệ thống"), ("Partner", "Nhà bán hàng"),
             ("Customer", "Người mua")]
    fills = [PRIMARY, RGBColor(0xD9, 0x77, 0x06), EMERALD]
    uy = y + 0.32
    uh = 0.6
    for k, ((t, s), f) in enumerate(zip(names, fills)):
        _add_box(slide, x + 0.2 + k * (bw + 0.1), uy, bw, uh, t, (s,),
                 fill=f, title_size=12, sub_size=9.5)

    _add_arrow(slide, x + w / 2, y + 1.05, y + 1.34)
    # ---- FRONTEND
    fy = y + 1.38
    fh = 0.85
    _add_box(slide, x, fy, w, fh, "FRONTEND — 2 client",
             ("Web: React 18 + Vite + Tailwind (port 3000)",
              "Mobile: React Native + Expo (iOS / Android)"),
             fill=PRIMARY_DARK, title_size=13, sub_size=9.5)
    # ---- arrow + label
    y1 = fy + fh
    y2 = y1 + 0.28
    _add_arrow(slide, x + w / 2, y1, y2)
    lbl = slide.shapes.add_textbox(Inches(x + w / 2 + 0.28), Inches(y1 + 0.02),
                                   Inches(4.2), Inches(0.26))
    p = lbl.text_frame.paragraphs[0]
    add_run(p, "HTTP/JSON + JWT (Bearer token)", size=8.5, color=GRAY,
            font=MONO_FONT)
    # ---- BACKEND
    by = y2 + 0.04
    bh = 0.95
    _add_box(slide, x, by, w, bh, "BACKEND API (port 5000)",
             ("Node.js + Express + Prisma ORM · JWT · Redis · Helmet",
              "25 controllers · 26 route files · middleware bảo mật"),
             fill=PRIMARY_DARK, title_size=13, sub_size=9.5)
    # ---- 3 arrows down
    y1 = by + bh
    y2 = y1 + 0.28
    for cx in (x + bw / 2 + 0.2, x + w / 2, x + w - (bw / 2 + 0.2)):
        _add_arrow(slide, cx, y1, y2)
    # ---- data boxes
    dy = y2 + 0.04
    dh = 0.95
    boxes = [("PostgreSQL 15", ("Dữ liệu chính · 20+ models",),
              RGBColor(0x33, 0x46, 0x5D)),
             ("Redis 7", ("Cache API · refresh token",),
              RGBColor(0x33, 0x46, 0x5D)),
             ("ML SERVICE (8000)", ("FastAPI · Python", "AI/ML + RAG"), EMERALD)]
    for k, (t, s, f) in enumerate(boxes):
        _add_box(slide, x + 0.2 + k * (bw + 0.1), dy, bw, dh, t, s,
                 fill=f, title_size=12, sub_size=9.5)
    # ---- arrow ML -> Ollama
    y1 = dy + dh
    y2 = y1 + 0.26
    _add_arrow(slide, x + w - (bw / 2 + 0.2), y1, y2)
    # ---- Ollama
    oy = y2 + 0.04
    _add_box(slide, x + w - (bw + 0.4), oy, bw + 0.2, 0.55,
             "Ollama — llama3.2:3b (LLM local) + ChromaDB",
             fill=DARK, title_size=11)
    return (oy + 0.59) - y


def render_diagram_mlservice(slide, x, y, w):
    """Sơ đồ 7 nhóm mô hình ML Service (thay ASCII)."""
    cont_h = 5.2
    cont = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y),
                                  Inches(w), Inches(cont_h))
    cont.fill.solid()
    cont.fill.fore_color.rgb = RGBColor(0xF7, 0xF9, 0xFC)
    cont.line.color.rgb = BORDER
    cont.line.width = Pt(1)
    cont.shadow.inherit = False
    tb = slide.shapes.add_textbox(Inches(x + 0.25), Inches(y + 0.08),
                                  Inches(w - 0.5), Inches(0.34))
    p = tb.text_frame.paragraphs[0]
    add_run(p, "ML SERVICE (FastAPI · port 8000)", size=14, bold=True,
            color=PRIMARY_DARK)

    bw = (w - 0.9) / 3
    groups = [
        ("1. Session-based", ("Co-occurrence", "Sequence Pred",
                               "HSP · RIC / RIC-CiL"), PRIMARY),
        ("2. Collaborative", ("Item-Item · User-User", "ALS Matrix · Hybrid",
                               ""), RGBColor(0x7C, 0x3A, 0xED)),
        ("3. Graph-based", ("Graph CF (nhẹ)", "LightGCN-CF",
                             "(PyTorch, BPR)"), EMERALD),
        ("4. Clustering", ("RFM + K-Means", "4 cụm khách hàng", ""),
         RGBColor(0xD9, 0x77, 0x06)),
        ("5. A/B Testing", ("Log → Compare", "→ Report", ""),
         RGBColor(0xDB, 0x27, 0x77)),
        ("6. Evaluation", ("Precision · Recall", "NDCG · Coverage", ""),
         RGBColor(0x0D, 0x94, 0x88)),
    ]
    gy = y + 0.52
    gh = 1.42
    for k, (t, s, f) in enumerate(groups):
        row, col = divmod(k, 3)
        bx = x + 0.2 + col * (bw + 0.25)
        by = gy + row * (gh + 0.22)
        _add_box(slide, bx, by, bw, gh, t, s, fill=f, title_size=11.5, sub_size=9)
    ry = gy + 2 * (gh + 0.22) + 0.1
    rh = cont_h - (ry - y) - 0.15
    _add_box(slide, x + 0.2, ry, w - 0.4, rh,
             "7. RAG Chatbot — ChromaDB + sentence-transformers + Ollama llama3.2:3b / Groq",
             ("Knowledge Base: sản phẩm · danh mục · chính sách · FAQ · hướng dẫn",
              "3 cấp fallback: Groq → Ollama local → keyword matching"),
             fill=DARK, title_size=12, sub_size=9.5)
    return cont_h


def render_content(prs, info):
    chunks = chunk_blocks(info["blocks"])
    n_chunks = len(chunks)
    slides = []

    for ci, chunk in enumerate(chunks):
        slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank

        # --- tính tỉ lệ co để vừa slide (vòng lặp hội tụ theo font thật)
        scale = compute_scale(chunk)
        body = max(BODY_MIN, BODY_SIZE * scale)
        heading = max(HEADING_MIN, HEADING_SIZE * scale)
        code = max(CODE_MIN, CODE_SIZE * scale)
        table = max(TABLE_MIN, TABLE_SIZE * scale)

        # --- header bar
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0,
                                     Inches(SLIDE_W), Inches(0.95))
        bar.fill.solid()
        bar.fill.fore_color.rgb = PRIMARY_DARK
        bar.line.fill.background()
        strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(0.95),
                                       Inches(SLIDE_W), Inches(0.06))
        strip.fill.solid()
        strip.fill.fore_color.rgb = EMERALD
        strip.line.fill.background()

        title = info["title"]
        if n_chunks > 1 and ci > 0:
            title += " (tiếp)"
        tb = slide.shapes.add_textbox(Inches(MARGIN), Inches(0.14),
                                      Inches(SLIDE_W - 2 * MARGIN), Inches(0.75))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        add_run(p, title, size=24, bold=True, color=WHITE)

        # --- body
        y = CONTENT_TOP
        x = MARGIN
        w = AVAIL_W
        for block in chunk:
            kind = block[0]
            if kind == "heading":
                h = estimate_block_height(block, body, code, table)
                tbx = slide.shapes.add_textbox(Inches(x), Inches(y),
                                               Inches(w), Inches(h))
                p = tbx.text_frame.paragraphs[0]
                add_rich(p, block[1], size=heading, color=PRIMARY)
                if p.runs:
                    p.runs[0].font.bold = True
                y += h
            elif kind == "para":
                h = estimate_block_height(block, body, code, table)
                tbx = slide.shapes.add_textbox(Inches(x), Inches(y),
                                               Inches(w), Inches(h + 0.05))
                tbx.text_frame.word_wrap = True
                p = tbx.text_frame.paragraphs[0]
                add_rich(p, block[1], size=body)
                y += h
            elif kind == "bullets":
                h = estimate_block_height(block, body, code, table)
                tbx = slide.shapes.add_textbox(Inches(x), Inches(y),
                                               Inches(w), Inches(h + 0.05))
                tf = tbx.text_frame
                tf.word_wrap = True
                for k, (lvl, text) in enumerate(block[1]):
                    p = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
                    prefix = "• " if lvl == 0 else "    – "
                    if lvl > 0:
                        p.level = 1
                    add_rich(p, prefix + text, size=body)
                y += h
            elif kind == "code":
                h = estimate_block_height(block, body, code, table)
                box = slide.shapes.add_shape(
                    MSO_SHAPE.RECTANGLE, Inches(x), Inches(y),
                    Inches(w), Inches(h))
                box.fill.solid()
                box.fill.fore_color.rgb = CODE_BG
                box.line.color.rgb = BORDER
                box.line.width = Pt(0.75)
                tbx = slide.shapes.add_textbox(Inches(x + 0.12), Inches(y + 0.08),
                                               Inches(w - 0.24), Inches(h - 0.14))
                tbx.text_frame.word_wrap = False
                for k, line in enumerate(block[1]):
                    p = tbx.text_frame.paragraphs[0] if k == 0 \
                        else tbx.text_frame.add_paragraph()
                    add_run(p, line if line else " ", size=code, font=MONO_FONT,
                            color=DARK)
                y += h + 0.08
            elif kind == "chart":
                h = render_chart(slide, block[1], x, y, w)
                y += h + 0.1
            elif kind == "diagram":
                if block[1] == "architecture":
                    h = render_diagram_architecture(slide, x, y, w)
                else:
                    h = render_diagram_mlservice(slide, x, y, w)
                y += h + 0.1
            elif kind == "table":
                headers = block[1]["headers"]
                rows = block[1]["rows"]
                widths = col_widths(headers, rows)
                row_h = 0.26 if table <= 8.5 else (0.30 if table <= 10 else 0.34)
                h = (1 + len(rows)) * row_h
                shape = slide.shapes.add_table(1 + len(rows), len(headers),
                                               Inches(x), Inches(y),
                                               Inches(w), Inches(h))
                tbl = shape.table
                tbl.first_row = False
                tbl.horz_banding = False
                for j, cw in enumerate(widths):
                    tbl.columns[j].width = cw
                tbl.rows[0].height = Inches(row_h + 0.04)

                def fill_cell(cell, text, header=False, bg=None):
                    cell.margin_left = Inches(0.06)
                    cell.margin_right = Inches(0.06)
                    cell.margin_top = Inches(0.02)
                    cell.margin_bottom = Inches(0.02)
                    cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = bg or WHITE
                    tf_ = cell.text_frame
                    tf_.word_wrap = True
                    p = tf_.paragraphs[0]
                    add_rich(p, text, size=table,
                             color=WHITE if header else DARK)
                    if header:
                        p.runs[0].font.bold = True

                for j, htxt in enumerate(headers):
                    fill_cell(tbl.cell(0, j), htxt, header=True, bg=PRIMARY)
                for ri, row in enumerate(rows):
                    bg = LIGHT if ri % 2 == 0 else WHITE
                    for j in range(len(headers)):
                        txt = row[j] if j < len(row) else ""
                        fill_cell(tbl.cell(ri + 1, j), txt, bg=bg)
                y += h + 0.1

        add_footer(slide, info["number"])
        slides.append(slide)

    return slides


def main():
    slides_info = parse_md(SRC)
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W)
    prs.slide_height = Inches(SLIDE_H)

    for info in slides_info:
        if info["kind"] == "title":
            render_title(prs, info)
            created = [prs.slides[-1]]
        else:
            created = render_content(prs, info)
        if info["notes"] and created:
            notes = "\n".join(info["notes"])
            created[0].notes_slide.notes_text_frame.text = notes

    prs.save(OUT)
    print(f"OK {OUT}: {len(list(prs.slides))} slides")


if __name__ == "__main__":
    main()
