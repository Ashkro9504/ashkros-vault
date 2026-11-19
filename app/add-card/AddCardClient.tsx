'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface ApiCardItem {
  id: string;
  name: string;
  image?: string;
  localId?: string;
}

export default function AddCardClient() {
  const router = useRouter();

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return createClient(supabaseUrl, supabaseAnonKey);
  }, []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Ricerca per solo nome carta su tutte le espansioni
  const [searchName, setSearchName] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ApiCardItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingCardDetails, setLoadingCardDetails] = useState(false);

  // Campi della carta
  const [cardName, setCardName] = useState('');
  const [setName, setSetName] = useState('');
  const [rarity, setRarity] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardImage, setCardImage] = useState('');
  const [gradeCompany, setGradeCompany] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      setCheckingAuth(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  const handleSearchByName = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchName.trim();
    if (!query) {
      setErrorMsg('Inserisci il nome della carta da cercare.');
      return;
    }

    try {
      setSearching(true);
      setHasSearched(true);
      setErrorMsg('');
      setSuccessMsg('');
      setSearchResults([]);

      const encoded = encodeURIComponent(query);

      const [itRes, enRes] = await Promise.allSettled([
        fetch(`https://api.tcgdex.net/v2/it/cards?name=${encoded}`),
        fetch(`https://api.tcgdex.net/v2/en/cards?name=${encoded}`),
      ]);

      const merged: ApiCardItem[] = [];
      const seenIds = new Set<string>();

      const appendResults = async (res: PromiseSettledResult<Response>) => {
        if (res.status === 'fulfilled' && res.value.ok) {
          const json = await res.value.json();
          if (Array.isArray(json)) {
            for (const item of json) {
              if (item?.id && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                merged.push(item);
              }
            }
          }
        }
      };

      await appendResults(itRes);
      await appendResults(enRes);

      setSearchResults(merged.slice(0, 24));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante la ricerca delle carte.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCard = async (item: ApiCardItem) => {
    try {
      setLoadingCardDetails(true);
      setErrorMsg('');
      setSuccessMsg('');

      let detail: any = null;
      const itDetailRes = await fetch(`https://api.tcgdex.net/v2/it/cards/${item.id}`);
      if (itDetailRes.ok) {
        detail = await itDetailRes.json();
      } else {
        const enDetailRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${item.id}`);
        if (enDetailRes.ok) {
          detail = await enDetailRes.json();
        }
      }

      const source = detail || item;
      const baseImage = source.image || item.image || '';

      setCardName(source.name || item.name || '');
      setSetName(source.set?.name || '');
      setRarity(source.rarity || '');
      setCardNumber(source.localId || item.localId || '');
      setCardImage(baseImage ? `${baseImage}/high.webp` : '');
    } catch {
      setCardName(item.name || '');
      setCardImage(item.image ? `${item.image}/high.webp` : '');
    } finally {
      setLoadingCardDetails(false);
    }
  };

  const handleSaveToBinder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!cardName.trim()) {
      setErrorMsg('Seleziona una carta dai risultati o inserisci almeno il nome.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setSaving(false);
        setErrorMsg('Sessione non valida: effettua il login e riprova.');
        return;
      }

      const parsedScore = gradeScore.trim() !== '' ? Number(gradeScore) : null;
      const parsedPrice = purchasePrice.trim() !== '' ? Number(purchasePrice) : null;

      if (parsedScore !== null && Number.isNaN(parsedScore)) {
        setSaving(false);
        setErrorMsg('Il voto di gradazione deve essere un numero valido.');
        return;
      }

      if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
        setSaving(false);
        setErrorMsg('Il prezzo di acquisto deve essere un numero valido.');
        return;
      }

      const payload = {
        user_id: session.user.id,
        card_name: cardName.trim(),
        set_name: setName.trim() || null,
        rarity: rarity.trim() || null,
        card_number: cardNumber.trim() || null,
        card_image: cardImage.trim() || null,
        grade_company: gradeCompany.trim() || null,
        grade_score: parsedScore,
        purchase_price: parsedPrice,
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from('user_cards')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        setSaving(false);
        setErrorMsg(`Errore salvataggio Supabase: ${insertError.message}`);
        return;
      }

      setSaving(false);
      setSuccessMsg(
        `Salvata su Supabase: "${insertedRow?.card_name || cardName.trim()}" (ID: ${insertedRow?.id || 'ok'}).`
      );
    } catch (err: any) {
      setSaving(false);
      setErrorMsg(err?.message || 'Errore imprevisto durante il salvataggio.');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-12 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Aggiungi Carta al Binder</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Cerca per nome in tutte le espansioni e salva nella tua collezione
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            ← Vai al Profilo
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-4 rounded-xl font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg self-start sm:self-auto"
            >
              Apri Profilo
            </button>
          </div>
        )}

        {/* Ricerca per solo nome carta */}
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xl space-y-4">
          <form onSubmit={handleSearchByName} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Nome carta (es. Charizard, Zekrom, Pikachu...)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
            >
              {searching ? 'Ricerca...' : 'Cerca Carta'}
            </button>
          </form>

          {loadingCardDetails && (
            <p className="text-xs text-amber-400">Caricamento immagine e dati espansione...</p>
          )}

          {hasSearched && !searching && searchResults.length === 0 && (
            <p className="text-xs text-slate-400">
              Nessuna carta trovata con questo nome. Puoi comunque compilare i campi qui sotto a mano.
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectCard(item)}
                  className="group text-left bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/60 p-2.5 rounded-xl transition-all flex flex-col gap-2"
                >
                  {item.image ? (
                    <img
                      src={`${item.image}/low.webp`}
                      alt={item.name}
                      className="w-full h-32 object-contain rounded-lg bg-slate-900/60"
                    />
                  ) : (
                    <div className="w-full h-32 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] text-slate-500">
                      Nessuna foto
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-100 line-clamp-1 group-hover:text-amber-400">
                      {item.name}
                    </p>
                    {item.localId && (
                      <p className="text-[10px] text-slate-400 font-mono">#{item.localId}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Anteprima carta selezionata + salvataggio nel binder */}
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {cardImage ? (
              <img
                src={cardImage}
                alt={cardName || 'Carta selezionata'}
                className="w-28 h-40 object-contain rounded-lg shrink-0"
              />
            ) : (
              <div className="w-28 h-40 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[11px] text-slate-500 text-center p-2 shrink-0">
                Anteprima carta
              </div>
            )}
            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="font-bold text-sm text-slate-100">
                {cardName || 'Nessuna carta selezionata'}
              </h2>
              <p className="text-xs text-slate-400">
                Espansione: <span className="text-slate-200">{setName || '—'}</span>
              </p>
              <p className="text-xs text-slate-400">
                Numero: <span className="text-slate-200 font-mono">{cardNumber || '—'}</span>
              </p>
              <span className="inline-block text-[10px] bg-slate-900 border border-slate-800 text-amber-400 px-2.5 py-0.5 rounded-full font-mono mt-1">
                {rarity || 'Rarità non specificata'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveToBinder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Carta *
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Espansione / Set
                </label>
                <input
                  type="text"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rarità
                </label>
                <input
                  type="text"
                  value={rarity}
                  onChange={(e) => setRarity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL Immagine
                </label>
                <input
                  type="url"
                  value={cardImage}
                  onChange={(e) => setCardImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ente Gradazione
                </label>
                <input
                  type="text"
                  value={gradeCompany}
                  onChange={(e) => setGradeCompany(e.target.value)}
                  placeholder="PSA, BGS, GRAAD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Voto
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  placeholder="10"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prezzo Acquisto (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="25.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg disabled:opacity-50 mt-2"
            >
              {saving ? 'Salvataggio nel binder...' : 'Salva Carta nel Binder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}