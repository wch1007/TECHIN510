import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// 确保类型安全
interface Token {
  accessToken?: string;
  refreshToken?: string;
}

interface Session {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
}


const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
    // 添加会话配置
    session: {
      strategy: "jwt",
      maxAge: 24 * 60 * 60, // 会话有效期为24小时（一天）
    },
    // 添加cookie配置确保持久化
    cookies: {
      sessionToken: {
        name: `next-auth.session-token`,
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          maxAge: 24 * 60 * 60, // 与会话时间匹配
        },
      },
    },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
        const typedToken = token as any
        (session as any).accessToken = typedToken.accessToken
        (session as any).refreshToken = typedToken.refreshToken
        return session
      }
      ,
  },
})

export { handler as GET, handler as POST }
