import EditCardClient from './EditCardClient';

// 🛑 FORZA IL RENDERING DINAMICO AL 100% (Disabilita il prerender statico che fa fallire Vercel)
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return <EditCardClient cardId={resolvedParams.id} />;
}