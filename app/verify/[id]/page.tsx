'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

function VerifyCardContent() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function loadVerifiedCard() {
      try {
        setLoading(true);
        setErrorMsg('');

        const { data, error } = await supabase
          .from('user_cards')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          throw new Error('Certificato o carta non trovata.');
        }

        setCard(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Errore durante la verifica.');
      } finally {
        setLoading(false);
      }
    }

    loadVerifiedCard();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Verifica certificato in corso...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 text-red-400 text-xs p-6 rounded-2xl">
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <h1 className="text-lg font-bold text-amber-400">Verifica Autenticità Carta</h1>
        {card && (
          <div className="space-y-2 text-xs text-slate-300">
            <p><span className="text-slate-400">Carta:</span> {card.card_name}</p>
            <p><span className="text-slate-400">Set:</span> {card.set_name}</p>
            <p><span className="text-slate-400">Gradazione:</span> {card.grade_company || 'Raw'} {card.grade_score || ''}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyCardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Caricamento verifica...
        </div>
      }
    >
      <VerifyCardContent />
    </Suspense>
  );
}