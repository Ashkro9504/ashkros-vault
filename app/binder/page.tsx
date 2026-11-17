'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface CardItem {
  id: string;
  game_title: string | null;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  is_graded: string | null;
  grade: string | null;
  language: string | null;
  public_qr_code_id: string;
  created_at: string;
}

export default function BinderPage() {
  const [user, setUser] = useState<any>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Stati per Ricerca e Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'alphabetical'>('latest');

  const router = useRouter();

  useEffect(() => {
    async function loadUserDataAndCards() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      fetchCards(user.id);
    }

    loadUserDataAndCards();
  }, [router]);

  async function fetchCards(userId: string) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Errore nel caricamento delle carte:', error);
    } else if (data) {
      setCards(data);
    }
    setLoading(false);
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Vuoi davvero rimuovere questa carta dal tuo Vault?')) return;

    const { error } = await supabase.from('cards').delete().eq('id', cardId);
    if (!error && user) {
      fetchCards(user.id);
    }
  };

  // --- FILTRAGGIO E ORDINAMENTO DELLE CARTE ---
  const filteredAndSortedCards = cards
    .filter((card) => 
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

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">Caricamento Binder...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header con Tasto + Aggiungi Carta */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-amber-400">🛡️ Ashkro's Vault - Il tuo Binder</h1>
            <p className="text-xs text-slate-400 mt-1">Gestisci la tua collezione TCG, scansiona i QR code e tieni traccia delle tue carte phygital.</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/add-card"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
            >
              <span>➕</span> Aggiungi Carta
            </a>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-xl text-xs border border-red-500/30"
            >
              Esci
            </button>
          </div>
        </div>

        {/* --- BARRA DI RICERCA E FILTRI --- */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
          {/* Campo Cerca */}
          <div className="w-full sm:w-96">
            <input
              type="text"
              placeholder="🔍 Cerca carta per nome, set o gioco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Menu Filtri / Ordinamento */}
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

        {/* Griglia delle Carte */}
        {filteredAndSortedCards.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800/80 rounded-3xl space-y-4">
            <p className="text-slate-400 text-sm">Nessuna carta trovata nel tuo Vault con questi criteri.</p>
            <a
              href="/add-card"
              className="inline-block px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Aggiungi la tua prima carta
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAndSortedCards.map((card) => (
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

                  {card.image_url && (
                    <div className="relative h-56 mb-4 flex items-center justify-center bg-slate-950/50 rounded-xl p-2 border border-slate-800/50">
                      <img
                        src={card.image_url}
                        alt={card.card_name}
                        className="max-h-full object-contain drop-shadow-lg"
                      />
                    </div>
                  )}

                  <div className="w-full mb-3">
                    {card.is_graded === 'graded' ? (
                      <div className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg flex justify-between items-center">
                        <span>🛡️ GRADATA</span>
                        <span className="font-mono">{card.grade || 'N/D'}</span>
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
                  <p className="text-[11px] text-slate-400 mt-1">Rarità: {card.rarity || 'N/D'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] space-y-0.5">
                    <span className="text-amber-400 font-semibold block">Passaporto QR</span>
                    <a
                      href={`/card/${card.public_qr_code_id || card.id}`}
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
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/card/${card.public_qr_code_id || card.id}`}
                        size={40}
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition-colors text-xs"
                      title="Elimina carta"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}