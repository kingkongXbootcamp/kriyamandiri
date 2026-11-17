"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  sanitizeDashboardRedirect,
  stripControlChars,
} from "@/lib/security";

export interface AuthActionResponse {
  success?: boolean;
  error?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function getClientFingerprint(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown-ip";
  return ip;
}

export async function registerAction(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  const ip = await getClientFingerprint();
  const rate = checkRateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
  if (!rate.allowed) {
    return {
      error: `Terlalu banyak percobaan pendaftaran. Silakan coba lagi dalam ${rate.retryAfterSeconds} detik.`,
    };
  }

  const fullName = stripControlChars(
    String(formData.get("fullName") || "")
  ).trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!fullName || fullName.length < 3 || fullName.length > 100) {
    return { error: "Nama lengkap harus antara 3 hingga 100 karakter." };
  }

  if (!email || !isValidEmail(email)) {
    return { error: "Format alamat email tidak valid." };
  }

  if (!password || password.length < 8) {
    return { error: "Kata sandi minimal 8 karakter." };
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      error: "Kata sandi harus mengandung kombinasi huruf dan angka.",
    };
  }

  if (password !== confirmPassword) {
    return { error: "Konfirmasi kata sandi tidak cocok." };
  }

  const supabase = await createClient();

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
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Email sudah terdaftar. Silakan login ke akun Anda." };
    }
    return { error: "Pendaftaran gagal. Periksa kembali data Anda." };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    success: true,
    error: undefined,
  };
}

export async function loginAction(
  _prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  const ip = await getClientFingerprint();
  const rate = checkRateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!rate.allowed) {
    return {
      error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${rate.retryAfterSeconds} detik.`,
    };
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const rawRedirectTo = String(formData.get("redirectTo") || "/dashboard");
  const safeRedirectTo = sanitizeDashboardRedirect(rawRedirectTo);

  if (!email || !isValidEmail(email) || !password) {
    return { error: "Email atau kata sandi tidak sesuai." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return {
        error: "Email belum dikonfirmasi. Periksa kotak masuk/spam email Anda.",
      };
    }
    return { error: "Email atau kata sandi tidak sesuai." };
  }

  redirect(safeRedirectTo);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}