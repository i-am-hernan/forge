from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from models.database import get_db, Audiobook
from models.schemas import AudiobookResponse, AudiobookWithImages, UploadResponse
from services.storage_service import storage_service

router = APIRouter(prefix="/audiobooks", tags=["audiobooks"])

@router.post("/upload", response_model=UploadResponse)
async def upload_audiobook(
    file: UploadFile = File(...),
    style_prompt: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload an audiobook file with style prompt"""
    
    # Save file
    filename, file_path = await storage_service.save_audio_file(file)
    
    # Create database record
    audiobook = Audiobook(
        filename=filename,
        original_name=file.filename,
        style_prompt=style_prompt,
        file_path=file_path
    )
    
    db.add(audiobook)
    db.commit()
    db.refresh(audiobook)
    
    return UploadResponse(
        message="Audiobook uploaded successfully",
        audiobook=AudiobookResponse.model_validate(audiobook)
    )

@router.get("/{audiobook_id}", response_model=AudiobookWithImages)
async def get_audiobook(audiobook_id: int, db: Session = Depends(get_db)):
    """Get audiobook details with generated images"""
    
    audiobook = db.query(Audiobook).filter(Audiobook.id == audiobook_id).first()
    if not audiobook:
        raise HTTPException(status_code=404, detail="Audiobook not found")
    
    return AudiobookWithImages.model_validate(audiobook)

@router.get("/", response_model=List[AudiobookResponse])
async def list_audiobooks(db: Session = Depends(get_db)):
    """List all audiobooks"""
    
    audiobooks = db.query(Audiobook).all()
    return [AudiobookResponse.model_validate(book) for book in audiobooks]

@router.delete("/{audiobook_id}")
async def delete_audiobook(audiobook_id: int, db: Session = Depends(get_db)):
    """Delete an audiobook and its files"""
    
    audiobook = db.query(Audiobook).filter(Audiobook.id == audiobook_id).first()
    if not audiobook:
        raise HTTPException(status_code=404, detail="Audiobook not found")
    
    # Delete file
    storage_service.delete_file(audiobook.file_path)
    
    # Delete from database (cascade will handle images)
    db.delete(audiobook)
    db.commit()
    
    return {"message": "Audiobook deleted successfully"}

@router.get("/{audiobook_id}/audio")
async def serve_audio(audiobook_id: int, db: Session = Depends(get_db)):
    """Serve audio file for playback"""
    
    audiobook = db.query(Audiobook).filter(Audiobook.id == audiobook_id).first()
    if not audiobook:
        raise HTTPException(status_code=404, detail="Audiobook not found")
    
    if not os.path.exists(audiobook.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        audiobook.file_path,
        media_type="audio/mp4",
        filename=audiobook.original_name
    )