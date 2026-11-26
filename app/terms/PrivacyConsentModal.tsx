'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const CONSENT_STORAGE_KEY = 'ashkros_vault_privacy_accepted_v1';

interface PrivacyConsentModalProps {
  userId?: string | null;
}

export default function PrivacyConsentModal({ userId }: PrivacyConsentModalProps) {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function checkConsent() {
      const localAccepted = window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
      if (localAccepted) {
        setVisible(false);
        return;
      }

      if (userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.privacy_accepted_at) {
          window.localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
          setVisible(false);
          return;
        }
      }

      setVisible(true);
    }

    checkConsent();
  }, [userId]);

  const handleAccept = async () => {
    if (!checked) return;
    setSaving(true);

    const acceptedAt = new Date().toISOString();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      window.localStorage.setItem('ashkros_vault_privacy_accepted_at', acceptedAt);
    }

    if (userId) {
      await supabase.auth.updateUser({
        data: {
          privacy_accepted: true,
          privacy_accepted_at: acceptedAt,
        },
      });
    }

    setSaving(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
        <div className="space-y-1">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-md">
            Informativa Privacy & Cookie
          </span>
          <h2 className="text-lg font-bold text-white pt-1">
            Benvenuto su Ashkro's Vault
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Prima di continuare a utilizzare la piattaforma, prendi visione dell'informativa
          sul trattamento dei dati personali (AI. 13 GDPR): i dati del tuo account, delle carte
          registrate e delle segnalazioni di sicurezza vengono utilizzati esclusivamente per erogare
          i servizi del Vault, la tracciabilità dei passaporti digitali e la tutela anti-furto.
        </p>

        <label className="flex items-start gap-2.5 bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 accent-amber-500"
          />
          <span>
            Ho letto e accetto l'informativa sulla privacy e il trattamento dei dati
            necessari al funzionamento del servizio.
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={!checked || saving}
            onClick={handleAccept}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-xl transition"
          >
            {saving ? 'Salvataggio...' : 'Accetta e continua'}
          </button>
        </div>
      </div>
    </div>
  );
}