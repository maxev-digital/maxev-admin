'use client';

import { AIHighlightProvider } from '@/lib/ai-highlight';
import { DraftModalProvider } from '@/lib/draft-modal';
import DraftModal from '@/components/DraftModal';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AIHighlightProvider>
      <DraftModalProvider>
        {children}
        <DraftModal />
      </DraftModalProvider>
    </AIHighlightProvider>
  );
}
