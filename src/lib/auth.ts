import NextAuth from 'next-auth';
import { authConfig } from '@/config/auth.config';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from './prisma';
import { getMagicLinkEmail } from './email/magic-link-template';

 
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.LOGIN_EMAIL_FROM,
      async sendVerificationRequest({ identifier: email, url, provider }) {
        const { host } = new URL(url);
        const { subject, html, text } = getMagicLinkEmail({ url, host });
        
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: provider.from,
            to: email,
            subject,
            html,
            text,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to send verification email');
        }
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});