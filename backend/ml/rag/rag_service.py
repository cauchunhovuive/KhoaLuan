"""
RAG Service — Retrieval-Augmented Generation pipeline

1. Nhận câu hỏi từ user
2. Tìm kiếm documents liên quan trong Knowledge Base
3. Xây dựng prompt với context + câu hỏi
4. Gửi đến AI provider (Ollama local, Groq cloud, ...) để sinh câu trả lời
5. Trả về câu trả lời + nguồn tham khảo

Hỗ trợ multiple providers:
- ollama: Chạy local, cần cài Ollama
- groq: Dùng Groq API (free tier), cần GROQ_API_KEY
"""

import os
import logging
from typing import List, Dict, Optional, Any

from .knowledge_base import KnowledgeBase

logger = logging.getLogger(__name__)

# AI Provider configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama").lower()  # ollama | groq

# Ollama configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# Groq configuration (OpenAI-compatible)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Chung
AI_TIMEOUT = int(os.getenv("AI_TIMEOUT", "30"))


class RAGService:
    """
    RAG pipeline sử dụng Knowledge Base + AI provider.
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
        self.provider = AI_PROVIDER

        # Cấu hình theo provider
        if self.provider == "groq":
            self.model = model or GROQ_MODEL
            self.api_key = GROQ_API_KEY
            self.api_url = f"{GROQ_BASE_URL}/chat/completions"
            if not self.api_key:
                logger.warning("GROQ_API_KEY not set — Groq will not work")
        else:
            # Ollama (default)
            self.model = model or OLLAMA_MODEL
            self.ollama_host = OLLAMA_HOST
            self.api_url = f"{self.ollama_host}/api/generate"
            self._check_ollama()

        self.timeout = AI_TIMEOUT
        logger.info(f"RAGService initialized: provider={self.provider}, model={self.model}")

    def _check_ollama(self):
        """Kiểm tra Ollama service có chạy không (lazy import requests)"""
        try:
            import requests
        except ImportError:
            logger.warning("requests not available — skipping Ollama health check")
            return

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
        Gọi AI provider để sinh câu trả lời.
        Hỗ trợ: Ollama (local), Groq (cloud).
        """
        try:
            import requests
        except ImportError:
            logger.warning("requests not available — using fallback response")
            return self._fallback_response(question="")

        try:
            if self.provider == "groq":
                return self._call_groq(prompt, requests)
            else:
                return self._call_ollama_direct(prompt, requests)
        except Exception as e:
            logger.error(f"AI provider error ({self.provider}): {e}")
            return self._fallback_response(question="")

    def _call_ollama_direct(self, prompt: str, requests) -> str:
        """Gọi Ollama local API"""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
                "max_tokens": 1024,
            },
        }

        resp = requests.post(
            self.api_url,
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

    def _call_groq(self, prompt: str, requests) -> str:
        """Gọi Groq API (OpenAI-compatible chat completions)"""
        if not self.api_key:
            logger.warning("GROQ_API_KEY not set")
            return self._fallback_response(question="")

        # Tách prompt thành system + user messages
        # Format prompt: SYSTEM_INSTRUCTIONS + CONTEXT + "CÂU HỎI: ..."
        messages = []

        if "CÂU HỎI:" in prompt:
            parts = prompt.split("CÂU HỎI:", 1)
            system_content = parts[0].strip()
            user_question = parts[1].strip()
            # Bỏ "TRẢ LỜI:" ở cuối nếu có
            if user_question.endswith("TRẢ LỜI:"):
                user_question = user_question[:-len("TRẢ LỜI:")].strip()
            if system_content:
                messages.append({"role": "system", "content": system_content})
            if user_question:
                messages.append({"role": "user", "content": user_question})
        else:
            messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1024,
            "top_p": 0.9,
        }

        resp = requests.post(
            self.api_url,
            json=payload,
            headers=headers,
            timeout=self.timeout,
        )

        if resp.status_code == 200:
            result = resp.json()
            choices = result.get("choices", [])
            if choices:
                answer = choices[0].get("message", {}).get("content", "").strip()
                return answer if answer else "Xin lỗi, tôi không thể trả lời câu hỏi này ngay lúc này."
        else:
            logger.error(f"Groq error: {resp.status_code} - {resp.text}")
            if resp.status_code == 401:
                return "Xin lỗi, API key không hợp lệ. Vui lòng kiểm tra lại GROQ_API_KEY."
            elif resp.status_code == 429:
                return "Xin lỗi, đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau."

        return self._fallback_response(question="")

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
