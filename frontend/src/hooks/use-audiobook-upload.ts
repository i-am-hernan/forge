import { useState, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { UploadResponse } from '@/lib/types';

interface UseAudiobookUploadReturn {
	isUploading: boolean;
	error: string | null;
	uploadAudiobook: (file: File, stylePrompt: string) => Promise<UploadResponse | null>;
	clearError: () => void;
}

export function useAudiobookUpload(): UseAudiobookUploadReturn {
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const uploadAudiobook = useCallback(async (
		file: File,
		stylePrompt: string
	): Promise<UploadResponse | null> => {
		setIsUploading(true);
		setError(null);

		try {
			if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.m4a')) {
				throw new Error('Invalid file type. Please upload an M4A file.');
			}
			const response = await apiService.uploadAudiobook(file, stylePrompt);
			return response;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Upload failed';
			setError(errorMessage);
			return null;
		} finally {
			setIsUploading(false);
		}
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		isUploading,
		error,
		uploadAudiobook,
		clearError,
	};
}
