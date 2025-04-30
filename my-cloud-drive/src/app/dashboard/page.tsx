'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import PhotoCard from '@/components/PhotoCard';
import { saveNote, getNote, getAllNotes } from '@/lib/notes-service';

// Define MediaFile type
interface MediaFile {
  id: string;
  name: string;
  thumbnailLink: string;
  mimeType: string;
  webViewLink: string;
  videoUrl?: string;
  size?: string;
  modifiedTime?: string;
}

// Define API response type
interface MediaApiResponse {
  files: MediaFile[];
  nextPageToken: string | null;
  error?: string;
  message?: string;
}

export default function Dashboard(): React.ReactElement {
  const { data: session, status } = useSession(); 
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [notes, setNotes] = useState<Record<string, any>>({});
  
  // Reference to track if this is the initial load
  const initialLoad = useRef(true);
  
  // Reference to track the bottom element for intersection observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastFileElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    
    // Disconnect previous observer if exists
    if (observer.current) observer.current.disconnect();
    
    // Create new observer
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && nextPageToken) {
        fetchMediaFiles(nextPageToken);
      }
    });
    
    // Observe new node if it exists
    if (node) observer.current.observe(node);
  }, [loading, hasMore, nextPageToken]);

  // 提高缩略图质量的函数
  const getHighQualityThumbnail = (url: string) => {
    try {
      // 检查 URL 是否有效
      if (!url || typeof url !== 'string') {
        return '';
      }
      
      // 如果是 Google Drive 的缩略图链接
      if (url.includes('googleusercontent.com')) {
        // 替换尺寸参数，同时保留其他参数
        return url.replace(/=s\d+/, '=s1600').replace(/=w\d+-h\d+/, '=w1600-h1600');
      }
      
      return url;
    } catch (error) {
      console.error('Error processing thumbnail URL:', error);
      return url;
    }
  };
  
  const fetchMediaFiles = useCallback(async (pageToken: string | null = null): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/drive/media${pageToken ? `?pageToken=${pageToken}` : ''}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data: MediaApiResponse = await response.json();
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      
      if (data.files && Array.isArray(data.files)) {
        const validFiles = data.files.filter(file => {
          // 检查文件是否有效，同时支持视频和图片
          const isValid = file && file.id && (
            file.thumbnailLink || 
            file.mimeType?.includes('image') || 
            file.mimeType?.includes('video')
          );
          if (!isValid) {
            console.log('跳过无效文件:', file);
          }
          return isValid;
        });
        
        // 处理文件大小显示
        const processedFiles = validFiles.map(file => ({
          ...file,
          size: file.size ? formatFileSize(parseInt(file.size)) : undefined,
        }));
        
        setFiles(prev => [...prev, ...processedFiles]);
        setNextPageToken(data.nextPageToken);
        setHasMore(!!data.nextPageToken);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("获取文件时出错:", error);
      setError(error instanceof Error ? error.message : '发生未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  // 添加文件大小格式化函数
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Initial load
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      fetchMediaFiles();
      // Load notes from localStorage
      if (typeof window !== 'undefined') {
        setNotes(getAllNotes());
      }
    }
  }, [fetchMediaFiles]);

  // Handle saving notes
  const handleSaveNote = (photoId: string, note: string) => {
    saveNote(photoId, note);
    setNotes(prev => ({
      ...prev,
      [photoId]: {
        id: photoId,
        note,
        timestamp: Date.now()
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-4 right-4 z-10 flex items-center gap-2 bg-white p-2 rounded-lg shadow-md">
        {session?.user?.image && (
          <Image 
            src={session.user.image} 
            width={32} 
            height={32} 
            alt="profile" 
            className="rounded-full"
            unoptimized={true}
          />
        )}
        <div className="text-sm">
          <p className="font-medium">{session?.user?.name || 'Not logged in'}</p>
          <p className="text-xs text-gray-500">{session?.user?.email}</p>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: '/' })}
          className="ml-2 text-xs text-red-500 hover:text-red-700"
        >
          Log out
        </button>
      </div>

      <h1 className="fixed top-4 left-4 z-10 text-2xl font-bold text-gray-800">Media Files</h1>
      
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {/* Grid layout for media files */}
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-6 gap-3 p-3 pt-20 w-screen">
        {files.map((file, index) => {
          const isLastElement = files.length === index + 1;
          const hasNote = notes[file.id]?.note;
          const isVideo = file.mimeType.includes('video');
          
          return (
            <div 
              key={file.id} 
              ref={isLastElement ? lastFileElementRef : null}
              className="break-inside-avoid mb-3 cursor-pointer group relative"
              onClick={() => setSelectedFile(file)}
            >
              <div className="relative w-full overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                {isVideo ? (
                  <div className="relative w-full">
                    <div className="relative pb-[56.25%]">
                      <Image
                        src={`/api/drive/thumbnail/${file.id}`}
                        alt={file.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        className="absolute top-0 left-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    <Image
                      src={`/api/drive/thumbnail/${file.id}`}
                      alt={file.name}
                      width={800}
                      height={800}
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-sm truncate">{file.name}</p>
                  {file.size && <p className="text-white/80 text-xs">{file.size}</p>}
                  {notes[file.id]?.note && (
                    <p className="text-white/80 text-xs italic">Has note</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Photo Card Modal */}
      {selectedFile && (
        <PhotoCard 
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onSaveNote={handleSaveNote}
          savedNote={notes[selectedFile.id]?.note || ''}
        />
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && files.length === 0 && !error && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <p className="text-gray-500">No media files found</p>
        </div>
      )}
    </div>
  );
}