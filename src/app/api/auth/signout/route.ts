import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (token) {
    await prisma.adminSession.deleteMany({ where: { token } }).catch(() => {});
    cookieStore.delete('admin_session');
  }

  // Use the request's own origin so demo stays on demo.maxevdigital.com
  // and admin stays on admin.maxevdigital.com — never cross-redirect
  return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
}
