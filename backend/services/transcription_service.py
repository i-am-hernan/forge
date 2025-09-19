import os
import tempfile
import openai
from typing import Optional

class TranscriptionService:
    """Service for transcribing audio using OpenAI Whisper API"""

    def __init__(self):
        self.client = openai.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )

    def transcribe_audio_segment(self, audio_data: bytes) -> Optional[str]:
        """
        Transcribe audio data using Whisper API

        Args:
            audio_data: WAV audio data as bytes

        Returns:
            Transcribed text or None if transcription fails
        """
        if not os.getenv("OPENAI_API_KEY"):
            print("Warning: OPENAI_API_KEY not set. Transcription will fail.")
            return None

        try:
            # Create temporary file for the audio data
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name

            # Transcribe using Whisper API
            with open(temp_path, 'rb') as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )

            # Clean up temporary file
            os.unlink(temp_path)

            return transcript.strip() if transcript else None

        except Exception as e:
            print(f"Error transcribing audio: {e}")
            return None
        finally:
            # Ensure cleanup even if an error occurs
            if 'temp_path' in locals() and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass

    def create_fallback_transcription(self, timestamp: float) -> str:
        """
        Create a fallback transcription when the API fails

        Args:
            timestamp: The timestamp in seconds

        Returns:
            A fallback transcription message
        """
        minutes = int(timestamp // 60)
        seconds = int(timestamp % 60)
        return f"Audio content at {minutes:02d}:{seconds:02d} - transcription unavailable"