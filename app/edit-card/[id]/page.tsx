import EditCardClient from './EditCardClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <EditCardClient cardId={resolvedParams.id} />;
}