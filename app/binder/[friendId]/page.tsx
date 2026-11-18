import { Suspense } from 'react';
import FriendBinderClient from './FriendBinderClient';

interface PageProps {
  params: Promise<{ friendId: string }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">Caricamento binder...</div>}>
      <FriendBinderClient friendId={resolvedParams.friendId} />
    </Suspense>
  );
}