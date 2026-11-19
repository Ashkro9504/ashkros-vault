'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function AddCardClient() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [cardName, setCardName] = useState('');
  const [setName, setSetName] = useState('');
  const [rarity, setRarity] = useState('');
  const [cardImage, setCardImage] = useState('');
  const [gradeCompany, setGradeCompany] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCheckingAuth(false);
    }
    checkSession();
  }, [router]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!cardName.trim()) {
      setErrorMsg('Inserisci almeno il nome della carta.');
      return;
    }

    try {
      setSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase.from('user_cards').insert({
        user_id: user.id,
        card_name: cardName.trim(),
        set_name: setName.trim() || null,
        rarity: rarity.trim() || null,
        card_image: cardImage.trim() || null,
        grade_company: gradeCompany.trim() || null,
        grade_score: gradeScore ? parseFloat(gradeScore) : null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      });

      if (error) throw error;

      setSuccessMsg('Carta aggiunta al tuo Vault!');
      setTimeout(() => {
        router.push('/profile');
        router.refresh();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante il salvataggio della carta.');
    } finally {
      setSaving(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Verifica sessione...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 pb-24">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h1 className="text-lg font-bold text-slate-100">Aggiungi Carta</h1>
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

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          {cardImage.trim() && (
            <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <img
                src={cardImage.trim()}
                alt={cardName || 'Anteprima carta'}
                className="w-20 h-28 object-contain rounded-lg"
              />
              <div>
                <h2 className="font-bold text-sm text-slate-100">{cardName || 'Nome carta'}</h2>
                <p className="text-xs text-slate-400">{setName || 'Set'}</p>
                {rarity && (
                  <span className="inline-block text-[10px] bg-slate-900 border border-slate-800 text-amber-400 px-2 py-0.5 rounded-full font-mono mt-2">
                    {rarity}
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleCreateCard} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Carta *
              </label>
              <input
                type="text"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Es. Zekrom ex / Charizard"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Set / Espansione
              </label>
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="Es. Black Bolt / Inferno X"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Rarità
              </label>
              <input
                type="text"
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                placeholder="Es. SAR, UR, Rare, Comune"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL Immagine Carta (opzionale)
              </label>
              <input
                type="url"
                value={cardImage}
                onChange={(e) => setCardImage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ente Gradazione (PSA, BGS, GRAAD)
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
                  Voto / Punteggio
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
                placeholder="Es. 35.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg disabled:opacity-50 mt-4"
            >
              {saving ? 'Salvataggio in corso...' : 'Salva Carta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}