'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface CardItem {
  id: string;
  card_name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  image_url: string | null;
  is_graded: string | null;
  grade: string | null;
  language: string | null;
  public_qr_code_id: string;
}

export default function FriendBinderPage({ params }: { params: Promise<{ friendId: string }> }) {
  const resolvedParams = use(params);
  const friendId = resolvedParams.friendId;

  const [cards, setCards] = useState<CardItem[]>([]);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFriendVault() {
      // 1. Recupera l'email del proprietario del binder dalla tabella profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', friendId)
        .single();

      if (profileData) {
        setOwnerEmail(profileData.email);
      }

      // 2. Recupera le carte del proprietario (Sola Lettura)
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore nel recupero del binder:', error);
      } else if (data) {
        setCards(data);
      }
      setLoading(false);
    }

    fetchFriendVault();
  }, [friendId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Apertura Vault condiviso in corso...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Sola Lettura */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black text-lg">🛡️ Ashkro's Vault</span>
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                Read-Only View (Amico)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Stai esplorando il binder di <span className="text-slate-200 font-semibold">{ownerEmail || 'Collezionista'}</span>
            </p>
          </div>

          <a
            href="/profile"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all border border-slate-700"
          >
            ← Torna al Profilo
          </a>
        </div>

        {/* Griglia delle carte dell'amico */}
        {cards.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800/80 rounded-3xl">
            <p className="text-slate-400 text-sm">Questo collezionista non ha ancora inserito carte nel suo Vault.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl"
              >
                <div>
                  {/* Immagine della carta */}
                  {card.image_url && (
                    <div className="relative h-64 mb-4 flex items-center justify-center bg-slate-950/50 rounded-xl p-2 border border-slate-800/50">
                      <img
                        src={card.image_url}
                        alt={card.card_name}
                        className="max-h-full object-contain drop-shadow-lg"
                      />
                    </div>
                  )}

                  {/* Badge Lingua e Stato */}
                  <div className="w-full mb-3 flex gap-2">
                    <span className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg">
                      🌐 {card.language || 'IT'}
                    </span>
                    {card.is_graded === 'graded' ? (
                      <div className="flex-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-lg flex justify-between items-center">
                        <span>🛡️ GRADATA</span>
                        <span className="font-mono">{card.grade || 'N/D'}</span>
                      </div>
                    ) : (
                      <div className="flex-1 bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-medium px-2 py-1 rounded-lg text-center">
                        RAW
                      </div>
                    )}
                  </div>

                  {/* Informazioni carta */}
                  <h3 className="font-bold text-slate-100 text-sm truncate">{card.card_name}</h3>
                  <p className="text-xs text-amber-400 font-medium truncate mt-0.5">
                    {card.set_name} • #{card.card_number}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Rarità: {card.rarity || 'N/D'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                  {/* Link passaporto QR e miniatura QR */}
                  <div className="flex items-center justify-between">
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
                    <div className="bg-white p-1 rounded-lg shadow-sm">
                      <QRCodeSVG
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/card/${card.public_qr_code_id || card.id}`}
                        size={40}
                      />
                    </div>
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