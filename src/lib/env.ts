function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}

export function getResendApiKey() {
  return requireEnv("RESEND_API_KEY");
}

export function getResendFromEmail() {
  return requireEnv("RESEND_FROM_EMAIL");
}

export function getSupabaseUrl() {
  return requireEnv("SUPABASE_URL");
}

export function getSupabaseServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getSupabaseBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET_CERTIFICATES ?? "certificate-pdfs";
}
