import { cookies } from 'next/headers';
import { prisma } from './db';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function getProspectSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('prospect_session')?.value;
  if (!token) return null;

  const session = await prisma.prospectSession.findUnique({
    where: { token },
    include: { prospect: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function requireAuth() {
  const [adminSession, prospectSession] = await Promise.all([getSession(), getProspectSession()]);
  if (!adminSession && !prospectSession) {
    const { redirect } = await import('next/navigation');
    // Redirect to appropriate login based on cookie presence hint
    redirect('/login');
  }
  return adminSession ?? prospectSession;
}

export async function requireAdminAuth() {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  return session;
}
