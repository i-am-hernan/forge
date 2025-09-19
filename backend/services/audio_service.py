import subprocess
import tempfile
import os
from pathlib import Path
from typing import Optional, Tuple

class AudioService:
    """Service for audio processing using FFmpeg"""

    @staticmethod
    def get_audio_duration(file_path: str) -> Optional[float]:
        """Get the duration of an audio file in seconds"""
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            import json
            data = json.loads(result.stdout)
            duration = float(data['format']['duration'])
            return duration
        except (subprocess.CalledProcessError, KeyError, ValueError) as e:
            print(f"Error getting audio duration: {e}")
            return None

    @staticmethod
    def extract_audio_segment(file_path: str, start_time: float, duration: float = 30.0) -> Optional[bytes]:
        """
        Extract a segment of audio from the file

        Args:
            file_path: Path to the source audio file
            start_time: Start time in seconds
            duration: Duration of the segment in seconds (default 30)

        Returns:
            WAV audio data as bytes, or None if extraction fails
        """
        try:
            # Create temporary file for the extracted segment
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_path = temp_file.name

            # FFmpeg command to extract segment and convert to WAV
            cmd = [
                'ffmpeg',
                '-i', file_path,
                '-ss', str(start_time),
                '-t', str(duration),
                '-ar', '16000',  # 16kHz sample rate for Whisper
                '-ac', '1',      # Mono channel
                '-f', 'wav',
                '-y',            # Overwrite output file
                temp_path
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )

            # Read the extracted audio data
            with open(temp_path, 'rb') as f:
                audio_data = f.read()

            # Clean up temporary file
            os.unlink(temp_path)

            return audio_data

        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error: {e.stderr}")
            return None
        except Exception as e:
            print(f"Error extracting audio segment: {e}")
            return None
        finally:
            # Ensure cleanup even if an error occurs
            if 'temp_path' in locals() and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass

    @staticmethod
    def validate_audio_file(file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that the file is a valid audio file

        Returns:
            (is_valid, error_message)
        """
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_streams',
                file_path
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            import json
            data = json.loads(result.stdout)

            # Check if there's at least one audio stream
            audio_streams = [s for s in data.get('streams', []) if s.get('codec_type') == 'audio']

            if not audio_streams:
                return False, "No audio streams found in file"

            return True, None

        except subprocess.CalledProcessError as e:
            return False, f"Invalid audio file: {e.stderr}"
        except Exception as e:
            return False, f"Error validating audio file: {str(e)}"