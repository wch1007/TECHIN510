'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut, signIn } from 'next-auth/react';
import PhotoCard from '@/components/PhotoCard';
import { saveNote, getNote, getAllNotes } from '@/lib/notes-service';
import { FaRegSmile, FaRegFrown, FaRegMeh, FaRegGrin, FaArchive, FaImages, FaSignOutAlt, FaUserCircle, FaClock } from "react-icons/fa";

// Define MediaFile type
interface MediaFile {
  id: string;
  name: string;
  thumbnailLink: string;
  mimeType: string;
  webViewLink: string;
  videoUrl?: string;
  size?: string;
  createdTime?: string;
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
  const [activeTab, setActiveTab] = useState<'all' | 'archived' | 'timeline'>('all');
  const [archivedFiles, setArchivedFiles] = useState<Set<string>>(new Set());
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{startDate: string, endDate: string}>({
    startDate: '',
    endDate: ''
  });
  const [appliedFilter, setAppliedFilter] = useState<string>('all');
  const [appliedDateRange, setAppliedDateRange] = useState<{startDate: string, endDate: string}>({
    startDate: '',
    endDate: ''
  });
  const [timezoneMethod, setTimezoneMethod] = useState<'local' | 'utc' | 'smart'>('local');
  
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

  // 前端检测图片方向的状态
  const [detectedOrientations, setDetectedOrientations] = useState<Record<string, 'portrait' | 'landscape' | 'square'>>({});

