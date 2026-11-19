import { Suspense } from 'react';
import FriendBinderClient from './FriendBinderClient';

interface PageProps {
  params: Promise<{ friendId: string }>;
}

async function FriendBinderContent({ params }: PageProps) {
  const { friendId } = await params;
  return <FriendBinderClient friendId={friendId} />;
}

export default function Page({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Caricamento binder...
        </div>
      }
    >
      <FriendBinderContent params={params} />
    </Suspense>
  );
}