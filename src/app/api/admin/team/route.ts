import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id:          true,
      email:       true,
      name:        true,
      role:        true,
      createdAt:   true,
      lastLoginAt: true,
      inviteToken: true,
    },
  });
  return NextResponse.json(users);
}
