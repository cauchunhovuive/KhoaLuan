# -*- coding: utf-8 -*-
"""Sinh bài báo SSRC (định dạng IEEE 2 cột) từ template SSRC_Word_Template.docx."""
import copy
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, Twips

TEMPLATE = "SSRC_Word_Template.docx"
OUTPUT = "SSRC_BaiBao_GoiYTheoPhien.docx"

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
    r1 = p.add_run("\t")
    style_run(r1)
    r2 = p.add_run(formula)
    style_run(r2, italic=True)
    r3 = p.add_run("\t(" + str(number) + ")")
    style_run(r3)
    return p


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
    run = p.add_run(text)
    style_run(run, size=8, bold=bold)


def add_table(doc, caption_no, caption, header, rows, widths):
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_before = Pt(6)
    cap.paragraph_format.space_after = Pt(2)
    cap.paragraph_format.keep_with_next = True
    r = cap.add_run(caption_no)
    style_run(r, size=8, small_caps=True)
    cap2 = doc.add_paragraph()
    cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap2.paragraph_format.space_before = Pt(0)
    cap2.paragraph_format.space_after = Pt(4)
    cap2.paragraph_format.keep_with_next = True
    r = cap2.add_run(caption)
    style_run(r, size=8)

    table = doc.add_table(rows=1 + len(rows), cols=len(header))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    _tbl_borders(table)
    for idx, text in enumerate(header):
        cell = table.rows[0].cells[idx]
        _cell_text(cell, text, bold=False)
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


# ---------------------------------------------------------------- build
doc = Document(TEMPLATE)
body = doc.element.body
for child in list(body):
    if child.tag != qn("w:sectPr"):
        body.remove(child)

set_cols(doc.sections[0], 1)

cp = doc.core_properties
cp.title = ("Tích hợp gợi ý theo phiên dựa trên đồ thị vào hệ thống "
            "thương mại điện tử đa nhánh cho người dùng ẩn danh")
cp.author = "Phat"
cp.language = "vi-VN"

# ---- Title
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(6)
p.paragraph_format.space_after = Pt(14)
p.paragraph_format.line_spacing = 1.0
run = p.add_run("Tích hợp gợi ý theo phiên dựa trên đồ thị vào hệ thống "
                "thương mại điện tử đa nhánh cho người dùng ẩn danh")
style_run(run, size=22)

# ---- Authors
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(2)
run = p.add_run("Phát")
style_run(run, size=11)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(1)
run = p.add_run("Khoa Công nghệ Thông tin, Trường Đại học [điền tên trường]")
style_run(run, size=10)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(12)
run = p.add_run("cuongphat234@gmail.com")
style_run(run, size=10)

# ---- Abstract
abstract = ("Phần lớn khách truy cập sàn thương mại điện tử không đăng nhập, nên hệ thống chỉ "
            "quan sát được chuỗi sản phẩm trong phiên hiện tại thay vì hồ sơ người dùng dài hạn; "
            "các phương pháp lọc cộng tác truyền thống vì thế mất tác dụng. Bài báo trình bày việc "
            "thiết kế và tích hợp hai thuật toán gợi ý theo phiên chỉ dựa trên phép đếm — HSP "
            "(Hierarchical Sequence Probability) và RIC (Recurrent Item Co-occurrence) — vào một "
            "hệ thống thương mại điện tử đa nhánh gồm ba vai trò quản trị, đối tác và khách hàng. "
            "Hệ thống dùng React ở giao diện, Node.js/Express và Prisma ở tầng nghiệp vụ, PostgreSQL "
            "lưu lượt xem, và dịch vụ Python/FastAPI đảm nhận huấn luyện cùng suy luận. Trên 375.043 "
            "phiên của Yoochoose và 175.704 phiên của Diginetica, RIC đạt MRR@10 lần lượt 0,2416 và "
            "0,1804, Recall@20 đạt 0,6510 và 0,4432; HSP đạt Recall@20 0,6073 và 0,2234. So với "
            "baseline đồng xuất hiện thuần, RIC cao hơn 57% và 73% về Recall@20 trên hai bộ dữ liệu. "
            "Toàn bộ mô hình huấn luyện "
            "trong 8,3 giây trên CPU, cho phép triển khai trên hạ tầng phổ thông mà không cần GPU.")
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
p.paragraph_format.first_line_indent = Inches(0.14)
p.paragraph_format.space_after = Pt(6)
p.paragraph_format.line_spacing = 1.0
r = p.add_run("Tóm tắt — ")
style_run(r, size=9, bold=True)
r = p.add_run(abstract)
style_run(r, size=9)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
p.paragraph_format.first_line_indent = Inches(0.14)
p.paragraph_format.space_after = Pt(6)
p.paragraph_format.line_spacing = 1.0
r = p.add_run("Từ khóa — ")
style_run(r, size=9, bold=True)
r = p.add_run("Gợi ý theo phiên; thương mại điện tử; người dùng ẩn danh; HSP; RIC; LightGCN; "
              "hệ thống gợi ý")
