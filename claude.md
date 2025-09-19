# AI-Powered Audiobook Image Generator - System Architecture

## Project Overview
A web application that allows users to upload audiobooks (M4A format) and generate AI images at any timestamp based on the audio content. Users provide a style prompt upfront, and the system generates contextual images using the last 30 seconds of audio transcription.

## System Architecture

### High-Level Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │────│  Python Backend │────│ External APIs   │
│                 │    │   (FastAPI)     │    │                 │
│ - Audio Player  │    │ - File Storage  │    │ - Whisper API   │
│ - Image Gallery │    │ - Transcription │    │ - Image Gen API │
│ - Upload UI     │    │ - Image Gen     │    │ - FFmpeg        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────┐
                       │   SQLite    │
                       │  Database   │
                       └─────────────┘
```

## Database Schema

### Tables
```sql
-- Audiobooks table
CREATE TABLE audiobooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    style_prompt TEXT NOT NULL,
    duration_seconds INTEGER,
    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(500) NOT NULL
);

-- Generated images table  
CREATE TABLE generated_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    audiobook_id INTEGER NOT NULL,
    timestamp_seconds INTEGER NOT NULL,
    transcription TEXT NOT NULL,
    image_prompt TEXT NOT NULL,
    image_filename VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id)
);
```

## Frontend Architecture (React)

### Component Structure
```
src/
├── components/
│   ├── AudioUpload.jsx          # File upload + style prompt input
│   ├── AudioPlayer.jsx          # Custom HTML5 player with controls
│   ├── ImageGenerator.jsx       # "Generate Image" button + loading state
│   ├── ImageTimeline.jsx        # Timeline markers for generated images
│   ├── GeneratedImage.jsx       # Image display with timestamp
│   └── ImageGallery.jsx         # Grid view of all generated images
├── hooks/
│   ├── useAudioPlayer.js        # Player state management
│   └── useImageGeneration.js    # Image generation API calls
├── services/
│   └── api.js                   # Backend API calls
├── utils/
│   └── timeUtils.js             # Time formatting utilities
└── App.jsx                      # Main app component
```

### Key Frontend Features
- **Real-time Audio Position Tracking**: Monitor playback position for timestamp-based image generation
- **Image Timeline Markers**: Visual indicators on the audio scrubber showing where images were generated
- **Click-to-Seek Navigation**: Users can click on generated images to jump to that timestamp
- **Loading States**: Progress indicators during image generation (30-60 seconds)
- **Error Handling**: Graceful handling of failed generations or API errors

## Backend Architecture (Python/FastAPI)

### Project Structure
```
backend/
├── main.py                      # FastAPI app entry point
├── models/
│   ├── database.py             # SQLite models (SQLAlchemy)
│   └── schemas.py              # Pydantic request/response models
├── services/
│   ├── audio_service.py        # Audio processing (FFmpeg)
│   ├── transcription_service.py # Speech-to-text (Whisper)
│   ├── image_service.py        # AI image generation
│   └── storage_service.py      # File management
├── routers/
│   ├── audiobooks.py           # Audiobook CRUD endpoints
│   └── images.py               # Image generation endpoints
└── config/
    └── settings.py             # Environment configuration
