/**
 * Length of the emailed sign-in code.
 *
 * This MUST match Supabase Auth's `mailer_otp_length` (Authentication →
 * Providers → Email → Email OTP length). When the two disagree the form
 * silently truncates or rejects every code and nobody can sign in, so the
 * number lives here once and the UI and tests read it.
 */
export const EMAIL_OTP_LENGTH = 6;
