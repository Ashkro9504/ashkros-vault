'use client';

import React, { useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';

export interface BinderCardItem {
  id: string;
  name: string;
  setName?: string;
  cardNumber?: string;
  imageUrl?: string;
  rarity?: string;
  customOrder?: number;
}

interface VirtualBinderProps {
  cards: BinderCardItem[];
  title?: string;
  cardsPerPage?: number;
  onOrderChange?: (orderedIds: string[]) => void;
  onCardClick?: (card: BinderCardItem) => void;
}

type SortMode = 'custom' | 'name-asc' | 'name-desc' | 'number-asc';

export default function VirtualBinder({
  cards,
  title = 'Il Mio Binder',
  cardsPerPage = 9, // 3x3 per pagina sfogliabile (o imposta 12 per 4x3)
  onOrderChange,
  onCardClick,
}: VirtualBinderProps) {
  // 1. Personalizzazione copertina e fogli
  const [isOpen, setIsOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverColor, setCoverColor] = useState('#1e293b');
  const [pageColor, setPageColor] = useState('#f8fafc');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('custom');
  const [customOrderIds, setCustomOrderIds] = useState<string[]>(() =>
    cards.map((c) => c.id)
  );
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const bookRef = useRef<any>(null);

  // Sincronizza eventuali nuove carte aggiunte dall'esterno
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

  // 2. Effetto sonoro apertura zip / sfoglio pagina (Web Audio API senza asset esterni)
  const playZipAndOpenSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      // Suono "zip" (rumore filtrato con sweep di frequenza)
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
      // Ignora se il browser blocca l'audio prima di un gesto utente
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

  // Caricamento immagine di copertina dal PC/telefono
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

  // Riordinamento tramite drag & drop
  const applyNewOrder = (nextIds: string[]) => {
    setSortMode('custom');
    setCustomOrderIds(nextIds);
    onOrderChange?.(nextIds);
  };

  const handleDropOnCard = (targetCardId: string) => {
    if (!draggedCardId || draggedCardId === targetCardId) return;
    const currentIds = sortedCards.map((c) => c.id);
    const fromIdx = currentIds.indexOf(draggedCardId);
    const toIdx = currentIds.indexOf(targetCardId);
    if (fromIdx === -1 || toIdx === -1) return;

    const updated = [...currentIds];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    applyNewOrder(updated);
    setDraggedCardId(null);
  };

  const moveCardByStep = (cardId: string, delta: number) => {
    const currentIds = sortedCards.map((c) => c.id);
    const idx = currentIds.indexOf(cardId);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= currentIds.length) return;

    const updated = [...currentIds];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);
    applyNewOrder(updated);
  };

  // Suddivisione in pagine del raccoglitore
  const pages = useMemo(() => {
    const chunks: BinderCardItem[][] = [];
    for (let i = 0; i < sortedCards.length; i += cardsPerPage) {
      chunks.push(sortedCards.slice(i, i + cardsPerPage));
    }
    if (chunks.length === 0) chunks.push([]);
    return chunks;
  }, [sortedCards, cardsPerPage]);

  const gridColsClass =
    cardsPerPage === 12
      ? 'grid-cols-4 grid-rows-3'
      : 'grid-cols-3 grid-rows-3';

  return (
    <div className="w-full space-y-6 text-slate-100">
      {/* Barra personalizzazione copertina, fogli e ordinamento */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-amber-400">{title}</h2>
            <p className="text-xs text-slate-400">
              Personalizza copertina, colore dei fogli e ordine delle carte
            </p>
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
          {/* Colore copertina */}
          <label className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="text-slate-300">Colore copertina</span>
            <input
              type="color"
              value={coverColor}
              onChange={(e) => setCoverColor(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>

          {/* Colore fogli */}
          <label className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <span className="text-slate-300">Colore fogli</span>
            <input
              type="color"
              value={pageColor}
              onChange={(e) => setPageColor(e.target.value)}
              className="w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </label>

          {/* Ordinamento */}
          <label className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-slate-400 text-[11px]">Ordine carte</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
            >
              <option value="custom">Personalizzato (Drag / Frecce)</option>
              <option value="name-asc">Nome (A → Z)</option>
              <option value="name-desc">Nome (Z → A)</option>
              <option value="number-asc">Numero carta</option>
            </select>
          </label>

          {/* Immagine o URL copertina */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <span className="text-slate-400 text-[11px] block">Immagine copertina</span>
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

      {/* Vista chiusa (Copertina con zip) oppure aperta (Libro sfogliabile) */}
      {!isOpen ? (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleToggleBinder}
            style={{
              backgroundColor: coverColor,
              backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined,
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

            {/* Linea decorativa zip */}
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
              Trascina o usa le frecce sulle carte per riordinare
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
                        onDragStart={() => setDraggedCardId(card.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropOnCard(card.id)}
                        onClick={() => onCardClick?.(card)}
                        className="group relative bg-white/90 hover:bg-white border border-slate-300 rounded-lg p-1.5 shadow-sm flex flex-col justify-between cursor-grab active:cursor-grabbing transition"
                      >
                        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded bg-slate-100">
                          {card.imageUrl ? (
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              className="w-full h-full object-contain"
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Sposta indietro"
                              onClick={() => moveCardByStep(card.id, -1)}
                              className="px-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              title="Sposta avanti"
                              onClick={() => moveCardByStep(card.id, 1)}
                              className="px-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800"
                            >
                              ›
                            </button>
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