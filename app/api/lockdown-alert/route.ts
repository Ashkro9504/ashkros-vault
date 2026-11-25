import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reporterEmail, reporterId, cardName, cardId, notes } = body || {};

    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'rayken9597@gmail.com';
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Ashkro's Vault <onboarding@resend.dev>";

    if (!resendApiKey) {
      return NextResponse.json(
        {
          ok: true,
          warning:
            'Richiesta salvata su Supabase. Configura RESEND_API_KEY e ADMIN_ALERT_EMAIL su Vercel per ricevere anche la mail automatica.',
        },
        { status: 200 }
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail], // SOLO all'amministratore
        subject: `🚨 LOCK-DOWN Richiesto su Ashkro's Vault${cardName ? ` — ${cardName}` : ''}`,
        html: `
          <h2>Segnalazione Lock-down Carta</h2>
          <p><strong>Utente segnalante:</strong> ${reporterEmail || 'N/D'} (ID: ${reporterId || 'N/D'})</p>
          <p><strong>Carta collegata:</strong> ${cardName || 'Non specificata'} (ID: ${cardId || 'N/D'})</p>
          <p><strong>Dettagli inseriti dall'utente:</strong><br/>${notes || 'Nessuna nota aggiuntiva'}</p>
          <p>Accedi al pannello Lock-down su Ashkro's Vault per attivare il blocco sulla carta specifica.</p>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { ok: false, error: `Errore invio email Resend: ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Errore interno alert lock-down' },
      { status: 500 }
    );
  }
}