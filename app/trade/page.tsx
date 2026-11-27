'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface TradeCard {
  id: string;
  user_id: string;
  original_owner_id?: string | null;
  card_name: string;
  set_name?: string | null;
  card_number?: string | null;
  rarity?: string | null;
  image_url?: string | null;
  card_image?: string | null;
  public_qr_code_id?: string | null;
  is_favorite?: boolean;
}

interface TraderProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function TraderAvatar({
  profile,
  size = 'md',
}: {
  profile: TraderProfile;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-10 h-10 text-xs';

  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.displayName}
        className={`${dims} rounded-full object-cover border border-amber-400/60 bg-slate-800 shrink-0`}
      />
    );
  }

  return (
    <span
      className={`${dims} rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-extrabold flex items-center justify-center shrink-0`}
    >
      {getInitials(profile.displayName)}
    </span>
  );
}

function StylizedChair({
  profile,
  roleBadge,
  side,
  active,
}: {
  profile: TraderProfile;
  roleBadge: string;
  side: 'left' | 'right';
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 select-none ${
        side === 'left' ? 'items-start sm:items-center' : 'items-end sm:items-center'
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
          active
            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
            : 'bg-slate-900 border-slate-700 text-slate-200'
        }`}
      >
        <TraderAvatar profile={profile} size="sm" />
        <div className="leading-tight">
          <span className="text-[11px] font-bold block">{profile.displayName}</span>
          <span className="text-[9px] text-amber-300/80 block">{roleBadge}</span>
        </div>
      </div>

      <svg
        viewBox="0 0 80 72"
        className="w-16 h-14 text-slate-600"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="16"
          y="6"
          width="48"
          height="24"
          rx="6"
          className="fill-slate-800 stroke-amber-500/50"
          strokeWidth="2.5"
        />
        <rect
          x="12"
          y="32"
          width="56"
          height="12"
          rx="5"
          className="fill-slate-700 stroke-slate-500"
          strokeWidth="2.5"
        />
        <path
          d="M20 44V66M60 44V66"
          className="stroke-slate-500"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function TradingRoomPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [partnerUserId, setPartnerUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [requesterProfile, setRequesterProfile] = useState<TraderProfile>({
    id: '',
    displayName: 'Giocatore',
    avatarUrl: '',
  });
  const [invitedProfile, setInvitedProfile] = useState<TraderProfile>({
    id: '',
    displayName: 'In attesa di invito',
    avatarUrl: '',
  });

  const [myCards, setMyCards] = useState<TradeCard[]>([]);
  const [partnerCards, setPartnerCards] = useState<TradeCard[]>([]);

  const [selectedMyCardIds, setSelectedMyCardIds] = useState<string[]>([]);
  const [selectedPartnerCardIds, setSelectedPartnerCardIds] = useState<string[]>([]);

  // Importo in euro dichiarato (nessun metodo di pagamento sul sito)
  const [myCashEuro, setMyCashEuro] = useState<string>('0');
  const [partnerCashEuro, setPartnerCashEuro] = useState<string>('0');

  const [myAccepted, setMyAccepted] = useState(false);
  const [partnerAccepted, setPartnerAccepted] = useState(false);
  const [tradeCompleted, setTradeCompleted] = useState(false);

  const fetchTraderProfile = async (
    userId: string,
    fallbackName: string,
    fallbackAvatar = ''
  ): Promise<TraderProfile> => {
    const cleanId = userId.trim();
    if (!cleanId) {
      return {
        id: '',
        displayName: fallbackName,
        avatarUrl: fallbackAvatar,
      };
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();

    const nameFromDb =
      data?.full_name ||
      data?.username ||
      data?.display_name ||
      data?.name ||
      fallbackName;

    const avatarFromDb =
      data?.avatar_url ||
      data?.photo_url ||
      data?.image_url ||
      fallbackAvatar;

    return {
      id: cleanId,
      displayName: String(nameFromDb || fallbackName),
      avatarUrl: String(avatarFromDb || ''),
    };
  };

  useEffect(() => {
    let active = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      setCurrentUser(user);

      const metaName =
        user.user_metadata?.full_name ||
        user.user_metadata?.username ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Giocatore';
      const metaAvatar =
        user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

      const profileA = await fetchTraderProfile(user.id, metaName, metaAvatar);
      if (!active) return;
      setRequesterProfile(profileA);

      const { data: ownCards, error } = await supabase
        .from('user_cards')
        .select('*')
        .eq('user_id', user.id);

      if (!active) return;

      if (error) {
        setErrorMsg(`Errore caricamento binder: ${error.message}`);
      } else {
        setMyCards(ownCards || []);
      }

      setLoading(false);
    }

    init();
    return () => {
      active = false;
    };
  }, [router]);

  const loadPartnerBinder = async (targetId: string) => {
    const trimmed = targetId.trim();
    setErrorMsg('');
    setStatusMsg('');
    setTradeCompleted(false);
    setMyAccepted(false);
    setPartnerAccepted(false);
    setSelectedPartnerCardIds([]);

    if (!trimmed) {
      setPartnerCards([]);
      setInvitedProfile({
        id: '',
        displayName: 'In attesa di invito',
        avatarUrl: '',
      });
      return;
    }

    const profileB = await fetchTraderProfile(
      trimmed,
      `Collezionista (${trimmed.slice(0, 6)})`,
      ''
    );
    setInvitedProfile(profileB);

    const { data, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', trimmed);

    if (error) {
      setErrorMsg(
        `Impossibile leggere il binder di ${profileB.displayName} (${error.message}). Verifica la policy RLS per la lettura in scambio.`
      );
      setPartnerCards([]);
      return;
    }

    setPartnerCards(data || []);
    setStatusMsg(
      `Binder di ${profileB.displayName} caricato (${(data || []).length} carte).`
    );
  };

  const toggleCardSelection = (
    card: TradeCard,
    currentList: string[],
    setter: (next: string[]) => void
  ) => {
    if (tradeCompleted) return;
    if (card.is_favorite) {
      setErrorMsg(
        `"${card.card_name}" è nei Preferiti: rimuovila dai preferiti nel binder prima di metterla in scambio.`
      );
      return;
    }

    setErrorMsg('');
    setMyAccepted(false);
    setPartnerAccepted(false);
    setter(
      currentList.includes(card.id)
        ? currentList.filter((id) => id !== card.id)
        : [...currentList, card.id]
    );
  };

  const handleModifyOffer = () => {
    if (tradeCompleted) return;
    setMyAccepted(false);
    setPartnerAccepted(false);
    setErrorMsg('');
    setStatusMsg(
      'Offerta aggiornata in bozza: controlla carte e conguaglio in € prima di accettare.'
    );
  };

  const handleRejectOffer = () => {
    setMyAccepted(false);
    setPartnerAccepted(false);
    setSelectedMyCardIds([]);
    setSelectedPartnerCardIds([]);
    setMyCashEuro('0');
    setPartnerCashEuro('0');
    setTradeCompleted(false);
    setStatusMsg('Offerta rifiutata e tavolo azzerato.');
  };

  const handleAcceptOffer = async () => {
    if (tradeCompleted) return;
    setErrorMsg('');
    setStatusMsg('');

    if (!currentUser) return;

    const blockedMy = myCards.filter(
      (c) => selectedMyCardIds.includes(c.id) && c.is_favorite
    );
    const blockedPartner = partnerCards.filter(
      (c) => selectedPartnerCardIds.includes(c.id) && c.is_favorite
    );

    if (blockedMy.length > 0 || blockedPartner.length > 0) {
      setErrorMsg(
        'Una o più carte selezionate sono nei Preferiti e non possono essere scambiate finché restano nei preferiti.'
      );
      return;
    }

    const cashA = Math.max(0, Number(myCashEuro) || 0);
    const cashB = Math.max(0, Number(partnerCashEuro) || 0);

    if (
      selectedMyCardIds.length === 0 &&
      selectedPartnerCardIds.length === 0 &&
      cashA === 0 &&
      cashB === 0
    ) {
      setErrorMsg('Seleziona almeno una carta o un importo in € prima di accettare.');
      return;
    }

    setMyAccepted(true);

    if (partnerAccepted) {
      try {
        for (const cardId of selectedMyCardIds) {
          const cardObj = myCards.find((c) => c.id === cardId);
          await supabase
            .from('user_cards')
            .update({
              user_id: partnerUserId.trim() || currentUser.id,
              original_owner_id: cardObj?.original_owner_id || currentUser.id,
            })
            .eq('id', cardId);
        }

        for (const cardId of selectedPartnerCardIds) {
          const cardObj = partnerCards.find((c) => c.id === cardId);
          await supabase
            .from('user_cards')
            .update({
              user_id: currentUser.id,
              original_owner_id: cardObj?.original_owner_id || partnerUserId.trim(),
            })
            .eq('id', cardId);
        }

        const transferredFromMe = myCards.filter((c) => selectedMyCardIds.includes(c.id));
        const receivedFromPartner = partnerCards.filter((c) =>
          selectedPartnerCardIds.includes(c.id)
        );

        setMyCards((prev) => [
          ...prev.filter((c) => !selectedMyCardIds.includes(c.id)),
          ...receivedFromPartner.map((c) => ({
            ...c,
            user_id: currentUser.id,
            original_owner_id: c.original_owner_id || partnerUserId.trim(),
          })),
        ]);

        setPartnerCards((prev) => [
          ...prev.filter((c) => !selectedPartnerCardIds.includes(c.id)),
          ...transferredFromMe.map((c) => ({
            ...c,
            user_id: partnerUserId.trim(),
            original_owner_id: c.original_owner_id || currentUser.id,
          })),
        ]);

        setSelectedMyCardIds([]);
        setSelectedPartnerCardIds([]);
        setTradeCompleted(true);
        setStatusMsg(
          `Scambio completato tra ${requesterProfile.displayName} e ${invitedProfile.displayName}! Proprietario originale conservato e nuovo proprietario registrato (Conguaglio dichiarato: ${requesterProfile.displayName} €${cashA.toFixed(
            2
          )} / ${invitedProfile.displayName} €${cashB.toFixed(2)}).`
        );
      } catch (err: any) {
        setErrorMsg(err?.message || 'Errore durante il trasferimento delle carte.');
      }
    } else {
      setStatusMsg(
        `${requesterProfile.displayName} ha accettato l'offerta (${requesterProfile.displayName}: ${selectedMyCardIds.length} carte + €${cashA.toFixed(
          2
        )} | ${invitedProfile.displayName}: ${selectedPartnerCardIds.length} carte + €${cashB.toFixed(
          2
        )}). In attesa della conferma di ${invitedProfile.displayName}.`
      );
    }
  };

  const renderBinderColumn = useMemo(() => {
    return function BinderBlock({
      profile,
      roleLabel,
      cards,
      selectedIds,
      onToggle,
      cashValue,
      onCashChange,
      accepted,
    }: {
      profile: TraderProfile;
      roleLabel: string;
      cards: TradeCard[];
      selectedIds: string[];
      onToggle: (card: TradeCard) => void;
      cashValue: string;
      onCashChange: (val: string) => void;
      accepted: boolean;
    }) {
      const favorites = cards.filter((c) => Boolean(c.is_favorite));

      return (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <TraderAvatar profile={profile} size="md" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-amber-400 truncate">
                  Binder di {profile.displayName}
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  {roleLabel} • Selezionate:{' '}
                  <span className="text-slate-100 font-bold">{selectedIds.length}</span> /{' '}
                  {cards.length} carte
                </p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                accepted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {accepted ? '✓ Accettato' : 'In trattativa'}
            </span>
          </div>

          {/* Vetrina Preferiti visibile durante la trattativa */}
          <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-300">
                ⭐ Preferiti in Vetrina ({favorites.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Visibili • Non scambiabili
              </span>
            </div>

            {favorites.length === 0 ? (
              <p className="text-[11px] text-slate-500">Nessuna carta nei preferiti.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((fav) => {
                  const favPassportId = fav.public_qr_code_id || fav.id;
                  return (
                    <a
                      key={fav.id}
                      href={`/card/${favPassportId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-amber-500/30 text-[10px] text-amber-200 hover:border-amber-400"
                    >
                      <span>⭐ {fav.card_name}</span>
                      <span className="text-sky-400 underline">Passaporto ↗</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Binder virtuale con carte e link al Passaporto */}
          <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            {cards.length === 0 ? (
              <p className="col-span-full text-center text-xs text-slate-500 py-8">
                Nessuna carta visibile in questo binder.
              </p>
            ) : (
              cards.map((card) => {
                const isFav = Boolean(card.is_favorite);
                const isSelected = selectedIds.includes(card.id);
                const imgSrc = card.image_url || card.card_image || '';
                const passportId = card.public_qr_code_id || card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => onToggle(card)}
                    className={`relative rounded-xl p-2 border transition flex flex-col justify-between ${
                      isFav
                        ? 'bg-slate-900/70 border-amber-500/40 opacity-85 cursor-not-allowed'
                        : isSelected
                          ? 'cursor-pointer bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50'
                          : 'cursor-pointer bg-slate-900 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {isFav && (
                      <span className="mb-1 inline-block self-start px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-bold">
                        ⭐ Preferito • Bloccata
                      </span>
                    )}

                    <div className="h-24 flex items-center justify-center bg-slate-950 rounded-lg overflow-hidden mb-1.5">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={card.card_name}
                          className="max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-500">No foto</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-100 truncate">
                        {card.card_name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {card.set_name || 'Set'} {card.card_number ? `• #${card.card_number}` : ''}
                      </p>
                      <div
                        className="flex items-center justify-between pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={`text-[10px] font-bold ${
                            isFav ? 'text-amber-300/80' : 'text-amber-300'
                          }`}
                        >
                          {isFav ? 'Non scambiabile' : isSelected ? '✓ In offerta' : 'Seleziona'}
                        </span>
                        <a
                          href={`/card/${passportId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] underline text-sky-400 hover:text-sky-300"
                        >
                          Passaporto ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Importo in euro dichiarato (senza alcun metodo di pagamento sul sito) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <label className="block text-[11px] font-semibold text-slate-300">
              Conguaglio in € di {profile.displayName} (solo indicazione testuale, nessun pagamento sul sito)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cashValue}
              onChange={(e) => {
                onCashChange(e.target.value);
                setMyAccepted(false);
                setPartnerAccepted(false);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
            />
          </div>
        </div>
      );
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Caricamento Stanza Scambi...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-sm">
              🛡️ AV
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-amber-400">
                Ashkro's Vault — Stanza Scambi
              </h1>
              <p className="text-[11px] text-slate-400">
                Tavolo di contrattazione phygital con passaporti verificati
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => router.push('/binder')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700"
            >
              📖 Il mio Binder
            </button>
            <button
              type="button"
              onClick={() => router.push('/add-card')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              ➕ Aggiungi Carta
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <TraderAvatar profile={requesterProfile} size="md" />
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">
                Richiedente scambio:{' '}
                <span className="text-amber-400">{requesterProfile.displayName}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Inserisci l'ID dell'utente invitato per caricare il suo binder sul tavolo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={partnerUserId}
              onChange={(e) => setPartnerUserId(e.target.value)}
              placeholder="UUID utente invitato..."
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 w-full sm:w-72"
            />
            <button
              type="button"
              onClick={() => loadPartnerBinder(partnerUserId)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
            >
              Invita / Carica
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-xl">
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3.5 rounded-xl">
            {statusMsg}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <StylizedChair
              profile={requesterProfile}
              roleBadge="Richiede lo scambio"
              side="left"
              active={myAccepted}
            />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400/80 hidden sm:inline">
              Tavolo Scambi
            </span>
            <StylizedChair
              profile={invitedProfile}
              roleBadge="Invitato allo scambio"
              side="right"
              active={partnerAccepted}
            />
          </div>

          <div className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-emerald-950/45 via-slate-900 to-slate-950 p-4 sm:p-6 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderBinderColumn({
                profile: requesterProfile,
                roleLabel: 'Richiede lo scambio',
                cards: myCards,
                selectedIds: selectedMyCardIds,
                onToggle: (card) =>
                  toggleCardSelection(card, selectedMyCardIds, setSelectedMyCardIds),
                cashValue: myCashEuro,
                onCashChange: setMyCashEuro,
                accepted: myAccepted,
              })}

              {renderBinderColumn({
                profile: invitedProfile,
                roleLabel: 'Invitato allo scambio',
                cards: partnerCards,
                selectedIds: selectedPartnerCardIds,
                onToggle: (card) =>
                  toggleCardSelection(card, selectedPartnerCardIds, setSelectedPartnerCardIds),
                cashValue: partnerCashEuro,
                onCashChange: setPartnerCashEuro,
                accepted: partnerAccepted,
              })}
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-400">Riepilogo Offerta sul Tavolo</p>
                <p className="text-slate-300">
                  {requesterProfile.displayName} offre: <strong>{selectedMyCardIds.length}</strong>{' '}
                  carte + <strong>€ {(Number(myCashEuro) || 0).toFixed(2)}</strong>
                </p>
                <p className="text-slate-300">
                  {invitedProfile.displayName} offre:{' '}
                  <strong>{selectedPartnerCardIds.length}</strong> carte +{' '}
                  <strong>€ {(Number(partnerCashEuro) || 0).toFixed(2)}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Nota: gli importi in € sono puramente indicativi/dichiarativi; Ashkro's Vault non gestisce né richiede pagamenti.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleModifyOffer}
                  disabled={tradeCompleted}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 font-bold text-xs border border-amber-500/30"
                >
                  ✏️ Modifica Offerta
                </button>

                <button
                  type="button"
                  onClick={handleRejectOffer}
                  className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold text-xs border border-red-500/40"
                >
                  ✖ Rifiuta
                </button>

                <button
                  type="button"
                  onClick={handleAcceptOffer}
                  disabled={tradeCompleted}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs shadow-lg"
                >
                  {tradeCompleted ? '✓ Scambio Concluso' : '✓ Accetta Scambio'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}