// src/lib/notes-service.ts
interface PhotoNote {
    id: string;
    note: string;
    timestamp: number;
  }
  
  export const saveNote = (photoId: string, note: string): void => {
    try {
      // Get existing notes from localStorage
      const notesJson = localStorage.getItem('photoNotes');
      const notes: Record<string, PhotoNote> = notesJson ? JSON.parse(notesJson) : {};
      
      // Update or add new note
      notes[photoId] = {
        id: photoId,
        note,
        timestamp: Date.now()
      };
      
      // Save back to localStorage
      localStorage.setItem('photoNotes', JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };
  
  export const getNote = (photoId: string): string => {
    try {
      const notesJson = localStorage.getItem('photoNotes');
      if (!notesJson) return '';
      
      const notes: Record<string, PhotoNote> = JSON.parse(notesJson);
      return notes[photoId]?.note || '';
    } catch (error) {
      console.error('Error getting note:', error);
      return '';
    }
  };
  
  export const getAllNotes = (): Record<string, PhotoNote> => {
    try {
      const notesJson = localStorage.getItem('photoNotes');
      return notesJson ? JSON.parse(notesJson) : {};
    } catch (error) {
      console.error('Error getting all notes:', error);
      return {};
    }
  };