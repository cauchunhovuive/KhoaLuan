# -*- coding: utf-8 -*-
"""Sinh 2 hình cho bài báo SSRC: kiến trúc hệ thống và so sánh MRR/Recall."""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

OUT_DIR = os.path.join("tools", "figures")
os.makedirs(OUT_DIR, exist_ok=True)

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 7,
    "axes.linewidth": 0.6,
})


def box(ax, x0, y0, x1, y1, text, size=7):
    ax.add_patch(FancyBboxPatch(
        (x0, y0), x1 - x0, y1 - y0,
        boxstyle="round,pad=0,rounding_size=1.2",
        linewidth=0.7, edgecolor="#222222", facecolor="#f0f0f0"))
    ax.text((x0 + x1) / 2, (y0 + y1) / 2, text, ha="center", va="center",
            fontsize=size, color="#111111", linespacing=1.35)


def arrow(ax, x0, y0, x1, y1, label=None, lx=0.0, ly=0.0):
    ax.add_patch(FancyArrowPatch(
        (x0, y0), (x1, y1), arrowstyle="-|>", mutation_scale=7,
        linewidth=0.7, color="#222222", shrinkA=0, shrinkB=0))
    if label:
        ax.text((x0 + x1) / 2 + lx, (y0 + y1) / 2 + ly, label,
                fontsize=5.8, color="#333333", ha="center", va="center",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))


def architecture():
    fig, ax = plt.subplots(figsize=(3.4, 3.05), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")

    box(ax, 2, 86, 98, 97, "Clients\nReact web  ·  React Native mobile")
    box(ax, 2, 64, 98, 79, "Backend API\nNode.js / Express  ·  Prisma ORM")
    box(ax, 2, 42, 46, 56, "PostgreSQL\nusers, orders,\nProductView")
    box(ax, 54, 42, 98, 56, "Redis\ncache and\nsession buffer")
    box(ax, 2, 6, 98, 26,
        "ML service — Python / FastAPI\nHSP (P0, P1, P2)   ·   RIC (γ, w)\n"
        "customer clustering  ·  LightGCN")

    arrow(ax, 50, 86, 50, 79, "HTTPS / JSON", ly=0.0)
    arrow(ax, 24, 64, 24, 56)
    arrow(ax, 76, 64, 76, 56)
    arrow(ax, 50, 64, 50, 26)
    arrow(ax, 24, 42, 24, 26, "views", lx=5.6)
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    path = os.path.join(OUT_DIR, "fig_architecture.png")
    fig.savefig(path, dpi=300, facecolor="white")
    plt.close(fig)
    print("wrote", path)


def benchmark():
    methods = ["Co-occ.", "Seq.", "HSP", "RIC"]
    data = {
        "Yoochoose": {
            "mrr": [0.1611, 0.1934, 0.2426, 0.2416],
            "rec": [0.4153, 0.4603, 0.6073, 0.6510],
        },
        "Diginetica": {
            "mrr": [0.0820, 0.0792, 0.1091, 0.1804],
            "rec": [0.2560, 0.2382, 0.2234, 0.4432],
        },
    }
    fig, axes = plt.subplots(1, 2, figsize=(3.4, 1.95), dpi=300, sharey=True)
    width = 0.36
    xs = range(len(methods))
    for ax, (name, vals) in zip(axes, data.items()):
        ax.bar([x - width / 2 for x in xs], vals["mrr"], width,
               color="#4a4a4a", edgecolor="#222222", linewidth=0.4,
               label="MRR@10")
        ax.bar([x + width / 2 for x in xs], vals["rec"], width,
               color="#d0d0d0", edgecolor="#222222", linewidth=0.4,
               label="Recall@20")
        ax.set_xticks(list(xs))
        ax.set_xticklabels(methods, fontsize=6.2)
        ax.set_ylim(0, 0.75)
        ax.set_title("(%s) %s" % ("a" if name == "Yoochoose" else "b", name),
                     fontsize=6.8, pad=2)
        ax.tick_params(axis="both", labelsize=6, length=2, width=0.5)
        ax.yaxis.grid(True, linestyle=":", linewidth=0.4, color="#999999")
        ax.set_axisbelow(True)
        for spine in ("top", "right"):
            ax.spines[spine].set_visible(False)
    axes[0].set_ylabel("score", fontsize=6.4)
    axes[0].legend(fontsize=5.6, frameon=False, loc="upper left",
                   handlelength=1.0, borderaxespad=0.1)
    fig.tight_layout(pad=0.25, w_pad=0.6)
    path = os.path.join(OUT_DIR, "fig_benchmark.png")
    fig.savefig(path, dpi=300, facecolor="white")
    plt.close(fig)
    print("wrote", path)


if __name__ == "__main__":
    architecture()
    benchmark()
