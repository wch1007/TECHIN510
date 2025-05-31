// // src/app/api/auth/[...nextauth]/route.ts
// import NextAuth, { AuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";

// // Define types for better type safety
// interface Token {
//   accessToken?: string;
//   refreshToken?: string;
// }

// interface Session {
//   accessToken?: string;
//   refreshToken?: string;
//   user?: {
//     name?: string;
//     email?: string;
//     image?: string;
//   };
// }

// export const authOptions: AuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//       authorization: {
//         params: {
//           scope: "openid email profile https://www.googleapis.com/auth/drive",
//           access_type: "offline",
//           prompt: "consent",
//         },
//       }
//     })
//   ],
//   session: {
//     strategy: "jwt",
//     maxAge: 24 * 60 * 60, // Session valid for 24 hours (one day)
//   },
//   cookies: {
//     sessionToken: {
//       name: `next-auth.session-token`,
//       options: {
//         httpOnly: true,
//         sameSite: "lax",
//         path: "/",
//         secure: process.env.NODE_ENV === "production",
//         maxAge: 24 * 60 * 60, // Match with session time
//       },
//     },
//   },
//   callbacks: {
//     async jwt({ token, account }) {
//       if (account) {
//         token.accessToken = account.access_token;
//         token.refreshToken = account.refresh_token;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       const typedToken = token as any;
//       (session as any).accessToken = typedToken.accessToken;
//       (session as any).refreshToken = typedToken.refreshToken;
//       return session;
//     },
//   },
// };

// const handler = NextAuth(authOptions);

// export { handler as GET, handler as POST };


import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions"; // 或相对路径

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
