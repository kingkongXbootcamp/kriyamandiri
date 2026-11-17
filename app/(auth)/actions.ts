"use server";

import {
  loginAction as coreLoginAction,
  registerAction as coreRegisterAction,
  logoutAction as coreLogoutAction,
  type AuthActionResponse,
} from "@/actions/auth";

export type { AuthActionResponse };

export async function registerAction(
  prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  return coreRegisterAction(prevState, formData);
}

export async function loginAction(
  prevState: AuthActionResponse | null,
  formData: FormData
): Promise<AuthActionResponse> {
  return coreLoginAction(prevState, formData);
}

export async function logoutAction(): Promise<void> {
  return coreLogoutAction();
}