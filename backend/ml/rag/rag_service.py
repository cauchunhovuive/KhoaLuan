"""
RAG Service — Retrieval-Augmented Generation pipeline

1. Nhận câu hỏi từ user
2. Tìm kiếm documents liên quan trong Knowledge Base
3. Xây dựng prompt với context + câu hỏi
4. Gửi đến Ollama local để sinh câu trả lời
5. Trả về câu trả lời + nguồn tham khảo
"""

import os
import json
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

import requests

from .knowledge_base import KnowledgeBase

logger = logging.getLogger(__name__)

# Ollama configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "60"))


class RAGService:
    """
    RAG pipeline sử dụng Knowledge Base + Ollama local.
    """

    # System prompt — hướng dẫn AI cách trả lời
    SYSTEM_PROMPT = """Bạn là trợ lý AI thông minh của một website thương mại điện tử Việt Nam.
Bạn có kiến thức sâu về tất cả sản phẩm, chính sách, và tính năng của website.

NHIỆM VỤ CỦA BẠN:
- Trả lời câu hỏi của khách hàng dựa trên thông tin được cung cấp bên dưới.
- Nếu câu hỏi không liên quan đến website, lịch sự từ chối trả lời.
- Luôn trả lời bằng tiếng Việt, tự nhiên và thân thiện.
- Nếu không đủ thông tin để trả lời chính xác, hãy nói rõ và đề nghị hỗ trợ thêm.

QUY TẮC:
- Chỉ trả lời dựa trên thông tin được cung cấp trong CONTEXT bên dưới.
- Nếu CONTEXT không chứa đủ thông tin, hãy nói "Tôi chưa có đủ thông tin về vấn đề này" và đề nghị hỗ trợ khác.
- Không tự ý thêm thông tin không có trong CONTEXT.
- Không đưa ra giá cả hoặc thông tin sai lệch.
- Không trả lời các câu hỏi không liên quan đến mua sắm, thương mại điện tử hoặc website.
- Trích dẫn nguồn thông tin từ CONTEXT nếu cần.

VÍ DỤ:
Khách: "Tôi muốn tìm sản phẩm A"
Bạn: "Dạ, sản phẩm A có giá X₫, thuộc danh mục Y. Bạn có thể tìm thấy sản phẩm này tại [link]. Bạn cần tôi tư vấn thêm gì không ạ?"

Khách: "Thời tiết hôm nay thế nào?"
Bạn: "Xin lỗi, tôi chỉ được hỗ trợ các câu hỏi về mua sắm và sản phẩm trên website của chúng tôi. Bạn có cần tôi tư vấn sản phẩm gì không ạ?"
"""

    def __init__(
        self,
        knowledge_base: KnowledgeBase,
        model: Optional[str] = None,
    ):
        self.kb = knowledge_base
        self.model = model or OLLAMA_MODEL
        self.ollama_host = OLLAMA_HOST
        self.timeout = OLLAMA_TIMEOUT

        # Kiểm tra kết nối Ollama
        self._check_ollama()

    def _check_ollama(self):
        """Kiểm tra Ollama service có chạy không"""
        try:
            resp = requests.get(f"{self.ollama_host}/api/tags", timeout=5)
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m["name"] for m in models]
                logger.info(f"Ollama connected. Available models: {model_names}")

                # Kiểm tra model cần dùng đã được pull chưa
                if self.model not in model_names and not any(
                    m.startswith(self.model) for m in model_names
                ):
                    logger.warning(
                        f"Model '{self.model}' chưa được pull. "
                        f"Chạy: ollama pull {self.model}"
                    )
            else:
                logger.warning(f"Ollama returned status {resp.status_code}")
        except requests.exceptions.ConnectionError:
            logger.warning(
                f"Không thể kết nối Ollama tại {self.ollama_host}. "
                f"Đảm bảo Ollama đang chạy (https://ollama.com)"
            )
        except Exception as e:
            logger.warning(f"Ollama check failed: {e}")

    def ask(
        self,
        question: str,
        user_context: Optional[Dict[str, Any]] = None,
        n_results: int = 5,
    ) -> Dict[str, Any]:
        """
        Hỏi AI và nhận câu trả lời dựa trên knowledge base.

        Args:
            question: Câu hỏi từ người dùng
            user_context: Thông tin thêm về user (tên, role, ...)
            n_results: Số documents liên quan nhất để lấy

        Returns:
            {
                "answer": "...",
                "sources": [...],
                "kb_docs_used": int,
            }
        """
        # 1. Tìm kiếm trong knowledge base
        kb_docs = self.kb.search(question, n_results=n_results)

        # 2. Xây dựng prompt
        context = self._build_context(kb_docs)
        user_info = self._format_user_context(user_context)
        prompt = self._build_prompt(question, context, user_info)

        # 3. Gọi Ollama
        answer = self._call_ollama(prompt)

        # 4. Trả về kết quả
        return {
            "answer": answer,
            "sources": [
                {
                    "title": d["metadata"].get("title", ""),
                    "type": d["metadata"].get("type", ""),
                    "content": d["content"][:200],
                }
                for d in kb_docs[:3]  # Top 3 nguồn
            ],
            "kb_docs_used": len(kb_docs),
        }

    def _build_context(self, kb_docs: List[Dict]) -> str:
        """Xây dựng context string từ kết quả tìm kiếm KB"""
        if not kb_docs:
            return "Không có thông tin liên quan trong cơ sở kiến thức."

        parts = []
        for i, doc in enumerate(kb_docs[:7]):  # Tối đa 7 documents
            meta = doc["metadata"]
            source_type = meta.get("type", "unknown")
            title = meta.get("title", "")
            header = f"[{source_type.upper()}] {title}" if title else f"[{source_type.upper()}]"
            parts.append(f"{header}\n{doc['content']}")

        return "\n\n---\n\n".join(parts)

    def _format_user_context(self, ctx: Optional[Dict]) -> str:
        """Format thông tin user"""
        if not ctx:
            return ""
        parts = []
        if ctx.get("name"):
            parts.append(f"Tên: {ctx['name']}")
        if ctx.get("role"):
            role_map = {"CUSTOMER": "khách hàng", "PARTNER": "đối tác", "ADMIN": "quản trị viên"}
            parts.append(f"Vai trò: {role_map.get(ctx['role'], ctx['role'])}")
        return "\n".join(parts) if parts else ""

    def _build_prompt(self, question: str, context: str, user_info: str = "") -> str:
        """Xây dựng prompt hoàn chỉnh"""
        parts = [self.SYSTEM_PROMPT]

        if user_info:
            parts.append(f"\nTHÔNG TIN NGƯỜI DÙNG:\n{user_info}")

        parts.append(f"\nCONTEXT:\n{context}")
        parts.append(f"\nCÂU HỎI: {question}")
        parts.append("\nTRẢ LỜI:")

        return "\n\n".join(parts)

    def _call_ollama(self, prompt: str) -> str:
        """
        Gọi Ollama API để sinh câu trả lời.
        """
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,    # Thấp để trả lời chính xác
                    "top_p": 0.9,
                    "max_tokens": 1024,    # Giới hạn độ dài câu trả lời
                },
            }

            resp = requests.post(
                f"{self.ollama_host}/api/generate",
                json=payload,
                timeout=self.timeout,
            )

            if resp.status_code == 200:
                result = resp.json()
                answer = result.get("response", "").strip()
                return answer if answer else "Xin lỗi, tôi không thể trả lời câu hỏi này ngay lúc này."
            else:
                logger.error(f"Ollama error: {resp.status_code} - {resp.text}")
                return self._fallback_response(question="")

        except requests.exceptions.Timeout:
            logger.error("Ollama timeout")
            return "Xin lỗi, tôi đang mất tập trung. Bạn có thể hỏi lại sau được không ạ?"
        except requests.exceptions.ConnectionError:
            logger.error("Ollama connection refused")
            return (
                "Xin lỗi, trợ lý AI chưa sẵn sàng. "
                "Vui lòng đảm bảo Ollama đã được cài đặt và đang chạy.\n\n"
                "Cài đặt: https://ollama.com\n"
                "Sau đó chạy: ollama pull llama3.2:3b"
            )
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            return "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau."

    def _fallback_response(self, question: str) -> str:
        """
        Fallback khi Ollama không hoạt động.
        Dùng keyword matching đơn giản (giống code cũ) để không bị dead.
        """
        q = question.lower()
        if any(w in q for w in ["xin chào", "hello", "hi", "chào"]):
            return "Chào bạn! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn hôm nay? 😊"
        elif any(w in q for w in ["sản phẩm", "mua", "tìm"]):
            return "Bạn có thể tìm sản phẩm bằng thanh tìm kiếm hoặc duyệt danh mục. Bạn cần tìm gì ạ?"
        elif any(w in q for w in ["giá", "bao nhiêu", "giảm", "khuyến mãi"]):
            return "Các sản phẩm có giá cạnh tranh! Bạn xem chi tiết trên trang sản phẩm nhé. Hiện có nhiều mã giảm giá đang chờ bạn!"
        elif any(w in q for w in ["vận chuyển", "ship", "giao hàng"]):
            return "Chúng tôi giao hàng toàn quốc! Miễn phí ship cho đơn từ 500K. Thời gian 2-5 ngày."
        elif any(w in q for w in ["trả", "hoàn", "đổi trả"]):
            return "Hỗ trợ đổi trả trong 7 ngày. Sản phẩm còn nguyên tem, chưa qua sử dụng."
        else:
            return (
                "Cảm ơn bạn đã quan tâm! Tôi có thể hỗ trợ bạn về:\n"
                "- Tìm kiếm sản phẩm\n"
                "- Thông tin đơn hàng\n"
                "- Chính sách vận chuyển & đổi trả\n"
                "- Mã giảm giá & khuyến mãi\n\n"
                "Bạn muốn hỏi gì ạ?"
            )

    def chat(
        self,
        messages: List[Dict[str, str]],
        user_context: Optional[Dict] = None,
    ) -> str:
        """
        Chat với lịch sử messages (dạng [{"role": "user", "content": "..."}, ...]).
        Dùng cho các cuộc hội thoại nhiều lượt.
        """
        # Lấy câu hỏi mới nhất
        last_user_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_user_msg = msg["content"]
                break

        if not last_user_msg:
            return "Bạn muốn hỏi gì ạ?"

        # Tìm kiếm trong KB
        kb_docs = self.kb.search(last_user_msg, n_results=5)
        context = self._build_context(kb_docs)
        user_info = self._format_user_context(user_context)

        # Xây dựng prompt với lịch sử
        history_str = ""
        recent = messages[-6:-1]  # 5 messages gần nhất (không tính câu cuối)
        for m in recent:
            role = "Người dùng" if m["role"] == "user" else "AI"
            history_str += f"{role}: {m['content']}\n"

        prompt_parts = [self.SYSTEM_PROMPT]
        if history_str.strip():
            prompt_parts.append(f"LỊCH SỬ HỘI THOẠI:\n{history_str.strip()}")
        if user_info:
            prompt_parts.append(f"THÔNG TIN NGƯỜI DÙNG:\n{user_info}")
        prompt_parts.append(f"CONTEXT:\n{context}")
        prompt_parts.append(f"CÂU HỎI: {last_user_msg}")
        prompt_parts.append("TRẢ LỜI:")

        prompt = "\n\n".join(prompt_parts)
        return self._call_ollama(prompt)