style_run(r, size=9, italic=True)

# ---- Two-column body
sect2 = doc.add_section(WD_SECTION.CONTINUOUS)
set_cols(sect2, 2)
for el in sect2._sectPr.findall(qn("w:pgNumType")):
    sect2._sectPr.remove(el)

add_heading(doc, "GIỚI THIỆU", 1)
add_body(doc, "Trong thương mại điện tử, phần lớn lưu lượng truy cập đến từ khách vãng lai chưa "
              "đăng nhập. Với nhóm người dùng này, hệ thống không có mã định danh ổn định, không có "
              "lịch sử mua hàng dài hạn và cũng không có đánh giá để huấn luyện mô hình phân rã ma "
              "trận hay lọc cộng tác dựa trên người dùng [6]. Tín hiệu duy nhất có được là chuỗi sản "
              "phẩm mà khách vừa xem trong phiên hiện tại. Gợi ý theo phiên (session-based "
              "recommendation) ra đời chính từ ràng buộc này: dự đoán sản phẩm tiếp theo dựa trên "
              "một tiền tố hành vi ngắn, thường chỉ vài lượt xem.")
add_body(doc, "Các hướng tiếp cận hiện đại cho bài toán này chia làm hai nhóm. Nhóm thứ nhất dùng "
              "mạng nơ-ron hồi quy hoặc đồ thị: GRU4Rec mô hình hóa chuỗi bằng RNN [2], SR-GNN và "
              "GCE-GNN xây dựng đồ thị chuyển tiếp giữa các sản phẩm rồi học biểu diễn bằng mạng "
              "tích chập đồ thị [3], [4]. Nhóm thứ hai dựa trên thống kê đếm: tần suất, xác suất "
              "chuyển tiếp Markov và độ tin cậy của luật kết hợp. Nhóm thứ hai có ưu điểm huấn luyện "
              "gần như tức thời, suy luận rẻ và dễ giải thích, nhưng thường bị xem là kém chính xác "
              "hơn học sâu.")
add_body(doc, "Delianidi và cộng sự [1] đã chỉ ra rằng với dữ liệu thương mại điện tử thực tế, hai "
              "thuật toán đếm được thiết kế cẩn thận — HSP và RIC — có thể đạt độ chính xác tương "
              "đương các mô hình đồ thị trong khi nhanh hơn từ 10 đến 180 lần và chỉ cần CPU. Bài báo "
              "này tiếp nhận kết quả đó và trả lời câu hỏi kỹ thuật tiếp theo: làm thế nào để đưa hai "
              "thuật toán vào một hệ thống bán hàng đang vận hành, nơi dữ liệu phiên đến liên tục từ "
              "bảng lượt xem, mô hình phải tự làm mới và kết quả phải giải thích được cho cả quản trị "
              "viên lẫn đối tác bán hàng.")
add_body(doc, "Đóng góp của bài báo gồm bốn điểm. Thứ nhất, một kiến trúc tích hợp tách biệt tầng "
              "nghiệp vụ và tầng học máy, cho phép huấn luyện lại mô hình phiên mà không ảnh hưởng "
              "đến luồng đặt hàng. Thứ hai, cài đặt đầy đủ HSP và RIC cùng ba chiến lược suy luận "
              "(hsp, ric, ric_cil) sau một tham số duy nhất. Thứ ba, đánh giá trên hai bộ dữ liệu "
              "công khai với 10.000 mẫu kiểm thử mỗi bộ, tái hiện đúng thứ bậc kết quả của công trình "
              "gốc. Thứ tư, kiểm thử trực tuyến trên hệ thống thật, bao gồm cơ chế tự phục hồi mô "
              "hình khi dữ liệu vượt quá mô hình đã học.")
