'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { createClient } from '@supabase/supabase-js';

export interface BinderCardItem {
  id: string;
  name: string;
  setName?: string;
  cardNumber?: string;
  imageUrl?: string;
  rarity?: string;
  isFavorite?: boolean;
  customOrder?: number;
}

interface VirtualBinderProps {
  cards: BinderCardItem[];
  title?: string;
  cardsPerPage?: number;
  onOrderChange?: (orderedIds: string[]) => void;
  onCardClick?: (card: BinderCardItem) => void;
}

type SortMode = 'favorites-first' | 'custom' | 'name-asc' | 'name-desc' | 'number-asc';

const STORAGE_KEY = 'ashkros_virtual_binder_style_v2';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function VirtualBinder({
  cards,
  title = 'Il Mio Binder',
  cardsPerPage = 9,
  onOrderChange,
  onCardClick,
}: VirtualBinderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [styleHydrated, setStyleHydrated] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('');

  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverColor, setCoverColor] = useState('#1e293b');
  const [pageColor, setPageColor] = useState('#f8fafc');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('favorites-first');
  const [customOrderIds, setCustomOrderIds] = useState<string[]>(() =>
    cards.map((c) => c.id)
  );
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const bookRef = useRef<any>(null);

  // 1. Carica stile da localStorage e poi da Supabase (se loggato)
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.coverImageUrl === 'string') setCoverImageUrl(parsed.coverImageUrl);
            if (typeof parsed.coverColor === 'string') setCoverColor(parsed.coverColor);
            if (typeof parsed.pageColor === 'string') setPageColor(parsed.pageColor);
            if (typeof parsed.soundEnabled === 'boolean') setSoundEnabled(parsed.soundEnabled);
          }
        } catch {
          // Ignora errori localStorage
        }
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) return;
        if (user) {
          setUserId(user.id);
          const { data } = await supabase
            .from('binder_settings')
            .select('cover_color, page_color, cover_image_url, sound_enabled')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!active) return;
          if (data) {
            if (typeof data.cover_color === 'string') setCoverColor(data.cover_color);
            if (typeof data.page_color === 'string') setPageColor(data.page_color);
            if (typeof data.cover_image_url === 'string') setCoverImageUrl(data.cover_image_url);
            if (typeof data.sound_enabled === 'boolean') setSoundEnabled(data.sound_enabled);
          }
        }
      } catch {
        // Ignora errori rete
      } finally {
        if (active) setStyleHydrated(true);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  // 2. Salva stile in localStorage e su Supabase quando cambia
  useEffect(() => {
    if (!styleHydrated) return;

    let effectiveCoverImg = coverImageUrl;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            coverImageUrl: effectiveCoverImg,
            coverColor,
            pageColor,
            soundEnabled,
          })
        );
      } catch {
        // Se l'immagine supera la quota di localStorage, non la blocchiamo su Supabase
        try {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              coverImageUrl: '',
              coverColor,
              pageColor,
              soundEnabled,
            })
          );
        } catch {
          // Ignora
        }
      }
    }

    if (!userId) return;

    const timer = setTimeout(async () => {
      const { error } = await supabase.from('binder_settings').upsert(
        {
          user_id: userId,
          cover_color: coverColor,
          page_color: pageColor,
          cover_image_url: effectiveCoverImg,
          sound_enabled: soundEnabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (!error) {
        setSaveFeedback('✓ Stile salvato');
        setTimeout(() => setSaveFeedback(''), 1800);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [styleHydrated, userId, coverImageUrl, coverColor, pageColor, soundEnabled]);

  // 3. Mantieni sincronizzato l'ordine quando cambia la lista delle carte
  useEffect(() => {
    setCustomOrderIds((prev) => {
      const cardIds = cards.map((c) => c.id);
      const kept = prev.filter((id) => cardIds.includes(id));
      const added = cardIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [cards]);

  const effectiveOrderIds = useMemo(() => {
    const existingSet = new Set(cards.map((c) => c.id));
    const filtered = customOrderIds.filter((id) => existingSet.has(id));
    const missing = cards.filter((c) => !filtered.includes(c.id)).map((c) => c.id);
    return [...filtered, ...missing];
  }, [cards, customOrderIds]);

  const sortedCards = useMemo(() => {
    const mapById = new Map(cards.map((c) => [c.id, c]));
    const ordered = effectiveOrderIds
      .map((id) => mapById.get(id))
      .filter((c): c is BinderCardItem => Boolean(c));

    if (sortMode === 'favorites-first') {
      return [...ordered].sort((a, b) => {
        const favA = a.isFavorite ? 0 : 1;
        const favB = b.isFavorite ? 0 : 1;
        if (favA !== favB) return favA - favB;
        return 0;
      });
    }
    if (sortMode === 'custom') return ordered;
    if (sortMode === 'name-asc') {
      return [...ordered].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    }
    if (sortMode === 'name-desc') {
      return [...ordered].sort((a, b) => b.name.localeCompare(a.name, 'it'));
    }
    if (sortMode === 'number-asc') {
      return [...ordered].sort((a, b) =>
        (a.cardNumber || '').localeCompare(b.cardNumber || '', undefined, {
          numeric: true,
        })
      );
    }
    return ordered;
  }, [cards, effectiveOrderIds, sortMode]);

  const playZipAndOpenSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      const duration = 0.28;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3600, ctx.currentTime + duration);
      filter.Q.value = 3.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + duration);
    } catch {
      // Ignora errori audio
    }
  };

  const playPageFlipSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const duration = 0.14;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1100;

      const gain = ctx.createGain();
      gain.gain.value = 0.14;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      // Ignora errori audio
    }
  };

  const handleToggleBinder = () => {
    if (!isOpen) {
      playZipAndOpenSound();
    } else {
      playPageFlipSound();
    }
    setIsOpen((prev) => !prev);
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyNewOrder = (nextIds: string[]) => {
    setSortMode('custom');
    setCustomOrderIds(nextIds);
    onOrderChange?.(nextIds);
  };

  const handleDropOnCard = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCardId || draggedCardId === targetCardId) {
      setDraggedCardId(null);
      setIsDraggingCard(false);
      return;
    }
    const currentIds = sortedCards.map((c) => c.id);
    const fromIdx = currentIds.indexOf(draggedCardId);
    const toIdx = currentIds.indexOf(targetCardId);
    if (fromIdx === -1 || toIdx === -1) return;

    const updated = [...currentIds];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    applyNewOrder(updated);
    setDraggedCardId(null);
    setIsDraggingCard(false);
  };

  const moveCardByStep = (e: React.MouseEvent, cardId: string, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    const currentIds = sortedCards.map((c) => c.id);
    const idx = currentIds.indexOf(cardId);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= currentIds.length) return;

    const updated = [...currentIds];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);
    applyNewOrder(updated);
  };

  const pages = useMemo(() => {
    const chunks: BinderCardItem[][] = [];
    for (let i = 0; i < sortedCards.length; i += cardsPerPage) {
      chunks.push(sortedCards.slice(i, i + cardsPerPage));
    }
    if (chunks.length === 0) chunks.push([]);
    return chunks;
  }, [sortedCards, cardsPerPage]);

  const gridColsClass =
    cardsPerPage === 12 ? 'grid-cols-4 grid-rows-3' : 'grid-cols-3 grid-rows-3';

  return (
    <div className="w-full space-y-6 text-slate-100">
      {/* Pannello personalizzazione copertina, fogli e ordinamento */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-amber-400">{title}</h2>
              <p className="text-xs text-slate-400">
                Personalizza copertina, colore dei fogli e riordina senza girare pagina
              </p>
            </div>
            {saveFeedback && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {saveFeedback}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              {soundEnabled ? '🔊 Suoni ON' : '🔇 Suoni OFF'}
            </button>

            <button
              type="button"
              onClick={handleToggleBinder}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition"
            >
              {isOpen ? '🤐 Chiudi Zip Binder' : '🤐 Apri Zip Binder'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <label className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="text-slate-300">Colore copertina</span>
            <input
              type="color"
              value={coverColor}
              onChange={(e) => setCoverColor(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>

          <label className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="text-slate-300">Colore fogli</span>
            <input
              type="color"
              value={pageColor}
              onChange={(e) => setPageColor(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>

          <label className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-slate-400 text-[11px]">Ordine carte</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
            >
              <option value="favorites-first">⭐ Preferiti prima</option>
              <option value="custom">Personalizzato (Drag / Frecce)</option>
              <option value="name-asc">Nome (A → Z)</option>
              <option value="name-desc">Nome (Z → A)</option>
              <option value="number-asc">Numero carta</option>
            </select>
          </label>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Copertina (File o URL)</span>
              {coverImageUrl && (
                <button
                  type="button"
                  onClick={() => setCoverImageUrl('')}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Rimuovi img
                </button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverFileChange}
              className="block w-full text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-slate-800 file:text-amber-300"
            />
            <input
              type="text"
              placeholder="Oppure incolla URL immagine..."
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Vista chiusa o aperta */}
      {!isOpen ? (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleToggleBinder}
            style={{
              backgroundColor: coverColor,
              backgroundImage: coverImageUrl ? `url("${coverImageUrl}")` : undefined,
            }}
            className="group relative w-72 sm:w-80 h-96 rounded-r-3xl rounded-l-lg border-l-8 border-l-black/40 shadow-2xl bg-cover bg-center overflow-hidden flex flex-col justify-between p-6 text-left transition-transform hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition" />

            <div className="relative z-10">
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-slate-950">
                Binder Digitale
              </span>
              <h3 className="text-xl font-extrabold text-white mt-3 drop-shadow">
                {title}
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                {sortedCards.length} {sortedCards.length === 1 ? 'carta' : 'carte'}
              </p>
            </div>

            <div className="relative z-10 border-t border-dashed border-amber-300/80 pt-3 flex items-center justify-between text-xs font-bold text-amber-300">
              <span>🤐 Clicca per aprire la zip</span>
              <span>→</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                playPageFlipSound();
                bookRef.current?.pageFlip()?.flipPrev();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              ← Pagina precedente
            </button>

            <span className="text-xs text-slate-400">
              Usa le frecce o trascina per riordinare; clicca su “Scheda” per aprire la carta
            </span>

            <button
              type="button"
              onClick={() => {
                playPageFlipSound();
                bookRef.current?.pageFlip()?.flipNext();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              Pagina successiva →
            </button>
          </div>

          <div className="flex justify-center overflow-x-auto py-2">
            {/* @ts-expect-error react-pageflip espone componenti compatibili a runtime */}
            <HTMLFlipBook
              ref={bookRef}
              width={380}
              height={500}
              size="stretch"
              minWidth={300}
              maxWidth={520}
              minHeight={380}
              maxHeight={680}
              showCover={false}
              useMouseEvents={!isDraggingCard}
              onFlip={playPageFlipSound}
              className="shadow-2xl rounded-xl"
            >
              {pages.map((pageCards, pageIndex) => (
                <div
                  key={`page-${pageIndex}`}
                  style={{ backgroundColor: pageColor }}
                  className="p-4 border border-slate-300/60 shadow-inner flex flex-col justify-between text-slate-900"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 pb-2 border-b border-slate-300">
                    <span>{title}</span>
                    <span>Pag. {pageIndex + 1}</span>
                  </div>

                  <div className={`grid ${gridColsClass} gap-2.5 my-3 flex-1`}>
                    {pageCards.map((card) => (
                      <div
                        key={card.id}
                        draggable
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          setDraggedCardId(card.id);
                          setIsDraggingCard(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => handleDropOnCard(e, card.id)}
                        onDragEnd={() => {
                          setDraggedCardId(null);
                          setIsDraggingCard(false);
                        }}
                        className={`group relative bg-white/95 border rounded-lg p-1.5 shadow-sm flex flex-col justify-between cursor-grab active:cursor-grabbing transition ${
                          draggedCardId === card.id
                            ? 'border-amber-500 ring-2 ring-amber-400/50'
                            : card.isFavorite
                              ? 'border-amber-400 ring-1 ring-amber-300/60'
                              : 'border-slate-300'
                        }`}
                      >
                        {card.isFavorite && (
                          <span
                            title="Carta nei Preferiti"
                            className="absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-extrabold shadow"
                          >
                            ⭐
                          </span>
                        )}

                        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded bg-slate-100">
                          {card.imageUrl ? (
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              draggable={false}
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 text-center px-1">
                              {card.name}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-1 text-[10px]">
                          <span className="truncate font-semibold text-slate-800">
                            {card.name}
                          </span>

                          <div
                            className="flex items-center gap-0.5 shrink-0"
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Sposta indietro"
                              onClick={(e) => moveCardByStep(e, card.id, -1)}
                              className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-amber-400 text-slate-900 font-bold"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              title="Sposta avanti"
                              onClick={(e) => moveCardByStep(e, card.id, 1)}
                              className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-amber-400 text-slate-900 font-bold"
                            >
                              ›
                            </button>
                            {onCardClick && (
                              <button
                                type="button"
                                title="Apri Passaporto Carta"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onCardClick(card);
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-bold"
                              >
                                Scheda
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-500 text-center">
                    {pageCards.length} carte in questa pagina
                  </div>
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        </div>
      )}
    </div>
  );
}