"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();
  
  revalidatePath("/", "layout"); // Bersihin cache
  redirect("/login"); // <--- PASTIKAN INI /login, bukan /auth/login atau yang lain
}
