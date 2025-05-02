// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };
// module.exports = {
//   images: {
//     // domains: ['picsum.photos'],
//     domains: ['drive.google.com', 'lh3.googleusercontent.com', 'lh4.googleusercontent.com', 'lh5.googleusercontent.com', 'lh6.googleusercontent.com'],

//   },
// }

// export default nextConfig;
// next.config.ts
import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: [
      'localhost',
      'drive.google.com',
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'lh3.googleusercontent.com',
      'lh4.googleusercontent.com',
      'lh5.googleusercontent.com',
      'lh6.googleusercontent.com',
      'lh7.googleusercontent.com',
      'lh8.googleusercontent.com',
      'lh9.googleusercontent.com',
      'lh10.googleusercontent.com',
      'lh11.googleusercontent.com',
      'lh12.googleusercontent.com',
      'lh13.googleusercontent.com',
      'lh14.googleusercontent.com',
      'lh15.googleusercontent.com',
      'lh16.googleusercontent.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;