'use client';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function LandingPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    }
    checkSession();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">Caricamento Ashkro's Vault...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      
      {/* Navbar superiore */}
      <header className="max-w-7xl mx-auto w-full p-6 flex justify-between items-center border-b border-slate-900">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-black text-xl tracking-wider">🛡️ ASHKRO'S VAULT</span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <a
              href="/binder"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg"
            >
              Apri il mio Vault ↗
            </a>
          ) : (
            <>
              <a href="/login" className="px-4 py-2 text-slate-300 hover:text-white text-xs font-semibold">
                Accedi
              </a>
              <a
                href="/login"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg"
              >
                Registrati
              </a>
            </>
          )}
        </div>
      </header>

      {/* Hero Section con il Logo / Immagine di Intestazione */}
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16 flex flex-col items-center text-center space-y-10">
        
        {/* Contenitore Logo Principale */}
        <div className="w-full max-w-3xl rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900/50 p-4 flex justify-center items-center">
          <img
            src="/header-ashkrosvault.jpeg" 
            alt="Ashkro's Vault Intestazione"
            className="w-full max-h-56 object-contain rounded-2xl drop-shadow-lg"
            onError={(e) => {
              // Se l'immagine non viene trovata nella cartella public, mostra un fallback grafico pulito
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        <div className="space-y-4 max-w-2xl">
          <div className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1 rounded-full font-mono">
            The Ultimate Phygital TCG Ecosystem
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-100">
            Proteggi, Condividi e Scansiona la tua Collezione Pokémon
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            La piattaforma definitiva per i collezionisti di carte. Gestisci il tuo binder digitale, genera passaporti QR univoci per ogni carta, connettiti con gli amici e vivi lo scambio in sicurezza totale.
          </p>
        </div>

        {/* Pulsanti d'azione principali */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-2">
          {session ? (
            <a
              href="/binder"
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-xl"
            >
              Entra nel tuo Vault Personale
            </a>
          ) : (
            <a
              href="/login"
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-xl"
            >
              Inizia Subito - È Gratis
            </a>
          )}
          <a
            href="/scan"
            className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-2xl text-sm border border-slate-800 transition-all"
          >
            📷 Prova lo Scanner QR
          </a>
        </div>

        {/* Feature Grid descrittiva */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left w-full">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-2">
            <span className="text-xl">🛡️</span>
            <h3 className="font-bold text-slate-200 text-sm">Passaporto Digitale QR</h3>
            <p className="text-xs text-slate-400">Ogni carta ha un codice QR verificato legato al database sicuro per certificarne l'autenticità e i dettagli.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-2">
            <span className="text-xl">🤝</span>
            <h3 className="font-bold text-slate-200 text-sm">Network & Binder Amici</h3>
            <p className="text-xs text-slate-400">Aggiungi collezionisti tramite email, esplora i loro binder in sola lettura e gestisci trattative.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-2">
            <span className="text-xl">⚡</span>
            <h3 className="font-bold text-slate-200 text-sm">Scanner Fotocamera</h3>
            <p className="text-xs text-slate-400">Inquadra i passaporti da smartphone o PC per identificare immediatamente profili e carte al volo.</p>
          </div>
        </div>

      </main>

      {/* Footer con Disclaimer Legale in corsivo */}
      <footer className="border-t border-slate-900 py-8 px-6 text-center space-y-3">
        <p className="text-[11px] text-slate-500 italic max-w-4xl mx-auto leading-relaxed">
          Ashkro's Vault è uno strumento indipendente sviluppato da terze parti per la catalogazione e la gestione amatoriale/collezionistica di carte collezionabili (TCG). La piattaforma non è in alcun modo affiliata, associata, autorizzata, sponsorizzata o ufficialmente collegata ad alcuna casa editrice di giochi di carte (tra cui The Pokémon Company, Wizards of the Coast, Konami, Ravensburger, Bandai, ecc.) né ad alcuna società di grading di terze parti. Tutti i marchi registrati, i loghi, i nomi dei giochi, delle espansioni e delle carte appartengono esclusivamente ai rispettivi legittimi proprietari.
        </p>
        <p className="text-xs text-slate-600">
          Ashkro's Vault © 2026 • Tutti i diritti riservati ai rispettivi detentori dei marchi TCG.
        </p>
      </footer>

    </div>
  );
}