// src/app/api/drive/media/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    console.log("Media API route called");
    
    // check environment variables
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("Missing GOOGLE_CLIENT_ID environment variable");
      return NextResponse.json(
        { error: 'Server configuration error: Missing GOOGLE_CLIENT_ID' },
        { status: 500 }
      );
    }
    
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      console.error("Missing GOOGLE_CLIENT_SECRET environment variable");
      return NextResponse.json(
        { error: 'Server configuration error: Missing GOOGLE_CLIENT_SECRET' },
        { status: 500 }
      );
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const pageToken = url.searchParams.get('pageToken');
    
    // Get authentication
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.error("No session found");
      return NextResponse.json(
        { error: 'Not authenticated - No session' },
        { status: 401 }
      );
    }
    
    if (!(session as any).accessToken) {
      console.error("No access token in session");
      console.error("Session object:", JSON.stringify(session, null, 2));
      return NextResponse.json(
        { error: 'Not authenticated - No access token' },
        { status: 401 }
      );
    }
    
    console.log("Session found with access token");
    
    // Set up authentication
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    auth.setCredentials({
      access_token: (session as any).accessToken
    });
    
    console.log("Auth setup complete");
    
    // Create Drive client
    const drive = google.drive({ version: 'v3', auth });
    
    // Fetch files from Google Drive
    console.log("Fetching files from Drive");
    const response = await drive.files.list({
      pageSize: 20,
      pageToken: pageToken || undefined,
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, hasThumbnail, createdTime, size, imageMediaMetadata)',
      q: "mimeType contains 'image/' or mimeType contains 'video/'",
      orderBy: 'createdTime desc'
    });
    
    console.log(`Got ${response.data.files?.length || 0} files from Drive`);
    
    // Process files to extract image dimensions
    const processedFiles = response.data.files?.map(file => {
      const processedFile: any = { ...file };
      
      // Extract width and height from imageMediaMetadata if available
      if (file.imageMediaMetadata) {
        processedFile.width = file.imageMediaMetadata.width;
        processedFile.height = file.imageMediaMetadata.height;
      }
      
      return processedFile;
    }) || [];
    
    // Return the processed drive data
    return NextResponse.json({
      files: processedFiles,
      nextPageToken: response.data.nextPageToken
    });
    
  } catch (error) {
    console.error('API error details:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch files', 
        message: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    );
  }
}