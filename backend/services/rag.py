import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict   
import os

class RAGSystem:
    
    def __init__(self, persist_dir: str = "data/chromadb"):
        self.collection_name = "documents"
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Create or get collection
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "PDF document chunks"}
        )
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        print("RAG System initialized")
        print(f"  - Collection: {self.collection.name}")
        print(f"  - Documents: {self.collection.count()}")
    
    def add_documents(self, chunks: List[Dict], pdf_name: str):
        """Add PDF chunks to vector database"""
        documents = []
        metadatas = []
        ids = []
        
        for i, chunk in enumerate(chunks):
            doc_id = f"{pdf_name}_page_{chunk['page']}_chunk_{i}"
            
            documents.append(chunk['content'])
            metadatas.append({
                "source": pdf_name,
                "page": chunk['page'],
                "chunk_index": i,
                **chunk.get('metadata', {})
            })
            ids.append(doc_id)
        
        # Add to ChromaDB
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✓ Added {len(documents)} chunks from {pdf_name}")
    
    def search(self, query: str, k: int = 5) -> List[Dict]:
        """Search for document chunks"""
        return self.retrieve(query, top_k=k)
    
    def retrieve(self, query: str, top_k: int = 3) -> List[Dict]:
        """Retrieve most relevant document chunks"""
        if self.collection.count() == 0:
            print("No documents in collection")
            return []
        
        results = self.collection.query(
            query_texts=[query],
            n_results=min(top_k, self.collection.count())
        )
        
        # Format results
        retrieved = []
        for i in range(len(results['documents'][0])):
            retrieved.append({
                "content": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "score": results['distances'][0][i] if 'distances' in results else 1.0
            })
        
        print(f"Retrieved {len(retrieved)} chunks for query: '{query[:50]}...'")
        return retrieved
    
    def get_all_documents(self) -> List[str]:
        """Get list of all PDFs in database"""
        all_docs = self.collection.get()
        sources = set()
        
        for metadata in all_docs['metadatas']:
            sources.add(metadata.get('source', 'unknown'))
        
        return list(sources)
    
    def delete_document(self, pdf_name: str):
        """Delete all chunks from a specific PDF"""
        all_docs = self.collection.get()
        ids_to_delete = []
        
        for i, metadata in enumerate(all_docs['metadatas']):
            if metadata.get('source') == pdf_name:
                ids_to_delete.append(all_docs['ids'][i])
        
        if ids_to_delete:
            self.collection.delete(ids=ids_to_delete)
            print(f"Deleted {len(ids_to_delete)} chunks from {pdf_name}")

    def clear_all(self):
        """Clear all documents from the collection"""
        try:
            self.client.delete_collection(name=self.collection_name)
            self.collection = self.client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            print("  RAG system cleared")
        except Exception as e:
            print(f"Error clearing RAG: {str(e)}")


rag_system = RAGSystem()