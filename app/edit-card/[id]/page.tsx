'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const cardId = resolvedParams.id;

  const [cardName, setCardName] = useState('');
  const [setName, setSetName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [rarity, setRarity] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Stati per la gestione della gradazione e della lingua
  const [cardType, setCardType] = useState<'raw' | 'graded'>('raw');
  const [slabBarcode, setSlabBarcode] = useState('');
  const [grade, setGrade] = useState('');
  const [language, setLanguage] = useState('IT');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchCardData() {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) {
        setErrorMsg('Impossibile trovare la carta specificata.');
      } else if (data) {
        setCardName(data.card_name || '');
        setSetName(data.set_name || '');
        setCardNumber(data.card_number || '');
        setRarity(data.rarity || '');
        setImageUrl(data.image_url || '');
        setCardType(data.is_graded || 'raw');
        setSlabBarcode(data.slab_barcode || '');
        setGrade(data.grade || '');
        setLanguage(data.language || 'IT');
      }
      setLoading(false);
    }

    fetchCardData();
  }, [cardId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    const { error } = await supabase
      .from('cards')
      .update({
        card_name: cardName,
        set_name: setName,
        card_number: cardNumber,
        rarity: rarity,
        image_url: imageUrl,
        is_graded: cardType,
        slab_barcode: cardType === 'graded' ? slabBarcode : null,
        grade: cardType === 'graded' ? grade : null,
        language: language,
      })
      .eq('id', cardId);

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
    } else {
      router.push('/binder');
      router.refresh();
    }
  };

  const handleDeleteCard = async () => {
    if (!confirm('Sei sicuro di voler eliminare definitivamente questa carta dal Vault?')) return;

    setSaving(true);
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
    } else {
      router.push('/binder');
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        Caricamento dati della carta...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex items-center justify-center">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Modifica Carta</h1>
            <p className="text-xs text-slate-400 mt-1">Aggiorna le specifiche, la lingua, lo stato o rimuovi la carta.</p>
          </div>
          <button
            type="button"
            onClick={handleDeleteCard}
            disabled={saving}
            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/30 transition-all"
          >
            🗑️ Elimina
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          
          {/* Selettore LINGUA */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">Lingua della Carta</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="IT">Italiano (IT)</option>
              <option value="EN">Inglese (EN)</option>
              <option value="JP">Giapponese (JP)</option>
              <option value="FR">Francese (FR)</option>
              <option value="DE">Tedesco (DE)</option>
              <option value="ES">Spagnolo (ES)</option>
            </select>
          </div>

          {/* Selettore STATO: Raw o Gradata */}
          <div className="space-y-1 pt-2">
            <label className="block text-xs font-medium text-slate-300">Stato di Conservazione / Certificazione</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCardType('raw')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  cardType === 'raw' 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                RAW (Non Certificata)
              </button>
              <button
                type="button"
                onClick={() => setCardType('graded')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  cardType === 'graded' 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                GRADATA (Slab Certificato)
              </button>
            </div>
          </div>

          {/* Campi condizionali se è Gradata */}
          {cardType === 'graded' && (
            <div className="p-4 bg-slate-950/70 border border-amber-500/30 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <span>🛡️ Dettagli Certificazione Slab</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Codice a Barre / ID Slab</label>
                  <input
                    type="text"
                    value={slabBarcode}
                    onChange={(e) => setSlabBarcode(e.target.value)}
                    placeholder="es. 12345678"
                    required={cardType === 'graded'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Voto (Grade)</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="es. PSA 10 / BGS 9.5"
                    required={cardType === 'graded'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-bold text-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nome Carta</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Set / Espansione</label>
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Numero Carta</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Rarità</label>
            <input
              type="text"
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">URL Immagine Ufficiale</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Link immagine"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {imageUrl && (
            <div className="flex justify-center p-3 bg-slate-950 rounded-xl border border-slate-800">
              <img src={imageUrl} alt="Anteprima" className="h-32 object-contain rounded-lg shadow-md" />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all text-sm shadow-lg disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Aggiorna Carta'}
            </button>
            <a
              href="/binder"
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm text-center transition-all"
            >
              Annulla
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}