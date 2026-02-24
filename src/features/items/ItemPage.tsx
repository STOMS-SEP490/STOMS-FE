import { useParams } from 'react-router-dom';
import { useItem } from '../../hooks/useExampleQuery';
import type { Item } from '../../types';

export default function ItemPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useItem(id);

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error.message}</div>;

  const item = data as Item | undefined;
  if (!item) return <div className="p-4">Not found</div>;

  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold mb-2">{item.name}</h1>
      <p className="text-sm text-muted-foreground">{item.description}</p>
    </main>
  );
}
