'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function EditCardClient({ cardId }: { cardId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [gradeCompany, setGradeCompany] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [cardData, setCardData] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadCardDetails() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error } = await supabase
          .from('user_cards')
          .select('*')
          .eq('id', cardId)
          .single();

        if (error || !data) {
          throw new Error('Impossibile trovare la carta richiesta.');
        }

        setCardData(data);
        setGradeCompany(data.grade_company || '');
        setGradeScore(data.grade_score?.toString() || '');
        setPurchasePrice(data.purchase_price?.toString() || '');
      } catch (err: any) {
        setErrorMsg(err?.message || 'Errore durante il caricamento della carta.');
      } finally {
        setLoading(false);
      }
    }

    loadCardDetails();
  }, [cardId, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('user_cards')
        .update({
          grade_company: gradeCompany.trim() || null,
          grade_score: gradeScore ? parseFloat(gradeScore) : null,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        })
        .eq('id', cardId);

      if (error) throw error;

      setSuccessMsg('Carta aggiornata con successo!');
      setTimeout(() => {
        router.push('/profile');
        router.refresh();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Caricamento dettagli carta...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-12 pb-24">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xl">
          <h1 className="text-lg font-bold text-slate-100">Modifica Carta</h1>
          <a
            href="/profile"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            ← Indietro
          </a>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl">
            {successMsg}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xl space-y-6">
          {cardData && (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              {cardData.card_image ? (
                <img
                  src={cardData.card_image}
                  alt={cardData.card_name}
                  className="w-28 h-40 object-contain rounded-lg shrink-0"
                />
              ) : (
                <div className="w-28 h-40 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[11px] text-slate-500 shrink-0">
                  Nessuna foto
                </div>
              )}
              <div className="space-y-1.5 text-center sm:text-left">
                <h2 className="font-bold text-sm text-slate-100">{cardData.card_name}</h2>
                <p className="text-xs text-slate-400">
                  Espansione: <span className="text-slate-200">{cardData.set_name || '—'}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Gradazione attuale:{' '}
                  <span className="text-slate-200">
                    {cardData.grade_company
                      ? `${cardData.grade_company} ${cardData.grade_score ?? ''}`.trim()
                      : 'Raw / Non gradata'}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  Prezzo attuale:{' '}
                  <span className="text-slate-200">
                    {cardData.purchase_price != null ? `€ ${cardData.purchase_price}` : '—'}
                  </span>
                </p>
                <span className="inline-block text-[10px] bg-slate-900 border border-slate-800 text-amber-400 px-2.5 py-0.5 rounded-full font-mono mt-1">
                  {cardData.rarity || 'Rarità non specificata'}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Ente di Gradazione (es. PSA, BGS, GRAAD)
              </label>
              <input
                type="text"
                value={gradeCompany}
                onChange={(e) => setGradeCompany(e.target.value)}
                placeholder="Es. GRAAD"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Voto / Punteggio (es. 10, 9.5)
              </label>
              <input
                type="number"
                step="0.5"
                value={gradeScore}
                onChange={(e) => setGradeScore(e.target.value)}
                placeholder="Es. 10"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prezzo di Acquisto (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="Es. 45.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg disabled:opacity-50 mt-4"
            >
              {saving ? 'Salvataggio in corso...' : 'Salva Modifiche'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}