import os
from typing import AsyncGenerator, List, Dict, Optional
import re
import json

class LLMService:
    """Groq LLM Service with Llama 4 multimodal support"""
    
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
        # Llama 4 multimodal model for vision tasks
        self.vision_model = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
        self._initialized = True
        print(" LLM Service ready")
    
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
        """Extract data-rich components from response - DEPRECATED, use generate_visualization instead"""
        
        if citations is None:
            citations = []
        
        # Try to extract actual numerical data from the response
        numbers = re.findall(r'[\$₹]?\s*[\d,]+(?:\.\d+)?\s*(?:Cr|crore|million|billion|%|percent)?', response_text, re.IGNORECASE)
        
        if len(numbers) >= 3:
            # We have enough numbers for a chart
            data_points = []
            labels = ["Value 1", "Value 2", "Value 3", "Value 4", "Value 5"]
            for i, num_str in enumerate(numbers[:5]):
                # Extract just the number
                num_match = re.search(r'[\d,]+(?:\.\d+)?', num_str)
                if num_match:
                    try:
                        value = float(num_match.group().replace(',', ''))
                        data_points.append({
                            "label": labels[i] if i < len(labels) else f"Item {i+1}",
                            "value": value
                        })
                    except ValueError:
                        continue
            
            if len(data_points) >= 2:
                return [{
                    "component": "BarChart",
                    "props": {
                        "title": "Key Metrics",
                        "data": data_points
                    }
                }]
        
        # Look for percentage changes
        change_match = re.search(r'([+-]?\d+(?:\.\d+)?)\s*%', response_text)
        value_match = re.search(r'[\$₹]\s*[\d,]+(?:\.\d+)?\s*(?:Cr|crore|million|billion)?', response_text, re.IGNORECASE)
        
        if value_match:
            return [{
                "component": "MetricCard",
                "props": {
                    "title": "Key Finding",
                    "value": value_match.group().strip(),
                    "change": change_match.group() if change_match else None,
                    "color": "green" if change_match and '+' in change_match.group() else "blue"
                }
            }]
        
        # Fallback - but don't use page numbers
        return [{
            "component": "InfoCard",
            "props": {
                "title": "Analysis Summary",
                "value": "See detailed response above",
                "icon": "📄",
                "color": "blue"
            }
        }]
    
    def generate_visualization(self, query: str, context: str, citations: List[Dict] = None) -> Optional[Dict]:
        """Generate a visualization component using LLM with real data extraction"""
        self._ensure_client()
        
        component_prompt = """You are a financial data visualization expert. Your job is to extract REAL numerical data from documents and create meaningful visualizations.

CRITICAL RULES:
1. Extract ACTUAL numbers, percentages, and values from the context
2. NEVER use placeholder text like "See details below" or page numbers as values
3. If you find financial data, use BarChart or LineChart with real values
4. If you find percentages or distributions, use PieChart
5. If you find growth rates or changes, use MetricCard with the actual percentage
6. For comparisons, use Table with actual data

Available components with examples:

1. MetricCard - For a key metric with change
   {"component": "MetricCard", "props": {"title": "Revenue Growth", "value": "₹2,34,500 Cr", "change": "+15.2%", "color": "green"}}

2. BarChart - For comparing values (MUST have at least 3 data points with real numbers)
   {"component": "BarChart", "props": {"title": "Quarterly Revenue", "data": [{"label": "Q1 FY24", "value": 12500}, {"label": "Q2 FY24", "value": 14200}, {"label": "Q3 FY24", "value": 15800}]}}

3. LineChart - For trends over time
   {"component": "LineChart", "props": {"title": "Stock Price Trend", "data": [{"label": "Jan", "value": 2450}, {"label": "Feb", "value": 2520}, {"label": "Mar", "value": 2680}]}}

4. PieChart - For showing proportions (values should add up meaningfully)
   {"component": "PieChart", "props": {"title": "Revenue Breakdown", "data": [{"label": "Digital Services", "value": 45}, {"label": "Retail", "value": 30}, {"label": "Oil & Gas", "value": 25}]}}

5. Table - For structured data
   {"component": "Table", "props": {"title": "Financial Summary", "headers": ["Metric", "FY24", "FY23", "Change"], "rows": [["Revenue", "₹2.3L Cr", "₹2.0L Cr", "+15%"], ["EBITDA", "₹58,000 Cr", "₹52,000 Cr", "+11.5%"]]}}

6. InfoCard - ONLY use if no numerical data is available
   {"component": "InfoCard", "props": {"title": "Company Overview", "value": "Reliance Industries", "icon": "🏢", "color": "blue"}}

PRIORITY ORDER: BarChart > Table > MetricCard > PieChart > LineChart > InfoCard

Respond with ONLY valid JSON. Extract REAL data from the context provided."""

        try:
            citations_text = ""
            if citations:
                citation_parts = []
                for c in citations:
                    excerpt = c.get('excerpt', '')[:200]
                    citation_parts.append(f"[{c['number']}] {c['source']} p.{c['page']}: {excerpt}")
                citations_text = "\n\nSOURCE EXCERPTS:\n" + '\n'.join(citation_parts)
            
            user_prompt = f"""User Query: {query}

Document Content:
{context[:3000]}
{citations_text}

IMPORTANT: Extract REAL numerical data (revenues, percentages, growth rates, comparisons) from the above content.
Create a visualization that answers the user's query with actual data points.
DO NOT use placeholder values. If you can't find specific numbers, look for percentages or ratios.

Generate the most appropriate visualization JSON:"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": component_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,  # Lower temperature for more precise data extraction
                max_tokens=800
            )
            
            text = response.choices[0].message.content
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                component = json.loads(json_match.group())
                comp_type = component.get('component', 'Unknown')
                print(f"✓ Generated visualization: {comp_type}")
                
                # Validate component has real data
                props = component.get('props', {})
                if comp_type in ['BarChart', 'LineChart', 'PieChart']:
                    data = props.get('data', [])
                    if len(data) >= 2:
                        return component
                    else:
                        print("⚠️ Chart has insufficient data points, will retry")
                elif comp_type == 'Table':
                    rows = props.get('rows', [])
                    if len(rows) >= 1:
                        return component
                elif comp_type == 'MetricCard':
                    value = props.get('value', '')
                    # Check if value contains actual data (numbers or currency)
                    if any(c.isdigit() for c in value) or '₹' in value or '$' in value or '%' in value:
                        return component
                else:
                    return component
                    
        except Exception as e:
            print(f"⚠️ Visualization generation error: {e}")
        
        return None
    
    async def stream_with_visualization(
        self,
        query: str,
        context_chunks: List[Dict]
    ) -> AsyncGenerator[Dict, None]:
        """Stream text response and generate visualization with real data"""
        
        self._ensure_client()
        prompt = self.build_prompt(query, context_chunks)
        
        full_response = ""
        
        try:
            # Stream the text response
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
                temperature=0.7,
                max_tokens=1500
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_response += token
                    yield {"type": "text", "content": token}
            
            # Extract citations
            citations = self.extract_citations(full_response, context_chunks)
            for citation in citations:
                yield {"type": "citation", "content": citation}
            
            # Generate visualization with full context from chunks
            if len(full_response) > 50:
                # Build rich context from all chunks for better data extraction
                context_parts = []
                for chunk in context_chunks:
                    source = chunk['metadata'].get('source', 'Unknown')
                    page = chunk['metadata'].get('page', 0)
                    content = chunk['content']
                    context_parts.append(f"[{source} p.{page}]: {content}")
                
                full_context = "\n\n".join(context_parts)
                
                # Add the AI's response as additional context
                full_context += f"\n\nAI ANALYSIS:\n{full_response}"
                
                component = self.generate_visualization(query, full_context, citations)
                if component:
                    yield {"type": "component", "content": component}
                else:
                    print("⚠️ No valid visualization generated from backend")
        
        except Exception as e:
            yield {"type": "error", "content": str(e)}

llm_service = LLMService()