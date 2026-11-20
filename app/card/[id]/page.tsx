'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface ProvenanceStep {
  from_user_id?: string;
  from_username?: string;
  to_user_id?: string;
  to_username?: string;
  trade_id?: string;
  traded_at?: string;
}

interface PassportCard {
  id: string;
  user_id: string;
  original_owner_id?: string | null;
  public_qr_code_id?: string | null;
  game_title?: string | null;
  card_name: string;
  set_name?: string | null;
  card_number?: string | null;
  rarity?: string | null;
  language?: string | null;
  image_url?: string | null;
  card_image?: string | null;
  is_graded?: string | null;
  grade?: string | number | null;
  grade_company?: string | null;
  grade_score?: number | null;
  purchase_price?: number | null;
  provenance_history?: ProvenanceStep[] | null;
  created_at: string;
}

export default function CardPassportPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;

  const [card, setCard] = useState<PassportCard | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCardPassport() {
      if (!rawId) {
        if (active) {
          setErrorMsg('Identificativo carta mancante.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setErrorMsg('');

      // Cerca prima per public_qr_code_id, poi per id
      let foundCard: PassportCard | null = null;

      const { data: byQr } = await supabase
        .from('user_cards')
        .select('*')
        .eq('public_qr_code_id', rawId)
        .maybeSingle();

      if (byQr) {
        foundCard = byQr;
      } else {
        const { data: byId, error: byIdErr } = await supabase
          .from('user_cards')
          .select('*')
          .eq('id', rawId)
          .maybeSingle();

        if (byIdErr) {
          if (active) {
            setErrorMsg(`Errore lettura passaporto carta: ${byIdErr.message}`);
            setLoading(false);
          }
          return;
        }
        foundCard = byId;
      }

      if (!active) return;

      if (!foundCard) {
        setErrorMsg('Carta non trovata o non visibile con questo passaporto QR.');
        setLoading(false);
        return;
      }

      setCard(foundCard);

      // Recupera nomi/email dai profili per proprietario attuale e originale
      const profileIds = Array.from(
        new Set(
          [foundCard.user_id, foundCard.original_owner_id].filter((id): id is string => Boolean(id))
        )
      );

      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', profileIds);

        if (active && profilesData) {
          const map: Record<string, string> = {};
          for (const p of profilesData) {
            map[p.id] = p.username || p.email || p.id;
          }
          setOwnerNames(map);
        }
      }

      if (active) {
        setLoading(false);
      }
    }

    loadCardPassport();

    return () => {
      active = false;
    };
  }, [rawId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Caricamento Passaporto Digitale...
      </div>
    );
  }

  if (errorMsg || !card) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 text-center">
          <p className="text-sm font-bold text-red-400">{errorMsg || 'Carta non trovata'}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl border border-slate-700"
          >
            ← Torna indietro
          </button>
        </div>
      </div>
    );
  }

  const displayImage = card.image_url || card.card_image || '';
  const currentOwnerLabel = ownerNames[card.user_id] || card.user_id;
  const originalOwnerId = card.original_owner_id || card.user_id;
  const originalOwnerLabel = ownerNames[originalOwnerId] || originalOwnerId;
  const history = Array.isArray(card.provenance_history) ? card.provenance_history : [];

  const isGradedCard =
    card.is_graded === 'graded' || Boolean(card.grade_company) || card.grade_score != null;
  const gradeLabel =
    card.grade ||
    (card.grade_company ? `${card.grade_company} ${card.grade_score ?? ''}`.trim() : 'N/D');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-lg font-bold text-amber-400">
              🪪 Passaporto Digitale Carta — Ashkro's Vault
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID Passaporto: {card.public_qr_code_id || card.id}
            </p>
          </div>
          <a
            href="/binder"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            ← Vai al Binder
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl p-4">
            {displayImage ? (
              <img
                src={displayImage}
                alt={card.card_name}
                className="max-h-72 object-contain rounded-xl"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                Foto non disponibile
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-md">
                {card.game_title || 'Pokémon'} • {card.language || 'IT'}
              </span>
              <h2 className="text-xl font-bold text-slate-100 mt-2">{card.card_name}</h2>
              <p className="text-xs text-amber-400 font-medium mt-0.5">
                {card.set_name || 'Set non specificato'} • #{card.card_number || 'N/D'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Rarità</span>
                <span className="font-semibold text-slate-100">{card.rarity || 'N/D'}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Condizione / Gradazione</span>
                <span className="font-semibold text-amber-300">
                  {isGradedCard ? `Gradata (${gradeLabel})` : 'RAW (Non gradata)'}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Proprietario Originario</span>
                <span className="font-semibold text-slate-100">{originalOwnerLabel}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Proprietario Attuale</span>
                <span className="font-semibold text-emerald-400">{currentOwnerLabel}</span>
              </div>
            </div>

            {/* Storico passaggi di mano */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                📜 Storico Provenienza ({history.length} {history.length === 1 ? 'scambio' : 'scambi'})
              </h3>

              {history.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Nessuno scambio registrato: la carta è ancora presso il proprietario originale.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((step, idx) => (
                    <div
                      key={`${step.trade_id || idx}-${idx}`}
                      className="text-xs bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                    >
                      <span className="text-slate-200">
                        <strong className="text-slate-300">
                          {step.from_username || step.from_user_id || 'Utente'}
                        </strong>{' '}
                        →{' '}
                        <strong className="text-emerald-400">
                          {step.to_username || step.to_user_id || 'Utente'}
                        </strong>
                      </span>
                      {step.traded_at && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(step.traded_at).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}