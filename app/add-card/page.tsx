import { Suspense } from 'react';
import AddCardClient from './AddCardClient';

export default function AddCardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Caricamento Aggiungi Carta...
        </div>
      }
    >
      <AddCardClient />
    </Suspense>
  );
}