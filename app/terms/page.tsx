export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <h1 className="text-3xl font-bold text-amber-400">Note Legali & Disclaimer</h1>
        <p className="text-xs text-slate-400">Ultimo aggiornamento: Novembre 2026</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">1. Proprietà Intellettuale e Marchi</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            <strong>Ashkro's Vault</strong> è un'applicazione indipendente sviluppata a scopo di catalogazione e gestione amatoriale/collezionistica. 
            Tutti i marchi registrati, i nomi dei prodotti, le immagini delle carte, i loghi e i simboli relativi a 
            <em>The Pokémon Company International</em>, <em>Wizards of the Coast</em>, <em>Konami</em>, <em>Bandai</em> e qualsiasi altro editore di Trading Card Games (TCG) 
            sono di proprietà esclusiva dei rispettivi detentori del copyright. L'uso di tali materiali è puramente descrittivo e identificativo.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">2. Natura del Servizio e "Passaporto Digitale"</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            I codici QR e i passaporti digitali generati da Ashkro's Vault costituiscono uno strumento di tracciamento e inventario privato per il collezionista. 
            La piattaforma non costituisce un ente di certificazione ufficiale, di grading professionale o di autenticazione legale vincolante. 
            Gli scambi, le vendite o le transazioni fisiche avvengono sotto la totale ed esclusiva responsabilità degli utenti coinvolti.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">3. Privacy e Gestione dei Dati</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            L'accesso alla piattaforma tramite credenziali o servizi di autenticazione (come Supabase Auth) raccoglie unicamente i dati necessari 
            al funzionamento del binder personale e alla protezione dei dati tramite Row Level Security (RLS). I dati non vengono ceduti a terze parti 
            e vengono impiegati esclusivamente per mantenere la coerenza del registro di proprietà delle carte inserite.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
          <a 
            href="/binder" 
            className="text-xs font-semibold text-amber-400 hover:underline"
          >
            ← Torna al Binder
          </a>
          <span className="text-xs text-slate-500 font-mono">Ashkro's Vault Registry</span>
        </div>
      </div>
    </div>
  );
}