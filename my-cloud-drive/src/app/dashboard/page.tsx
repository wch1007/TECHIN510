// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Define MediaFile type
interface MediaFile {
  id: string;
  name: string;
  thumbnailLink: string;
  mimeType: string;
  webViewLink: string;
}

// Define API response type
interface MediaApiResponse {
  files: MediaFile[];
  nextPageToken: string | null;
  error?: string;
  message?: string;
}

export default function Dashboard():  React.ReactElement  {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // This effect runs once to indicate we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // This effect handles fetching the media files
  useEffect(() => {
    const fetchMediaFiles = async (): Promise<void> => {
      try {
        if (!isClient) return; // Only fetch on the client
        
        setLoading(true);
        const response = await fetch(`/api/drive/media${nextPageToken ? `?pageToken=${nextPageToken}` : ''}`);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const data: MediaApiResponse = await response.json();
        
        if (data.error) {
          throw new Error(data.message || data.error);
        }
        
        if (data.files && Array.isArray(data.files)) {
          setFiles(prev => [...prev, ...data.files]);
          setNextPageToken(data.nextPageToken);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching files:", error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setLoading(false);
      }
    };

    // Only fetch if we're on the client and either:
    // 1. We don't have files yet, or
    // 2. We just got a new nextPageToken (for pagination)
    if (isClient && (!files.length || nextPageToken)) {
      fetchMediaFiles();
    }
  }, [isClient, nextPageToken, files.length]);

  // Function to load more files
  const loadMore = (): void => {
    if (nextPageToken && !loading) {
      // The useEffect will trigger a fetch when nextPageToken changes
      setNextPageToken(nextPageToken);
    }
  };

  if (!isClient) {
    // Return a loading state or placeholder when rendering on the server
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Media Files</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Grid layout for media files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <div key={file.id} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="relative w-full h-40">
              {file.mimeType.includes('video') ? (
                <div className="bg-gray-100 h-full flex items-center justify-center">
                  <svg 
                    className="w-12 h-12 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <Image
                  src={file.thumbnailLink}
                  alt={file.name}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{file.name}</h3>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {file.mimeType.split('/')[0]}
                </span>
                <Link 
                  href={file.webViewLink} 
                  target="_blank"
                  className="text-blue-500 text-xs hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Load more button */}
      {nextPageToken && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Load More
          </button>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && files.length === 0 && !error && (
        <div className="text-center my-12">
          <p className="text-gray-500">No media files found</p>
        </div>
      )}
    </div>
  );
}