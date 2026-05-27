'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface DraftModalPayload {
  docType: 'message' | 'proposal' | 'invoice' | 'lead' | 'task';
  draftData: Record<string, unknown>;
  onApprove: (editedData: Record<string, unknown>) => Promise<{ ok: boolean; result?: string; error?: string }>;
}

interface DraftModalCtx {
  payload: DraftModalPayload | null;
  openDraft: (p: DraftModalPayload) => void;
  closeDraft: () => void;
}

const DraftModalContext = createContext<DraftModalCtx>({
  payload: null,
  openDraft: () => {},
  closeDraft: () => {},
});

export function DraftModalProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<DraftModalPayload | null>(null);
  const openDraft  = useCallback((p: DraftModalPayload) => setPayload(p), []);
  const closeDraft = useCallback(() => setPayload(null), []);
  return (
    <DraftModalContext.Provider value={{ payload, openDraft, closeDraft }}>
      {children}
    </DraftModalContext.Provider>
  );
}

export function useDraftModal() {
  return useContext(DraftModalContext);
}
