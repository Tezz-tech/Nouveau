/**
 * The brief presents identity verification as "Dojah or Smile ID" without
 * picking one — everything provider-specific goes behind this interface,
 * same discipline as `BrokerAdapter` in the original brief's Phase 5. Two
 * real implementations (DojahAdapter, SmileIdAdapter) can be added later
 * without touching a single onboarding route; only `SimulatorKycAdapter`
 * exists so far, since no real provider credentials are configured yet.
 */
export interface KycSubmission {
  userId: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  idType: "passport" | "national_id" | "drivers_license";
  idNumber: string;
}

export type KycVerificationStatus = "verified" | "rejected" | "pending";

export interface KycVerificationResult {
  status: KycVerificationStatus;
  providerReference: string;
  reason?: string;
}

export interface KycAdapter {
  readonly provider: string;
  submitVerification(input: KycSubmission): Promise<KycVerificationResult>;
}
