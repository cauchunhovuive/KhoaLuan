"""
RAG (Retrieval-Augmented Generation) module
Knowledge base + Ollama-powered AI chat for e-commerce
"""
from .knowledge_base import KnowledgeBase
from .rag_service import RAGService

__all__ = ["KnowledgeBase", "RAGService"]
