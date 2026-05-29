import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const jobs = await prisma.jobApplication.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const job = await prisma.jobApplication.create({
    data: {
      company:      body.company,
      role:         body.role,
      type:         Number(body.type),
      status:       body.status      ?? 'building',
      salaryMin:    body.salaryMin   ? Number(body.salaryMin)  : null,
      salaryMax:    body.salaryMax   ? Number(body.salaryMax)  : null,
      location:     body.location    ?? null,
      isRemote:     body.isRemote    ?? false,
      applyUrl:     body.applyUrl    ?? null,
      pdfFilename:  body.pdfFilename ?? null,
      notes:        body.notes       ?? null,
      appliedAt:    body.appliedAt   ? new Date(body.appliedAt) : null,
      matchScore:   body.matchScore  ? Number(body.matchScore) : null,
      tags:         Array.isArray(body.tags) ? body.tags : [],
      postedDate:   body.postedDate  ? new Date(body.postedDate) : null,
      companyStage: body.companyStage ?? null,
    },
  });
  return NextResponse.json(job, { status: 201 });
}
