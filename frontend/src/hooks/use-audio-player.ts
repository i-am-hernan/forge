import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  formatTime: (time: number) => string;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      const audio = audioRef.current;
      const seekTime = Math.max(0, Math.min(time, audio.duration));

      console.log('Seeking to:', seekTime, 'Duration:', audio.duration, 'ReadyState:', audio.readyState);

      try {
        audio.currentTime = seekTime;
        // Don't manually set currentTime state - let the timeupdate event handle it
      } catch (error) {
        console.error('Seek failed:', error);
      }
    } else {
      console.log('Cannot seek: audio not ready or duration not available');
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
    }
  }, []);

  const formatTime = useCallback((time: number): string => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      console.log('Time update:', audio.currentTime);
      setCurrentTime(audio.currentTime);
    };
    const handleDurationChange = () => {
      console.log('Duration changed:', audio.duration);
      setDuration(audio.duration);
    };
    const handleLoadStart = () => {
      console.log('Load start - audio reloading');
      setIsLoading(true);
    };
    const handleCanPlay = () => {
      console.log('Can play');
      setIsLoading(false);
    };
    const handleCanPlayThrough = () => {
      console.log('Can play through');
      setIsLoading(false);
    };
    const handleEnded = () => {
      console.log('Audio ended');
      setIsPlaying(false);
    };
    const handlePlay = () => {
      console.log('Audio play');
      setIsPlaying(true);
    };
    const handlePause = () => {
      console.log('Audio pause');
      setIsPlaying(false);
    };
    const handleWaiting = () => {
      console.log('Audio waiting/buffering');
      setIsLoading(true);
    };
    const handleSeeking = () => {
      console.log('Audio seeking started');
      setIsLoading(true);
    };
    const handleSeeked = () => {
      console.log('Audio seeking completed');
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);
    };
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    audioRef,
    play,
    pause,
    togglePlay,
    seekTo,
    setVolume,
    formatTime,
  };
}