```

### API Endpoints
```
POST   /audiobooks/upload           # Upload M4A + style prompt
GET    /audiobooks/{id}             # Get audiobook metadata
POST   /audiobooks/{id}/generate-image  # Generate image at timestamp
GET    /audiobooks/{id}/images      # Get all generated images
GET    /images/{filename}           # Serve image files
GET    /audio/{filename}            # Serve audio files
DELETE /audiobooks/{id}             # Delete audiobook and images
```

### Core Services

#### Audio Service (audio_service.py)
```python
# Key functionality:
- extract_audio_segment(file_path, start_time, duration=30)
- get_audio_duration(file_path)
- convert_to_wav_for_transcription(audio_segment)
```

#### Transcription Service (transcription_service.py)
```python
# Key functionality:
- transcribe_audio_segment(audio_data)
- supports both local Whisper and OpenAI API
- handles audio preprocessing
```

#### Image Service (image_service.py)
```python
# Key functionality:
- generate_image(style_prompt, transcription)
- construct_full_prompt(style, context)
- handle_api_responses_and_storage()
```

## External Services & APIs

### Required Integrations
1. **Audio Transcription**
   - **Option A**: OpenAI Whisper API ($0.006/minute)
   - **Option B**: Local faster-whisper (free, requires setup)
   - **Option C**: Hugging Face Inference API (free tier available)

2. **Image Generation**
   - **Option A**: DALL-E 3 via OpenAI API ($0.04-0.08/image)
   - **Option B**: Stable Diffusion via Replicate API (~$0.01/image)
   - **Option C**: Hugging Face Inference API (free tier available)

3. **Audio Processing**
   - **FFmpeg**: Local installation for audio segment extraction
   - Handles M4A to WAV conversion for transcription

### Recommended POC Stack
- **Transcription**: faster-whisper (local) - free and fast
- **Image Generation**: Replicate API with Stable Diffusion - cost-effective
- **Audio Processing**: FFmpeg - industry standard

## File Storage Strategy

### POC (Local Storage)
```
uploads/
├── audio/
│   └── {audiobook_id}_{original_filename}.m4a
└── images/
    └── {audiobook_id}/
        └── {timestamp}_{image_id}.png
```

### Production Considerations
- **Cloud Storage**: AWS S3, Google Cloud Storage, or Azure Blob
- **CDN**: CloudFront or similar for image delivery
- **Database**: PostgreSQL or MongoDB for production scale

## Implementation Workflow

### User Journey
1. **Upload**: User uploads M4A file and provides style prompt ("anime style", "photorealistic", etc.)
2. **Listen**: User plays audiobook using custom HTML5 player
3. **Generate**: At any moment, user clicks "Generate Image" button
4. **Process**: System extracts last 30 seconds, transcribes, generates image
5. **Display**: Generated image appears with timestamp marker
6. **Navigate**: User can click images to jump to that timestamp

### Technical Flow
```
Audio Upload → File Storage → Metadata in DB
     ↓
Audio Playback → Real-time Position Tracking
     ↓
Generate Request → Extract 30s Audio Segment
     ↓
Transcribe Audio → Combine with Style Prompt
     ↓