add_body(doc, "Phần còn lại của bài báo được tổ chức như sau. Mục II tóm tắt công trình liên quan. "
              "Mục III mô tả kiến trúc hệ thống và hai thuật toán. Mục IV trình bày thiết lập thực "
              "nghiệm, kết quả và thảo luận. Mục V kết luận và nêu hướng phát triển.")

add_heading(doc, "CÔNG TRÌNH LIÊN QUAN", 1)
add_body(doc, "Gợi ý theo phiên được hình thức hóa như bài toán dự đoán mục tiêu từ một chuỗi "
              "hành vi. Hidasi và cộng sự [2] dùng GRU để mã hóa chuỗi và đạt bước tiến lớn so với "
              "các baseline dựa trên độ phổ biến, nhưng chi phí huấn luyện cao và kết quả phụ thuộc "
              "nhiều vào siêu tham số. Wu và cộng sự [3] chuyển bài toán sang đồ thị phiên, trong đó "
              "mỗi phiên là một đồ thị con và các mô hình tích chập đồ thị học biểu diễn mục. "
              "GCE-GNN [4] mở rộng bằng đồ thị toàn cục để tận dụng chuyển tiếp giữa các phiên. Các "
              "mô hình này đòi hỏi GPU và thời gian huấn luyện tính bằng giờ trên dữ liệu lớn.")
add_body(doc, "Ở hướng thống kê, luật kết hợp và lọc cộng tác dựa trên mục (item-KNN) là nền tảng "
              "lâu đời. Hạn chế của chúng là chỉ khai thác đồng xuất hiện, bỏ qua thứ tự. HSP của "
              "Delianidi và cộng sự [1] khắc phục bằng cách phân cấp xác suất theo độ dài ngữ cảnh, "
              "còn RIC khai thác đồng xuất hiện nhưng thêm bộ nhớ suy giảm theo thời gian. Trên bốn "
              "bộ dữ liệu, nhóm tác giả cho thấy RIC thường vượt HSP về Recall và cả hai nhanh hơn "
              "các mô hình GNN rất nhiều. Bài báo của chúng tôi kế thừa trực tiếp hai thuật toán này "
              "và bổ sung phần còn thiếu trong công trình gốc: quy trình tích hợp vào hệ thống nhiều "
              "vai trò, cơ chế làm mới mô hình và kiểm thử trực tuyến.")
add_body(doc, "Với người dùng đã đăng nhập, lọc cộng tác dựa trên đồ thị vẫn là lựa chọn phù hợp. "
              "LightGCN [5] đơn giản hóa mô hình tích chập đồ thị bằng cách bỏ biến đổi phi tuyến, "
              "giữ lại lan truyền tuyến tính trên đồ thị người dùng – sản phẩm. Hệ thống của chúng "
              "tôi cung cấp mô-đun này như một nhánh bổ sung: khách ẩn danh dùng mô hình phiên, khách "
              "đã đăng nhập có thể kết hợp thêm tín hiệu lịch sử dài hạn.")

add_heading(doc, "KIẾN TRÚC HỆ THỐNG VÀ PHƯƠNG PHÁP", 1)
add_heading(doc, "Kiến trúc tổng thể", 2)
add_body(doc, "Hệ thống gồm năm dịch vụ chạy trong Docker: PostgreSQL lưu dữ liệu nghiệp vụ, Redis "
              "làm bộ nhớ đệm, backend Node.js/Express truy cập cơ sở dữ liệu qua Prisma, dịch vụ ML "
              "viết bằng Python/FastAPI và giao diện web React. Ngoài ra hệ thống có một ứng dụng di "
              "động React Native dùng chung API và một dịch vụ hỏi đáp dựa trên truy xuất (Ollama kết "
              "hợp ChromaDB) phục vụ tư vấn sản phẩm.")
