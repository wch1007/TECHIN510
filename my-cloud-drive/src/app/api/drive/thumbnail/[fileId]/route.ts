// src/app/api/drive/thumbnail/[fileId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    // 获取服务器会话用于认证
    const session = await getServerSession(authOptions);
    
    if (!session || !(session as any).accessToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    // 设置认证
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );
    
    auth.setCredentials({
      access_token: (session as any).accessToken
    });
    
    // 创建Drive客户端
    const drive = google.drive({ version: 'v3', auth });

    // 获取文件元数据，包括缩略图链接和 MIME 类型
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'mimeType, thumbnailLink, hasThumbnail'
    });

    const isVideo = fileMetadata.data.mimeType?.includes('video');

    // 如果是视频文件且有缩略图链接
    if (isVideo && fileMetadata.data.thumbnailLink) {
      // 对于视频，使用更大的缩略图尺寸
      const thumbnailUrl = fileMetadata.data.thumbnailLink.replace(/=s\d+/, '=s1600').replace(/=w\d+-h\d+/, '=w1600-h900');
      const thumbnailResponse = await fetch(thumbnailUrl);
      const thumbnailBuffer = await thumbnailResponse.arrayBuffer();
      
      return new Response(thumbnailBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, immutable', // 缓存一天
        }
      });
    }
    
    // 如果是图片文件且有缩略图链接
    if (!isVideo && fileMetadata.data.thumbnailLink) {
      const thumbnailUrl = fileMetadata.data.thumbnailLink.replace(/=s\d+/, '=s1600');
      const thumbnailResponse = await fetch(thumbnailUrl);
      const thumbnailBuffer = await thumbnailResponse.arrayBuffer();
      
      return new Response(thumbnailBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, immutable',
        }
      });
    }

    // 如果没有缩略图，获取文件内容
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, {
      responseType: 'arraybuffer'
    });

    // 获取内容类型
    const contentType = fileMetadata.data.mimeType || 'image/jpeg';
    
    // 确保响应数据是 Buffer 或 ArrayBuffer
    const buffer = Buffer.from(response.data as ArrayBuffer);
    
    // 返回图片数据
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      }
    });
    
  } catch (error) {
    console.error('获取缩略图出错:', error);
    
    // 返回一个默认的占位图像
    return new Response(null, {
      status: 404,
      statusText: 'Image not found'
    });
  }
}