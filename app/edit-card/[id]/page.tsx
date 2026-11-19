import { Suspense } from 'react';
import EditCardClient from './EditCardClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function EditCardContent({ params }: PageProps) {
  const { id } = await params;
  return <EditCardClient cardId={id} />;
}

export default function Page({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Caricamento carta...
        </div>
      }
    >
      <EditCardContent params={params} />
    </Suspense>
  );
}