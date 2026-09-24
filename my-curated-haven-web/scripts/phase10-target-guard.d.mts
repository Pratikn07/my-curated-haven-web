export interface Phase10Targets {
  appOrigin: string;
  supabaseOrigin: string;
  remoteTargets: string[];
}

export function validatePhase10Targets(
  environment?: Record<string, string | undefined>,
): Phase10Targets;

export function assertSafePhase10Targets(
  environment?: Record<string, string | undefined>,
): Phase10Targets;
