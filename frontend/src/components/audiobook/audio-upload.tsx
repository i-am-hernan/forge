'use client';

import { useState } from 'react';
import { Upload, FileAudio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAudiobookUpload } from '@/hooks/use-audiobook-upload';
import { UploadResponse } from '@/lib/types';

interface AudioUploadProps {
	onUploadSuccess: (response: UploadResponse) => void;
}

export function AudioUpload({ onUploadSuccess }: AudioUploadProps) {
	const [file, setFile] = useState<File | null>(null);
	const [stylePrompt, setStylePrompt] = useState('');
	const { isUploading, error, uploadAudiobook, clearError } = useAudiobookUpload();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
			clearError();
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!file || !stylePrompt.trim()) {
			return;
		}

		const response = await uploadAudiobook(file, stylePrompt.trim());
		if (response) {
			onUploadSuccess(response);

			// Reset form
			setFile(null);
			setStylePrompt('');
			const fileInput = document.getElementById('audio-file') as HTMLInputElement;
			if (fileInput) fileInput.value = '';
		}
	};

	const isFormValid = file && stylePrompt.trim() && !isUploading;

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="audio-file" className="text-sm font-medium">
							Audio File (M4A)
						</label>
						<div className="relative">
							<Input
								id="audio-file"
								type="file"
								accept=".m4a,audio/mp4,audio/x-m4a"
								onChange={handleFileChange}
								disabled={isUploading}
								className="cursor-pointer"
							/>
							<Upload className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
						</div>
						{file && (
							<p className="text-sm text-muted-foreground">
								Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
							</p>
						)}
					</div>

					<div className="space-y-2">
						<label htmlFor="style-prompt" className="text-sm font-medium">
							Image Style Prompt
						</label>
						<Textarea
							id="style-prompt"
							value={stylePrompt}
							onChange={(e) => setStylePrompt(e.target.value)}
							placeholder="e.g., anime style, photorealistic, watercolor painting, cyberpunk art..."
							rows={3}
							disabled={isUploading}
						/>
						<p className="text-xs text-muted-foreground">
							This style will be applied to all generated images for this audiobook
						</p>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Button
						type="submit"
						disabled={!isFormValid}
						className="w-full"
					>
						{isUploading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Uploading...
							</>
						) : (
							<>
								<Upload className="mr-2 h-4 w-4" />
								Upload Audiobook
							</>
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
