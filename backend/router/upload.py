from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from backend.services.pdf_loader import pdf_loader
from backend.services.rag import rag_system
import os
import shutil
import base64

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
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"✓ Saved: {file.filename}")
        
        chunks = pdf_loader.extract_text(file_path)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Failed to extract text from PDF")
        
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

@router.post("/clear")
async def clear_all_documents():
    """Clear all uploaded PDFs and reset RAG system"""
    try:
        # Clear RAG system
        rag_system.clear_all()
        
        # Clear PDF files
        if os.path.exists(pdf_loader.calquity_dir):
            for file in os.listdir(pdf_loader.calquity_dir):
                if file.endswith('.pdf'):
                    os.remove(os.path.join(pdf_loader.calquity_dir, file))
        
        print("🧹 Cleared all documents")
        return {"message": "All documents cleared", "status": "success"}
    except Exception as e:
        print(f"✗ Clear error: {str(e)}")
        return {"message": str(e), "status": "error"}

@router.get("/documents")
async def list_documents():
    """List all uploaded PDFs"""
    try:
        if not os.path.exists(pdf_loader.calquity_dir):
            return {"documents": [], "count": 0}
        
        documents = [f for f in os.listdir(pdf_loader.calquity_dir) if f.endswith('.pdf')]
        return {"documents": documents, "count": len(documents)}
    except Exception as e:
        print(f"✗ Error listing documents: {str(e)}")
        return {"documents": [], "count": 0}

@router.get("/pdf/{filename}")
async def get_pdf_file(filename: str):
    """Serve PDF file for inline viewing"""
    file_path = os.path.join(pdf_loader.calquity_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache",
        }
    )

@router.delete("/{filename}")
async def delete_document(filename: str):
    """Delete a specific PDF"""
    try:
        rag_system.delete_document(filename)
        
        file_path = os.path.join(pdf_loader.calquity_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"✓ Deleted: {filename}")
        
        return {"message": f"Deleted {filename}", "status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pdf/{filename}/screenshot")
async def get_pdf_screenshot(filename: str, page: int = Query(1, ge=1)):
    """Get a screenshot of a specific PDF page as base64"""
    file_path = os.path.join(pdf_loader.calquity_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    
    try:
        import fitz  # PyMuPDF
        
        doc = fitz.open(file_path)
        
        if page > len(doc):
            page = len(doc)
        
        pdf_page = doc[page - 1]  # 0-indexed
        
        # Render page to image
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better quality
        pix = pdf_page.get_pixmap(matrix=mat)
        
        # Convert to base64
        img_data = pix.tobytes("png")
        base64_img = base64.b64encode(img_data).decode('utf-8')
        
        doc.close()
        
        return JSONResponse({
            "image": base64_img,
            "page": page,
            "total_pages": len(doc),
            "width": pix.width,
            "height": pix.height
        })
        
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="PyMuPDF not installed. Run: pip install pymupdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))