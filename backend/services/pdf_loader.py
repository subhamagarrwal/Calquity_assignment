import os
import tempfile
from typing import List, Dict
from pypdf import PdfReader

class PDFLoader:
    """Extract text from PDFs and chunk them"""
    
    def __init__(self):
        # Use system temp directory instead of persistent storage
        self.upload_dir = tempfile.gettempdir()
        self.calquity_dir = os.path.join(self.upload_dir, 'calquity_uploads')
        os.makedirs(self.calquity_dir, exist_ok=True)
        print(f"PDF Loader initialized (temp dir: {self.calquity_dir})")
    
    def extract_text(self, pdf_path: str, chunk_size: int = 500) -> List[Dict]:
        """Extract text from PDF and split into chunks"""
        try:
            reader = PdfReader(pdf_path)
            chunks = []
            
            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                
                if not text.strip():
                    continue
                
                # Split page into chunks
                words = text.split()
                for i in range(0, len(words), chunk_size):
                    chunk_text = ' '.join(words[i:i + chunk_size])
                    
                    chunks.append({
                        'content': chunk_text,
                        'page': page_num,
                        'metadata': {
                            'page': page_num,
                            'chunk_index': i // chunk_size
                        }
                    })
            
            print(f" Extracted {len(chunks)} chunks from {len(reader.pages)} pages")
            return chunks
        
        except Exception as e:
            print(f"Error extracting PDF: {str(e)}")
            return []

pdf_loader = PDFLoader()