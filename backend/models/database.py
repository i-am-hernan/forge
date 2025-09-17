from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from config.settings import settings

# Database setup
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Audiobook(Base):
    __tablename__ = "audiobooks"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    style_prompt = Column(Text, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    upload_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    file_path = Column(String(500), nullable=False)
    
    # Relationship to generated images
    images = relationship("GeneratedImage", back_populates="audiobook", cascade="all, delete-orphan")

class GeneratedImage(Base):
    __tablename__ = "generated_images"
    
    id = Column(Integer, primary_key=True, index=True)
    audiobook_id = Column(Integer, ForeignKey("audiobooks.id"), nullable=False)
    timestamp_seconds = Column(Integer, nullable=False)
    transcription = Column(Text, nullable=False)
    image_prompt = Column(Text, nullable=False)
    image_filename = Column(String(255), nullable=False)
    image_path = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to audiobook
    audiobook = relationship("Audiobook", back_populates="images")

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()