# -*- coding: utf-8 -*-
"""Build the English SSRC paper (IEEE two-column format) with figures."""
import os

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

TEMPLATE = "SSRC_Word_Template.docx"
OUTPUT = "SSRC_Paper_EN.docx"
FIG_ARCH = os.path.join("tools", "figures", "fig_architecture.png")
FIG_BENCH = os.path.join("tools", "figures", "fig_benchmark.png")

FONT = "Times New Roman"


# ---------------------------------------------------------------- helpers
def set_cols(section, num):
    sectPr = section._sectPr
    cols = sectPr.find(qn("w:cols"))
    if cols is None:
        cols = OxmlElement("w:cols")
        sectPr.append(cols)
    for child in list(cols):
        cols.remove(child)
    cols.set(qn("w:num"), str(num))
    cols.set(qn("w:space"), "288")
    if qn("w:equalWidth") in cols.attrib:
        del cols.attrib[qn("w:equalWidth")]


def style_run(run, size=10, bold=False, italic=False, small_caps=False):
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.small_caps = small_caps
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), FONT)


def add_body(doc, text, size=10, bold=False, italic=False, align="justify",
             first_line=0.14, space_after=0, space_before=0, keep_next=False):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.alignment = {"justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
                    "center": WD_ALIGN_PARAGRAPH.CENTER,
                    "left": WD_ALIGN_PARAGRAPH.LEFT}[align]
    pf.first_line_indent = Inches(first_line)
    pf.space_after = Pt(space_after)
    pf.space_before = Pt(space_before)
    pf.line_spacing = 1.05
    pf.keep_with_next = keep_next
    run = p.add_run(text)
    style_run(run, size=size, bold=bold, italic=italic)
    return p


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style="Heading 1" if level == 1 else "Heading 2")
    pf = p.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.CENTER if level == 1 else WD_ALIGN_PARAGRAPH.LEFT
    pf.space_before = Pt(12 if level == 1 else 6)
    pf.space_after = Pt(4 if level == 1 else 3)
    run = p.add_run(text)
    style_run(run, size=10, italic=(level == 2))
    return p


def add_equation(doc, formula, number):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.first_line_indent = Inches(0)
    pf.space_before = Pt(4)
    pf.space_after = Pt(4)
    pf.line_spacing = 1.0
    pf.tab_stops.add_tab_stop(Inches(1.75), WD_TAB_ALIGNMENT.CENTER)
    pf.tab_stops.add_tab_stop(Inches(3.45), WD_TAB_ALIGNMENT.RIGHT)
    style_run(p.add_run("\t"))
    style_run(p.add_run(formula), italic=True)
    style_run(p.add_run("\t(" + str(number) + ")"))
    return p


def add_figure(doc, path, caption, width=3.3):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.first_line_indent = Inches(0)
    p.add_run().add_picture(path, width=Inches(width))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    cap.paragraph_format.space_before = Pt(0)
    cap.paragraph_format.space_after = Pt(6)
    cap.paragraph_format.line_spacing = 1.0
    style_run(cap.add_run(caption), size=8)


def _tbl_borders(table):
    tblPr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "bottom"):
        el = OxmlElement("w:" + edge)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "6")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "000000")
        borders.append(el)
    tblPr.insert_element_before(
        borders, "w:shd", "w:tblLayout", "w:tblCellMar", "w:tblLook",
        "w:tblCaption", "w:tblDescription")


def _bottom_border(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "0")
    bottom.set(qn("w:color"), "000000")
    borders.append(bottom)
    tcPr.append(borders)


