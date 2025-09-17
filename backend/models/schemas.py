from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class AudiobookCreate(BaseModel):
    style_prompt: str

class AudiobookResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    style_prompt: str
    duration_seconds: Optional[int]
    upload_timestamp: datetime
    file_path: str
    
    class Config:
        from_attributes = True

class GeneratedImageResponse(BaseModel):
    id: int
    audiobook_id: int
    timestamp_seconds: int
    transcription: str
    image_prompt: str
    image_filename: str
    image_path: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class AudiobookWithImages(AudiobookResponse):
    images: List[GeneratedImageResponse] = []

class UploadResponse(BaseModel):
    message: str
    audiobook: AudiobookResponse