  // 检测图片尺寸的辅助函数
  const detectImageOrientation = useCallback((file: MediaFile): Promise<'portrait' | 'landscape' | 'square'> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image() as HTMLImageElement;
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let orientation: 'portrait' | 'landscape' | 'square';
        
        if (aspectRatio < 0.9) {
          orientation = 'portrait';
        } else if (aspectRatio > 1.1) {
          orientation = 'landscape';
        } else {
          orientation = 'square';
        }
        
        console.log(`🖼️ 前端检测 ${file.name}: ${img.width}x${img.height}, 比例: ${aspectRatio.toFixed(2)} → ${orientation}`);
        
        // 更新检测结果
        setDetectedOrientations(prev => ({
          ...prev,
          [file.id]: orientation
        }));
        
        resolve(orientation);
      };
      img.onerror = () => {
        // 如果加载失败，默认为横向
        resolve('landscape');
      };
      img.src = `/api/drive/thumbnail/${file.id}`;
    });
  }, []);

  // 启动前端检测
  useEffect(() => {
    if (files.length > 0) {
      // 对前几张图片进行前端检测
      files.slice(0, 20).forEach(file => {
        if (!file.mimeType.includes('video') && !detectedOrientations[file.id]) {
          detectImageOrientation(file);
        }
      });
    }
  }, [files, detectImageOrientation, detectedOrientations]);

  // 延时检测更多图片（避免一次性加载太多）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (files.length > 20) {
        files.slice(20, 50).forEach(file => {
          if (!file.mimeType.includes('video') && !detectedOrientations[file.id]) {
            detectImageOrientation(file);
          }
        });
      }
    }, 2000); // 2秒后检测更多图片

    return () => clearTimeout(timer);
  }, [files, detectImageOrientation, detectedOrientations]);

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

  // 按图片方向分组的函数
  const groupFilesByOrientation = useCallback((files: MediaFile[]) => {
    const portraitFiles: MediaFile[] = []; // 竖向图片 (高>宽)
    const landscapeFiles: MediaFile[] = []; // 横向图片 (宽>高)
    const squareFiles: MediaFile[] = []; // 正方形图片 (宽≈高)
    
    console.log('🔍 开始分组文件，总数:', files.length, '已检测:', Object.keys(detectedOrientations).length);
    
    files.forEach(file => {
      // 优先使用前端检测的结果
      if (detectedOrientations[file.id]) {
        const orientation = detectedOrientations[file.id];
        console.log(`✅ 使用前端检测结果 ${file.name}: ${orientation}`);
        
        if (orientation === 'portrait') {
          portraitFiles.push(file);
        } else if (orientation === 'landscape') {
          landscapeFiles.push(file);
        } else {
          squareFiles.push(file);
        }
        return;
      }
      
      // 从Google Drive API获取图片尺寸（如果可用）
      if (file.width && file.height) {
        const aspectRatio = file.width / file.height;
        console.log(`📐 API数据 ${file.name}: ${file.width}x${file.height}, 比例: ${aspectRatio.toFixed(2)}`);
        
        if (aspectRatio < 0.9) {
          portraitFiles.push(file); // 竖向
          console.log(`📱 竖向: ${file.name}`);
        } else if (aspectRatio > 1.1) {
          landscapeFiles.push(file); // 横向
          console.log(`🖼️ 横向: ${file.name}`);
        } else {
          squareFiles.push(file); // 正方形
          console.log(`⬛ 正方形: ${file.name}`);
        }
      } else {
        // 如果没有尺寸信息，先尝试根据文件名推断
        const fileName = file.name.toLowerCase();
        
        // 根据常见的文件名模式推断
        if (fileName.includes('portrait') || fileName.includes('vertical') || fileName.includes('竖') || fileName.includes('vt_')) {
          console.log(`📱 根据文件名推断为竖向: ${file.name}`);
          portraitFiles.push(file);
        } else if (fileName.includes('square') || fileName.includes('sq_') || fileName.includes('正方')) {
          console.log(`⬛ 根据文件名推断为正方形: ${file.name}`);
          squareFiles.push(file);
        } else {
          // 默认分配到横向组，等待前端检测
          console.log(`❓ 暂时分配为横向，等待检测: ${file.name}`);
          landscapeFiles.push(file);
        }
      }
    });
    
    // 按创建时间排序每个组
    const sortByTime = (a: MediaFile, b: MediaFile) => {
      if (!a.createdTime || !b.createdTime) return 0;
      return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime();
    };
    
    portraitFiles.sort(sortByTime);
    squareFiles.sort(sortByTime);
    landscapeFiles.sort(sortByTime);
    
    console.log(`📊 分组结果: 竖向${portraitFiles.length}张, 正方形${squareFiles.length}张, 横向${landscapeFiles.length}张`);
    
    return {
      portrait: portraitFiles,
      square: squareFiles,
      landscape: landscapeFiles
    };
  }, [detectedOrientations]);

  // 按日期分组文件的函数
  const groupFilesByDate = (files: MediaFile[]) => {
    const groups: Record<string, MediaFile[]> = {};
    
    // 添加调试标志
    const DEBUG_DATES = true;
    
    files.forEach(file => {
      if (!file.createdTime) return;
      
      let dateKey: string;
      const originalDate = new Date(file.createdTime);
      
      switch (timezoneMethod) {
        case 'utc':
          // 使用UTC日期
          dateKey = originalDate.toISOString().split('T')[0];
          break;
        case 'smart':
          // 智能处理：尝试从Google Drive的预期行为推断
          const smartDate = new Date(file.createdTime);
          // 如果是深夜时间（可能跨日），使用智能调整
          if (smartDate.getUTCHours() >= 16) { // UTC 16:00+ 可能是次日凌晨
            const adjustedDate = new Date(smartDate.getTime() + (8 * 60 * 60 * 1000)); // 假设+8时区
            dateKey = adjustedDate.toISOString().split('T')[0];
          } else {
            dateKey = smartDate.toLocaleDateString('en-CA');
          }
          break;
        default: // 'local'
          dateKey = originalDate.toLocaleDateString('en-CA');
      }
      
      // 简化的调试输出
      if (DEBUG_DATES) {
        console.log(`📅 ${file.name}: ${file.createdTime} → ${dateKey} (${timezoneMethod})`);
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(file);
    });
    
    // Sort groups by date (newest first)
    const sortedGroups = Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as Record<string, MediaFile[]>);
    
    if (DEBUG_DATES) {
      console.log('📊 Final groups:', Object.keys(sortedGroups));
    }
    
    return sortedGroups;
  };

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    // 使用安全的日期解析函数
    const date = safeParseDateString(dateString);
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 添加调试信息
    console.log(`🗓️ formatDate: ${dateString} → ${date.toDateString()}`);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // 安全的日期解析函数 - 避免时区问题
  const safeParseDateString = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month是0-based
  };

  // 筛选文件的函数
  const filterFilesByDate = (files: MediaFile[], filter: string) => {
    if (filter === 'all') return files;
    
    const now = new Date();
    
    return files.filter(file => {
      if (!file.createdTime) return false;
      
      const fileDate = new Date(file.createdTime);
      
      switch (filter) {
        case 'thisMonth':
          return fileDate.getMonth() === now.getMonth() && 
                 fileDate.getFullYear() === now.getFullYear();
        case 'lastMonth':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return fileDate.getMonth() === lastMonth.getMonth() && 
                 fileDate.getFullYear() === lastMonth.getFullYear();
        case 'thisYear':
          return fileDate.getFullYear() === now.getFullYear();
        case 'lastYear':
          return fileDate.getFullYear() === now.getFullYear() - 1;
        case 'custom':
          if (!appliedDateRange.startDate && !appliedDateRange.endDate) return true;
          
          // 获取文件创建的本地日期（yyyy-mm-dd格式），忽略时间部分
          const fileLocalDate = fileDate.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format
          
          if (appliedDateRange.startDate && appliedDateRange.endDate) {
            return fileLocalDate >= appliedDateRange.startDate && fileLocalDate <= appliedDateRange.endDate;
          } else if (appliedDateRange.startDate) {
            return fileLocalDate >= appliedDateRange.startDate;
          } else if (appliedDateRange.endDate) {
            return fileLocalDate <= appliedDateRange.endDate;
          }
          return true;
        default:
          return true;
      }
    });
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

  // 在组件顶部添加 useEffect 来加载保存的归档状态
  useEffect(() => {
    // 从 localStorage 加载归档状态
    const savedArchivedFiles = localStorage.getItem('archivedFiles');
    if (savedArchivedFiles) {
      setArchivedFiles(new Set(JSON.parse(savedArchivedFiles)));
    }
  }, []);

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

  // 修改 toggleArchive 函数
  const toggleArchive = (fileId: string) => {
    setArchivedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      // 保存到 localStorage
      localStorage.setItem('archivedFiles', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100/40 via-blue-100/40 to-purple-100/40">
      {/* Top navigation bar with user info */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-pink-200/90 via-blue-200/90 to-purple-200/90 backdrop-blur-sm shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="h-20 flex items-center justify-between">
            {/* Left: Title and navigation */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl text-pink-400"><FaRegSmile /></span>
                <span className="text-3xl text-blue-400"><FaRegFrown /></span>
                <span className="text-3xl text-purple-400"><FaRegMeh /></span>
                <span className="text-3xl text-pink-400"><FaRegGrin /></span>
              </div>
              <h1 className="text-2xl font-bold text-gray-700 tracking-wide" style={{letterSpacing: '2px'}}>My Media Stories</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors shadow-sm ${
                    activeTab === 'all'
                      ? 'bg-pink-300 text-pink-700'
                      : 'text-gray-500 hover:bg-pink-80'
                  }`}
                >
                  <FaImages /> All
                </button>
                <button
                  onClick={() => setActiveTab('archived')}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors shadow-sm ${
                    activeTab === 'archived'
                      ? 'bg-purple-300 text-purple-700'
                      : 'text-gray-500 hover:bg-purple-80'
                  }`}
                >
                  <FaArchive /> Archived
                </button>
                <button
                  onClick={() => {
                    setActiveTab('timeline');
                  }}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full transition-colors shadow-sm ${
                    activeTab === 'timeline'
                      ? 'bg-blue-300 text-blue-700'
                      : 'text-gray-500 hover:bg-blue-80'
                  }`}
                >
                  <FaClock /> Timeline
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
      {activeTab === 'timeline' ? (
        // Timeline View
        <div className="pt-28 px-4 w-full max-w-6xl mx-auto">
          {(() => {
            const filteredFiles = files.filter(file => !hiddenFiles.has(file.id));
            const dateFilteredFiles = filterFilesByDate(filteredFiles, appliedFilter);
            const groupedFiles = groupFilesByDate(dateFilteredFiles);
            const dateKeys = Object.keys(groupedFiles);

            return (
              <>
                {/* Timeline filter */}
                <div className="flex flex-col items-center mb-8 space-y-4">
                  {/* Quick filter buttons */}
                  <div className="bg-white/80 rounded-full p-1 shadow-sm">
                    {[
                      { key: 'all', label: 'All Time' },
                      { key: 'thisMonth', label: 'This Month' },
                      { key: 'lastMonth', label: 'Last Month' },
                      { key: 'custom', label: '📅 Select Date Range' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => {
                          setTimelineFilter(key);
                          if (key !== 'custom') {
                            setAppliedFilter(key);
                            setAppliedDateRange({ startDate: '', endDate: '' });
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-sm transition-all ${
                          timelineFilter === key
                            ? 'bg-blue-200 text-blue-700 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Custom date range inputs */}
                  {timelineFilter === 'custom' && (
                    <div className="flex flex-col items-center gap-4 bg-white/90 rounded-xl p-6 shadow-lg border border-blue-100">
                      <h3 className="text-lg font-semibold text-gray-700">📅 Choose Your Date Range</h3>
                      
                      {/* Timezone method selector */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-gray-600">Date display method:</span>
                        <div className="flex gap-2">
                          {[
                            { key: 'local', label: 'Local Time', desc: 'Your timezone' },
                            { key: 'utc', label: 'UTC Time', desc: 'Same as Google Drive' },
                            { key: 'smart', label: 'Smart', desc: 'Auto-detect' }
                          ].map(({ key, label, desc }) => (
                            <button
                              key={key}
                              onClick={() => setTimezoneMethod(key as 'local' | 'utc' | 'smart')}
                              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                                timezoneMethod === key
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title={desc}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-600">From:</label>
                          <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-600">To:</label>
                          <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setDateRange({ startDate: '', endDate: '' });
                          }}
                          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Clear Dates
                        </button>
                        <button
                          onClick={() => {
                            setAppliedFilter('custom');
                            setAppliedDateRange(dateRange);
                          }}
                          disabled={!dateRange.startDate && !dateRange.endDate}
                          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                            dateRange.startDate || dateRange.endDate
                              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Apply Filter
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline content */}
                <div className="space-y-12">
                  {dateKeys.map((dateKey) => {
                    const dayFiles = groupedFiles[dateKey];
                    
                    return (
                      <div key={dateKey} className="flex gap-8">
                        {/* Left: Timeline date */}
                        <div className="w-48 flex-shrink-0 text-right">
                          <div className="sticky top-32">
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">
                              {formatDate(dateKey)}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {safeParseDateString(dateKey).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <div className="w-0.5 h-16 bg-gradient-to-b from-pink-200 to-blue-200 ml-auto mt-4"></div>
                          </div>
                        </div>

                        {/* Right: Media and notes */}
                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dayFiles.map((file) => {
                              const hasNote = notes[file.id]?.note;
                              const isVideo = file.mimeType.includes('video');
                              
                              return (
                                <div 
                                  key={file.id}
                                  className="bg-white/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer group"
                                  onClick={() => setSelectedFile(file)}
                                >
                                  <div className="relative aspect-[4/3] overflow-hidden">
                                    <Image
                                      src={`/api/drive/thumbnail/${file.id}`}
                                      alt={file.name}
                                      fill
                                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                                      loading="lazy"
                                    />
                                    {isVideo && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-black/50 rounded-full p-3">
                                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z"/>
                                          </svg>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="p-4 border-t border-gray-100">
                                    {hasNote ? (
                                      <p className="text-sm text-gray-600 line-clamp-3">
                                        {notes[file.id].note}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-gray-400 italic">
                                        Click to add your story...
                                      </p>
                                    )}
                                  </div>
                                  
                                  <div className="px-4 pb-3">
                                    <p className="text-xs text-gray-400 truncate">{file.name}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {dateKeys.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">
                      {appliedFilter === 'all' 
                        ? 'No media files with dates found' 
                        : 'No media files found for the selected time period'}
                    </p>
                  </div>
                )}

                {/* Bottom spacing */}
                <div className="h-20"></div>
              </>
            );
          })()}
        </div>
      ) : (
        // Grid View (All/Archived) - 按方向分组显示
        <div className="px-4 pt-28 max-w-full overflow-x-hidden min-h-screen">
          <div className="flex gap-2 max-w-screen-2xl mx-auto min-h-full">
            {/* Image area - 按方向分组显示但不显示标题 */}
            <div className="flex-1 min-w-0">
              {(() => {
                const filteredFiles = files
                  .filter(file => {
                    const isArchived = archivedFiles.has(file.id);
                    return activeTab === 'all' ? !isArchived : isArchived;
                  })
                  .filter(file => !file.mimeType.includes('video'));
                
                const groupedFiles = groupFilesByOrientation(filteredFiles);
                
                // 合并所有组，保持方向顺序：竖向 -> 正方形 -> 横向
                const allFiles = [
                  ...groupedFiles.portrait,
                  ...groupedFiles.square, 
                  ...groupedFiles.landscape
                ];
                
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-20">
                    {allFiles.map((file, index) => {
                      const isLastElement = index === allFiles.length - 1;
                      
                      // 判断文件属于哪个方向组
                      const isPortrait = groupedFiles.portrait.includes(file);
                      const isSquare = groupedFiles.square.includes(file);
                      const isLandscape = groupedFiles.landscape.includes(file);
                      
                      // 根据方向确定宽高比
                      let aspectClass = 'aspect-square'; // 默认正方形
                      if (isPortrait) {
                        aspectClass = 'aspect-[3/4]'; // 竖向 3:4
                      } else if (isLandscape) {
                        aspectClass = 'aspect-[4/3]'; // 横向 4:3
                      }
                      
                      return (
                        <div 
                          key={file.id} 
                          ref={isLastElement ? lastFileElementRef : null}
                          className="cursor-pointer group relative"
                          onClick={() => setSelectedFile(file)}
                        >
                          <div className="relative w-full overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                            {hiddenFiles.has(file.id) ? (
                              <div className="w-full h-32 bg-gray-50 flex items-center justify-between p-2 rounded-lg border border-gray-200">
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
                                {/* 根据图片方向使用不同的宽高比 */}
                                <div className={`relative ${aspectClass}`}>
                                  <Image
                                    src={`/api/drive/thumbnail/${file.id}`}
                                    alt={file.name}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {notes[file.id]?.note && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-3">
                                      <p className="text-white text-xs line-clamp-4 text-center">
                                        {notes[file.id].note}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2">
                                  <div className="flex justify-between items-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleArchive(file.id);
                                      }}
                                      className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                                    >
                                      {archivedFiles.has(file.id) ? 'Unarchive' : 'Archive'}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFileVisibility(file.id);
                                      }}
                                      className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
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
                );
              })()}
            </div>

            {/* Video area - 侧边栏，只在有视频时显示 */}
            {files.filter(file => {
              const isArchived = archivedFiles.has(file.id);
              return activeTab === 'all' ? !isArchived : isArchived;
            }).filter(file => file.mimeType.includes('video')).length > 0 && (
              <div className="w-48 lg:w-56 xl:w-64 flex-shrink-0 h-fit">
                <div className="sticky top-24 z-20 space-y-3">
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
                          className="cursor-pointer group relative"
                          onClick={() => setSelectedFile(file)}
                        >
                          <div className="relative w-full overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-shadow">
                            {isHidden ? (
                              <div className="w-full h-20 bg-gray-50 flex items-center justify-between p-2 rounded-lg border border-gray-200">
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
                                  sizes="(max-width: 1024px) 192px, (max-width: 1280px) 224px, 256px"
                                  className="absolute top-0 left-0 w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  </svg>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-2">
                                  <div className="flex justify-between items-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleArchive(file.id);
                                      }}
                                      className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
                                    >
                                      {archivedFiles.has(file.id) ? 'Unarchive' : 'Archive'}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFileVisibility(file.id);
                                      }}
                                      className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200"
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
            )}
          </div>
        </div>
      )}
      
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