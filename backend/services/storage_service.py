import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from config.settings import settings

class StorageService:
    def __init__(self):
        self.upload_dir = settings.upload_dir
        self.audio_dir = os.path.join(self.upload_dir, "audio")
        self.images_dir = os.path.join(self.upload_dir, "images")
        
        # Ensure directories exist
        os.makedirs(self.audio_dir, exist_ok=True)
        os.makedirs(self.images_dir, exist_ok=True)
    
    async def save_audio_file(self, file: UploadFile) -> tuple[str, str]:
        """
        Save uploaded audio file and return (filename, file_path)
        """
        # Validate file type
        if file.content_type not in settings.allowed_audio_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {settings.allowed_audio_types}"
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(self.audio_dir, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            if len(content) > settings.max_file_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size: {settings.max_file_size / (1024*1024):.0f}MB"
                )
            await f.write(content)
        
        return unique_filename, file_path
    
    def get_audio_file_path(self, filename: str) -> str:
        """Get full path to audio file"""
        return os.path.join(self.audio_dir, filename)
    
    def get_image_file_path(self, filename: str) -> str:
        """Get full path to image file"""
        return os.path.join(self.images_dir, filename)
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file if it exists"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception:
            return False

storage_service = StorageService()