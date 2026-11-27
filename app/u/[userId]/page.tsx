'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface PublicCardItem {
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
  language?: string | null;
  public_qr_code_id?: string | null;
  binder_order?: number | null;
  is_favorite?: boolean;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function PublicUserBinderContent() {
  const params = useParams<{ userId: string }>();
  const userId = typeof params?.userId === 'string' ? params.userId : '';

  const [ownerName, setOwnerName] = useState('Collezionista');
  const [ownerAvatar, setOwnerAvatar] = useState('');
  const [cards, setCards] = useState<PublicCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPublicBinder() {
      if (!userId) {
        setErrorMsg('ID profilo non valido.');
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (active && profileData) {
        const resolvedName =
          profileData.full_name ||
          profileData.username ||
          profileData.display_name ||
          profileData.name;
        const resolvedAvatar =
          profileData.avatar_url || profileData.photo_url || profileData.image_url;
        if (resolvedName) setOwnerName(String(resolvedName));
        if (resolvedAvatar) setOwnerAvatar(String(resolvedAvatar));
      }

      const { data: cardsData, error } = await supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', userId)
        .order('binder_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!active) return;

      if (error) {
        setErrorMsg(`Impossibile caricare il binder pubblico: ${error.message}`);
      } else {
        setCards(cardsData || []);
      }

      setLoading(false);
    }

    loadPublicBinder();
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Caricamento Binder Pubblico...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {ownerAvatar ? (
              <img
                src={ownerAvatar}
                alt={ownerName}
                className="w-12 h-12 rounded-full object-cover border border-amber-400/60 bg-slate-800"
              />
            ) : (
              <span className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-extrabold flex items-center justify-center text-sm">
                AV
              </span>
            )}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Ashkro's Vault • Binder Pubblico
              </span>
              <h1 className="text-lg font-extrabold text-white">Binder di {ownerName}</h1>
              <p className="text-xs text-slate-400">
                {cards.length} {cards.length === 1 ? 'carta' : 'carte'} • Visibile anche senza account
              </p>
            </div>
          </div>

          <a
            href="/login"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            Accedi o Registrati
          </a>
        </header>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl">
            {errorMsg}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-sm text-slate-400">
            Questo binder non contiene carte visibili al momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cards.map((card) => {
              const displayImage = card.image_url || card.card_image || '';
              const detailId = card.public_qr_code_id || card.id;
              const isGraded =
                card.is_graded === 'graded' ||
                Boolean(card.grade_company) ||
                card.grade_score != null;
              const gradeText =
                card.grade ||
                (card.grade_company
                  ? `${card.grade_company} ${card.grade_score ?? ''}`.trim()
                  : 'N/D');

              return (
                <div
                  key={card.id}
                  className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-xl ${
                    card.is_favorite ? 'border-amber-400/70' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-1.5">
                      <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-md">
                        🎮 {card.game_title || 'Pokémon'}
                      </span>
                      <div className="flex items-center gap-1">
                        {card.is_favorite && (
                          <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            ⭐ Preferito
                          </span>
                        )}
                        <span className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          🌐 {card.language || 'IT'}
                        </span>
                      </div>
                    </div>

                    <div className="h-56 mb-4 flex items-center justify-center bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={card.card_name}
                          className="max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-500">Foto non disponibile</span>
                      )}
                    </div>

                    <h2 className="font-bold text-slate-100 text-sm truncate">{card.card_name}</h2>
                    <p className="text-xs text-amber-400 font-medium truncate mt-0.5">
                      {card.set_name || 'Set non specificato'} • #{card.card_number || 'N/D'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Rarità: {card.rarity || 'N/D'} • {isGraded ? `Gradata (${gradeText})` : 'RAW'}
                    </p>
                  </div>

                  <a
                    href={`/card/${detailId}`}
                    className="mt-4 block w-full text-center py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition"
                  >
                    Vedi Info & Passaporto ↗
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicUserBinderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Caricamento Binder Pubblico...
        </div>
      }
    >
      <PublicUserBinderContent />
    </Suspense>
  );
}