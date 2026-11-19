import FriendBinderClient from './FriendBinderClient';

export default async function Page({ params }: { params: Promise<{ friendId: string }> }) {
  const resolvedParams = await params;
  return <FriendBinderClient friendId={resolvedParams.friendId} />;
}
