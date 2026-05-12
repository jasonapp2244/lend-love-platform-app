import {
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  collection,
  where,
  writeBatch,
} from 'firebase/firestore';
import { ref as storageRef, listAll, deleteObject } from 'firebase/storage';
import { deleteUser as fbDeleteUser } from 'firebase/auth';
import { auth, db, storage } from './firebase';
import {
  UpdateProfileSchema,
  type UpdateProfileInput,
  type User,
} from '../../src/shared';

export async function updateProfile(uid: string, input: UpdateProfileInput): Promise<void> {
  const parsed = UpdateProfileSchema.parse(input);
  await updateDoc(doc(db, 'users', uid), {
    ...parsed,
    updatedAt: Date.now(),
  });
}

/**
 * Demo-mode account deletion.
 *
 * Cascade order:
 *  1. Delete user-owned Storage objects (signatures, kyc, profile)
 *  2. Anonymize loans (legal retention — never hard delete)
 *  3. Delete notifications, KYC submissions, support tickets
 *  4. Leave chat messages intact but anonymize via partnerId rename later
 *  5. Delete user document
 *  6. Delete Firebase Auth user
 *
 * Production will route this through a Cloud Function that adds:
 *   - Audit log entry
 *   - Confirmation email
 *   - Cancellation of auto-pay subscriptions
 *   - KYC document deletion via ID Analyzer API
 *   - Paykings customer vault removal
 */
export async function deleteAccount(uid: string): Promise<void> {
  // 1. Storage cleanup (best effort — Storage doesn't have recursive delete)
  await safeDeleteFolder(`users/${uid}/profile`);
  await safeDeleteFolder(`kyc/${uid}`);
  await safeDeleteFolder(`signatures/${uid}`);

  const batch = writeBatch(db);

  // 2. Anonymize loans (legal retention requirement — see CFR, TILA)
  const loanerLoans = await getDocs(
    query(collection(db, 'loans'), where('loanerId', '==', uid))
  );
  loanerLoans.forEach((d) =>
    batch.update(d.ref, { loanerId: 'deleted-user', updatedAt: Date.now() })
  );
  const borrowerLoans = await getDocs(
    query(collection(db, 'loans'), where('borrowerId', '==', uid))
  );
  borrowerLoans.forEach((d) =>
    batch.update(d.ref, { borrowerId: 'deleted-user', updatedAt: Date.now() })
  );

  // 3. Delete notifications
  const notifs = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', uid))
  );
  notifs.forEach((d) => batch.delete(d.ref));

  // 4. Delete KYC submissions
  const kyc = await getDocs(
    query(collection(db, 'kycSubmissions'), where('userId', '==', uid))
  );
  kyc.forEach((d) => batch.delete(d.ref));

  // 5. Delete user document last (so cascade reads above can find user info)
  batch.delete(doc(db, 'users', uid));

  await batch.commit();

  // 6. Delete Firebase Auth user (this signs us out immediately)
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await fbDeleteUser(auth.currentUser);
  }
}

async function safeDeleteFolder(path: string): Promise<void> {
  try {
    const folderRef = storageRef(storage, path);
    const list = await listAll(folderRef);
    await Promise.all(list.items.map((i) => deleteObject(i).catch(() => null)));
  } catch {
    // ignore — folder may not exist
  }
}
