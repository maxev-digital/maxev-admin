import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JOBS = [
  // Type 1 — Creative
  {
    company: 'Blaze Media',
    role: 'Social Media Manager',
    type: 1,
    status: 'applied',
    salaryMin: 50000,
    salaryMax: 70000,
    location: 'Dallas, TX',
    isRemote: false,
    pdfFilename: 'will-austin-blazemedia-application.pdf',
    appliedAt: new Date('2026-05-24'),
    notes: 'Conservative media company. Applied via Indeed.',
  },
  {
    company: 'Spa Castle Texas',
    role: 'Graphic Designer / Social Media Manager',
    type: 1,
    status: 'applied',
    salaryMin: 45000,
    salaryMax: 60000,
    location: 'Allen, TX',
    isRemote: false,
    pdfFilename: 'will-austin-spacastle-application.pdf',
    appliedAt: new Date('2026-05-22'),
    notes: 'Local hospitality brand. Applied.',
  },
  {
    company: 'Glasgow Investments',
    role: 'Marketing Coordinator',
    type: 1,
    status: 'interview',
    salaryMin: 52000,
    salaryMax: 72800,
    location: 'Rockwall, TX',
    isRemote: false,
    pdfFilename: 'will-austin-glasgow-application.pdf',
    notes: 'Part-time 1099, $25-35/hr. Owner reached out. Interview practice.',
  },

  // Type 2 — Marketing
  {
    company: 'Traders Village',
    role: 'Director of Marketing',
    type: 2,
    status: 'ready',
    salaryMin: 75000,
    salaryMax: 100000,
    location: 'Grand Prairie, TX',
    isRemote: false,
    pdfFilename: 'will-austin-traders-village-application.pdf',
    notes: 'Large flea market / entertainment venue.',
  },
  {
    company: 'Behavioral Innovations',
    role: 'Digital Marketing Manager',
    type: 2,
    status: 'ready',
    salaryMin: 65000,
    salaryMax: 85000,
    location: 'Dallas, TX',
    isRemote: true,
    pdfFilename: 'will-austin-behavioral-innovations-application.pdf',
    notes: 'ABA therapy provider. Healthcare marketing.',
  },

  // Type 3 — Solutions
  {
    company: 'Cypher Learning',
    role: 'Solutions Engineer',
    type: 3,
    status: 'ready',
    salaryMin: 74000,
    salaryMax: 112000,
    location: 'Remote',
    isRemote: true,
    pdfFilename: 'will-austin-cypher-learning-application.pdf',
    notes: 'EdTech SaaS. Solutions engineering + demos.',
  },
  {
    company: 'EvenUp',
    role: 'AI Adoption Manager',
    type: 3,
    status: 'ready',
    salaryMin: 100000,
    salaryMax: 124000,
    location: 'Atlanta, GA',
    isRemote: true,
    pdfFilename: 'will-austin-evenup-application.pdf',
    notes: 'Legal tech AI company. $112K base.',
  },
  {
    company: 'Humach',
    role: 'Manager, AI Solutions',
    type: 3,
    status: 'ready',
    salaryMin: 100000,
    salaryMax: 130000,
    location: 'Scottsdale, AZ',
    isRemote: true,
    pdfFilename: 'will-austin-humach-application.pdf',
    notes: 'CX automation company.',
  },

  // Type 4 — FDE / AI
  {
    company: 'Suffolk Construction',
    role: 'Forward Deployed AI Engineer',
    type: 4,
    status: 'ready',
    salaryMin: 130000,
    salaryMax: 180000,
    location: 'Boston, MA',
    isRemote: false,
    pdfFilename: 'will-austin-suffolk-application.pdf',
    notes: 'Construction tech FDE. Internal AI deployment.',
  },
  {
    company: 'HAAST',
    role: 'Forward Deployed Engineer',
    type: 4,
    status: 'ready',
    salaryMin: 180000,
    salaryMax: 220000,
    location: 'New York, NY',
    isRemote: false,
    pdfFilename: 'will-austin-haast-application.pdf',
    notes: '$180-220K NYC. Financial data intelligence.',
  },
  {
    company: 'Foley',
    role: 'Applied AI Engineer',
    type: 4,
    status: 'building',
    salaryMin: 80000,
    salaryMax: 130000,
    location: 'Boston, MA',
    isRemote: false,
    pdfFilename: 'will-austin-foley-application.pdf',
    notes: 'AI engineering role. Radar chart pending.',
  },
];

async function main() {
  console.log('Seeding job applications...');
  for (const job of JOBS) {
    const existing = await prisma.jobApplication.findFirst({
      where: { company: job.company, role: job.role },
    });
    if (existing) {
      console.log(`  Skip (exists): ${job.company}`);
      continue;
    }
    await prisma.jobApplication.create({ data: job });
    console.log(`  Created: ${job.company} — ${job.role}`);
  }
  console.log('Done.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