add_body(doc, "Hệ thống phục vụ ba nhánh người dùng. Quản trị viên giám sát danh mục, đơn hàng và "
              "chất lượng mô hình; đối tác quản lý cửa hàng và sản phẩm của mình; khách hàng duyệt, "
              "đặt hàng và thanh toán. Mọi lượt xem trang chi tiết sản phẩm của khách đều được ghi "
              "thành một bản ghi trong bảng ProductView gồm mã người dùng (nếu có), mã sản phẩm và "
              "thời điểm. Bảng này vừa là nguồn dữ liệu huấn luyện, vừa là đầu vào cho suy luận trực "
              "tuyến.")
add_body(doc, "Luồng gợi ý đi qua ba bước. Giao diện gửi chuỗi sản phẩm trong phiên hiện tại tới "
              "backend; backend chuyển tiếp tới dịch vụ ML qua endpoint session/recommend; dịch vụ ML "
              "tra mô hình đã học và trả về danh sách xếp hạng kèm nhãn nguồn của từng mục (P0, P1, "
              "P2 hoặc γ). Nhãn này được hiển thị cho quản trị viên, giúp việc gợi ý trở nên kiểm "
              "chứng được thay vì là một hộp đen.")

add_heading(doc, "Biểu diễn phiên và dữ liệu huấn luyện", 2)
add_body(doc, "Một phiên là dãy lượt xem được sắp theo thời gian, trong đó hai lượt liên tiếp cách "
              "nhau không quá 30 phút; khoảng cách lớn hơn mở phiên mới. Ngưỡng 30 phút là quy ước "
              "phổ biến trong thương mại điện tử và được đặt trong cấu hình của dịch vụ. Với mỗi "
              "phiên huấn luyện, hệ thống sinh các cặp tiền tố – mục tiêu: nếu phiên có dãy s1 … sn "
              "thì với mỗi t < n, tiền tố s1 … st là đầu vào và st+1 là nhãn. Cách sinh này biến một "
              "phiên dài thành nhiều mẫu và cho phép đánh giá ở mọi độ dài ngữ cảnh.")
add_body(doc, "Khi đánh giá, mục cuối của phiên kiểm thử bị giữ kín, phần còn lại là đầu vào. Các "
              "cặp chuyển tiếp chỉ xuất hiện một lần được xem là nhiễu và bị loại bằng ngưỡng "
              "min_support = 2. Trên Yoochoose, bước lọc loại 100.218 cặp và giữ 845.430 cặp; trên "
              "Diginetica, bước lọc loại 2.829.376 cặp và giữ 561.230 cặp. Bộ lọc này làm tăng độ "
              "tin cậy của xác suất có điều kiện mà không cần thêm tham số học.")

add_heading(doc, "HSP — Xác suất chuỗi phân cấp", 2)
add_body(doc, "HSP định nghĩa ba mức xác suất trên cùng một mô hình đếm. Mức thứ nhất là xác suất "
              "của một mục đơn lẻ, tương đương độ phổ biến:")
add_equation(doc, "P0(A) = N(A) / Σx∈I N(x)", 1)
add_body(doc, "trong đó N(A) là số lần mục A xuất hiện trong toàn bộ lượt xem huấn luyện và I là "
              "tập mục. Mức thứ hai là xác suất chuyển tiếp từ A sang B:", first_line=0)
add_equation(doc, "P1(A, B) = N(A → B) / N(A)", 2)
add_body(doc, "Mức thứ ba mở rộng sang ngữ cảnh hai mục:", first_line=0)
add_equation(doc, "P2(A, B, C) = N(A → B → C) / N(A → B)", 3)
add_body(doc, "Quy tắc suy luận là phân cấp: với tiền tố dài một mục, hệ thống xếp hạng theo P0; "
              "với tiền tố hai mục, ưu tiên các mục có P1 dương, sau đó bù bằng P0 nếu chưa đủ K; "
              "với tiền tố từ ba mục trở lên, ưu tiên P2 của cặp đuôi, rồi P1 của mục cuối, cuối "
              "cùng là P0. Mục đã có trong phiên bị loại khỏi danh sách khi giao diện yêu cầu. Nhờ "
              "quy tắc lấp đầy này, HSP luôn trả đủ K kết quả, kể cả khi khách mới xem một sản phẩm "
              "hoặc phiên hoàn toàn rỗng.")
