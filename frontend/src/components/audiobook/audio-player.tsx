'use client';

import { Play, Pause, Volume2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { apiService } from '@/lib/api';
import { Audiobook, GeneratedImage } from '@/lib/types';
import { useState, useEffect } from 'react';

interface AudioPlayerProps {
	audiobook: Audiobook;
	onImageGenerated?: (image: GeneratedImage) => void;
}

export function AudioPlayer({ audiobook, onImageGenerated }: AudioPlayerProps) {
	const {
		isPlaying,
		currentTime,
		duration,
		volume,
		isLoading,
		audioRef,
		togglePlay,
		seekTo,
		setVolume,
		formatTime,
	} = useAudioPlayer();

	const [isGeneratingImage, setIsGeneratingImage] = useState(false);
	const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

	// Fetch existing images on component mount
	useEffect(() => {
		const fetchImages = async () => {
			try {
				const audiobookWithImages = await apiService.getAudiobook(audiobook.id);
				setGeneratedImages(audiobookWithImages.images || []);
			} catch (error) {
				console.error('Failed to fetch generated images:', error);
			}
		};
		fetchImages();
	}, [audiobook.id]);

	const audioUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/audiobooks/${audiobook.id}/audio`;
	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	// Debug audio URL changes
	useEffect(() => {
		console.log('Audio URL changed:', audioUrl);
	}, [audioUrl]);

	const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const clickRatio = clickX / rect.width;
		const newTime = clickRatio * duration;
		seekTo(newTime);
		console.log('Progress bar clicked, seeking to:', newTime);
	};

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = parseFloat(e.target.value);
		setVolume(newVolume);
	};

	const handleGenerateImage = async () => {
		if (isGeneratingImage || currentTime === 0) return;

		setIsGeneratingImage(true);
		try {
			const result = await apiService.generateImage(audiobook.id, currentTime);
			const newImage: GeneratedImage = {
				id: result.image.id,
				audiobook_id: audiobook.id,
				timestamp_seconds: result.image.timestamp_seconds,
				transcription: result.image.transcription,
				image_prompt: '',
				image_filename: result.image.image_filename,
				image_path: '',
				created_at: result.image.created_at
			};

			setGeneratedImages(prev => [...prev, newImage]);
			onImageGenerated?.(newImage);
		} catch (error) {
			console.error('Failed to generate image:', error);
			alert('Failed to generate image. Please try again.');
		} finally {
			setIsGeneratingImage(false);
		}
	};

	const handleImageClick = (timestamp: number) => {
		seekTo(timestamp);
	};

	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span className="truncate">{audiobook.original_name}</span>
					{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
				</CardTitle>
				<p className="text-sm text-muted-foreground">
					Style: {audiobook.style_prompt}
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Hidden audio element */}
				<audio
					key={audiobook.id}
					ref={audioRef}
					src={audioUrl}
					preload="metadata"
					className="hidden"
				/>

				{/* Progress bar with image markers */}
				<div className="space-y-2">
					<div
						className="relative cursor-pointer"
						onClick={handleProgressClick}
					>
						<Progress value={progress} className="h-2" />

						{/* Image markers */}
						{generatedImages.map((image) => {
							const markerPosition = duration > 0 ? (image.timestamp_seconds / duration) * 100 : 0;
							return (
								<div
									key={image.id}
									className="absolute top-0 h-2 w-1 bg-blue-500 cursor-pointer hover:bg-blue-600 transition-colors"
									style={{ left: `${markerPosition}%` }}
									onClick={(e) => {
										e.stopPropagation();
										handleImageClick(image.timestamp_seconds);
									}}
									title={`Generated image at ${formatTime(image.timestamp_seconds)}`}
								/>
							);
						})}
					</div>
					<div className="flex justify-between text-sm text-muted-foreground">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>

				{/* Controls */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							size="icon"
							onClick={togglePlay}
							disabled={isLoading}
							className="h-12 w-12"
						>
							{isPlaying ? (
								<Pause className="h-6 w-6" />
							) : (
								<Play className="h-6 w-6 ml-1" />
							)}
						</Button>

						<Button
							variant="ghost"
							className="text-blue-600 hover:text-blue-700"
							disabled={isLoading || isGeneratingImage || currentTime === 0}
							onClick={handleGenerateImage}
						>
							{isGeneratingImage ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Generating...
								</>
							) : (
								<>
									<ImageIcon className="h-4 w-4 mr-2" />
									Generate Image
								</>
							)}
						</Button>
					</div>

					{/* Volume control */}
					<div className="flex items-center gap-2">
						<Volume2 className="h-4 w-4 text-muted-foreground" />
						<input
							type="range"
							min="0"
							max="1"
							step="0.1"
							value={volume}
							onChange={handleVolumeChange}
							className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
						/>
					</div>
				</div>

				{/* Generated Images Gallery */}
				{generatedImages.length > 0 && (
					<div className="mt-6">
						<h3 className="text-lg font-semibold mb-3">Generated Images</h3>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							{generatedImages.map((image) => (
								<div
									key={image.id}
									className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors"
									onClick={() => handleImageClick(image.timestamp_seconds)}
								>
									<img
										src={apiService.getImageUrl(audiobook.id, image.image_filename)}
										alt={`Generated at ${formatTime(image.timestamp_seconds)}`}
										className="w-full h-32 object-cover"
										onError={(e) => {
											const target = e.target as HTMLImageElement;
											target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
										}}
									/>
									<div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
									<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
										<p className="text-white text-xs font-medium">
											{formatTime(image.timestamp_seconds)}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Image generation placeholder when no images */}
				{generatedImages.length === 0 && (
					<div className="mt-6 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
						<p className="text-sm text-muted-foreground">
							Generated images will appear here as you create them
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
