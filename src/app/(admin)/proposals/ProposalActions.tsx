'use client';

import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

export default function ProposalActions({ proposalNumber }: { proposalNumber: string }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setError(false);
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(proposalNumber)}/pdf`);
      if (!res.ok) throw new Error('Failed');
      window.open(`/api/proposals/${encodeURIComponent(proposalNumber)}/pdf`, '_blank');
    } catch {
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={generate}
      disabled={generating}
      title={`Download PDF for ${proposalNumber}`}
    >
      {error ? <AlertCircle size={12} /> : <FileText size={12} />}
      {generating ? 'Generating...' : error ? 'Failed' : 'View PDF'}
    </button>
  );
}
