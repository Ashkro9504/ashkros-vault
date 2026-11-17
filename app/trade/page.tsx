'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function TradePage() {
  const [user, setUser] = useState<any>(null);
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      setLoading(false);
    }
    checkUser();
  }, [router]);

  const handleCreateRoom = () => {
    // Genera un codice stanza casuale a 6 cifre/lettere
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setActiveRoom(randomCode);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setActiveRoom(roomCode.trim().toUpperCase());
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">Caricamento Stanza di Scambio...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-amber-400">🤝 Stanza di Scambio Phygital</h1>
            <p className="text-xs text-slate-400 mt-1">Negozia carte in tempo reale con un altro collezionista in sicurezza.</p>
          </div>
          <a href="/profile" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700">
            ← Torna al Profilo
          </a>
        </div>

        {!activeRoom ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Crea Stanza */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Crea una nuova Stanza</h2>
                <p className="text-xs text-slate-400 mt-1">Avvia una sessione di scambio e condividi il codice con l'altro collezionista.</p>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
              >
                Crea Stanza Privata
              </button>
            </div>

            {/* Unisciti a Stanza */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Unisciti a una Stanza</h2>
                <p className="text-xs text-slate-400 mt-1">Inserisci il codice fornito dal tuo partner di scambio.</p>
              </div>
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="CODICE (es. A3F9K2)"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono uppercase focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all"
                >
                  Entra nella Stanza
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl text-center space-y-6">
            <div className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-4 py-1.5 rounded-full font-mono">
              Stanza Attiva: {activeRoom}
            </div>
            <h2 className="text-lg font-bold text-slate-100">Connessione sicura stabilita</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              In questa area potrai specchiare le proposte di scambio. Mostra il tuo QR code o seleziona le carte dal binder da proporre nella trattativa.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setActiveRoom(null)}
                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-xl border border-red-500/30"
              >
                Abbandona Stanza
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}