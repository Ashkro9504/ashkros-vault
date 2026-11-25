'use client';

import { Suspense, useEffect, useState } from 'react';
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
  condition?: string | null;
  image_url?: string | null;
  card_image?: string | null;
  is_graded?: string | null;
  grade?: string | number | null;
  grade_company?: string | null;
  grade_score?: number | null;
  grade_number?: string | null;
  provenance_history?: ProvenanceStep[] | null;
  created_at: string;
}

function formatOwnerName(
  profile?: { username?: string | null; email?: string | null } | null,
  fallbackId?: string | null
) {
  if (profile?.username) return profile.username;
  if (profile?.email) return profile.email.split('@')[0];
  return fallbackId || 'Utente non disponibile';
}

function CardPassportContent() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [card, setCard] = useState<PassportCard | null>(null);
  const [ownerProfiles, setOwnerProfiles] = useState<
    Record<string, { username?: string | null; email?: string | null }>
  >({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Stato tasto Lock-down
  const [showLockdownModal, setShowLockdownModal] = useState(false);
  const [lockdownNotes, setLockdownNotes] = useState('');
  const [sendingLockdown, setSendingLockdown] = useState(false);
  const [lockdownFeedback, setLockdownFeedback] = useState('');

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

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active && session?.user) {
        setCurrentUser(session.user);
      }

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
        setErrorMsg('Carta non trovata.');
        setLoading(false);
        return;
      }

      setCard(foundCard);

      const firstOwnerId = foundCard.original_owner_id || foundCard.user_id;
      const profileIds = Array.from(
        new Set([foundCard.user_id, firstOwnerId].filter((id): id is string => Boolean(id)))
      );

      if (profileIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', profileIds);

        if (active && profs) {
          const map: Record<string, { username?: string | null; email?: string | null }> = {};
          for (const p of profs) {
            map[p.id] = p;
          }
          setOwnerProfiles(map);
        }
      }

      if (active) setLoading(false);
    }

    loadCardPassport();
    return () => {
      active = false;
    };
  }, [rawId]);

  const handleTriggerLockdown = async () => {
    if (!card) return;
    if (!currentUser) {
      setErrorMsg('Devi effettuare il login per inviare una segnalazione di Lock-down.');
      return;
    }

    setSendingLockdown(true);
    setLockdownFeedback('');
    setErrorMsg('');

    const { error: dbErr } = await supabase.from('lockdown_requests').insert({
      reporter_user_id: currentUser.id,
      reporter_email: currentUser.email,
      card_id: card.id,
      notes:
        lockdownNotes.trim() ||
        `Segnalazione Lock-down per ${card.card_name} (${card.set_name || 'Set N/D'} #${card.card_number || 'N/D'})`,
      status: 'open',
    });

    if (dbErr) {
      setSendingLockdown(false);
      setErrorMsg(`Errore salvataggio segnalazione: ${dbErr.message}`);
      return;
    }

    // Invia notifica email SOLO all'amministratore tramite API route
    await fetch('/api/lockdown-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterEmail: currentUser.email,
        reporterId: currentUser.id,
        cardName: card.card_name,
        cardId: card.id,
        notes: lockdownNotes.trim(),
      }),
    }).catch(() => null);

    setSendingLockdown(false);
    setShowLockdownModal(false);
    setLockdownNotes('');
    setLockdownFeedback(
      "Segnalazione Lock-down inviata all'amministratore. Riceverai conferma appena la carta verrà bloccata a sistema."
    );
  };

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
  const firstOwnerId = card.original_owner_id || card.user_id;
  const firstOwnerLabel = formatOwnerName(ownerProfiles[firstOwnerId], firstOwnerId);
  const currentOwnerLabel = formatOwnerName(ownerProfiles[card.user_id], card.user_id);

  const conditionLabel =
    card.condition ||
    (card.is_graded === 'graded' || card.grade_company || card.grade_score != null
      ? `Gradata ${card.grade_company || ''} ${card.grade_score ?? card.grade ?? ''}`.trim()
      : 'RAW / Inserita manualmente');

  const history = Array.isArray(card.provenance_history) ? card.provenance_history : [];

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLockdownModal((prev) => !prev)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold rounded-xl border border-red-500/40 transition-all"
            >
              🚨 Lock-down
            </button>
            <a
              href="/binder"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            >
              ← Vai al Binder
            </a>
          </div>
        </div>

        {lockdownFeedback && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-4 rounded-xl">
            {lockdownFeedback}
          </div>
        )}

        {showLockdownModal && (
          <div className="bg-slate-900 border border-red-500/40 p-5 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-red-400">
              🚨 Segnala Smarrimento / Furto (Lock-down)
            </h2>
            <p className="text-xs text-slate-400">
              Verrà inviata una segnalazione riservata esclusivamente all'amministratore del
              sito per mettere la carta in lock-down.
            </p>
            <textarea
              rows={3}
              placeholder="Scrivi eventuali dettagli (es. rubata/smarrita, numero di gradazione, lingua, ecc.)..."
              value={lockdownNotes}
              onChange={(e) => setLockdownNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLockdownModal(false)}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={sendingLockdown}
                onClick={handleTriggerLockdown}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {sendingLockdown ? 'Invio...' : 'Invia Segnalazione Lock-down'}
              </button>
            </div>
          </div>
        )}

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
                {card.game_title || 'Pokémon'} • {card.language || 'Lingua N/D'}
              </span>
              <h2 className="text-xl font-bold text-slate-100 mt-2">{card.card_name}</h2>
              <p className="text-xs text-amber-400 font-medium mt-0.5">
                Set: {card.set_name || 'N/D'} • Numero: #{card.card_number || 'N/D'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Condizioni / Gradazione</span>
                <span className="font-semibold text-amber-300">{conditionLabel}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Lingua / Rarità</span>
                <span className="font-semibold text-slate-100">
                  {card.language || 'N/D'} {card.rarity ? `• ${card.rarity}` : ''}
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Primo proprietario</span>
                <span className="font-semibold text-slate-100">{firstOwnerLabel}</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[11px]">Proprietario attuale</span>
                <span className="font-semibold text-emerald-400">{currentOwnerLabel}</span>
              </div>
            </div>

            {card.grade_number && (
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs">
                <span className="text-slate-400 block text-[11px]">Numero di gradazione</span>
                <span className="font-mono font-semibold text-slate-100">{card.grade_number}</span>
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                📜 Storico Passaggi ({history.length})
              </h3>

              {history.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Nessuno scambio registrato: la carta è presso il primo proprietario.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((step, idx) => (
                    <div
                      key={`${step.trade_id || idx}-${idx}`}
                      className="text-xs bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                    >
                      <span className="text-slate-200">
                        <strong>{step.from_username || step.from_user_id || 'Utente'}</strong> →{' '}
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

export default function CardPassportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Caricamento Passaporto Digitale...
        </div>
      }
    >
      <CardPassportContent />
    </Suspense>
  );
}