Generate Image → Store with Timestamp → Update UI
```

## Performance Considerations

### Optimization Strategies
- **Audio Chunking**: Pre-process audio into segments for faster extraction
- **Caching**: Cache transcriptions to avoid re-processing same segments
- **Background Processing**: Use job queues for image generation
- **Progressive Loading**: Load images as they become available

### Scalability Bottlenecks
- **Image Generation**: 30-60 seconds per image (API dependent)
- **Storage**: Large M4A files require significant disk space
- **Concurrent Users**: Transcription and generation services may need queuing

## Security & Privacy

### Data Protection
- **File Validation**: Verify M4A format and file size limits
- **Input Sanitization**: Clean style prompts and transcriptions
- **Rate Limiting**: Prevent abuse of expensive AI APIs
- **Data Retention**: Clear policies for audiobook and image storage

### API Security
- **Environment Variables**: Store API keys securely
- **Request Validation**: Validate all inputs with Pydantic schemas
- **CORS Configuration**: Proper frontend-backend communication setup

## POC Success Metrics

### Technical Metrics
- **Transcription Accuracy**: >90% for clear audio
- **Image Generation Speed**: <60 seconds per image
- **Audio Processing Speed**: <5 seconds for 30-second extraction
- **Timeline Sync**: Precise timestamp navigation

### User Experience Metrics
- **Upload Success Rate**: >95% for valid M4A files
- **Image Quality**: Subjective evaluation of style adherence
- **Navigation Smoothness**: Seamless timestamp jumping
- **Error Recovery**: Graceful handling of API failures

## Development Timeline

### Phase 1: Foundation (2-3 days)
- Set up FastAPI backend with SQLite
- Create React app with basic routing
- Implement file upload with style prompt
- Basic HTML5 audio player

### Phase 2: Core Features (2-3 days)
- FFmpeg integration for audio processing
- Whisper transcription setup
- Image generation API integration
- Database operations for metadata

### Phase 3: UI/UX (1-2 days)
- Timeline markers for generated images
- Image gallery with timestamp navigation
- Loading states and error handling
- Responsive design basics

### Phase 4: Polish & Demo (1 day)
- Demo preparation with sample content
- Performance optimization
- Bug fixes and edge case handling
- Documentation and presentation materials

## Cost Estimation (POC)

### Development Costs
- **Developer Time**: 5-7 days for full POC
- **External APIs**: ~$10-20 for testing (100-200 images)
- **Infrastructure**: $0 (local development)

### Production Scaling Costs (Monthly)
- **Image Generation**: $50-200 (1000-5000 images)
- **Transcription**: $20-50 (500-1000 minutes)
- **Storage**: $10-30 (100GB audio + images)
- **Hosting**: $20-50 (basic cloud deployment)

## Risk Mitigation

### Technical Risks
- **API Rate Limits**: Implement queuing and retry logic
- **Large File Handling**: Stream processing for large audiobooks
- **Browser Compatibility**: Test audio playback across browsers
- **Generation Failures**: Graceful error handling and user feedback

### Business Risks
- **API Cost Overruns**: Monitor usage and implement caps
- **Copyright Issues**: Clear terms for user-uploaded content
- **Storage Scaling**: Plan migration to cloud storage early
- **User Adoption**: Focus on core value proposition in POC

## Future Enhancements

### Advanced Features
- **Batch Image Generation**: Generate images for entire audiobook
- **Style Templates**: Pre-defined artistic styles and themes
- **Social Sharing**: Share generated images with timestamps
- **Mobile App**: Native iOS/Android applications
- **Collaborative Listening**: Multiple users generating images for same audiobook

### Technical Improvements
- **Real-time Transcription**: Live transcription during playback
- **Voice Activity Detection**: Smarter audio segment selection
- **Image Editing**: Basic editing tools for generated images
- **Analytics Dashboard**: Usage metrics and generation statistics
- Remember to server start instuctions:
Bash(python3 -m uvicorn main:app --reload --port 8000)
npm run dev
- Phase 1 Summary - ✅ Complete:

  Backend Foundation:
  - FastAPI with SQLAlchemy models
  - File upload system with M4A validation
  - Database with proper relationships (audiobooks → images)
  - Local file storage with UUID naming

  Frontend Foundation:
  - Next.js with shadcn/ui components
  - Modular, clean architecture
  - Upload component with drag-drop styling
  - Audio player with custom controls
  - Proper TypeScript types and error handling

  Development Environment:
  - Both servers running (Backend: 8000, Frontend: 3000)
  - Proper .gitignore setup
  - Clean project structure

  Ready for Phase 2: Core AI Features 🚀

  Next implementations:
  - Audio Processing - FFmpeg integration for 30-second chunks
  - Transcription - Whisper API or local faster-whisper
  - Image Generation - Stable Diffusion via Replicate API
  - Timeline Integration - Image markers on audio scrubber
  - Navigation - Click images to seek to timestamps

  Your POC foundation is solid and production-ready. The modular
  architecture will make Phase 2 integration smooth and maintainable.

  Time to bring the AI magic to life! 🎨🎵
- Phase 2 implementation is complete! 🚀

  Core AI Features Implemented:

  ✅ Audio Processing - FFmpeg integration for 30-second audio extraction✅ Transcription - OpenAI Whisper API integration with fallback handling✅
   Image Generation - Replicate API with Stable Diffusion XL✅ Backend Integration - Full API endpoints for image generation✅ Frontend Features -
  Working Generate Image button with loading states✅ Timeline Markers - Blue markers on audio scrubber showing generated images✅ Click Navigation
   - Click images or markers to seek to timestamps

  Key Components:
  - audio_service.py - Handles audio segment extraction using FFmpeg
  - transcription_service.py - Transcribes audio using Whisper API
  - image_service.py - Generates images via Replicate API
  - Enhanced audio player with image gallery and timeline markers
  - Full error handling and loading states

  Setup Required:
  Set environment variables:
  export OPENAI_API_KEY="your_openai_key"
  export REPLICATE_API_TOKEN="your_replicate_token"

  The system now supports the complete workflow: upload audiobook → listen → generate contextual AI images → navigate via timeline markers!