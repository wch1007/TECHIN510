'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { signIn, useSession } from "next-auth/react"
import { useRouter } from 'next/navigation';
import DriveFiles from "@/components/DriveFiles"

interface ImageProps {
  id: number;
  url: string;
  width: number;
  height: number;
  span?: number; // Optional property for grid row span
}

export default function Home() {
  const [images, setImages] = useState<ImageProps[]>([]);
  const [columns, setColumns] = useState(4);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check last login time and auto redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastLoginTime = localStorage.getItem('lastLoginTime');
      if (lastLoginTime) {
        const lastLogin = new Date(lastLoginTime);
        const now = new Date();
        const diffInDays = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        
        // If logged in within last 2 days, redirect to dashboard
        if (diffInDays <= 2 && status === 'authenticated') {
          router.push('/dashboard');
        }
      }
    }
  }, [status, router]);

  // Calculate columns based on viewport width
  useEffect(() => {
    const calculateColumns = () => {
      if (window.innerWidth < 600) return 2;
      if (window.innerWidth < 900) return 3;
      if (window.innerWidth < 1200) return 4;
      return 5;
    };

    setColumns(calculateColumns());

    const handleResize = () => {
      setColumns(calculateColumns());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load images
  useEffect(() => {
    // In a real application, you'd fetch these from your API
    const sampleImages = [
      { id: 1, url: '/images/photo1.jpeg', width: 100, height: 100 },
      { id: 2, url: '/images/photo2.jpeg', width: 200, height: 200 },
      { id: 3, url: '/images/photo3.jpeg', width: 200, height: 500 },
      { id: 4, url: '/images/photo4.jpeg', width: 300, height: 300 },
      { id: 5, url: '/images/photo5.jpeg', width: 400, height: 600 },
      // { id: 6, url: '/images/photo6.jpeg', width: 300, height: 800 },
      // { id: 7, url: '/images/photo7.jpeg', width: 250, height: 350 },
      // { id: 8, url: '/images/photo8.jpeg', width: 350, height: 500 },
    ];

    // Process images for masonry layout
    const processedImages = [];
    for (let i = 0; i < 40; i++) {
      const sourceImage = sampleImages[i % sampleImages.length];
      const aspectRatio = sourceImage.width / sourceImage.height;

      // Calculate span - how many rows this item should take up
      let span = 5;
      if (aspectRatio < 0.8) span = 15;       // Portrait
      else if (aspectRatio < 1.2) span = 10;  // Square-ish
      else span = 5;                         // Landscape

      processedImages.push({
        ...sourceImage,
        id: i + 1,
        span: span,
        aspectRatio: aspectRatio
      });
    }

    // Shuffle images
    const shuffled = [...processedImages].sort(() => Math.random() - 0.5);
    setImages(shuffled);
  }, []);

  // Handle Google login button click
  const handleGoogleLogin = async () => {
    console.log('Google login clicked');
    // Save login time when user clicks login
    localStorage.setItem('lastLoginTime', new Date().toISOString());
    // 直接跳转到 Google 账户选择界面
    await signIn("google", { 
      callbackUrl: "/dashboard",
      prompt: "select_account" // 强制显示账户选择界面
    });
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {/* Photo Wall Background */}
        <div
          className={styles.photoWallBackground}
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridAutoRows: '20px' // Larger grid cells for better filling
          }}
        >
          {Array.from({ length: 50 }).map((_, index) => { // More items for better coverage
            const imageIndex = index % images.length;
            const image = images[imageIndex] || { id: 0, url: '', width: 300, height: 200, span: 1 };

            return (
              <div
                key={index}
                className={styles.photoItem}
                style={{
                  gridRow: `span ${image.span || 1}`
                }}
              >
                <div className={styles.photoInner}>
                  <div
                    className={styles.photoBg}
                    style={{
                      backgroundImage: `url(${image.url})`,
                      paddingBottom: `${(image.height / image.width) * 100}%`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Overlay Content */}
        <div className={styles.overlay}>
          <div className={styles.contentBox}>
            <h1 className={styles.title}>
              Manage<br />Your Photos<br />Smartly
            </h1>

            <div className={styles.loginPanel}>
              <h2>Connect to your drive to get started</h2>

              <button
                className={styles.googleLoginButton}
                onClick={handleGoogleLogin}
              >
                <div className={styles.googleIcon}>
                  
                  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                Authorize Google Login
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}