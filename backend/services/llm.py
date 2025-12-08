import os
from typing import AsyncGenerator, List, Dict, Optional
import re

class LLMService:
    """Groq LLM Service with numbered citations"""
    
    _instance: Optional['LLMService'] = None
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = None
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self._initialized = True
        print("✓ LLM Service ready")
    
    def _ensure_client(self):
        if self.client is not None:
            return
        from groq import Groq
        self.client = Groq(api_key=self.api_key)
        print(f"✓ Groq client initialized ({self.model})")
    
    def build_prompt(self, query: str, context_chunks: List[Dict]) -> str:
        """Build prompt with numbered sources"""
        
        # Build context with numbers
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            context_parts.append(
                f"[{i}] Source: {chunk['metadata']['source']}, Page {chunk['metadata']['page']}\n"
                f"{chunk['content']}"
            )
        
        context = "\n\n".join(context_parts)
        
        prompt = f"""Answer the question using the provided context. 
IMPORTANT: When you use information from a source, cite it using [1], [2], [3] etc.

CONTEXT:
{context}

QUESTION: {query}

Provide a clear answer with inline citations like [1], [2], etc. referring to the source numbers above."""
        
        return prompt
    
    async def stream_response(
        self, 
        query: str, 
        context_chunks: List[Dict]
    ) -> AsyncGenerator[str, None]:
        """Stream LLM response"""
        
        self._ensure_client()
        prompt = self.build_prompt(query, context_chunks)
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                temperature=0.7,
                max_tokens=1500
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        
        except Exception as e:
            yield f"\n\n❌ Error: {str(e)}"
    
    def extract_citations(self, response_text: str, context_chunks: List[Dict]) -> List[Dict]:
        """Extract numbered citations from response"""
        
        citations = []
        seen = set()
        
        # Find all [1], [2], etc. in response
        numbers = re.findall(r'\[(\d+)\]', response_text)
        
        for num_str in numbers:
            num = int(num_str)
            if num <= len(context_chunks) and num not in seen:
                seen.add(num)
                chunk = context_chunks[num - 1]
                citations.append({
                    "number": num,
                    "source": chunk['metadata']['source'],
                    "page": chunk['metadata']['page'],
                    "excerpt": chunk['content'][:150] + "..."
                })
        
        return citations
    
    def extract_components(self, response_text: str, query: str = "", citations: List[Dict] = None) -> List[Dict]:
        """Generate component from response"""
        
        if citations is None:
            citations = []
        
        # Extract title from first sentence
        sentences = re.split(r'[.!?]', response_text)
        title = "Summary"
        for sentence in sentences:
            sentence = re.sub(r'\[\d+\]', '', sentence).strip()
            if len(sentence) > 20:
                title = sentence[:45] + ("..." if len(sentence) > 45 else "")
                break
        
        # Extract value
        value = "See details below"
        patterns = [
            (r'(\d+(?:\.\d+)?)\s*%', '{}%'),
            (r'Rs\.?\s*([\d,]+)', 'Rs {}'),
            (r'\$([\d,]+)', '${}'),
        ]
        
        for pattern, fmt in patterns:
            match = re.search(pattern, response_text)
            if match:
                value = fmt.format(match.group(1))
                break
        
        if value == "See details below" and citations:
            pages = [str(c['page']) for c in citations[:3]]
            value = f"Pages {', '.join(pages)}"
        
        return [{
            "name": "InfoCard",
            "props": {
                "title": title[:50],
                "value": value[:40],
                "icon": "📊",
                "color": "blue"
            }
        }]

llm_service = LLMService()