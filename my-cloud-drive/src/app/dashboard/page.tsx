// // 修改后的dashboard/page.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import Image from 'next/image';
// import Link from 'next/link';
// import { useSession, signOut } from 'next-auth/react'; // 添加这行来获取会话信息

// // 保持类型定义不变
// interface MediaFile {
//   id: string;
//   name: string;
//   thumbnailLink?: string;
//   webContentLink?: string;
//   mimeType: string;
//   webViewLink: string;
//   hasThumbnail?: boolean;
// }

// interface MediaApiResponse {
//   files: MediaFile[];
//   nextPageToken: string | null;
//   error?: string;
//   message?: string;
// }

// export default function Dashboard(): React.ReactElement {
//   const { data: session, status } = useSession(); // 获取会话信息
//   const [files, setFiles] = useState<MediaFile[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [nextPageToken, setNextPageToken] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [mounted, setMounted] = useState<boolean>(false);
//   const [debugInfo, setDebugInfo] = useState<string>('初始化中...');

//   // 客户端挂载检查
//   useEffect(() => {
//     setMounted(true);
//     setDebugInfo('组件已挂载');
//   }, []);
  
//   // 数据获取逻辑
//   useEffect(() => {
//     if (!mounted) return;
    
//     // 检查认证状态
//     if (status === 'loading') {
//       setDebugInfo('Checking loading status...');
//       return;
//     }
    
//     if (status === 'unauthenticated') {
//       setError('Please log in first.');
//       setLoading(false);
//       setDebugInfo('Authentication failed');
//       return;
//     }
    
//     const fetchMediaFiles = async (): Promise<void> => {
//       try {
//         setDebugInfo('Started to get media files...');
//         setLoading(true);
        
//         // 添加时间戳防止缓存
//         const response = await fetch(`/api/drive/media${nextPageToken ? `?pageToken=${nextPageToken}` : ''}${nextPageToken ? '&' : '?'}t=${Date.now()}`);
        
//         setDebugInfo(`API response status: ${response.status}`);
        
//         if (!response.ok) {
//           let errorDetails = '';
//           try {
//             const errorData = await response.json();
//             errorDetails = JSON.stringify(errorData);
//           } catch (e) {
//             errorDetails = response.statusText;
//           }
          
//           throw new Error(`API return error ${response.status}: ${errorDetails}`);
//         }
        
//         const data = await response.json();
//         setDebugInfo(`Retrieved data: ${JSON.stringify(data).substring(0, 100)}...`);
        
//         if (data.error) {
//           throw new Error(data.message || data.error);
//         }
        
//         if (data.files && Array.isArray(data.files)) {
//           setDebugInfo(`File number: ${data.files.length}`);
//           if (nextPageToken) {
//             setFiles(prev => [...prev, ...data.files]);
//           } else {
//             setFiles(data.files);
//           }
//           setNextPageToken(data.nextPageToken);
//         } else {
//           setDebugInfo('API returned things null or non-list');
//         }
        
//         setLoading(false);
//       } catch (error) {
//         console.error("Error fetching files:", error);
//         setError(error instanceof Error ? error.message : 'unknoen error getting files');
//         setDebugInfo(`Error: ${error instanceof Error ? error.message : 'unknown error'}`);
//         setLoading(false);
//       }
//     };

//     fetchMediaFiles();
//   }, [mounted, nextPageToken, status]);

//   const loadMore = (): void => {
//     if (nextPageToken && !loading) {
//       setLoading(true);
//     }
//   };

//   // 未挂载时显示加载状态
//   if (!mounted) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto px-4 py-8">
//         <div className="absolute top-4 right-4 flex items-center gap-2 bg-white p-2 rounded-lg shadow-md">
//         {session?.user?.image && (
//           <Image 
//             src={session.user.image} 
//             width={32} 
//             height={32} 
//             alt="用户头像" 
//             className="rounded-full"
//             unoptimized={true}
//           />
//         )}
//         <div className="text-sm">
//           <p className="font-medium">{session?.user?.name || 'Not logged in'}</p>
//           <p className="text-xs text-gray-500">{session?.user?.email}</p>
//         </div>
//         <button 
//           onClick={() => signOut({ callbackUrl: '/' })}
//           className="ml-2 text-xs text-red-500 hover:text-red-700"
//         >
//           Log out
//         </button>
//       </div>
//       <h1 className="text-2xl font-bold mb-6">Media Files</h1>
      
