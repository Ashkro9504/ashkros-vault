'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

interface FriendItem {
  id: string;
  friend_email: string;
  friend_id: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [friendEmailInput, setFriendEmailInput] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function loadProfileData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Carica profilo (avatar)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setAvatarUrl(profileData.avatar_url || '');
      }

      // Carica amici
      const { data: friendshipsData } = await supabase
        .from('friendships')
        .select('*')
        .eq('user_id', user.id);

      if (friendshipsData) {
        const loadedFriends = await Promise.all(friendshipsData.map(async (f) => {
          const { data: pData } = await supabase.from('profiles').select('email').eq('id', f.friend_id).single();
          return {
            id: f.id,
            friend_id: f.friend_id,
            friend_email: pData?.email || 'Utente sconosciuto'
          };
        }));
        setFriends(loadedFriends);
      }

      setLoading(false);
    }

    loadProfileData();
  }, [router]);

  // Funzione per il caricamento diretto del file immagine
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      setUploading(true);

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('Devi selezionare un\'immagine da caricare.');
      }

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Carica il file nel bucket "avatars" di Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Ottieni l'URL pubblico dell'immagine caricata
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Aggiorna la tabella profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      setSuccessMsg('Foto profilo caricata e aggiornata con successo!');
    } catch (error: any) {
      setErrorMsg(error.message || 'Errore durante il caricamento dell\'immagine.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddFriendByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const targetEmail = friendEmailInput.trim().toLowerCase();
    if (targetEmail === user.email) {
      setErrorMsg('Non puoi aggiungere te stesso.');
      return;
    }

    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', targetEmail)
      .single();

    if (profileError || !targetProfile) {
      setErrorMsg('Nessun utente trovato con questa email su Ashkro\'s Vault.');
      return;
    }

    const { error: insertError } = await supabase.from('friendships').insert([
      { user_id: user.id, friend_id: targetProfile.id }
    ]);

    if (insertError) {
      setErrorMsg('Questo utente è già nei tuoi amici o c\'è stato un errore.');
    } else {
      setSuccessMsg(`Collezionista ${targetEmail} aggiunto con successo!`);
      setFriendEmailInput('');
      window.location.reload();
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Vuoi rimuovere questo amico dal tuo network?')) return;

    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (!error) {
      setFriends(friends.filter(f => f.id !== friendshipId));
      setSuccessMsg('Amico rimosso.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">Caricamento profilo...</div>;
  }

  const binderUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/binder/${user.id}`;
  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/login?ref=${user.id}`;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setSuccessMsg('Link referral copiato negli appunti!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ashkro's Vault",
          text: 'Unisciti a me su Ashkro\'s Vault per gestire la nostra collezione Pokémon phygital!',
          url: inviteUrl,
        });
      } catch (err) {
        // Utente ha annullato la condivisione
      }
    } else {
      handleCopyInvite();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-amber-400">👤 Profilo Collezionista</h1>
            <p className="text-xs text-slate-400 mt-1">Gestisci la tua identità phygital, il tuo QR code e il network di amici.</p>
          </div>
          <a href="/binder" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700">
            ← Torna al Binder
          </a>
        </div>

        {errorMsg && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl">{errorMsg}</div>}
        {successMsg && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl">{successMsg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Sezione 1: Avatar e Upload Immagine */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-200">Personalizzazione Account</h2>
            
            <div className="flex items-center gap-4 py-2">
              <div className="w-16 h-16 rounded-full bg-slate-950 border border-amber-500/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-amber-400 font-bold text-xl">🛡️</span>
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400">Email registrata</p>
                <p className="text-sm font-bold text-slate-100 truncate">{user.email}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-medium text-slate-300">Carica nuova foto profilo (PC o Smartphone)</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-950 rounded-xl p-4 cursor-pointer transition-all">
                <span className="text-xs text-slate-300 font-semibold">
                  {uploading ? 'Caricamento in corso...' : '📁 Scegli file o scatta foto'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">PNG, JPG supportati</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Sezione 2: QR Code del Binder Personale */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center space-y-3">
            <h2 className="text-sm font-bold text-slate-200">QR Code del tuo Binder Pubblico</h2>
            <p className="text-xs text-slate-400">Scansiona o condividi questo codice per mostrare la tua collezione in sola lettura.</p>
            
            <div className="bg-white p-3 rounded-2xl shadow-md my-2">
              <QRCodeSVG value={binderUrl} size={110} />
            </div>

            <a href={binderUrl} target="_blank" className="text-xs text-amber-400 underline hover:text-amber-300">
              Apri il link pubblico ↗
            </a>
          </div>

        </div>

        {/* Sezione 3: Gestione Amici tramite Email */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200">🤝 Network Amici</h2>
          <p className="text-xs text-slate-400">Aggiungi altri collezionisti inserendo la loro email registrata su Ashkro's Vault.</p>

          <form onSubmit={handleAddFriendByEmail} className="flex gap-3">
            <input
              type="email"
              value={friendEmailInput}
              onChange={(e) => setFriendEmailInput(e.target.value)}
              placeholder="emailpsa@collezionista.com"
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg">
              Aggiungi Amico
            </button>
          </form>

          <div className="space-y-2 pt-2">
            {friends.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">Nessun amico collegato al momento.</p>
            ) : (
              friends.map((f) => (
                <div key={f.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-200">📧 {f.friend_email}</span>
                  <div className="flex gap-2">
                    <a href={`/binder/${f.friend_id}`} className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg border border-amber-500/30">
                      Vedi Binder
                    </a>
                    <button onClick={() => handleRemoveFriend(f.id)} className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg border border-red-500/30">
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sezione 4: Sistema di Referral (Invita un amico) */}
        <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 p-6 rounded-2xl shadow-xl space-y-3">
          <h2 className="text-sm font-bold text-amber-400">🎁 Invita un Amico & Ottieni Bonus</h2>
          <p className="text-xs text-slate-300">
            Il collezionismo è condivisione. Condividi il tuo link referral esclusivo: quando un nuovo utente si registra su Ashkro's Vault tramite il tuo invito, sbloccherete entrambi vantaggi esclusivi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-400 select-all"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCopyInvite}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700"
              >
                Copia Link
              </button>
              <button
                onClick={handleNativeShare}
                className="flex-1 sm:flex-none px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg"
              >
                📤 Condividi...
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}