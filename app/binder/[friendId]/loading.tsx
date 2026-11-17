'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

interface CardItem {
  id: string;
  card_id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  set_name: string;
  rarity: string;
}

export default function FriendBinderPage({ params }: { params: Promise<{ friendId: string }> }) {
  const resolvedParams = use(params);
  const friendId = resolvedParams.friendId;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendAvatar, setFriendAvatar] = useState('');
  const [friendCards, setFriendCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Trucco per forzare il rendering client-side ed evitare il prerendering statico di Vercel
    if (typeof window === 'undefined') return;

    async function loadFriendBinder() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);

        // 1. Carica le informazioni del profilo dell'amico
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, avatar_url')
          .eq('id', friendId)
          .single();

        if (profileError || !profileData) {
          throw new Error('Impossibile trovare il profilo di questo collezionista.');
        }

        setFriendEmail(profileData.email);
        setFriendAvatar(profileData.avatar_url || '');

        // 2. Carica le carte nel binder dell'amico
        const { data: cardsData, error: cardsError } = await supabase
          .from('user_cards')
          .select('*')
          .eq('user_id', friendId);

        if (cardsError) {
          throw new Error('Errore durante il caricamento del binder dell\'amico.');
        }

        const formattedCards: CardItem[] = (cardsData || []).map((item) => ({
          id: item.id,
          card_id: item.card_id,
          name: item.card_name || 'Carta Pokémon',
          images: {
            small: item.card_image || '',
            large: item.card_image || '',
          },
          set_name: item.set_name || 'Set sconosciuto',
          rarity: item.rarity || 'Comune',
        }));

        setFriendCards(formattedCards);
      } catch (err: any) {
        setErrorMsg(err.message || 'Errore imprevisto.');
      } finally {
        setLoading(false);
      }
    }

    loadFriendBinder();
  }, [friendId, router]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">Caricamento binder del collezionista...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header di navigazione e info amico */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-950 border border-amber-500/40 flex items-center justify-center overflow-hidden flex-shrink-0">
              {friendAvatar ? (
                <img src={friendAvatar} alt="Avatar Amico" className="w-full h-full object-cover" />
              ) : (
                <span className="text-amber-400 font-bold text-xl">🛡️</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                  Binder in Sola Lettura
                </span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-slate-100 mt-1">{friendEmail}</h1>
            </div>
          </div>

          <a
            href="/profile"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            ← Torna al tuo Profilo
          </a>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Griglia delle carte dell'amico */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-slate-300">Collezione Pokémon ({friendCards.length} carte)</h2>
          </div>

          {friendCards.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-12 text-center space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-sm text-slate-300 font-semibold">Questo binder è attualmente vuoto.</p>
              <p className="text-xs text-slate-500">Il collezionista non ha ancora aggiunto carte Pokémon alla sua vetrina pubblica.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {friendCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-between shadow-lg group hover:border-amber-500/50 transition-all"
                >
                  <div className="w-full flex justify-center mb-2 overflow-hidden rounded-xl bg-slate-950 p-2">
                    {card.images.small ? (
                      <img
                        src={card.images.small}
                        alt={card.name}
                        className="h-48 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                      />
                    ) : (
                      <div className="h-48 flex items-center justify-center text-xs text-slate-600">Nessuna immagine</div>
                    )}
                  </div>
                  <div className="w-full text-center space-y-1">
                    <h3 className="font-bold text-slate-200 text-xs truncate" title={card.name}>{card.name}</h3>
                    <p className="text-[10px] text-slate-400 truncate">{card.set_name}</p>
                    <span className="inline-block text-[9px] bg-slate-950 border border-slate-800 text-amber-400 px-2 py-0.5 rounded-full font-mono mt-1">
                      {card.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}