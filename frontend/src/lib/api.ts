import { Audiobook, AudiobookWithImages, UploadResponse, ApiError } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async uploadAudiobook(file: File, stylePrompt: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('style_prompt', stylePrompt);

    const response = await fetch(`${this.baseUrl}/audiobooks/upload`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse<UploadResponse>(response);
  }

  async getAudiobook(id: number): Promise<AudiobookWithImages> {
    const response = await fetch(`${this.baseUrl}/audiobooks/${id}`);
    return this.handleResponse<AudiobookWithImages>(response);
  }

  async listAudiobooks(): Promise<Audiobook[]> {
    const response = await fetch(`${this.baseUrl}/audiobooks/`);
    return this.handleResponse<Audiobook[]>(response);
  }

  async deleteAudiobook(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/audiobooks/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to delete audiobook');
    }
  }

  getAudioUrl(audiobookId: number): string {
    return `${this.baseUrl}/audiobooks/${audiobookId}/audio`;
  }

  getImageUrl(audiobookId: number, filename: string): string {
    return `${this.baseUrl}/audiobooks/${audiobookId}/images/${filename}`;
  }

  async generateImage(audiobookId: number, timestamp: number): Promise<any> {
    const formData = new FormData();
    formData.append('timestamp', timestamp.toString());

    const response = await fetch(`${this.baseUrl}/audiobooks/${audiobookId}/generate-image`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse<any>(response);
  }
}

export const apiService = new ApiService();
