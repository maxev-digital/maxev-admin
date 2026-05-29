import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const SEARCH_QUERIES = [
  'Forward Deployed Engineer AI',
  'FDE AI Engineer remote',
  'AI Solutions Engineer enterprise',
  'Applied AI Engineer SaaS',
  'AI Implementation Engineer',
];

const SALARY_FLOOR = 80000;

interface JSearchJob {
  employer_name: string;
  job_title: string;
  job_city: string | null;
  job_state: string | null;
  job_is_remote: boolean;
  job_apply_link: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_description: string;
}

interface FwdDeployJob {
  title: string;
  company: string;
  url: string;
  salaryMin: number | null;
  salaryMax: number | null;
  isRemote: boolean;
  location: string | null;
}

interface NewProspect {
  company: string;
  role: string;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  isRemote: boolean;
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bFde\b/g, 'FDE')
    .replace(/\bRl\b/g, 'RL')
    .replace(/\bUs\b/g, 'US')
    .replace(/\bUkg\b/g, 'UKG')
    .replace(/\bPs\b/g, 'PS');
}

function parseSalaryK(text: string): { min: number | null; max: number | null } {
  // Match "$120k-$150k" or "$120K–$150K" or "$120,000–$150,000"
  const kMatch = text.match(/\$([\d.]+)\s*[kK]\s*[–\-]\s*\$?\s*([\d.]+)\s*[kK]/);
  if (kMatch) {
    return {
      min: Math.round(parseFloat(kMatch[1]) * 1000),
      max: Math.round(parseFloat(kMatch[2]) * 1000),
    };
  }
  const fullMatch = text.match(/\$([\d,]+)\s*[–\-]\s*\$?\s*([\d,]+)/);
  if (fullMatch) {
    return {
      min: Math.round(parseFloat(fullMatch[1].replace(/,/g, ''))),
      max: Math.round(parseFloat(fullMatch[2].replace(/,/g, ''))),
    };
  }
  return { min: null, max: null };
}

