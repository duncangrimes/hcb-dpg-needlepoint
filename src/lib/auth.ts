import NextAuth from 'next-auth';
import { authConfig } from '../../auth.config';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from './prisma';

 
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.LOGIN_EMAIL_FROM,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});