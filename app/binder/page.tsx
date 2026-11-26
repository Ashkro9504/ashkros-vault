'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import VirtualBinder, { BinderCardItem } from '../VirtualBinder/VirtualBinder';

interface CardItem {
  id: string;
  user_id?: string;
  game_title?: string | null;
  card_name: string;
  set_name?: string | null;
  card_number?: string | null;
  rarity?: string | null;
  image_url?: string | null;
  card_image?: string | null;
  is_graded?: string | null;
  grade?: string | number | null;
  grade_company?: string | null;
  grade_score?: number | null;
  purchase_price?: number | null;
  language?: string | null;
  public_qr_code_id?: string | null;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function BinderPage() {
  const [user, setUser] = useState<any>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'binder3d'>('grid');

  // Stati per Ricerca e Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'alphabetical'>('latest');

  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function loadUserDataAndCards() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);
      await fetchCards(authUser.id, active);
    }

    loadUserDataAndCards();

    return () => {
      active = false;
    };
  }, [router]);

  async function fetchCards(userId: string, active = true) {
    setErrorMsg('');
    const { data, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', userId);

    if (!active) return;

    if (error) {
      console.error('Errore nel caricamento delle carte:', error);
      setErrorMsg(`Errore lettura binder: ${error.message}`);
    } else if (data) {
      setCards(data);
    }
    setLoading(false);
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Vuoi davvero rimuovere questa carta dal tuo Vault?')) return;

    const { error } = await supabase.from('user_cards').delete().eq('id', cardId);
    if (!error && user) {
      fetchCards(user.id);
    }
  };

  // --- FILTRAGGIO E ORDINAMENTO DELLE CARTE ---
  const filteredAndSortedCards = cards
    .filter(
      (card) =>
        card.card_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.set_name && card.set_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (card.game_title && card.game_title.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'alphabetical') {
        return a.card_name.localeCompare(b.card_name);
      }
      return 0;
    });

  const virtualBinderCards: BinderCardItem[] = filteredAndSortedCards.map((card, index) => ({
    id: card.id,
    name: card.card_name,
    setName: card.set_name || undefined,
    cardNumber: card.card_number || undefined,
    imageUrl: card.image_url || card.card_image || undefined,
    rarity: card.rarity || undefined,
    customOrder: index,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Caricamento Binder...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-12 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header con Selettore Vista e Tasto + Aggiungi Carta */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-amber-400">🛡️ Ashkro's Vault - Il tuo Binder</h1>
            <p className="text-xs text-slate-400 mt-1">
              Gestisci la tua collezione TCG, scansiona i QR code e tieni traccia delle tue carte phygital.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🗂️ Griglia
              </button>
              <button
                type="button"
                onClick={() => setViewMode('binder3d')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === 'binder3d'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                📖 Binder 3D
              </button>
            </div>

            <a
              href="/add-card"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
            >
              <span>➕</span> Aggiungi Carta
            </a>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* --- BARRA DI RICERCA E FILTRI --- */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          <div className="w-full sm:w-96">
            <input
              type="text"
              placeholder="🔍 Cerca carta per nome, set o gioco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 whitespace-nowrap">Filtra per:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 sm:flex-none bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="latest">Ultimo inserito</option>
              <option value="oldest">Primo inserito</option>
              <option value="alphabetical">Ordine alfabetico (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Contenuto: Griglia o Binder 3D */}
        {filteredAndSortedCards.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800/80 rounded-3xl space-y-4">
            <p className="text-slate-400 text-sm">
              Nessuna carta trovata nel tuo Vault con questi criteri.
            </p>
            <a
              href="/add-card"
              className="inline-block px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Aggiungi la tua prima carta
            </a>
          </div>
        ) : viewMode === 'binder3d' ? (
          <VirtualBinder
            cards={virtualBinderCards}
            title="Il Mio Binder — Ashkro's Vault"
            onCardClick={(clicked) => router.push(`/card/${clicked.id}`)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAndSortedCards.map((card) => {
              const displayImage = card.image_url || card.card_image || '';
              const qrTargetId = card.public_qr_code_id || card.id;
              const isGradedCard =
                card.is_graded === 'graded' ||
                Boolean(card.grade_company) ||
                card.grade_score != null;
              const gradeLabel =
                card.grade ||
                (card.grade_company
                  ? `${card.grade_company} ${card.grade_score ?? ''}`.trim()
                  : 'N/D');

              return (
                <div
                  key={card.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl"
                >
                  <div>
                    {/* Badge del Gioco TCG */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider">
                        🎮 {card.game_title || 'Pokémon'}
                      </span>
                      <span className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg">
                        🌐 {card.language || 'IT'}
                      </span>
                    </div>

                    {displayImage ? (
                      <div className="relative h-56 mb-4 flex items-center justify-center bg-slate-950/50 rounded-xl p-2 border border-slate-800/50">
                        <img
                          src={displayImage}
                          alt={card.card_name}
                          className="max-h-full object-contain drop-shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="h-56 mb-4 flex items-center justify-center bg-slate-950/50 rounded-xl p-2 border border-slate-800/50 text-xs text-slate-500">
                        Foto non trovata
                      </div>
                    )}

                    <div className="w-full mb-3">
                      {isGradedCard ? (
                        <div className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg flex justify-between items-center">
                          <span>🛡️ GRADATA</span>
                          <span className="font-mono">{gradeLabel}</span>
                        </div>
                      ) : (
                        <div className="w-full bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-medium px-2 py-1 rounded-lg text-center">
                          RAW (Non gradata)
                        </div>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-100 text-sm truncate">{card.card_name}</h3>
                    <p className="text-xs text-amber-400 font-medium truncate mt-0.5">
                      {card.set_name || 'Set non specificato'} • #{card.card_number || 'N/D'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Rarità: {card.rarity || 'N/D'}
                    </p>
                    {card.purchase_price != null && (
                      <p className="text-[11px] text-emerald-400 mt-0.5">
                        Acquisto: € {card.purchase_price}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] space-y-0.5">
                        <span className="text-amber-400 font-semibold block">Passaporto QR</span>
                        <a
                          href={`/card/${qrTargetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 underline hover:text-amber-400 transition-colors block"
                        >
                          Apri Scheda ↗
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-white p-1 rounded-lg shadow-sm">
                          <QRCodeSVG
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/card/${qrTargetId}`}
                            size={40}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-colors text-xs"
                          title="Elimina carta"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <a
                      href={`/edit-card/${card.id}`}
                      className="block w-full text-center py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
                    >
                      ✏️ Modifica
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}