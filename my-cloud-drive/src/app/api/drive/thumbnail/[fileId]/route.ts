// src/app/api/drive/thumbnail/[fileId]/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
): Promise<Response> {
  try {
    const fileId = params.fileId;
    
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
    
    // 首先尝试获取缩略图
    try {
      const thumbnailResponse = await drive.files.get({
        fileId: fileId,
        fields: 'thumbnailLink'
      });
      
      if (thumbnailResponse.data.thumbnailLink) {
        // 如果有缩略图链接，重定向到该链接
        // 重定向到缩略图而不是代理内容
        return NextResponse.redirect(thumbnailResponse.data.thumbnailLink);
      }
    } catch (error) {
      console.error('无法获取缩略图链接:', error);
      // 继续尝试获取文件内容
    }
    
    // 如果没有缩略图或获取失败，直接获取文件内容
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, {
      responseType: 'stream'
    });
    
    // 创建一个ReadableStream
    const readable = new ReadableStream({
      start(controller) {
        response.data.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        
        response.data.on('end', () => {
          controller.close();
        });
        
        response.data.on('error', (err: Error) => {
          controller.error(err);
        });
      }
    });
    
    // 设置基于文件元数据的适当内容类型
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // 使用强缓存以避免重复请求
    return new Response(readable, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable' // 缓存一天，声明为不可变
      }
    });
    
  } catch (error) {
    console.error('获取缩略图出错:', error);
    // 返回一个占位符图像
    return NextResponse.json(
      { error: '无法获取图像' },
      { status: 500 }
    );
  }
}