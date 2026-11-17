'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function VerifyCardPage() {
  const params = useParams();
  const id = params?.id;
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchCard() {
      // Cerca la carta su Supabase tramite il suo ID univoco
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Errore nel recupero della carta:', error.message);
      } else {
        setCard(data);
      }
      setLoading(false);
    }

    fetchCard();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        Verifica autenticità in corso...
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 flex items-center justify-center p-6 text-center">
        Carta non trovata o inesistente nel registry di Ashkro's Vault.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
          ✔ Carta Verificata & Autenticata
        </div>

        {card.image_url && (
          <img 
            src={card.image_url} 
            alt={card.card_name} 
            className="w-48 h-auto mx-auto rounded-xl shadow-lg object-cover aspect-[5/7] border border-slate-800"
          />
        )}

        <h1 className="text-2xl font-bold text-amber-400">{card.card_name}</h1>
        
        <div className="text-xs text-slate-400 space-y-1">
          <p><strong>Set:</strong> {card.set_name || 'N/D'}</p>
          <p><strong>Numero:</strong> {card.card_number || 'N/D'}</p>
          <p><strong>Rarità:</strong> {card.rarity || 'N/D'}</p>
          <p><strong>Condizioni:</strong> {card.condition_notes}</p>
        </div>

        <div className="pt-4 border-t border-slate-800 text-left text-xs text-slate-500 space-y-1">
          <p>Registrato ufficialmente su Ashkro's Vault.</p>
          <p className="truncate">ID Univoco: {card.id}</p>
        </div>
      </div>
    </div>
  );
}