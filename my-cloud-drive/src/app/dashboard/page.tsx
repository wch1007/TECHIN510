'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut, signIn } from 'next-auth/react';
import PhotoCard from '@/components/PhotoCard';
import { saveNote, getNote, getAllNotes } from '@/lib/notes-service';
import { FaRegSmile, FaArchive, FaImages, FaSignOutAlt, FaUserCircle } from "react-icons/fa";

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
  width?: number;    // 添加宽度属性
  height?: number;   // 添加高度属性
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
  const [hiddenFiles, setHiddenFiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');
  const [archivedFiles, setArchivedFiles] = useState<Set<string>>(new Set());
  
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

  // Handle hiding/showing files
  const toggleFileVisibility = (fileId: string) => {
    setHiddenFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // 添加归档/取消归档功能
  const toggleArchive = (fileId: string) => {
    setArchivedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar with user info */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-r from-pink-100 via-blue-100 to-purple-100 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="h-20 flex items-center justify-between">
            {/* Left: Title and navigation */}
            <div className="flex items-center gap-8">
              <span className="text-3xl text-pink-400"><FaRegSmile /></span>
              <h1 className="text-2xl font-bold text-gray-700 tracking-wide" style={{letterSpacing: '2px'}}>My Mood Stories</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors shadow-sm ${
                    activeTab === 'all'
                      ? 'bg-pink-200 text-pink-700'
                      : 'text-gray-500 hover:bg-pink-50'
                  }`}
                >
                  <FaImages /> All
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors shadow-sm ${
                    activeTab === 'archived'
                      ? 'bg-purple-200 text-purple-700'
                      : 'text-gray-500 hover:bg-purple-50'
                  }`}
                >
                  <FaArchive /> Archived
                </button>
              </div>
            </div>
            {/* Right: User info */}
            <div className="flex items-center gap-3">
              {session?.user?.image ? (
                <Image 
                  src={session.user.image} 
                  width={40} 
                  height={40} 
                  alt="profile" 
                  className="rounded-full border-2 border-pink-200 shadow"
                  unoptimized={true}
                />
              ) : (
                <FaUserCircle className="text-3xl text-gray-400" />
              )}
              <div className="text-sm text-right">
                <p className="font-semibold text-gray-700">{session?.user?.name || 'Not logged in'}</p>
                <p className="text-xs text-gray-400">{session?.user?.email}</p>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/', redirect: true })}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 transition"
              >
                <FaSignOutAlt /> Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {/* File list - add top padding for navbar */}
      <div className="flex gap-4 p-4 pt-28 w-screen">
        {/* Image area */}
        <div className="flex-1 columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4">
          {files
            .filter(file => {
              const isArchived = archivedFiles.has(file.id);
              return activeTab === 'all' ? !isArchived : isArchived;
            })
            .filter(file => !file.mimeType.includes('video'))
            .map((file, index) => {
              const isLastElement = files.filter(f => !f.mimeType.includes('video')).length === index + 1;
              const hasNote = notes[file.id]?.note;
              const isHidden = hiddenFiles.has(file.id);
              
              return (
                <div 
                  key={file.id} 
                  ref={isLastElement ? lastFileElementRef : null}
                  className="break-inside-avoid mb-4 cursor-pointer group relative"
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="relative w-full overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                    {isHidden ? (
                      <div className="w-full h-[80px] bg-gray-50 flex items-center justify-between p-2 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 truncate flex-1">{file.name}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileVisibility(file.id);
                          }}
                          className="ml-2 text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                        >
                          Show
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full">
                        <div className="relative pb-[150%]">
                          <Image
                            src={`/api/drive/thumbnail/${file.id}`}
                            alt={file.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                            className="absolute top-0 left-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                          {notes[file.id]?.note && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4">
                              <p className="text-white text-sm line-clamp-4 text-center">
                                {notes[file.id].note}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <div className="flex justify-between items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleArchive(file.id);
                              }}
                              className="text-white/80 hover:text-white text-xs shrink-0"
                            >
                              {archivedFiles.has(file.id) ? 'Unarchive' : 'Archive'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFileVisibility(file.id);
                              }}
                              className="text-white/80 hover:text-white text-xs shrink-0"
                            >
                              Hide
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Video area */}
        <div className="w-64 flex-shrink-0">
          {files
            .filter(file => {
              const isArchived = archivedFiles.has(file.id);
              return activeTab === 'all' ? !isArchived : isArchived;
            })
            .filter(file => file.mimeType.includes('video'))
            .map((file) => {
              const hasNote = notes[file.id]?.note;
              const isHidden = hiddenFiles.has(file.id);
              
              return (
                <div 
                  key={file.id} 
                  className="mb-4 cursor-pointer group relative"
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="relative w-full overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                    {isHidden ? (
                      <div className="w-full h-[80px] bg-gray-50 flex items-center justify-between p-2 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 truncate flex-1">{file.name}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileVisibility(file.id);
                          }}
                          className="ml-2 text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                        >
                          Show
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-[16/9]">
                        <Image
                          src={`/api/drive/thumbnail/${file.id}`}
                          alt={file.name}
                          fill
                          sizes="256px"
                          className="absolute top-0 left-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <div className="flex justify-end items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFileVisibility(file.id);
                              }}
                              className="text-white/80 hover:text-white text-xs shrink-0"
                            >
                              Hide
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
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