"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthActionResponse {
  success?: boolean;
  error?: string;
}

/**
 * Validasi alamat email standar
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Server Action: Pendaftaran Akun Penjual Baru
 */
export async function registerAction(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  // Validasi Input Sisi Server
  if (!fullName || fullName.length < 3) {
    return { error: "Nama lengkap minimal 3 karakter." };
  }

  if (!email || !isValidEmail(email)) {
    return { error: "Format alamat email tidak valid." };
  }

  if (!password || password.length < 6) {
    return { error: "Kata sandi minimal 6 karakter." };
  }

  if (password !== confirmPassword) {
    return { error: "Konfirmasi kata sandi tidak cocok." };
  }

  const supabase = await createClient();

  // Eksekusi Pendaftaran di Supabase Auth
  // Data full_name otomatis disalin ke tabel public.users melalui trigger DB
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Email sudah terdaftar. Silakan login ke akun Anda." };
    }
    return { error: error.message };
  }

  // Jika auto-confirm aktif dan sesi langsung terbentuk, arahkan ke dashboard
  if (data.session) {
    redirect("/admin/profile");
  }

  // Jika membutuhkan konfirmasi email
  return {
    success: true,
    error: undefined,
  };
}

/**
 * Server Action: Masuk Akun Penjual
 */
export async function loginAction(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/admin/profile");

  if (!email || !isValidEmail(email)) {
    return { error: "Masukkan alamat email yang valid." };
  }

  if (!password) {
    return { error: "Kata sandi wajib diisi." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("invalid_grant")
    ) {
      return { error: "Email atau kata sandi tidak sesuai." };
    }
    if (error.message.includes("Email not confirmed")) {
      return {
        error: "Email belum dikonfirmasi. Periksa kotak masuk/spam email Anda.",
      };
    }
    return { error: error.message };
  }

  redirect(redirectTo.startsWith("/admin") ? redirectTo : "/admin/profile");
}

/**
 * Server Action: Keluar dari Sesi Penjual
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}