'use client';

import { Play, Pause, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { apiService } from '@/lib/api';
import { Audiobook } from '@/lib/types';

interface AudioPlayerProps {
  audiobook: Audiobook;
}

export function AudioPlayer({ audiobook }: AudioPlayerProps) {
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

  const audioUrl = apiService.getAudioUrl(audiobook.id);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = clickX / rect.width;
    const newTime = clickRatio * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
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
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          className="hidden"
        />

        {/* Progress bar */}
        <div className="space-y-2">
          <div
            className="relative cursor-pointer"
            onClick={handleProgressClick}
          >
            <Progress value={progress} className="h-2" />
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
              disabled={isLoading}
            >
              Generate Image
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

        {/* Image generation placeholder */}
        <div className="mt-6 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            Generated images will appear here as you create them
          </p>
        </div>
      </CardContent>
    </Card>
  );
}