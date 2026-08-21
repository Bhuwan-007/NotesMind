/**
 * Confidentiality helpers for the NotesMind frontend.
 *
 * Categories listed here are treated as "confidential" on the frontend.
 * The backend may also return `confidentiality_level: "confidential"` on
 * the case object — both signals are respected.
 */

export const CONFIDENTIAL_CATEGORIES: string[] = [
  "disciplinary action",
  "faculty grievance",
];

/** All known categories for the New Request form dropdown. */
export const ALL_CATEGORIES = [
  { value: "lab equipment purchase", label: "Lab Equipment Purchase", confidential: false },
  { value: "conference TA/DA", label: "Conference TA/DA", confidential: false },
  { value: "disciplinary action", label: "Disciplinary Action", confidential: true },
  { value: "faculty grievance", label: "Faculty Grievance", confidential: true },
] as const;

/** Returns true when the given category string is classified as confidential. */
export function isConfidentialCategory(category: string): boolean {
  return CONFIDENTIAL_CATEGORIES.includes(category.toLowerCase());
}

/**
 * Returns true when a case object (as returned by the API) is confidential,
 * either because the backend flagged it or because the category is in our list.
 */
export function isConfidentialCase(caseData: any): boolean {
  if (!caseData) return false;
  if (caseData.confidentiality_level === "confidential") return true;
  return isConfidentialCategory(caseData.category);
}

/**
 * Returns true when a confidential case still needs Dean OTP verification
 * before its contents can be accessed.
 */
export function needsOtpVerification(caseData: any): boolean {
  return isConfidentialCase(caseData) && !caseData.access_verified;
}
