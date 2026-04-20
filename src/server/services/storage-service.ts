import { createClient } from "@supabase/supabase-js";

import {
  getSupabaseBucket,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";

function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function uploadCertificatePdf(
  certificateCode: string,
  pdfBuffer: Buffer,
) {
  if (!isStorageConfigured()) {
    return {
      path: null,
    };
  }

  const storagePath = `certificates/${certificateCode}.pdf`;
  const client = getSupabaseAdminClient();

  const { error } = await client.storage
    .from(getSupabaseBucket())
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload certificate PDF: ${error.message}`);
  }

  return {
    path: storagePath,
  };
}

export async function downloadCertificatePdf(storagePath: string) {
  if (!isStorageConfigured()) {
    return null;
  }

  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage
    .from(getSupabaseBucket())
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download certificate PDF: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
