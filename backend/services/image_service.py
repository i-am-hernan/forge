import os
import requests
import uuid
from pathlib import Path
from typing import Optional, Dict, Any

class ImageService:
    """Service for generating images using Replicate API"""

    def __init__(self):
        self.api_token = os.getenv("REPLICATE_API_TOKEN")
        self.base_url = "https://api.replicate.com/v1"

    def generate_image(self, style_prompt: str, transcription: str, audiobook_id: int, timestamp: int) -> Optional[Dict[str, Any]]:
        """
        Generate an image based on style prompt and transcription

        Args:
            style_prompt: User's artistic style description
            transcription: Transcribed audio content
            audiobook_id: ID of the audiobook
            timestamp: Timestamp in seconds

        Returns:
            Dictionary with image info or None if generation fails
        """
        if not self.api_token:
            print("Warning: REPLICATE_API_TOKEN not set. Image generation will fail.")
            return None

        try:
            # Construct the full prompt
            full_prompt = self._construct_prompt(style_prompt, transcription)

            # Make API request to Replicate
            response = self._call_replicate_api(full_prompt)

            if not response:
                return None

            # Download and save the generated image
            image_filename = f"{audiobook_id}_{timestamp}_{uuid.uuid4().hex[:8]}.png"
            image_path = self._save_image(response, image_filename)

            if not image_path:
                return None

            return {
                "image_filename": image_filename,
                "image_path": image_path,
                "image_prompt": full_prompt
            }

        except Exception as e:
            print(f"Error generating image: {e}")
            return None

    def _construct_prompt(self, style_prompt: str, transcription: str) -> str:
        """
        Construct a comprehensive prompt for image generation

        Args:
            style_prompt: User's style preference
            transcription: Audio transcription

        Returns:
            Complete prompt for image generation
        """
        # Clean and limit the transcription
        clean_transcription = transcription.strip()
        if len(clean_transcription) > 200:
            clean_transcription = clean_transcription[:200] + "..."

        # Construct the prompt
        prompt = f"{style_prompt}, {clean_transcription}"

        # Add quality modifiers
        quality_terms = "highly detailed, professional quality, artistic composition"

        return f"{prompt}, {quality_terms}"

    def _call_replicate_api(self, prompt: str) -> Optional[str]:
        """
        Call Replicate API to generate image

        Args:
            prompt: The complete prompt for image generation

        Returns:
            URL of generated image or None if failed
        """
        try:
            headers = {
                "Authorization": f"Token {self.api_token}",
                "Content-Type": "application/json"
            }

            # Using Stable Diffusion XL model
            payload = {
                "version": "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                "input": {
                    "prompt": prompt,
                    "width": 1024,
                    "height": 1024,
                    "num_outputs": 1,
                    "scheduler": "K_EULER",
                    "num_inference_steps": 20,
                    "guidance_scale": 7.5
                }
            }

            # Create prediction
            response = requests.post(
                f"{self.base_url}/predictions",
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code != 201:
                print(f"Replicate API error: {response.status_code} - {response.text}")
                return None

            prediction = response.json()
            prediction_id = prediction["id"]

            # Poll for completion
            return self._poll_prediction(prediction_id, headers)

        except Exception as e:
            print(f"Error calling Replicate API: {e}")
            return None

    def _poll_prediction(self, prediction_id: str, headers: Dict[str, str], max_attempts: int = 60) -> Optional[str]:
        """
        Poll Replicate API for prediction completion

        Args:
            prediction_id: ID of the prediction
            headers: Request headers
            max_attempts: Maximum polling attempts

        Returns:
            URL of generated image or None if failed/timeout
        """
        import time

        for attempt in range(max_attempts):
            try:
                response = requests.get(
                    f"{self.base_url}/predictions/{prediction_id}",
                    headers=headers,
                    timeout=10
                )

                if response.status_code != 200:
                    print(f"Error polling prediction: {response.status_code}")
                    return None

                result = response.json()
                status = result.get("status")

                if status == "succeeded":
                    output = result.get("output")
                    if output and isinstance(output, list) and len(output) > 0:
                        return output[0]  # Return first image URL
                    return None

                elif status == "failed":
                    print(f"Image generation failed: {result.get('error', 'Unknown error')}")
                    return None

                elif status in ["starting", "processing"]:
                    time.sleep(2)  # Wait 2 seconds before next poll
                    continue

                else:
                    print(f"Unknown prediction status: {status}")
                    return None

            except Exception as e:
                print(f"Error polling prediction: {e}")
                time.sleep(2)

        print("Image generation timed out")
        return None

    def _save_image(self, image_url: str, filename: str) -> Optional[str]:
        """
        Download and save image from URL

        Args:
            image_url: URL of the generated image
            filename: Local filename to save as

        Returns:
            Local file path or None if failed
        """
        try:
            # Create images directory if it doesn't exist
            images_dir = Path("uploads/images")
            images_dir.mkdir(parents=True, exist_ok=True)

            file_path = images_dir / filename

            # Download the image
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()

            # Save to file
            with open(file_path, 'wb') as f:
                f.write(response.content)

            return str(file_path)

        except Exception as e:
            print(f"Error saving image: {e}")
            return None