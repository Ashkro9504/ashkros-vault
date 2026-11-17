'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ScanPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Inizializza lo scanner QR della fotocamera
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        scanner.clear();
        // Se il QR code appartiene al nostro sito, reindirizza direttamente all'URL decodificato
        if (decodedText.startsWith('http') || decodedText.startsWith('/')) {
          window.location.href = decodedText;
        }
      },
      (errorMessage) => {
        // Errori di scansione frame ignorati per evitare log continui
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Errore pulizia scanner:", error));
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-xl mx-auto space-y-6 text-center">
        
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-left">
          <div>
            <h1 className="text-xl font-bold text-amber-400">📷 Scanner Phygital QR</h1>
            <p className="text-xs text-slate-400 mt-1">Inquadra il passaporto di un collezionista o di una carta.</p>
          </div>
          <a href="/profile" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700">
            ← Profilo
          </a>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div id="reader" className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-xs"></div>
          {scanResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl break-all">
              QR Rilevato: {scanResult}
            </div>
          )}
          <p className="text-xs text-slate-500">Posiziona il codice QR all'interno dell'inquadratura della fotocamera del tuo smartphone o PC.</p>
        </div>

      </div>
    </div>
  );
}