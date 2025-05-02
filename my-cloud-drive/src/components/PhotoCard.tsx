// src/components/PhotoCard.tsx
import { useState, useEffect } from 'react';

interface PhotoCardProps {
  file: {
    id: string;
    thumbnailLink?: string;
    webViewLink: string;
    mimeType: string;
    name: string;
  };
  onClose: () => void;
  onSaveNote: (id: string, note: string) => void;
  savedNote?: string;
}

export default function PhotoCard({ file, onClose, onSaveNote, savedNote = '' }: PhotoCardProps) {
  const [note, setNote] = useState(savedNote);
  const isVideo = file.mimeType.includes('video');
  
  useEffect(() => {
    // Prevent scrolling of background when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleSave = () => {
    onSaveNote(file.id, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        <div className="flex flex-col md:flex-row overflow-hidden flex-grow">
          <div className="w-full md:w-2/5 relative h-[calc(100vh-200px)] overflow-hidden bg-gray-100 rounded-t-lg md:rounded-t-none md:rounded-l-lg">
            {isVideo ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="relative w-full h-full">
                  <img
                    src={`/api/drive/thumbnail/${file.id}`}
                    alt={file.name}
                    className="w-full h-full object-contain"
                  />
                  <a 
                    href={file.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-opacity"
                  >
                    <div className="flex flex-col items-center text-white">
                      <svg 
                        className="w-16 h-16" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="mt-2">Click to Play Video</span>
                    </div>
                  </a>
                </div>
              </div>
            ) : (
              <img
                src={`/api/drive/thumbnail/${file.id}`}
                alt={file.name}
                className="w-full h-full object-contain"
              />
            )}
          </div>
          
          <div className="w-full md:w-3/5 p-4 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{file.name}</h3>
              <p className="text-sm text-gray-500">{isVideo ? 'Video' : 'Image'}</p>
            </div>
            <textarea 
              className="flex-grow border rounded-md p-2 mb-4 resize-none"
              placeholder="Add notes about this file here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={onClose}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}