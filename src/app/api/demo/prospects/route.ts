import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  await requireAuth();

  const prospects = await prisma.prospectAccount.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { activities: true } },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, page: true },
      },
    },
  });

  return NextResponse.json({ prospects });
}

export async function POST(req: NextRequest) {
  await requireAuth();

  const { name, email, company, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, and password required' }, { status: 400 });
  }

  const existing = await prisma.prospectAccount.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const prospect = await prisma.prospectAccount.create({
    data: { name, email, company: company || null, passwordHash },
  });

  return NextResponse.json({ prospect }, { status: 201 });
}
