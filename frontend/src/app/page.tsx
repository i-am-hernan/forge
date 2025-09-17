'use client';

import { useState } from 'react';
import { AudioUpload } from '@/components/audiobook/audio-upload';
import { AudioPlayer } from '@/components/audiobook/audio-player';
import { Audiobook, UploadResponse } from '@/lib/types';

export default function HomePage() {
  const [currentAudiobook, setCurrentAudiobook] = useState<Audiobook | null>(null);

  const handleUploadSuccess = (response: UploadResponse) => {
    setCurrentAudiobook(response.audiobook);
  };

  const handleNewUpload = () => {
    setCurrentAudiobook(null);
  };

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Main Content */}
        <div className="space-y-8">
          {!currentAudiobook ? (
            /* Upload State */
            <div className="flex flex-col items-center space-y-6">
              <AudioUpload onUploadSuccess={handleUploadSuccess} />
              
              <div className="text-center text-sm text-gray-500 max-w-md">
                <p className="mb-2">
                  <strong>How it works:</strong>
                </p>
                <ol className="text-left space-y-1">
                  <li>1. Upload your M4A audiobook file</li>
                  <li>2. Describe the artistic style you want</li>
                  <li>3. Listen and generate images at any moment</li>
                  <li>4. Navigate back to images via timeline</li>
                </ol>
              </div>
            </div>
          ) : (
            /* Player State */
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Now Playing
                </h2>
                <button
                  onClick={handleNewUpload}
                  className="text-blue-600 hover:text-blue-700 underline text-sm"
                >
                  Upload New Audiobook
                </button>
              </div>
              
              <AudioPlayer audiobook={currentAudiobook} />
              
              <div className="text-center text-sm text-gray-500">
                <p>
                  Click Generate Image while listening to create an AI image based on the current audio content
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