//       {/* 添加调试信息区域 */}
//       {/* <div className="bg-gray-100 p-4 mb-4 rounded">
//         <h3 className="font-bold">调试信息:</h3>
//         <p className="text-sm font-mono">{debugInfo}</p>
//         <p className="text-sm mt-2">认证状态: {status}</p>
//         {session ? (
//           <p className="text-sm text-green-600">已登录</p>
//         ) : (
//           <p className="text-sm text-red-600">未登录</p>
//         )}
//       </div> */}
      
//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//           <p>{error}</p>
//         </div>
//       )}
      
//       {!loading && files.length === 0 && !error && (
//         <div className="text-center my-12">
//           <p className="text-gray-500">Did not find media files</p>
//         </div>
//       )}
      
//       {files.length > 0 && (
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//           {files.map((file) => (
//             <div key={file.id} className="border rounded-lg overflow-hidden shadow-sm">
//               <div className="relative w-full h-40">
//                 {file.mimeType.includes('video') ? (
//                   <div className="bg-gray-100 h-full flex items-center justify-center">
//                     <svg 
//                       className="w-12 h-12 text-gray-400" 
//                       fill="none" 
//                       stroke="currentColor" 
//                       viewBox="0 0 24 24"
//                     >
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                     </svg>
//                   </div>
//                 ) : (
//                   <div className="bg-gray-100 h-full w-full flex items-center justify-center">
//                     {file.thumbnailLink ? (
//                       <Image
//                         src={file.thumbnailLink}
//                         alt={file.name}
//                         fill
//                         style={{ objectFit: 'cover' }}
//                         unoptimized={true}
//                       />
//                     ) : (
//                       <div className="text-gray-400">No preview</div>
//                     )}
//                   </div>
//                 )}
//               </div>
//               <div className="p-3">
//                 <h3 className="font-medium text-sm truncate" title={file.name}>{file.name}</h3>
//                 <div className="flex justify-between items-center mt-2">
//                   <span className="text-xs text-gray-500">
//                     {file.mimeType.split('/')[0]}
//                   </span>
//                   <Link 
//                     href={file.webViewLink} 
//                     target="_blank"
//                     className="text-blue-500 text-xs hover:underline"
//                   >
//                     View
//                   </Link>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
      
//       {loading && (
//         <div className="flex justify-center my-8">
//           <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
//         </div>
//       )}
      
//       {nextPageToken && !loading && files.length > 0 && (
//         <div className="flex justify-center mt-8">
//           <button
//             onClick={loadMore}
//             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
//           >
//             Load More
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
// Create a modified version of the dashboard page with improved infinite scrolling
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

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

export default function Dashboard(): React.ReactElement {
  const { data: session, status } = useSession(); 
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
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
        setFiles(prev => [...prev, ...data.files]);
        setNextPageToken(data.nextPageToken);
        setHasMore(!!data.nextPageToken);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      fetchMediaFiles();
    }
  }, [fetchMediaFiles]);

  return (
    <div className="container mx-auto px-4 py-8">
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-white p-2 rounded-lg shadow-md">
       {session?.user?.image && (
          <Image 
            src={session.user.image} 
            width={32} 
            height={32} 
            alt="用户头像" 
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
      <h1 className="text-2xl font-bold mb-6">Media Files</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Grid layout for media files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file, index) => {
          // Apply ref to last element
          const isLastElement = files.length === index + 1;
          
          return (
            <div 
              key={file.id} 
              ref={isLastElement ? lastFileElementRef : null}
              className="border rounded-lg overflow-hidden shadow-sm"
            >
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
          );
        })}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
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