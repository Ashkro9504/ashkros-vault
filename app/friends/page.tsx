'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

interface Friend {
  id: string;
  friend_id: string;
  friend_email?: string;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndFetchFriends() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Recuperiamo le amicizie dell'utente
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error(error);
      } else if (data) {
        setFriends(data);
      }
      setLoading(false);
    }

    checkAuthAndFetchFriends();
  }, [router]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Per semplicità iniziale, se inserisci l'ID utente dell'amico:
    // (Successivamente possiamo mappare le email tramite una tabella profiles)
    const targetFriendId = friendEmailInput.trim();

    if (targetFriendId === user.id) {
      setErrorMsg('Non puoi aggiungere te stesso agli amici!');
      return;
    }

    const { error } = await supabase.from('friendships').insert([
      { user_id: user.id, friend_id: targetFriendId }
    ]);

    if (error) {
      setErrorMsg('Impossibile aggiungere l\'amico. Controlla l\'ID inserito.');
    } else {
      setSuccessMsg('Amico aggiunto con successo al network del Vault!');
      setFriendEmailInput('');
      // Ricarica la lista
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Caricamento network amici...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-amber-400">🤝 Network Amici & Vault Condivisi</h1>
            <p className="text-xs text-slate-400 mt-1">Collega i tuoi collezionisti di fiducia per esplorare le loro collezioni.</p>
          </div>
          <a
            href="/binder"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            ← Torna al mio Binder
          </a>
        </div>

        {/* Form Aggiungi Amico */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200">Aggiungi nuovo collezionista</h2>
          
          {errorMsg && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">{errorMsg}</div>}
          {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl">{successMsg}</div>}

          <form onSubmit={handleAddFriend} className="flex gap-3">
            <input
              type="text"
              value={friendEmailInput}
              onChange={(e) => setFriendEmailInput(e.target.value)}
              placeholder="Inserisci l'ID utente (UUID) dell'amico..."
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg"
            >
              Aggiungi
            </button>
          </form>
        </div>

        {/* Lista Amici */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200">I tuoi contatti collegati</h2>
          
          {friends.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">Non hai ancora aggiunto nessun amico al tuo network.</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div key={f.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs font-mono text-slate-300">Collezionista ID: {f.friend_id}</span>
                  <a
                    href={`/binder/${f.friend_id}`}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-lg transition-all"
                  >
                    Visualizza Binder ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}