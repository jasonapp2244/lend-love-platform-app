/**
 * Review service — allows users to rate and review each other after a loan completes.
 * Reviews are stored as a subcollection: users/{uid}/reviews/{reviewId}
 * User's aggregate rating is updated after each review.
 */
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  loanId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: number;
}

/** Submit a review for a user. Updates the user's aggregate rating. */
export async function submitReview(
  targetUid: string,
  reviewerId: string,
  reviewerName: string,
  loanId: string,
  rating: number,
  comment: string,
): Promise<void> {
  // Create review document
  const reviewRef = doc(collection(db, 'users', targetUid, 'reviews'));
  const review: Review = {
    id: reviewRef.id,
    reviewerId,
    reviewerName,
    loanId,
    rating: Math.min(5, Math.max(1, Math.round(rating))),
    comment: comment.trim(),
    createdAt: Date.now(),
  };
  await setDoc(reviewRef, review);

  // Update aggregate rating on user profile
  const userRef = doc(db, 'users', targetUid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const user = userSnap.data();
    const oldRating = user.rating ?? 0;
    const oldCount = user.reviewCount ?? 0;
    const newCount = oldCount + 1;
    const newRating = (oldRating * oldCount + review.rating) / newCount;
    await updateDoc(userRef, {
      rating: Math.round(newRating * 10) / 10, // 1 decimal
      reviewCount: newCount,
      updatedAt: Date.now(),
    });
  }
}

/** Fetch reviews for a user. */
export async function fetchReviews(uid: string): Promise<Review[]> {
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'reviews'),
      orderBy('createdAt', 'desc'),
      limit(50),
    ),
  );
  return snap.docs.map((d) => d.data() as Review);
}
