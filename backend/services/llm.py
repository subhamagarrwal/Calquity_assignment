import os
from typing import AsyncGenerator, List, Dict, Optional
import re
import json

class LLMService:
    """Groq LLM Service with component generation"""
    
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
        if not self.api_key:
            print("⚠️ GROQ_API_KEY not set")
        
        self.client = None
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self._initialized = True
        print("✓ LLM Service ready (lazy mode)")
    
    def _ensure_client(self):
        """Initialize Groq client only when needed"""
        if self.client is not None:
            return
        
        from groq import Groq
        self.client = Groq(api_key=self.api_key)
        print(f"✓ Groq client initialized ({self.model})")
    
    def build_prompt(self, query: str, context_chunks: List[Dict]) -> str:
        """Build prompt with retrieved context + component instructions"""
        
        context = "\n\n".join([
            f"[Source: {chunk['metadata']['source']}, Page {chunk['metadata']['page']}]\n{chunk['content']}"
            for chunk in context_chunks
        ])
        
        prompt = f"""You are a helpful AI assistant analyzing documents.

CONTEXT FROM DOCUMENTS:
{context}

USER QUESTION:
{query}

INSTRUCTIONS:
1. Answer using ONLY the context provided
2. If context doesn't contain answer, say "I don't have enough information"
3. Always cite sources: (Source: filename.pdf, Page X)
4. Be concise and clear

SPECIAL: If the question asks for data visualization (charts, tables, statistics):
- After your text answer, add: [COMPONENT]
- Then add SINGLE-LINE JSON (no newlines) for the component

Available components:
- BarChart: {{"name":"BarChart","props":{{"title":"...","data":[{{"label":"...","value":123}}]}}}}
- Table: {{"name":"Table","props":{{"title":"...","headers":["..."],"rows":[["..."]]}}}}
- InfoCard: {{"name":"InfoCard","props":{{"title":"...","value":"...","icon":"📊","color":"blue"}}}}

IMPORTANT: Component JSON must be on ONE LINE with no spaces after colons or commas inside the JSON.

ANSWER:"""
        
        return prompt
    
    async def stream_response(
        self, 
        query: str, 
        context_chunks: List[Dict]
    ) -> AsyncGenerator[str, None]:
        """Stream LLM response token by token"""
        
        self._ensure_client()
        prompt = self.build_prompt(query, context_chunks)
        
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful document analysis assistant. Always cite sources. You can generate visual components when appropriate. Always output component JSON on a single line."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                stream=True,
                temperature=0.3,
                max_tokens=2000
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        
        except Exception as e:
            yield f"\n\n❌ Error: {str(e)}"
    
    def extract_citations(self, response_text: str) -> List[Dict]:
        """Extract citations from LLM response"""
        
        citations = []
        pattern = r'\(Source:\s*([^,]+),\s*Page\s*(\d+)\)'
        
        matches = re.finditer(pattern, response_text)
        for match in matches:
            citations.append({
                "source": match.group(1).strip(),
                "page": int(match.group(2))
            })
        
        return citations
    
    def extract_components(self, response_text: str) -> List[Dict]:
        """Extract component definitions from response"""
        
        components = []
        
        # Look for [COMPONENT] marker followed by JSON
        # Match everything between { and } including nested braces
        pattern = r'\[COMPONENT\]\s*(\{(?:[^{}]|(?:\{[^{}]*\}))*\})'
        matches = re.finditer(pattern, response_text, re.DOTALL)
        
        for match in matches:
            try:
                component_json = match.group(1)
                # Remove all newlines and extra spaces
                component_json = re.sub(r'\s+', ' ', component_json)
                component_json = component_json.strip()
                
                component_data = json.loads(component_json)
                components.append(component_data)
                print(f"✓ Parsed component: {component_data.get('name', 'unknown')}")
            except json.JSONDecodeError as e:
                print(f"⚠️ Failed to parse component JSON: {match.group(1)[:100]}...")
                print(f"   Error: {str(e)}")
        
        return components

llm_service = LLMService()