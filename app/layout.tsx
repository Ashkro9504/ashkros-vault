import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ashkro's Vault - Registro TCG & Binder Virtuale",
  description: "Attestazione di proprietà e catalogazione carte TCG raw",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-slate-950 text-slate-100 min-h-full flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
        
        {/* Contenuto principale delle pagine */}
        <div className="flex-1 pb-24">
          {children}
        </div>

        {/* Barra di Navigazione Rapida Globale a piè di pagina */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 shadow-2xl">
          <div className="max-w-md mx-auto flex justify-around items-center text-xs font-semibold">
            <a href="/binder" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors">
              <span className="text-lg">🛡️</span>
              <span>Il tuo Binder</span>
            </a>
            <a href="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors">
              <span className="text-lg">👤</span>
              <span>Profilo</span>
            </a>
            <a href="/trade" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors">
              <span className="text-lg">🤝</span>
              <span>Scambi</span>
            </a>
            <a href="/scan" className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors">
              <span className="text-lg">📷</span>
              <span>Scanner</span>
            </a>
          </div>
        </nav>

      </body>
    </html>
  );
}