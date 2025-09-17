export interface Audiobook {
  id: number;
  filename: string;
  original_name: string;
  style_prompt: string;
  duration_seconds?: number;
  upload_timestamp: string;
  file_path: string;
}

export interface GeneratedImage {
  id: number;
  audiobook_id: number;
  timestamp_seconds: number;
  transcription: string;
  image_prompt: string;
  image_filename: string;
  image_path: string;
  created_at: string;
}

export interface AudiobookWithImages extends Audiobook {
  images: GeneratedImage[];
}

export interface UploadResponse {
  message: string;
  audiobook: Audiobook;
}

export interface ApiError {
  detail: string;
}