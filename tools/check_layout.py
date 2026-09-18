# -*- coding: utf-8 -*-
"""Kiểm tra layout: ước tính chiều cao từng chunk, báo chunk có nguy cơ tràn."""
import sys

sys.path.insert(0, "tools")
from make_pptx import (parse_md, estimate_block_height, compute_scale,
                       chunk_blocks, BODY_MIN, CODE_MIN, TABLE_MIN,
                       BODY_SIZE, CODE_SIZE, TABLE_SIZE, AVAIL_H)

slides = parse_md("BAI_THUYET_TRINH_KIEN_TRUC.md")

print(f"{'Slide':<6s} {'chunk':<5s} {'scale':>5s} {'body':>5s} {'code':>5s} "
      f"{'used':>6s}  title")
for s in slides:
    if s["kind"] != "content":
        continue
    chunks = chunk_blocks(s["blocks"])
    for ci, chunk in enumerate(chunks):
        scale = compute_scale(chunk)
        body = max(BODY_MIN, BODY_SIZE * scale)
        code = max(CODE_MIN, CODE_SIZE * scale)
        table = max(TABLE_MIN, TABLE_SIZE * scale)
        est = sum(estimate_block_height(b, body, code, table) for b in chunk)
        flag = " <-- TIGHT" if est > AVAIL_H - 0.1 else ""
        chunk_label = f"{ci + 1}/{len(chunks)}"
        print(f"{str(s['number'] or ''):<6s} {chunk_label:<5s} {scale:5.2f} "
              f"{body:5.1f} {code:5.1f} {est:6.2f}  {s['title'][:55]}{flag}")
