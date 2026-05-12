/**
 * KYC service — demo-mode implementation.
 *
 * Production flow:
 *   - Cloud Function calls ID Analyzer DocuPass API
 *   - Returns hosted verification URL
 *   - User completes verification in WebView
 *   - ID Analyzer webhook updates user.isVerified
 *
 * Demo flow (this module):
 *   - Upload 3 photos to Firebase Storage under kyc/{uid}/
 *   - Create kycSubmissions/{id} record with status='approved'
 *   - Update user.isVerified = true and kycStatus = 'approved'
 *   - Simulate ~1.5s processing delay
 */
import {
  doc,
  setDoc,
  updateDoc,
  collection,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import type { KycSubmission } from '../../src/shared';

export type KycDocType = 'id' | 'selfie' | 'address';

export interface KycDocUploads {
  idUrl?: string;
  selfieUrl?: string;
  addressUrl?: string;
}

/**
 * Uploads a single KYC document image to Firebase Storage.
 * `assetUri` is a local file URI from expo-image-picker.
 */
export async function uploadKycDocument(
  uid: string,
  docType: KycDocType,
  assetUri: string
): Promise<string> {
  const res = await fetch(assetUri);
  const blob = await res.blob();
  const path = `kyc/${uid}/${docType}-${Date.now()}.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(ref);
}

/**
 * Create a KYC submission record and auto-approve in demo mode.
 * Returns the submission ID.
 */
export async function submitKyc(uid: string, docs: KycDocUploads): Promise<string> {
  const ref = doc(collection(db, 'kycSubmissions'));
  const submission: KycSubmission = {
    id: ref.id,
    userId: uid,
    status: 'pending',
    documents: docs,
    createdAt: Date.now(),
  };
  await setDoc(ref, submission);

  // Simulate processing
  await new Promise((r) => setTimeout(r, 1500));

  // Auto-approve in demo
  await updateDoc(ref, {
    status: 'approved',
    confidenceScore: 0.98,
    amlFlag: false,
    reviewedAt: Date.now(),
  });

  // Update user document
  await updateDoc(doc(db, 'users', uid), {
    isVerified: true,
    kycStatus: 'approved',
    kycSubmissionId: ref.id,
    updatedAt: Date.now(),
  });

  return ref.id;
}
