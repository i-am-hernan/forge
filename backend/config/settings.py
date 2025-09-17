from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "AI Audiobook Image Generator"
    database_url: str = "sqlite:///./audiobooks.db"
    upload_dir: str = "./uploads"
    max_file_size: int = 500 * 1024 * 1024  # 500MB
    allowed_audio_types: list = ["audio/mpeg","audio/mp3", "audio/mp4", "audio/x-m4a"]
    
    class Config:
        env_file = ".env"

settings = Settings()
