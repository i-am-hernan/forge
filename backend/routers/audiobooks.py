from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import os
import re

from models.database import get_db, Audiobook, GeneratedImage
from models.schemas import AudiobookResponse, AudiobookWithImages, UploadResponse
from services.storage_service import storage_service
from services.audio_service import AudioService
from services.transcription_service import TranscriptionService
from services.image_service import ImageService

router = APIRouter(prefix="/audiobooks", tags=["audiobooks"])

@router.post("/upload", response_model=UploadResponse)
async def upload_audiobook(
    file: UploadFile = File(...),
    style_prompt: str = Form(...),
    db: Session = Depends(get_db)
):
    """Upload an audiobook file with style prompt"""
    
    # Save file
    print("Saving file...")
    print("File:", file.filename,file.content_type);
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
async def serve_audio(audiobook_id: int, request: Request, db: Session = Depends(get_db)):
    """Serve audio file for playback with range request support"""

    audiobook = db.query(Audiobook).filter(Audiobook.id == audiobook_id).first()
    if not audiobook:
        raise HTTPException(status_code=404, detail="Audiobook not found")

    if not os.path.exists(audiobook.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    file_size = os.path.getsize(audiobook.file_path)
    range_header = request.headers.get("range")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range",
    }

    # Handle range requests
    if range_header:
        range_match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1

            if start >= file_size:
                raise HTTPException(status_code=416, detail="Range not satisfiable")

            end = min(end, file_size - 1)
            content_length = end - start + 1

            headers.update({
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Content-Length": str(content_length),
            })

            def iter_file(start: int, end: int):
                with open(audiobook.file_path, "rb") as f:
                    f.seek(start)
                    remaining = end - start + 1
                    while remaining:
                        chunk_size = min(8192, remaining)
                        chunk = f.read(chunk_size)
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk

            return StreamingResponse(
                iter_file(start, end),
                status_code=206,
                headers=headers,
                media_type="audio/mp4"
            )

    # Full file response for non-range requests
    def iter_file():
        with open(audiobook.file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    return StreamingResponse(
        iter_file(),
        status_code=200,
        headers=headers,
        media_type="audio/mp4"
    )

@router.post("/{audiobook_id}/generate-image")
async def generate_image(
    audiobook_id: int,
    timestamp: float = Form(...),
    db: Session = Depends(get_db)
):
    """Generate an image at a specific timestamp"""

    # Get audiobook
    audiobook = db.query(Audiobook).filter(Audiobook.id == audiobook_id).first()
    if not audiobook:
        raise HTTPException(status_code=404, detail="Audiobook not found")

    if not os.path.exists(audiobook.file_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        # Initialize services
        audio_service = AudioService()
        transcription_service = TranscriptionService()
        image_service = ImageService()

        # Extract 30-second audio segment ending at the timestamp
        start_time = max(0, timestamp - 30)
        audio_data = audio_service.extract_audio_segment(
            audiobook.file_path,
            start_time,
            30.0
        )

        if not audio_data:
            raise HTTPException(status_code=500, detail="Failed to extract audio segment")

        # Transcribe the audio
        transcription = transcription_service.transcribe_audio_segment(audio_data)
        if not transcription:
            # Use fallback transcription
            transcription = transcription_service.create_fallback_transcription(timestamp)

        # Generate image
        image_result = image_service.generate_image(
            audiobook.style_prompt,
            transcription,
            audiobook_id,
            int(timestamp)
        )

        if not image_result:
            raise HTTPException(status_code=500, detail="Failed to generate image")

        # Save to database
        generated_image = GeneratedImage(
            audiobook_id=audiobook_id,
            timestamp_seconds=int(timestamp),
            transcription=transcription,
            image_prompt=image_result["image_prompt"],
            image_filename=image_result["image_filename"],
            image_path=image_result["image_path"]
        )

        db.add(generated_image)
        db.commit()
        db.refresh(generated_image)

        return {
            "message": "Image generated successfully",
            "image": {
                "id": generated_image.id,
                "timestamp_seconds": generated_image.timestamp_seconds,
                "transcription": generated_image.transcription,
                "image_filename": generated_image.image_filename,
                "created_at": generated_image.created_at.isoformat()
            }
        }

    except Exception as e:
        print(f"Error generating image: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")

@router.get("/{audiobook_id}/images/{image_filename}")
async def serve_image(audiobook_id: int, image_filename: str, db: Session = Depends(get_db)):
    """Serve generated image file"""

    # Verify the image belongs to this audiobook
    image = db.query(GeneratedImage).filter(
        GeneratedImage.audiobook_id == audiobook_id,
        GeneratedImage.image_filename == image_filename
    ).first()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if not os.path.exists(image.image_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(
        image.image_path,
        media_type="image/png",
        filename=image_filename,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )
