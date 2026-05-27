'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface Props {
  prospectId: string;
  prospectName: string;
}

export default function ProspectTracker({ prospectId, prospectName }: Props) {
  const pathname = usePathname();
  const lastPage = useRef('');

  useEffect(() => {
    if (pathname === lastPage.current) return;
    lastPage.current = pathname;

    fetch('/api/demo/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'page_view', page: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}

// Exported helper — call this from any component to track a specific interaction
export function trackProspectClick(page: string, action: string, metadata?: Record<string, unknown>) {
  fetch('/api/demo/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'click', page, action, metadata }),
  }).catch(() => {});
}