add_body(doc, "Về chi phí, HSP lưu ba bảng tra: tần suất mục, cặp chuyển tiếp và bộ ba. Huấn luyện "
              "là một lượt duyệt dữ liệu, suy luận là tra bảng và sắp xếp trên số ứng viên nhỏ, nên "
              "độ phức tạp gần như tuyến tính theo số lượt xem.")

add_heading(doc, "RIC — Đồng xuất hiện có bộ nhớ suy giảm", 2)
add_body(doc, "RIC bỏ qua thứ tự và chỉ hỏi mục nào thường xuất hiện cùng phiên với mục đang xem. "
              "Độ tin cậy của mục o khi biết mục x là:")
add_equation(doc, "γ(o|x) = Nsame(x, o) / Nvisit(x)", 4)
add_body(doc, "trong đó Nsame đếm số phiên chứa cả hai mục và Nvisit đếm số phiên chứa x. Nếu γ "
              "bằng 0, giá trị được thay bằng P0 để tránh mất tín hiệu ở tình huống khởi động "
              "nguội. Điểm của mỗi ứng viên được cập nhật sau từng lượt xem theo bộ lọc hàm mũ:",
              first_line=0)
add_equation(doc, "wi(t) = α·wi(t−1) + (1 − α)·ci(t)", 5)
add_body(doc, "với ci(t) là γ hoặc P0 tại bước t và α là hệ số quên. Khi α gần 1, mô hình nhớ dài "
              "và ít phản ứng với hành vi mới; khi α gần 0, mô hình bám theo mục vừa xem. Giá trị "
              "α = 0,3 được chọn sau khi dò trên cả hai bộ dữ liệu, cân bằng giữa MRR và Recall.")
add_body(doc, "Biến thể RIC-CiL (Current-item-Last) giữ nguyên công thức nhưng đẩy mục đang xem "
              "xuống cuối danh sách trước khi cắt Top-K. Biến thể này hữu ích khi giao diện cần gợi "
              "ý mục mới thay vì lặp lại mục khách vừa bấm.")

add_heading(doc, "Tích hợp và vận hành", 2)
add_body(doc, "Dịch vụ ML đóng gói cả ba chiến lược sau một tham số strategy, nhờ đó tầng nghiệp vụ "
              "không phải biết chi tiết thuật toán. Mô hình được huấn luyện từ bảng ProductView và "
              "được lưu xuống đĩa cùng siêu dữ liệu về số phiên, số mục và thời điểm huấn luyện. Khi "
              "khởi động, dịch vụ so sánh số phiên trong mô hình với số phiên trong cơ sở dữ liệu; "
              "nếu mô hình cũ hơn đáng kể, tiến trình huấn luyện lại được kích hoạt tự động. Cơ chế "
              "này xử lý đúng tình huống thực tế là dữ liệu phiên tăng liên tục trong khi mô hình chỉ "
              "được huấn luyện theo lô.")
add_body(doc, "Trang quản trị có một màn hình riêng hiển thị nội dung mô hình đã học: tần suất "
              "P0, các cặp P1, bộ ba P2 và ma trận γ, kèm phân số đếm thô. Đây là lựa chọn thiết kế "
              "có chủ đích: với thuật toán đếm, việc giải thích một gợi ý chỉ là chỉ ra phân số tạo "
              "ra nó, điều mà mô hình học sâu không làm được.")

add_heading(doc, "THỰC NGHIỆM", 1)
add_heading(doc, "Dữ liệu và thiết lập", 2)
add_body(doc, "Chúng tôi dùng hai bộ dữ liệu công khai chuẩn của bài toán: Yoochoose từ RecSys "
              "Challenge 2015 [7] và Diginetica từ CIKM Cup 2016 [8]. Bảng I tóm tắt quy mô sau khi "
              "tiền xử lý. Với mỗi bộ, 10.000 mẫu kiểm thử đầu tiên được dùng để đánh giá, đủ lớn để "
              "sai số chuẩn của MRR dưới 0,005.")
add_table(doc, "BẢNG I", "Quy mô dữ liệu thực nghiệm",
          ["Tập dữ liệu", "Nguồn", "Phiên huấn luyện", "Mẫu kiểm thử", "Mẫu đánh giá"],
          [["Yoochoose", "RecSys 2015", "375.043", "55.405", "10.000"],
           ["Diginetica", "CIKM Cup 2016", "175.704", "43.926", "10.000"],
           ["Hệ thống thật", "ProductView", "281 lượt xem", "—", "20 kiểm thử"]],
          [0.9, 0.75, 0.65, 0.6, 0.55])
