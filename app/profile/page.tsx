'use client';

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface ProfileRow {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url?: string | null;
}

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  sender?: ProfileRow;
  receiver?: ProfileRow;
}

interface TradeInviteRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  sender?: ProfileRow;
  receiver?: ProfileRow;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addFriendParam = searchParams.get('addFriend');

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<FriendshipRow[]>([]);
  const [friends, setFriends] = useState<ProfileRow[]>([]);
  const [allFriendshipEdges, setAllFriendshipEdges] = useState<FriendshipRow[]>([]);
  const [tradeNotifications, setTradeNotifications] = useState<TradeInviteRow[]>([]);

  // Foto profilo
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Aggiunta manuale amici
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
  const [searchingFriends, setSearchingFriends] = useState(false);

  // Link invito sito
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [loading, setLoading] = useState(true);
  const [statusBanner, setStatusBanner] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  const loadAll = async (currentUserId: string) => {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
      .single();

    if (myProfile) {
      setProfile(myProfile);
      setAvatarInputUrl(myProfile.avatar_url || '');
    }

    if (addFriendParam && addFriendParam !== currentUserId) {
      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(user_id.eq.${currentUserId},friend_id.eq.${addFriendParam}),and(user_id.eq.${addFriendParam},friend_id.eq.${currentUserId})`
        );

      if (!existing || existing.length === 0) {
        const { error: reqErr } = await supabase.from('friendships').insert({
          user_id: currentUserId,
          friend_id: addFriendParam,
          status: 'pending',
        });
        if (!reqErr) {
          setStatusBanner('Richiesta di amicizia inviata tramite QR Code!');
        }
      } else {
        setStatusBanner('Collegamento con questo utente già presente.');
      }
      router.replace('/profile');
    }

    const { data: allFriendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

    if (allFriendships) {
      setAllFriendshipEdges(allFriendships);

      const relatedIds = Array.from(
        new Set(
          allFriendships.flatMap((f) => [f.user_id, f.friend_id]).filter((id) => id !== currentUserId)
        )
      );

      let profilesMap: Record<string, ProfileRow> = {};
      if (relatedIds.length > 0) {
        const { data: profList } = await supabase
          .from('profiles')
          .select('*')
          .in('id', relatedIds);

        if (profList) {
          profilesMap = Object.fromEntries(profList.map((p) => [p.id, p]));
        }
      }

      const pendingIn = allFriendships
        .filter((f) => f.friend_id === currentUserId && f.status === 'pending')
        .map((f) => ({ ...f, sender: profilesMap[f.user_id] }));

      const acceptedFriends = allFriendships
        .filter((f) => f.status === 'accepted')
        .map((f) => {
          const otherId = f.user_id === currentUserId ? f.friend_id : f.user_id;
          return profilesMap[otherId];
        })
        .filter(Boolean);

      setIncomingRequests(pendingIn);
      setFriends(acceptedFriends);
    }

    const { data: activeTrades } = await supabase
      .from('trades')
      .select('*')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .in('status', ['invite_pending', 'room_open', 'offer_sent', 'counter_offer'])
      .order('updated_at', { ascending: false });

    if (activeTrades) {
      const tradeUserIds = Array.from(
        new Set(activeTrades.flatMap((t) => [t.sender_id, t.receiver_id]))
      );
      let tradeProfilesMap: Record<string, ProfileRow> = {};
      if (tradeUserIds.length > 0) {
        const { data: tProf } = await supabase
          .from('profiles')
          .select('*')
          .in('id', tradeUserIds);
        if (tProf) {
          tradeProfilesMap = Object.fromEntries(tProf.map((p) => [p.id, p]));
        }
      }

      setTradeNotifications(
        activeTrades.map((t) => ({
          ...t,
          sender: tradeProfilesMap[t.sender_id],
          receiver: tradeProfilesMap[t.receiver_id],
        }))
      );
    }

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

      setUser(session.user);
      await loadAll(session.user.id);
    }
    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- MODIFICA FOTO PROFILO ---
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    setErrorBanner('');
    setStatusBanner('');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadErr) {
      setUploadingAvatar(false);
      setErrorBanner(`Errore caricamento foto: ${uploadErr.message}`);
      return;
    }

    const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = pubData.publicUrl;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    setUploadingAvatar(false);

    if (updateErr) {
      setErrorBanner(`Errore salvataggio profilo: ${updateErr.message}`);
      return;
    }

    setAvatarInputUrl(publicUrl);
    setStatusBanner('Foto profilo aggiornata!');
    await loadAll(user.id);
  };

  const handleSaveAvatarUrl = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    setErrorBanner('');
    setStatusBanner('');

    const cleanUrl = avatarInputUrl.trim() || null;
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: cleanUrl })
      .eq('id', user.id);

    setUploadingAvatar(false);

    if (error) {
      setErrorBanner(`Errore salvataggio URL foto: ${error.message}`);
      return;
    }

    setStatusBanner('Foto profilo salvata!');
    await loadAll(user.id);
  };

  // --- RICERCA E AGGIUNTA MANUALE AMICI ---
  const handleSearchUsers = async (queryText: string) => {
    setFriendSearchQuery(queryText);
    const trimmed = queryText.trim();
    if (!trimmed || !user) {
      setSearchResults([]);
      return;
    }

    setSearchingFriends(true);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    const builder = supabase.from('profiles').select('id, email, username, avatar_url').neq('id', user.id);

    const { data, error } = isUuid
      ? await builder.eq('id', trimmed).limit(10)
      : await builder.or(`email.ilike.%${trimmed}%,username.ilike.%${trimmed}%`).limit(10);

    setSearchingFriends(false);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  const handleManualAddFriend = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return;
    setErrorBanner('');
    setStatusBanner('');

    const alreadyLinked = allFriendshipEdges.some(
      (f) =>
        (f.user_id === user.id && f.friend_id === targetUserId) ||
        (f.user_id === targetUserId && f.friend_id === user.id)
    );

    if (alreadyLinked) {
      setStatusBanner('Hai già una richiesta o amicizia attiva con questo utente.');
      return;
    }

    const { error } = await supabase.from('friendships').insert({
      user_id: user.id,
      friend_id: targetUserId,
      status: 'pending',
    });

    if (error) {
      setErrorBanner(`Errore invio richiesta amicizia: ${error.message}`);
      return;
    }

    setStatusBanner('Richiesta di amicizia inviata! Appena accetta comparirà nei tuoi amici.');
    await loadAll(user.id);
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    setErrorBanner('');
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) {
      setErrorBanner(error.message);
      return;
    }
    setStatusBanner('Amicizia accettata! Ora potete avviare uno scambio.');
    if (user) await loadAll(user.id);
  };

  const handleSendTradeInvite = async (friendId: string) => {
    if (!user) return;
    setErrorBanner('');
    setStatusBanner('');

    const { data: createdTrade, error } = await supabase
      .from('trades')
      .insert({
        sender_id: user.id,
        receiver_id: friendId,
        status: 'invite_pending',
        last_updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      setErrorBanner(`Errore invio proposta di scambio: ${error.message}`);
      return;
    }

    setStatusBanner('Notifica "Proposta di scambio" inviata! In attesa che accetti.');
    if (createdTrade) {
      await loadAll(user.id);
    }
  };

  const handleAcceptTradeInvite = async (tradeId: string) => {
    setErrorBanner('');
    const { error } = await supabase
      .from('trades')
      .update({ status: 'room_open', updated_at: new Date().toISOString() })
      .eq('id', tradeId);

    if (error) {
      setErrorBanner(error.message);
      return;
    }
    router.push(`/trade/${tradeId}`);
  };

  const handleRejectTradeInvite = async (tradeId: string) => {
    await supabase
      .from('trades')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', tradeId);

    if (user) await loadAll(user.id);
  };

  const siteInviteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const handleCopySiteInvite = async () => {
    if (!siteInviteUrl) return;
    try {
      await navigator.clipboard.writeText(siteInviteUrl);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      setErrorBanner('Impossibile copiare automaticamente il link.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Caricamento Profilo...
      </div>
    );
  }

  const profileQrUrl =
    siteInviteUrl && user ? `${siteInviteUrl}/profile?addFriend=${user.id}` : '';

  const currentAvatar = profile?.avatar_url || '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Profilo con Foto Avatar + Logout */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Foto profilo"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 bg-slate-950 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-amber-400 shrink-0">
                {(profile?.username || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-amber-400">
                👤 {profile?.username || user?.email?.split('@')[0] || 'Collezionista'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/binder"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            >
              🛡️ Il mio Binder
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold rounded-xl border border-red-500/40 transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-4 rounded-xl">
            {statusBanner}
          </div>
        )}

        {errorBanner && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl">
            {errorBanner}
          </div>
        )}

        {/* Modifica Foto Profilo */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">🖼️ Modifica Foto Profilo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">
                Carica immagine dal dispositivo
              </label>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingAvatar}
                onChange={handleAvatarFileUpload}
                className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Oppure incolla URL immagine..."
                value={avatarInputUrl}
                onChange={(e) => setAvatarInputUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={handleSaveAvatarUrl}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shrink-0 disabled:opacity-50"
              >
                {uploadingAvatar ? '...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>

        {/* Link Invito al Sito (Beta Tester / Utenti) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-3">
          <h2 className="text-sm font-bold text-amber-400">
            🔗 Link di Invito al Sito (per Beta Tester)
          </h2>
          <p className="text-xs text-slate-400">
            Condividi questo indirizzo pubblico per far registrare i beta tester direttamente
            sull'app (non dà accesso al team di Vercel).
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="text"
              readOnly
              value={siteInviteUrl}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300"
            />
            <button
              type="button"
              onClick={handleCopySiteInvite}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shrink-0"
            >
              {copiedInvite ? '✅ Copiato!' : '📋 Copia Link Sito'}
            </button>
          </div>
        </div>

        {/* QR Code Profilo */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-3 rounded-2xl shadow-md shrink-0">
            {profileQrUrl && <QRCodeSVG value={profileQrUrl} size={132} />}
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-sm font-bold text-slate-100">
              📲 Il tuo QR Code Profilo (Aggiungi Amico)
            </h2>
            <p className="text-xs text-slate-400">
              Fai scansionare questo QR code a un altro utente di Ashkro's Vault per ricevere
              la richiesta di amicizia e aprire la Stanza Scambi.
            </p>
            <p className="text-[11px] font-mono text-amber-400 break-all">{profileQrUrl}</p>
          </div>
        </div>

        {/* Notifiche Proposta di Scambio */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-amber-400">
            🔔 Notifiche & Stanze Scambio ({tradeNotifications.length})
          </h2>

          {tradeNotifications.length === 0 ? (
            <p className="text-xs text-slate-400">Nessuna proposta di scambio attiva al momento.</p>
          ) : (
            <div className="space-y-3">
              {tradeNotifications.map((t) => {
                const isReceiver = t.receiver_id === user?.id;
                const otherName = isReceiver
                  ? t.sender?.username || t.sender?.email || 'Utente'
                  : t.receiver?.username || t.receiver?.email || 'Utente';

                return (
                  <div
                    key={t.id}
                    className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-100">
                        {t.status === 'invite_pending' && isReceiver
                          ? `📩 Proposta di scambio da ${otherName}`
                          : `🤝 Stanza scambio con ${otherName}`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Stato: <span className="text-amber-400 font-mono">{t.status}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {t.status === 'invite_pending' && isReceiver ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAcceptTradeInvite(t.id)}
                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl"
                          >
                            Accetta ed entra nella Stanza
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectTradeInvite(t.id)}
                            className="px-3.5 py-2 bg-red-500/15 text-red-400 text-xs font-semibold rounded-xl border border-red-500/30"
                          >
                            Rifiuta
                          </button>
                        </>
                      ) : (
                        <a
                          href={`/trade/${t.id}`}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                        >
                          Entra nella Stanza →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Richieste di Amicizia in entrata */}
        {incomingRequests.length > 0 && (
          <div className="bg-slate-900 border border-amber-500/40 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-amber-400">
              👋 Richieste di Amicizia in attesa ({incomingRequests.length})
            </h2>
            <div className="space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-100">
                      {req.sender?.username || req.sender?.email || req.user_id}
                    </p>
                    <p className="text-[11px] text-slate-400">Richiesta di amicizia ricevuta</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAcceptFriend(req.id)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl"
                  >
                    Accetta Amicizia
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aggiunta Manuale Amici */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">➕ Aggiungi Amico Manualmente</h2>
          <input
            type="text"
            placeholder="Cerca per username, email o ID utente..."
            value={friendSearchQuery}
            onChange={(e) => handleSearchUsers(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />

          {searchingFriends && (
            <p className="text-xs text-slate-400">Ricerca utenti in corso...</p>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => {
                const isAlreadyFriend = friends.some((f) => f.id === u.id);
                const isPending = allFriendshipEdges.some(
                  (edge) =>
                    edge.status === 'pending' &&
                    ((edge.user_id === user?.id && edge.friend_id === u.id) ||
                      (edge.user_id === u.id && edge.friend_id === user?.id))
                );

                return (
                  <div
                    key={u.id}
                    className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.username || 'Utente'}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                          {(u.username || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-100">
                          {u.username || u.email}
                        </p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>

                    {isAlreadyFriend ? (
                      <span className="text-[11px] font-semibold text-emerald-400 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                        Già amico
                      </span>
                    ) : isPending ? (
                      <span className="text-[11px] font-semibold text-amber-400 px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/30">
                        In attesa
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleManualAddFriend(u.id)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                      >
                        + Aggiungi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lista Amici + Avvio Proposta di Scambio */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-100">🤝 Lista Amici ({friends.length})</h2>

          {friends.length === 0 ? (
            <p className="text-xs text-slate-400">
              Nessun amico ancora. Cercalo qui sopra oppure fai scansionare il tuo QR code.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.username || 'Amico'}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                        {(friend.username || friend.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate">
                        {friend.username || friend.email}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{friend.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendTradeInvite(friend.id)}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shrink-0"
                  >
                    🔄 Proponi Scambio
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          Caricamento...
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}