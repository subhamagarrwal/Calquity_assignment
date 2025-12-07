from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from services.pdf_loader import pdf_loader
from services.rag import rag_system
import os
import shutil

router = APIRouter(
    prefix="/upload",
    tags=["Upload"]
)

@router.post("/")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process PDF file"""
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    file_path = os.path.join(pdf_loader.calquity_dir, file.filename)
    
    try:
        # Save file to temp directory
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"✓ Saved to temp: {file.filename}")
        
        # Extract text chunks
        chunks = pdf_loader.extract_text(file_path)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Failed to extract text from PDF")
        
        # Add to RAG system
        rag_system.add_documents(chunks, file.filename)
        
        return JSONResponse(content={
            "message": "PDF uploaded successfully",
            "filename": file.filename,
            "pages": len(set(chunk['page'] for chunk in chunks)),
            "chunks": len(chunks),
            "status": "success"
        })
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/documents")
async def list_documents():
    """List all uploaded PDFs (from temp directory)"""
    try:
        if not os.path.exists(pdf_loader.calquity_dir):
            return {"documents": [], "count": 0}
        
        documents = [f for f in os.listdir(pdf_loader.calquity_dir) if f.endswith('.pdf')]
        return {
            "documents": documents,
            "count": len(documents)
        }
    except Exception as e:
        print(f"✗ Error listing documents: {str(e)}")
        return {"documents": [], "count": 0}

@router.get("/uploads/{filename}")
async def get_pdf_file(filename: str):
    """Serve uploaded PDF file from temp directory"""
    file_path = os.path.join(pdf_loader.calquity_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=filename
    )

@router.delete("/{filename}")
async def delete_document(filename: str):
    """Delete a PDF from temp storage"""
    try:
        rag_system.delete_document(filename)
        
        file_path = os.path.join(pdf_loader.calquity_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"✓ Deleted from temp: {filename}")
        
        return {"message": f"Deleted {filename}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))