add_body(doc, "Toàn bộ thực nghiệm chạy trên một máy CPU thông thường, không dùng GPU. Mô hình HSP "
              "và RIC được huấn luyện lại cho từng bộ dữ liệu; thời gian huấn luyện Yoochoose là 8,3 "
              "giây. Hai baseline được giữ lại để so sánh: cooccurrence (chỉ dùng γ) và sequence "
              "(Markov bậc một, tương đương chỉ dùng P1).")

add_heading(doc, "Độ đo", 2)
add_body(doc, "Chúng tôi dùng MRR@K và Recall@K với K ∈ {10, 20, 30}. MRR@K là trung bình nghịch "
              "đảo thứ hạng của mục đúng nếu mục đó nằm trong K kết quả đầu, ngược lại bằng 0. "
              "Recall@K là tỉ lệ mẫu có mục đúng nằm trong K kết quả đầu. MRR nhạy với vị trí nên "
              "phản ánh chất lượng xếp hạng, còn Recall phản ánh khả năng bao phủ và phù hợp hơn với "
              "giao diện hiển thị danh sách dài.")

add_heading(doc, "Kết quả", 2)
add_body(doc, "Bảng II và Bảng III trình bày kết quả trên hai bộ dữ liệu. Trên Yoochoose, RIC đạt "
              "MRR@10 0,2416 và Recall@20 0,6510, cao hơn baseline đồng xuất hiện 50% về MRR và 57% "
              "về Recall@20; HSP đạt MRR@10 0,2426 và Recall@20 0,6073. Trên Diginetica, khoảng cách "
              "lớn hơn: RIC đạt MRR@10 0,1804 so với 0,0820 của baseline, tức hơn gấp đôi, và "
              "Recall@20 0,4432 so với 0,2560.")
add_table(doc, "BẢNG II", "Kết quả trên Yoochoose (10.000 mẫu kiểm thử)",
          ["Phương pháp", "MRR@10", "MRR@20", "Recall@10", "Recall@20", "Recall@30"],
          [["Cooccurrence", "0,1611", "0,1670", "0,3300", "0,4153", "0,4616"],
           ["Sequence (Markov)", "0,1934", "0,1989", "0,3812", "0,4603", "0,5004"],
           ["HSP", "0,2426", "0,2498", "0,5055", "0,6073", "0,6558"],
           ["RIC", "0,2416", "0,2493", "0,5424", "0,6510", "0,6965"],
           ["RIC-CiL", "0,1985", "0,2053", "0,4380", "0,5357", "0,6965"]],
          [0.9, 0.48, 0.48, 0.53, 0.53, 0.53])
add_table(doc, "BẢNG III", "Kết quả trên Diginetica (10.000 mẫu kiểm thử)",
          ["Phương pháp", "MRR@10", "MRR@20", "Recall@10", "Recall@20", "Recall@30"],
          [["Cooccurrence", "0,0820", "0,0866", "0,1898", "0,2560", "0,2908"],
           ["Sequence (Markov)", "0,0792", "0,0831", "0,1826", "0,2382", "0,2692"],
           ["HSP", "0,1091", "0,1105", "0,2040", "0,2234", "0,2308"],
           ["RIC", "0,1804", "0,1861", "0,3597", "0,4432", "0,4813"],
           ["RIC-CiL", "0,1278", "0,1333", "0,2669", "0,3461", "0,4813"]],
          [0.9, 0.48, 0.48, 0.53, 0.53, 0.53])
add_body(doc, "Kết quả dò hệ số quên cho thấy α ảnh hưởng rõ rệt. Trên Yoochoose, MRR@10 của "
              "RIC-CiL là 0,2204 với α = 0,1; 0,2159 với α = 0,3; 0,2030 với α = 0,5 và 0,1843 với "
              "α = 0,9. Trên Diginetica, α = 0,3 cho MRR@10 0,1236, cao nhất trong bốn giá trị thử. "
              "Vì vậy α = 0,3 được đặt làm mặc định, thay cho giá trị 0,5 thường thấy trong các cài "
              "đặt tham khảo.")

