'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ADMIN_EMAIL = 'rayken9597@gmail.com';

interface LockdownRule {
  id: string;
  card_name: string;
  set_name: string;
  card_number: string;
  language: string;
  grade_number?: string | null;
  reason?: string | null;
  is_active: boolean;
  created_at: string;
  resolved_at?: string | null;
}

interface LockdownRequestItem {
  id: string;
  reporter_email?: string | null;
  card_id?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
}

export default function AdminLockdownPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [cardName, setCardName] = useState('');
  const [setName, setSetName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [language, setLanguage] = useState('IT');
  const [gradeNumber, setGradeNumber] = useState('');
  const [reason, setReason] = useState('Carta rubata o smarrita');

  const [rules, setRules] = useState<LockdownRule[]>([]);
  const [requests, setRequests] = useState<LockdownRequestItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadLockdowns = async () => {
    const [{ data: rData }, { data: reqData }] = await Promise.all([
      supabase.from('card_lockdowns').select('*').order('created_at', { ascending: false }),
      supabase
        .from('lockdown_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    setRules(rData || []);
    setRequests(reqData || []);
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

      if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
        router.replace('/profile');
        return;
      }

      setUser(session.user);
      await loadLockdowns();
      setLoading(false);
    }
    init();
  }, [router]);

  const handleActivateLockdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!cardName.trim() || !setName.trim() || !cardNumber.trim() || !language.trim()) {
      setErrorMsg('Compila almeno Nome carta, Edizione/Set, Numero nell’espansione e Lingua.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setStatusMsg('');

    const { error } = await supabase.from('card_lockdowns').insert({
      card_name: cardName.trim(),
      set_name: setName.trim(),
      card_number: cardNumber.trim(),
      language: language.trim(),
      grade_number: gradeNumber.trim() || null,
      reason: reason.trim() || 'Carta rubata/smarrita',
      is_active: true,
      created_by: user.id,
    });

    setSaving(false);

    if (error) {
      setErrorMsg(`Errore attivazione lock-down: ${error.message}`);
      return;
    }

    setStatusMsg(
      `Lock-down attivato: nessun utente potrà inserire "${cardName.trim()}" (${setName.trim()} #${cardNumber.trim()}) in lingua ${language.trim()}.`
    );
    setCardName('');
    setSetName('');
    setCardNumber('');
    setGradeNumber('');
    await loadLockdowns();
  };

  const handleResolveLockdown = async (rule: LockdownRule) => {
    setSaving(true);
    setErrorMsg('');
    setStatusMsg('');

    const { error } = await supabase
      .from('card_lockdowns')
      .update({
        is_active: false,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', rule.id);

    setSaving(false);

    if (error) {
      setErrorMsg(`Errore annullamento lock-down: ${error.message}`);
      return;
    }

    setStatusMsg(
      `Lock-down annullato per "${rule.card_name}" (${rule.set_name} #${rule.card_number}): situazione tornata sotto controllo.`
    );
    await loadLockdowns();
  };

  const handleCloseRequest = async (requestId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('lockdown_requests')
      .update({ status: 'resolved' })
      .eq('id', requestId);
    setSaving(false);

    if (error) {
      setErrorMsg(`Errore aggiornamento segnalazione: ${error.message}`);
      return;
    }
    await loadLockdowns();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
        Verifica autorizzazioni Admin...
      </div>
    );
  }

  const activeRules = rules.filter((r) => r.is_active);
  const resolvedRules = rules.filter((r) => !r.is_active);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-10 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-lg font-bold text-red-400">
              🛡️ Pannello Admin Lock-down — Ashkro's Vault
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Accesso riservato a <span className="text-amber-400 font-mono">{ADMIN_EMAIL}</span>
            </p>
          </div>
          <a
            href="/profile"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
          >
            ← Torna al Profilo
          </a>
        </div>

        {statusMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-4 rounded-xl">
            {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* 1. CARTE ATTUALMENTE IN LOCK-DOWN (BLOCCATE) */}
        <div className="bg-slate-900 border border-red-500/40 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-red-400">
            🔒 Prodotti attualmente in Lock-down ({activeRules.length})
          </h2>

          {activeRules.length === 0 ? (
            <p className="text-xs text-slate-400">
              Nessuna carta è attualmente bloccata in lock-down.
            </p>
          ) : (
            <div className="space-y-3">
              {activeRules.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-950 border border-red-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{r.card_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/40">
                        BLOCCATA
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Set: <strong>{r.set_name}</strong> • Numero: <strong>#{r.card_number}</strong> • Lingua: <strong>{r.language}</strong>
                      {r.grade_number ? ` • Gradazione: ${r.grade_number}` : ''}
                    </p>
                    {r.reason && (
                      <p className="text-[11px] text-slate-400">Motivo: {r.reason}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleResolveLockdown(r)}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shrink-0 disabled:opacity-50"
                  >
                    ✅ Annulla Lock-down (Risolto)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. FORM PER METTERE IN LOCK-DOWN UNA CARTA */}
        <form
          onSubmit={handleActivateLockdown}
          className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4"
        >
          <h2 className="text-sm font-bold text-amber-400">
            ➕ Metti in Lock-down una carta specifica
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Nome carta *</label>
              <input
                type="text"
                placeholder="Es. Zekrom EX"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Edizione / Set *</label>
              <input
                type="text"
                placeholder="Es. Black Bolt"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Numero nell'espansione *</label>
              <input
                type="text"
                placeholder="Es. 172/086"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Lingua *</label>
              <input
                type="text"
                placeholder="Es. IT o EN"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Numero di gradazione (opzionale)
              </label>
              <input
                type="text"
                placeholder="Es. certificato PSA / GRAAD / BGS"
                value={gradeNumber}
                onChange={(e) => setGradeNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Motivo / Nota</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
          >
            {saving ? 'Attivazione...' : '🚨 Attiva Lock-down'}
          </button>
        </form>

        {/* 3. SEGNALAZIONI RICEVUTE DAGLI UTENTI */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-3">
          <h2 className="text-sm font-bold text-amber-400">
            📩 Segnalazioni ricevute dal tasto Lock-down ({requests.length})
          </h2>

          {requests.length === 0 ? (
            <p className="text-xs text-slate-400">Nessuna segnalazione ricevuta.</p>
          ) : (
            <div className="space-y-2.5">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-200">
                      Da: {req.reporter_email || 'Utente'} •{' '}
                      <span
                        className={
                          req.status === 'open' ? 'text-amber-400 font-mono' : 'text-emerald-400 font-mono'
                        }
                      >
                        {req.status}
                      </span>
                    </p>
                    <p className="text-slate-400">{req.notes || 'Nessuna nota'}</p>
                  </div>

                  {req.status === 'open' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleCloseRequest(req.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-700 shrink-0"
                    >
                      Segna segnalazione gestita
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. STORICO LOCK-DOWN ANNULLATI */}
        {resolvedRules.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-300">
              🗂️ Storico Lock-down risolti ({resolvedRules.length})
            </h2>
            <div className="space-y-2">
              {resolvedRules.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs text-slate-400"
                >
                  <span>
                    <strong className="text-slate-200">{r.card_name}</strong> ({r.set_name} #
                    {r.card_number} — {r.language})
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    RISOLTO
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}