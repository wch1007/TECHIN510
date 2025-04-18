// src/app/api/drive/media/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getSession } from 'next-auth/react'; // Assuming you're using next-auth for auth

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const pageToken = url.searchParams.get('pageToken');
    
    // Get authentication (using next-auth or your auth method)
    const session = await getSession({ req: request });
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Set up authentication
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );
    
    auth.setCredentials({
      access_token: session.accessToken
    });
    
    // Create Drive client
    const drive = google.drive({ version: 'v3', auth });
    
    // Fetch files from Google Drive
    const response = await drive.files.list({
      pageSize: 20,
      pageToken: pageToken || undefined,
      fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink)',
      q: "mimeType contains 'image/' or mimeType contains 'video/'",
      orderBy: 'modifiedTime desc'
    });
    
    // Return the actual drive data
    return NextResponse.json({
      files: response.data.files,
      nextPageToken: response.data.nextPageToken
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}