add_heading(doc, "Thảo luận", 2)
add_body(doc, "Ba quan sát rút ra từ kết quả. Thứ nhất, đồng xuất hiện quan trọng hơn thứ tự. Trên "
              "Diginetica, RIC vượt HSP 65% về MRR@10 dù HSP dùng ngữ cảnh ba mục; nguyên nhân là "
              "hành vi mua sắm có nhiều nhánh quay lại mục cũ, khiến xác suất chuyển tiếp bậc cao bị "
              "thưa. Thứ hai, HSP vẫn hữu ích ở giai đoạn đầu phiên: khi mới có một hoặc hai mục, "
              "chuỗi chuyển tiếp cung cấp tín hiệu mà ma trận đồng xuất hiện chưa đủ mạnh. Thứ ba, "
              "RIC-CiL chỉ nên dùng khi giao diện không muốn lặp lại mục hiện tại: trên Yoochoose, "
              "việc đẩy mục hiện tại xuống cuối làm MRR@10 giảm từ 0,2416 xuống 0,1985, vì dữ liệu "
              "có nhiều lần xem lặp liên tiếp.")
add_body(doc, "Về hiệu năng, mô hình đếm huấn luyện 375.043 phiên trong 8,3 giây và suy luận trong "
              "vài mili giây cho mỗi yêu cầu, nên có thể huấn luyện lại theo lịch mà không cần cụm "
              "GPU. Đây là lợi thế vận hành quyết định khi so với các mô hình đồ thị [3], [4]. Bộ "
              "kiểm thử trực tuyến gồm 20 tình huống chạy trên hệ thống thật đều đạt, bao gồm các ca "
              "phiên rỗng, phiên một mục, mục không có trong mô hình và mục bị lặp liên tiếp.")
add_body(doc, "Hạn chế của nghiên cứu gồm ba điểm. Mô hình đếm không học được biểu diễn ẩn nên "
              "không tận dụng được thuộc tính sản phẩm như giá, thương hiệu hay danh mục. Dữ liệu "
              "kiểm thử lấy theo thời điểm cuối bộ dữ liệu, chưa phản ánh đầy đủ dịch chuyển phân "
              "phối theo mùa. Cuối cùng, dữ liệu trực tuyến của hệ thống còn nhỏ (281 lượt xem), nên "
              "các kiểm thử trực tuyến xác nhận tính đúng đắn của luồng xử lý chứ chưa đủ để kết luận "
              "về chất lượng gợi ý trong sản xuất.")

add_heading(doc, "KẾT LUẬN", 1)
add_body(doc, "Bài báo đã trình bày việc tích hợp hai thuật toán gợi ý theo phiên dựa trên phép đếm "
              "vào một hệ thống thương mại điện tử đa nhánh đang vận hành. Kiến trúc tách biệt dịch "
              "vụ ML khỏi tầng nghiệp vụ cho phép huấn luyện lại độc lập, còn tham số chiến lược duy "
              "nhất giúp so sánh HSP, RIC và RIC-CiL trên cùng một phiên. Thực nghiệm trên Yoochoose "
              "và Diginetica cho thấy RIC vượt baseline đồng xuất hiện thuần từ 50% đến hơn 100% về "
              "MRR@10, trong khi toàn bộ mô hình huấn luyện dưới 10 giây trên CPU.")
add_body(doc, "Hướng phát triển tiếp theo gồm: bổ sung đặc trưng nội dung sản phẩm vào công thức "
              "điểm để xử lý mục mới, học hệ số quên α theo từng ngành hàng thay vì dùng một giá trị "
              "chung, và đánh giá trực tuyến dài hạn bằng thử nghiệm A/B khi lưu lượng truy cập đủ "
              "lớn.")

# ---- References
p = doc.add_paragraph(style="Reference Head")
p.paragraph_format.space_before = Pt(12)
p.paragraph_format.space_after = Pt(4)
run = p.add_run("TÀI LIỆU THAM KHẢO")
style_run(run, size=10)

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
    run = p.add_run("[%d]\t%s" % (i, ref))
    style_run(run, size=8)

doc.save(OUTPUT)
print("saved", OUTPUT)