async function fetchFwdDeployJobs(): Promise<FwdDeployJob[]> {
  const jobs: FwdDeployJob[] = [];
  const seenUrls = new Set<string>();

  for (let page = 1; page <= 2; page++) {
    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`https://www.fwddeploy.com/jobs?page=${page}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(fetchTimeout);
      if (!res.ok) break;
      const html = await res.text();

      // Find each job card by its link to railway.jobboardly.com
      const urlRegex = /href="(https:\/\/railway\.jobboardly\.com\/jobs\/([^"]+))"/g;
      let urlMatch;

      while ((urlMatch = urlRegex.exec(html)) !== null) {
        const url = urlMatch[1];
        const slug = urlMatch[2];
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);

        // Extract 800 chars of HTML context after this link for card content
        const ctxStart = urlMatch.index;
        const ctxEnd = Math.min(html.length, ctxStart + 900);
        const rawCtx = html.slice(ctxStart, ctxEnd).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        // Title from slug (remove trailing 6-10 char hex hash)
        const titleSlug = slug.replace(/-[0-9a-f]{6,12}$/, '');
        const title = slugToTitle(titleSlug);
        if (!title || title.length < 8) continue;

        // Salary
        const { min: salaryMin, max: salaryMax } = parseSalaryK(rawCtx);

        // Skip if salary is listed and below floor
        if (salaryMin !== null && salaryMin < SALARY_FLOOR) continue;

        // Remote / US filter — skip non-US international postings
        const isRemote = /\bremote\b/i.test(rawCtx);
        const isUS = /\bUSA\b|\bUnited States\b|\b[A-Z]{2},\s*USA\b|US\s*\(Remote\)/i.test(rawCtx);
        const hasSalary = salaryMin !== null;
        // Include if: explicitly US, explicitly remote, or has a salary (salary implies we saw it clearly)
        if (!isUS && !isRemote && !hasSalary) continue;

        // Location
        const locM = rawCtx.match(/([A-Z][A-Za-z\s]+,\s*[A-Z]{2}(?:,\s*USA)?(?:\s*\(Remote\))?)/);
        const location = locM ? locM[1].trim() : (isRemote ? 'USA Remote' : null);

        // Company: look for capitalized word/phrase in context that isn't the title
        // Typically appears as text near the link (company logo alt text or nearby text)
        const altM = rawCtx.match(/alt="([^"]{2,50}?)(?:\s+logo)?"/i);
        const company = altM ? altM[1].trim() : 'FwdDeploy Prospect';

        jobs.push({ title, company, url, salaryMin, salaryMax, isRemote, location });
      }
    } catch {
      // continue on fetch error
    }
  }

  return jobs;
}

async function sendTelegram(prospects: NewProspect[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || prospects.length === 0) return;

  const lines = prospects.map(p => {
    const sal = p.salaryMin && p.salaryMax
      ? `$${Math.round(p.salaryMin / 1000)}K–$${Math.round(p.salaryMax / 1000)}K`
      : 'Salary TBD';
    const loc = p.isRemote ? 'Remote' : (p.location ?? 'On-site');
    return `• <b>${p.company}</b> — ${p.role}\n  ${sal} | ${loc}`;
  }).join('\n\n');

  const text = `🎯 <b>${prospects.length} New FDE Prospect${prospects.length > 1 ? 's' : ''} Ready</b>\n\n${lines}\n\n<a href="https://admin.maxevdigital.com/jobs">Review + apply in pipeline →</a>`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
}

export async function POST() {
  const apiKey = process.env.RAPIDAPI_KEY;

  const existingJobs = await prisma.jobApplication.findMany({
    select: { company: true, role: true },
  });
  const existingSet = new Set(
    existingJobs.map(j => `${j.company.toLowerCase()}::${j.role.toLowerCase()}`)
  );

  let added = 0;
  const seen = new Set<string>();
  const newProspects: NewProspect[] = [];

  // --- Indeed / JSearch source ---
  if (apiKey) {
    for (const query of SEARCH_QUERIES) {
      try {
        const url = new URL('https://jsearch.p.rapidapi.com/search');
        url.searchParams.set('query', query);
        url.searchParams.set('num_pages', '2');
        url.searchParams.set('remote_jobs_only', 'false');
        url.searchParams.set('employment_types', 'FULLTIME');

        const res = await fetch(url.toString(), {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
        });

        if (!res.ok) continue;
        const data = await res.json();
        const results: JSearchJob[] = data.data ?? [];

        for (const job of results) {
          const key = `${job.employer_name.toLowerCase()}::${job.job_title.toLowerCase()}`;
          if (seen.has(key) || existingSet.has(key)) continue;

          const minSal = job.job_min_salary ?? null;
          const maxSal = job.job_max_salary ?? null;
          if (minSal !== null && minSal < SALARY_FLOOR) continue;

          seen.add(key);

          const isFDE = /forward.?deploy|fde\b|implementation|applied ai|solutions engineer|ai platform/i.test(job.job_title);
          const isMarketing = /marketing|social media|content|brand/i.test(job.job_title);
          const isCreative = /design|creative|visual|art director/i.test(job.job_title);
          const type = isFDE ? 4 : isMarketing ? 2 : isCreative ? 1 : 3;

          const location = [job.job_city, job.job_state].filter(Boolean).join(', ') || null;

          const prospect: NewProspect = {
            company: job.employer_name,
            role: job.job_title,
            salaryMin: minSal,
            salaryMax: maxSal,
            location,
            isRemote: job.job_is_remote,
          };

          await prisma.jobApplication.create({
            data: {
              ...prospect,
              type,
              status: 'building',
              applyUrl: job.job_apply_link,
              notes: job.job_description.slice(0, 400),
            },
          });

          existingSet.add(key);
          newProspects.push(prospect);
          added++;
        }
      } catch {
        // continue next query on error
      }
    }
  }

  // --- FwdDeploy.com source ---
  try {
    const fwdJobs = await fetchFwdDeployJobs();

    for (const job of fwdJobs) {
      const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
      if (seen.has(key) || existingSet.has(key)) continue;
      seen.add(key);

      const prospect: NewProspect = {
        company: job.company,
        role: job.title,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        location: job.location,
        isRemote: job.isRemote,
      };

      await prisma.jobApplication.create({
        data: {
          ...prospect,
          type: 4, // All fwddeploy listings are FDE type
          status: 'building',
          applyUrl: job.url,
          notes: `Source: fwddeploy.com`,
        },
      });

      existingSet.add(key);
      newProspects.push(prospect);
      added++;
    }
  } catch {
    // fwddeploy scrape failed — don't block the response
  }

  if (added > 0) {
    await sendTelegram(newProspects);
  }

  return NextResponse.json({
    added,
    message: `Found and added ${added} new prospects.`,
    indeedEnabled: !!apiKey,
  });
}
