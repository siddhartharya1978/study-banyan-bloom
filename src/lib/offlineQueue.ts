import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Review {
  id: string;
  user_id: string;
  card_id: string;
  deck_id: string;
  result: 'correct' | 'incorrect' | 'skip';
  session_id: string;
  time_spent_seconds: number;
  metadata?: any;
  created_at: string;
}

interface BanyanDB extends DBSchema {
  'pending-reviews': {
    key: string;
    value: Review;
  };
}

let db: IDBPDatabase<BanyanDB> | null = null;

async function getDB() {
  if (!db) {
    db = await openDB<BanyanDB>('banyan-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending-reviews')) {
          db.createObjectStore('pending-reviews', { keyPath: 'id' });
        }
      },
    });
  }
  return db;
}

export async function queueReview(review: Review) {
  try {
    const database = await getDB();
    await database.add('pending-reviews', review);
    console.log('Review queued for offline sync:', review.id);
  } catch (error) {
    console.error('Error queueing review:', error);
  }
}

export async function getPendingReviews(): Promise<Review[]> {
  try {
    const database = await getDB();
    return await database.getAll('pending-reviews');
  } catch (error) {
    console.error('Error getting pending reviews:', error);
    return [];
  }
}

export async function clearPendingReview(id: string) {
  try {
    const database = await getDB();
    await database.delete('pending-reviews', id);
    console.log('Review synced and removed from queue:', id);
  } catch (error) {
    console.error('Error clearing review:', error);
  }
}

export async function syncPendingReviews(supabase: any) {
  const reviews = await getPendingReviews();
  console.log(`Syncing ${reviews.length} pending reviews...`);
  
  for (const review of reviews) {
    try {
      const { error } = await supabase
        .from('reviews')
        .insert(review);
      
      if (!error) {
        await clearPendingReview(review.id);
      }
    } catch (error) {
      console.error('Error syncing review:', error);
    }
  }
}