def _cell_text(cell, text, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.0
    style_run(p.add_run(text), size=8, bold=bold)


def add_table(doc, caption_no, caption, header, rows, widths):
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_before = Pt(6)
    cap.paragraph_format.space_after = Pt(2)
    cap.paragraph_format.keep_with_next = True
    style_run(cap.add_run(caption_no), size=8, small_caps=True)
    cap2 = doc.add_paragraph()
    cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap2.paragraph_format.space_before = Pt(0)
    cap2.paragraph_format.space_after = Pt(4)
    cap2.paragraph_format.keep_with_next = True
    style_run(cap2.add_run(caption), size=8)

    table = doc.add_table(rows=1 + len(rows), cols=len(header))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    _tbl_borders(table)
    for idx, text in enumerate(header):
        cell = table.rows[0].cells[idx]
        _cell_text(cell, text)
        _bottom_border(cell)
    for ridx, row in enumerate(rows, start=1):
        for cidx, text in enumerate(row):
            _cell_text(table.rows[ridx].cells[cidx], text)
    for row in table.rows:
        trPr = row._tr.get_or_add_trPr()
        trPr.append(OxmlElement("w:cantSplit"))
        for cidx, w in enumerate(widths):
            row.cells[cidx].width = Inches(w)
    for cidx, w in enumerate(widths):
        table.columns[cidx].width = Inches(w)
    tblW = table._tbl.tblPr.find(qn("w:tblW"))
    if tblW is not None:
        tblW.set(qn("w:type"), "dxa")
        tblW.set(qn("w:w"), str(int(round(sum(widths) * 1440))))
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


# ---------------------------------------------------------------- document
doc = Document(TEMPLATE)
body = doc.element.body
for child in list(body):
    if child.tag != qn("w:sectPr"):
        body.remove(child)

set_cols(doc.sections[0], 1)

cp = doc.core_properties
cp.title = ("Integrating Graph-Based Session Recommendation into a Multi-Branch "
            "E-Commerce Platform for Anonymous Users")
cp.author = "Phat"
cp.language = "en-US"

# ---- Title
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(6)
p.paragraph_format.space_after = Pt(14)
p.paragraph_format.line_spacing = 1.0
style_run(p.add_run("Integrating Graph-Based Session Recommendation into a "
                    "Multi-Branch E-Commerce Platform for Anonymous Users"), size=22)

# ---- Authors
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(2)
style_run(p.add_run("Phat"), size=11)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(1)
style_run(p.add_run("Faculty of Information Technology, [University name]"), size=10)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(12)
style_run(p.add_run("cuongphat234@gmail.com"), size=10)

# ---- Abstract
abstract = ("Most visitors of an e-commerce platform are anonymous: the system observes only "
            "the sequence of products viewed in the current session instead of a long-term user "
            "profile, which makes traditional collaborative filtering ineffective. This paper "
            "presents the design and integration of two count-based session recommenders, HSP "
            "(Hierarchical Sequence Probability) and RIC (Recurrent Item Co-occurrence), into a "
            "multi-branch e-commerce platform with administrator, partner and customer roles. The "
            "platform uses React on the client, Node.js/Express with Prisma for business logic, "
            "PostgreSQL for clickstream storage and a Python/FastAPI service for training and "
            "inference. On 375,043 Yoochoose sessions and 175,704 Diginetica sessions, RIC reaches "
            "MRR@10 of 0.2416 and 0.1804 and Recall@20 of 0.6510 and 0.4432, while HSP reaches "
            "0.6073 and 0.2234. Compared with a pure co-occurrence baseline, RIC improves "
            "Recall@20 by 57% and 73%, respectively. The full model trains in 8.3 s on a CPU, so it "
            "can be retrained on commodity hardware without a GPU.")
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
p.paragraph_format.first_line_indent = Inches(0.14)
p.paragraph_format.space_after = Pt(6)
p.paragraph_format.line_spacing = 1.0
style_run(p.add_run("Abstract—"), size=9, bold=True)
style_run(p.add_run(abstract), size=9)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
p.paragraph_format.first_line_indent = Inches(0.14)
p.paragraph_format.space_after = Pt(6)
p.paragraph_format.line_spacing = 1.0
style_run(p.add_run("Index Terms—"), size=9, bold=True)
style_run(p.add_run("Session-based recommendation; e-commerce; anonymous users; HSP; RIC; "
                    "LightGCN; recommender systems"), size=9, italic=True)

# ---- Two-column body
sect2 = doc.add_section(WD_SECTION.CONTINUOUS)
set_cols(sect2, 2)
for el in sect2._sectPr.findall(qn("w:pgNumType")):
    sect2._sectPr.remove(el)

add_heading(doc, "INTRODUCTION", 1)
add_body(doc, "In e-commerce, most traffic comes from visitors who are not signed in. For this "
              "population the platform has no stable identifier, no long purchase history and no "
              "ratings, so matrix factorization and user-based collaborative filtering cannot be "
              "trained [6]. The only available signal is the ordered sequence of products the "
              "visitor has just viewed. Session-based recommendation addresses exactly this "
              "constraint: it predicts the next item from a short prefix of behaviour, often only a "
              "handful of clicks.")
add_body(doc, "Modern approaches fall into two families. The first uses recurrent or graph neural "
              "networks: GRU4Rec models the sequence with a gated recurrent unit [2], while SR-GNN "
              "and GCE-GNN build item-transition graphs and learn item representations with graph "
              "convolution [3], [4]. The second family is statistical: popularity, Markov transition "
              "probabilities and association-rule confidence. These models train in seconds, need "
              "no GPU and are easy to explain, but they are often assumed to be less accurate than "
              "learned models.")
add_body(doc, "Delianidi et al. [1] showed that for real e-commerce logs two carefully designed "
              "counting algorithms, HSP and RIC, match graph-based models in ranking quality while "
              "being 10 to 180 times faster and requiring only a CPU. This paper takes that result "
              "one step further and answers the engineering question that follows: how can the two "
              "algorithms be embedded in a running store, where session data arrives continuously, "
              "the model must refresh itself, and results must be explainable to both administrators "
              "and merchants?")
add_body(doc, "The contributions are fourfold. First, an integration architecture that separates "
              "the business layer from the machine-learning layer, so that session models can be "
              "retrained without touching the checkout flow. Second, a complete implementation of "
              "HSP and RIC with three inference strategies (hsp, ric and ric_cil) behind a single "
              "parameter. Third, an evaluation on two public datasets with 10,000 test samples each, "
              "which reproduces the ranking order reported by the original work. Fourth, an online "
              "test on the running platform, including a self-healing mechanism that retrains the "
              "model when the data outgrows it.")
add_body(doc, "The rest of the paper is organised as follows. Section II summarises related work. "
              "Section III describes the architecture and the two algorithms. Section IV presents "
              "the experimental setup, results and discussion. Section V concludes and outlines "
              "future work.")

add_heading(doc, "RELATED WORK", 1)
add_body(doc, "Session-based recommendation is formalised as predicting a target item from a "
              "behaviour sequence. Hidasi et al. [2] use a gated recurrent unit to encode the "
              "sequence and report large gains over popularity baselines, but training is expensive "
              "and sensitive to hyper-parameters. Wu et al. [3] move the problem to a session graph, "
              "where each session is a subgraph and graph convolution learns item embeddings. "
              "GCE-GNN [4] extends this with a global graph that exploits transitions across "
              "sessions. These models require GPUs and training times measured in hours on large "
              "logs.")
add_body(doc, "On the statistical side, association rules and item-based nearest neighbours are "
              "long-standing baselines, but they exploit co-occurrence only and ignore order. HSP of "
              "Delianidi et al. [1] addresses this by grading probabilities according to context "
              "length, while RIC exploits co-occurrence with a memory that decays over time. Across "
              "four datasets the authors show that RIC usually beats HSP on Recall and that both are "
              "orders of magnitude faster than graph networks. Our work builds directly on these two "
              "algorithms and fills the gap left by the original paper: an integration procedure for "
              "a multi-role platform, a model-refresh mechanism and an online validation.")
add_body(doc, "For signed-in users, graph collaborative filtering remains the natural choice. "
              "LightGCN [5] simplifies graph convolution by removing non-linear transforms and "
              "keeping linear propagation over the user–item graph. Our platform exposes this module "
              "as a complementary branch: anonymous visitors use the session model, while signed-in "
              "customers can additionally use long-term history.")

add_heading(doc, "SYSTEM ARCHITECTURE AND METHOD", 1)
add_heading(doc, "Platform Overview", 2)
add_body(doc, "The platform consists of five Docker services: PostgreSQL for business data, Redis "
              "as a cache, a Node.js/Express backend that accesses the database through Prisma, a "
              "Python/FastAPI ML service and a React web client. A React Native mobile application "
              "shares the same API, and a retrieval-augmented question-answering service (Ollama "
              "with ChromaDB) provides product advice. Fig. 1 summarises the architecture and the "
              "direction of each call.")
add_figure(doc, FIG_ARCH,
           "Fig. 1.  System architecture. The web and mobile clients call the Node.js/Express API, "
           "which persists sessions in PostgreSQL and delegates recommendation to the "
           "Python/FastAPI ML service.")
add_body(doc, "The platform serves three user branches. Administrators supervise the catalogue, "
              "orders and model quality; partners manage their own storefront and products; "
              "customers browse, order and pay. Every product-detail view is written to the "
              "ProductView table together with an optional user id, a product id and a timestamp. "
              "That table is both the training source and the input of online inference.")
add_body(doc, "The recommendation path has three steps. The client sends the product sequence of "
              "the current session to the backend; the backend forwards it to the ML service through "
              "the session/recommend endpoint; the ML service looks up the trained model and returns "
              "a ranked list annotated with the source of each candidate (P0, P1, P2 or γ). The "
              "annotation is shown in the administration console, which makes a recommendation "
              "auditable rather than a black box.")

add_heading(doc, "Session Representation and Training Data", 2)
add_body(doc, "A session is a time-ordered sequence of views in which two consecutive views are at "
              "most 30 minutes apart; a larger gap opens a new session. The 30-minute threshold is "
              "the usual convention in e-commerce and is a configuration value of the service. For "
              "each training session with sequence s1 … sn and for every t < n, the prefix s1 … st is "
              "an input and st+1 is the label. This expansion turns one long session into many "
              "samples and allows evaluation at every context length.")
add_body(doc, "At evaluation time the last item of each test session is hidden and the remainder is "
              "the input. Transitions observed only once are treated as noise and removed with a "
              "min_support of 2. On Yoochoose the filter drops 100,218 pairs and keeps 845,430; on "
              "Diginetica it drops 2,829,376 pairs and keeps 561,230. The filter raises the "
              "reliability of conditional probabilities without introducing a learned parameter.")

add_heading(doc, "HSP: Hierarchical Sequence Probability", 2)
add_body(doc, "HSP defines three probability levels over one counting model. The first level is the "
              "probability of a single item, equivalent to popularity:")
add_equation(doc, "P0(A) = N(A) / Σx∈I N(x)", 1)
add_body(doc, "where N(A) is the number of times item A occurs in the training views and I is the "
              "item set. The second level is the transition probability from A to B:", first_line=0)
add_equation(doc, "P1(A, B) = N(A → B) / N(A)", 2)
add_body(doc, "The third level extends the context to two items:", first_line=0)
add_equation(doc, "P2(A, B, C) = N(A → B → C) / N(A → B)", 3)
add_body(doc, "Inference is hierarchical. With a one-item prefix the system ranks by P0; with a "
              "two-item prefix it first takes candidates with positive P1 and then fills the list "
              "with P0; with three or more items it prefers P2 of the trailing pair, then P1 of the "
              "last item, and finally P0. Items already in the session are removed when the interface "
              "requests so. Because of this filling rule HSP always returns K results, even when the "
              "visitor has seen a single product or the session is empty.")
add_body(doc, "In terms of cost, HSP stores three lookup tables: item frequencies, transition pairs "
              "and triples. Training is a single pass over the data and inference is a table lookup "
              "plus a sort over a small candidate set, so complexity is essentially linear in the "
              "number of views.")

add_heading(doc, "RIC: Recurrent Item Co-occurrence", 2)
add_body(doc, "RIC ignores order and asks only which items tend to appear in the same session as "
              "the current one. The confidence of item o given item x is:")
add_equation(doc, "γ(o|x) = Nsame(x, o) / Nvisit(x)", 4)
add_body(doc, "where Nsame counts sessions containing both items and Nvisit counts sessions "
              "containing x. If γ is zero the value is replaced by P0, which avoids losing signal in "
              "the cold-start case. The score of each candidate is updated after every view with an "
              "exponential filter:", first_line=0)
add_equation(doc, "wi(t) = α·wi(t−1) + (1 − α)·ci(t)", 5)
add_body(doc, "where ci(t) is γ or P0 at step t and α is the forgetting factor. When α is close to "
              "1 the model remembers the whole session; when α is close to 0 it follows the most "
              "recent item. The value α = 0.3 was selected after a sweep on both datasets, balancing "
              "MRR and Recall.")
add_body(doc, "The RIC-CiL (Current-item-Last) variant keeps the same formula but moves the current "
              "item to the end of the list before truncating to Top-K. It is useful when the "
              "interface should suggest new items instead of repeating the product just clicked.")

add_heading(doc, "Deployment and Operation", 2)
add_body(doc, "The ML service exposes all three strategies behind one strategy parameter, so the "
              "business layer does not need to know algorithm details. The model is trained from the "
              "ProductView table and persisted to disk together with metadata about the number of "
              "sessions, the number of items and the training timestamp. On start-up the service "
              "compares the session count of the stored model with the session count in the database; "
              "if the model is significantly older, retraining is triggered automatically. This "
              "handles the practical situation in which session data grows continuously while models "
              "are trained in batches.")
add_body(doc, "The administration console has a dedicated screen that shows what the model has "
              "learned: P0 frequencies, P1 pairs, P2 triples and the γ matrix, each with its raw "
              "counting fraction. This is a deliberate design choice: with counting algorithms, "
              "explaining a recommendation amounts to showing the fraction that produced it, which a "
              "deep model cannot do.")

add_heading(doc, "EXPERIMENTS", 1)
add_heading(doc, "Datasets and Setup", 2)
add_body(doc, "We use the two standard public datasets for this task: Yoochoose from the RecSys "
              "Challenge 2015 [7] and Diginetica from the CIKM Cup 2016 [8]. Table I summarises their "
              "size after preprocessing. For each dataset the first 10,000 test samples are used for "
              "evaluation, which keeps the standard error of MRR below 0.005.")
add_table(doc, "TABLE I", "Experimental data",
          ["Dataset", "Source", "Train sessions", "Test samples", "Evaluated"],
          [["Yoochoose", "RecSys 2015", "375,043", "55,405", "10,000"],
           ["Diginetica", "CIKM Cup 2016", "175,704", "43,926", "10,000"],
           ["Live store", "ProductView", "281 views", "—", "20 checks"]],
          [0.9, 0.75, 0.65, 0.6, 0.55])
add_body(doc, "All experiments run on an ordinary CPU machine without a GPU. HSP and RIC are "
              "retrained for each dataset; training on Yoochoose takes 8.3 s. Two baselines are kept "
              "for comparison: cooccurrence (γ only) and sequence (first-order Markov, equivalent to "
              "P1 only).")

add_heading(doc, "Metrics", 2)
add_body(doc, "We report MRR@K and Recall@K for K ∈ {10, 20, 30}. MRR@K is the mean reciprocal rank "
              "of the target when it appears in the first K results and zero otherwise. Recall@K is "
              "the fraction of samples whose target appears in the first K results. MRR is sensitive "
              "to position and reflects ranking quality, whereas Recall measures coverage and better "
              "matches a long result list on screen.")

add_heading(doc, "Results", 2)
add_body(doc, "Tables II and III report the results on the two datasets, and Fig. 2 shows the same "
              "comparison graphically. On Yoochoose, RIC reaches MRR@10 of 0.2416 and Recall@20 of "
              "0.6510, which is 50% better than the co-occurrence baseline in MRR and 57% better in "
              "Recall@20; HSP reaches 0.2426 and 0.6073. On Diginetica the gap is wider: RIC reaches "
              "MRR@10 of 0.1804 against 0.0820 for the baseline, more than double, and Recall@20 of "
              "0.4432 against 0.2560.")
add_table(doc, "TABLE II", "Results on Yoochoose (10,000 test samples)",
          ["Method", "MRR@10", "MRR@20", "Recall@10", "Recall@20", "Recall@30"],
          [["Cooccurrence", "0.1611", "0.1670", "0.3300", "0.4153", "0.4616"],
           ["Sequence (Markov)", "0.1934", "0.1989", "0.3812", "0.4603", "0.5004"],
           ["HSP", "0.2426", "0.2498", "0.5055", "0.6073", "0.6558"],
           ["RIC", "0.2416", "0.2493", "0.5424", "0.6510", "0.6965"],
           ["RIC-CiL", "0.1985", "0.2053", "0.4380", "0.5357", "0.6965"]],
          [0.9, 0.48, 0.48, 0.53, 0.53, 0.53])
add_table(doc, "TABLE III", "Results on Diginetica (10,000 test samples)",
          ["Method", "MRR@10", "MRR@20", "Recall@10", "Recall@20", "Recall@30"],
          [["Cooccurrence", "0.0820", "0.0866", "0.1898", "0.2560", "0.2908"],
           ["Sequence (Markov)", "0.0792", "0.0831", "0.1826", "0.2382", "0.2692"],
           ["HSP", "0.1091", "0.1105", "0.2040", "0.2234", "0.2308"],
           ["RIC", "0.1804", "0.1861", "0.3597", "0.4432", "0.4813"],
           ["RIC-CiL", "0.1278", "0.1333", "0.2669", "0.3461", "0.4813"]],
          [0.9, 0.48, 0.48, 0.53, 0.53, 0.53])
add_figure(doc, FIG_BENCH,
           "Fig. 2.  MRR@10 and Recall@20 of four strategies on (a) Yoochoose and (b) Diginetica, "
           "10,000 test samples each. RIC dominates the co-occurrence and first-order Markov "
           "baselines on both datasets.")
add_body(doc, "The forgetting-factor sweep shows that α matters. On Yoochoose the MRR@10 of RIC-CiL "
              "is 0.2204 with α = 0.1, 0.2159 with α = 0.3, 0.2030 with α = 0.5 and 0.1843 with "
              "α = 0.9. On Diginetica, α = 0.3 gives the best MRR@10 of 0.1236 among the four values. "
              "We therefore set α = 0.3 as the default instead of the 0.5 often found in reference "
              "implementations.")

add_heading(doc, "Discussion", 2)
add_body(doc, "Three observations follow from the results. First, co-occurrence matters more than "
              "order. On Diginetica, RIC beats HSP by 65% in MRR@10 although HSP uses three-item "
              "contexts; shopping behaviour often returns to earlier items, which makes higher-order "
              "transition probabilities sparse. Second, HSP remains useful early in a session: with "
              "one or two items, transition sequences carry signal that the co-occurrence matrix has "
              "not yet accumulated. Third, RIC-CiL should be used only when the interface must avoid "
              "repeating the current item: on Yoochoose, pushing the current item to the end lowers "
              "MRR@10 from 0.2416 to 0.1985 because consecutive repeated views are common in the log.")
add_body(doc, "In terms of efficiency, the counting model trains on 375,043 sessions in 8.3 s and "
              "answers a request in a few milliseconds, so it can be retrained on a schedule without "
              "a GPU cluster. This operational advantage is decisive compared with graph models [3], "
              "[4]. The online test suite covers 20 scenarios on the live platform and all of them "
              "pass, including empty sessions, single-item sessions, items absent from the model and "
              "consecutively repeated items.")
add_body(doc, "The study has three limitations. A counting model learns no latent representation "
              "and therefore cannot use product attributes such as price, brand or category. The "
              "test split is taken at the end of each dataset and does not fully reflect seasonal "
              "distribution shift. Finally, the live data of the platform is still small (281 views), "
              "so the online tests confirm the correctness of the pipeline rather than the production "
              "quality of the recommendations.")

add_heading(doc, "CONCLUSION AND FUTURE WORK", 1)
add_body(doc, "This paper presented the integration of two count-based session recommenders into a "
              "running multi-branch e-commerce platform. The architecture isolates the ML service "
              "from the business layer, so models can be retrained independently, while a single "
              "strategy parameter allows HSP, RIC and RIC-CiL to be compared on the same session. "
              "Experiments on Yoochoose and Diginetica show that RIC improves MRR@10 over a pure "
              "co-occurrence baseline by 50% to more than 100%, while the full model trains in under "
              "10 s on a CPU.")
add_body(doc, "Future work includes adding product content features to the scoring function to "
              "handle new items, learning the forgetting factor α per category instead of using one "
              "global value, and running a long-term A/B test once traffic is large enough.")

# ---- References
p = doc.add_paragraph(style="Reference Head")
p.paragraph_format.space_before = Pt(12)
p.paragraph_format.space_after = Pt(4)
style_run(p.add_run("REFERENCES"), size=10)

refs = [
    "M. Delianidi, K. Diamantaras, D. Tektonidis, and M. Salampasis, “Session-based "
    "recommendations for e-commerce with graph-based data modeling,” Applied Sciences, vol. 13, "
    "no. 1, art. 394, 2023, doi: 10.3390/app13010394.",
    "B. Hidasi, A. Karatzoglou, L. Baltrunas, and D. Tikk, “Session-based recommendations with "
    "recurrent neural networks,” in Proc. Int. Conf. Learning Representations (ICLR), 2016.",
    "S. Wu, Y. Tang, Y. Zhu, L. Wang, X. Xie, and T. Tan, “Session-based recommendation with graph "
    "neural networks,” in Proc. AAAI Conf. Artificial Intelligence, vol. 33, 2019, pp. 346–353.",
    "S. Wu et al., “Global context enhanced graph neural networks for session-based "
    "recommendation,” in Proc. 43rd Int. ACM SIGIR Conf., 2020, pp. 169–178.",
    "X. He, K. Deng, X. Wang, Y. Li, Y. Zhang, and M. Wang, “LightGCN: Simplifying and powering "
    "graph convolution network for recommendation,” in Proc. 43rd Int. ACM SIGIR Conf., 2020, "
    "pp. 639–648.",
    "Y. Koren, R. Bell, and C. Volinsky, “Matrix factorization techniques for recommender "
    "systems,” Computer, vol. 42, no. 8, pp. 30–37, 2009.",
    "RecSys Challenge 2015 dataset, Yoochoose GmbH. [Online]. Available: "
    "https://recsys.acm.org/recsys15/challenge/",
    "CIKM Cup 2016 dataset, Diginetica. [Online]. Available: "
    "https://competitions.codalab.org/competitions/11161",
]
for i, ref in enumerate(refs, start=1):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf.left_indent = Inches(0.25)
    pf.first_line_indent = Inches(-0.25)
    pf.space_after = Pt(2)
    pf.line_spacing = 1.0
    style_run(p.add_run("[%d]\t%s" % (i, ref)), size=8)

doc.save(OUTPUT)
print("saved", OUTPUT)
