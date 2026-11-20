'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface TradeCard {
  id: string;
  user_id: string;
  card_name: string;
  set_name?: string | null;
  card_number?: string | null;
  rarity?: string | null;
  card_image?: string | null;
  image_url?: string | null;
  grade_company?: string | null;
  grade_score?: number | null;
}

interface TradeData {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_card_id: string | null;
  receiver_card_id: string | null;
  last_updated_by: string | null;
  status: string;
}

function TradeRoomContent() {
  const params = useParams();
  const router = useRouter();
  const tradeId = params?.tradeId as string;

  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [trade, setTrade] = useState<TradeData | null>(null);
  const [senderCards, setSenderCards] = useState<TradeCard[]>([]);
  const [receiverCards, setReceiverCards] = useState<TradeCard[]>([]);
  const [selectedSenderCardId, setSelectedSenderCardId] = useState<string>('');
  const [selectedReceiverCardId, setSelectedReceiverCardId] = useState<string>('');
  const [counterMode, setCounterMode] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadTradeRoom = async (uid: string) => {
    setErrorMsg('');
    const { data: tradeRow, error: tradeErr } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (tradeErr || !tradeRow) {
      setErrorMsg('Stanza scambio non trovata o non autorizzata.');
      setLoading(false);
      return;
    }

    setTrade(tradeRow);
    setSelectedSenderCardId(tradeRow.sender_card_id || '');
    setSelectedReceiverCardId(tradeRow.receiver_card_id || '');

    const [{ data: sCards }, { data: rCards }] = await Promise.all([
      supabase.from('user_cards').select('*').eq('user_id', tradeRow.sender_id),
      supabase.from('user_cards').select('*').eq('user_id', tradeRow.receiver_id),
    ]);

    setSenderCards(sCards || []);
    setReceiverCards(rCards || []);
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      setCurrentUserId(session.user.id);
      if (tradeId) {
        await loadTradeRoom(session.user.id);
      }
    }
    init();
  }, [router, tradeId]);

  const handleSendOrCounterOffer = async (isCounter: boolean) => {
    if (!trade || !selectedSenderCardId || !selectedReceiverCardId) {
      setErrorMsg('Seleziona entrambe le carte (una per ciascun binder) prima di inviare.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase
      .from('trades')
      .update({
        sender_card_id: selectedSenderCardId,
        receiver_card_id: selectedReceiverCardId,
        last_updated_by: currentUserId,
        status: isCounter ? 'counter_offer' : 'offer_sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', trade.id);

    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setCounterMode(false);
    setSuccessMsg(
      isCounter
        ? 'Contro-offerta inviata!'
        : 'Proposta di scambio inviata! In attesa di risposta.'
    );
    await loadTradeRoom(currentUserId);
  };

  const handleConfirmTrade = async () => {
    if (!trade) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase.rpc('execute_card_trade', {
      p_trade_id: trade.id,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(`Errore completamento scambio: ${error.message}`);
      return;
    }

    setSuccessMsg(
      'Scambio completato! Le carte sono state assegnate nei rispettivi binder e i Passaporti Digitali sono stati aggiornati.'
    );
    await loadTradeRoom(currentUserId);
  };

  const handleRejectTrade = async () => {
    if (!trade) return;
    setSubmitting(true);
    await supabase
      .from('trades')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', trade.id);
    setSubmitting(false);
    router.push('/profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Apertura Stanza Scambi...
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center text-sm">
        {errorMsg || 'Stanza non disponibile.'}
      </div>
    );
  }

  const proposedSenderCard = senderCards.find((c) => c.id === selectedSenderCardId);
  const proposedReceiverCard = receiverCards.find((c) => c.id === selectedReceiverCardId);

  const canRespondToOffer =
    (trade.status === 'offer_sent' || trade.status === 'counter_offer') &&
    trade.last_updated_by !== currentUserId;

  const canEditSelection = trade.status === 'room_open' || counterMode;

  const renderCardPreview = (card: TradeCard | undefined, label: string) => {
    const img = card?.image_url || card?.card_image || '';
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
          {label}
        </span>
        {img ? (
          <img
            src={img}
            alt={card?.card_name || label}
            className="w-36 h-48 object-contain rounded-xl bg-slate-900 p-2"
          />
        ) : (
          <div className="w-36 h-48 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
            Nessuna carta selezionata
          </div>
        )}
        <p className="text-xs font-bold text-slate-100">
          {card?.card_name || 'Seleziona dal binder'}
        </p>
        {card && (
          <p className="text-[11px] text-slate-400">
            {card.set_name || 'Set N/D'} {card.rarity ? `• ${card.rarity}` : ''}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-lg font-bold text-amber-400">
              🔄 Stanza Scambi — Ashkro's Vault
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Stato attuale: <span className="text-amber-400 font-mono">{trade.status}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadTradeRoom(currentUserId)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
            >
              ↻ Aggiorna
            </button>
            <a
              href="/profile"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
            >
              ← Profilo
            </a>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-4 rounded-xl">
            {successMsg}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
          <h2 className="text-sm font-bold text-slate-100 text-center">Proposta di Scambio</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {renderCardPreview(proposedSenderCard, 'Carta offerta da Utente A')}
            {renderCardPreview(proposedReceiverCard, 'Carta richiesta a Utente B')}
          </div>

          {trade.status === 'completed' && (
            <div className="text-center pt-2">
              <a
                href="/binder"
                className="inline-block px-5 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Scambio completato — Vai al tuo Binder
              </a>
            </div>
          )}

          {canEditSelection && trade.status !== 'completed' && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSendOrCounterOffer(counterMode)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg disabled:opacity-50"
              >
                {submitting
                  ? 'Invio in corso...'
                  : counterMode
                  ? '📤 Invia Contro-offerta'
                  : '📤 Invia Proposta di Scambio'}
              </button>
            </div>
          )}

          {canRespondToOffer && !counterMode && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmTrade}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg disabled:opacity-50"
              >
                ✅ Conferma Scambio
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCounterMode(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg disabled:opacity-50"
              >
                🔁 Fai Contro-offerta
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRejectTrade}
                className="px-5 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-xs rounded-xl border border-red-500/30 disabled:opacity-50"
              >
                ❌ Rifiuta
              </button>
            </div>
          )}
        </div>

        {canEditSelection && trade.status !== 'completed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase">
                Binder Utente A (seleziona 1 carta)
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {senderCards.map((c) => {
                  const img = c.image_url || c.card_image || '';
                  const selected = c.id === selectedSenderCardId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedSenderCardId(c.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-amber-500/15 border-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {img && (
                        <img
                          src={img}
                          alt={c.card_name}
                          className="w-full h-28 object-contain mb-2 rounded"
                        />
                      )}
                      <p className="text-xs font-bold text-slate-100 truncate">{c.card_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.set_name || ''}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase">
                Binder Utente B (seleziona 1 carta)
              </h3>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {receiverCards.map((c) => {
                  const img = c.image_url || c.card_image || '';
                  const selected = c.id === selectedReceiverCardId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedReceiverCardId(c.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-amber-500/15 border-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {img && (
                        <img
                          src={img}
                          alt={c.card_name}
                          className="w-full h-28 object-contain mb-2 rounded"
                        />
                      )}
                      <p className="text-xs font-bold text-slate-100 truncate">{c.card_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.set_name || ''}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TradeRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Apertura Stanza Scambi...
        </div>
      }
    >
      <TradeRoomContent />
    </Suspense>
  );
}