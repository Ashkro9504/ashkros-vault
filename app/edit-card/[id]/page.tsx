import { Suspense } from 'react';
import EditCardClient from './EditCardClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">Caricamento carta...</div>}>
      <EditCardClient cardId={resolvedParams.id} />
    </Suspense>
  );
}