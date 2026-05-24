"use client";

import { signIn } from "next-auth/react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    if (typeof window !== "undefined") {
      const hasSignedInBefore = localStorage.getItem("linkvault_has_signed_in");
      if (window.gtag) {
        window.gtag("event", "login", { auth_method: "google" });
        if (!hasSignedInBefore) {
          window.gtag("event", "sign_up", { auth_method: "google" });
        }
      }
      localStorage.setItem("linkvault_has_signed_in", "1");
    }
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-slate-900 text-center mb-2">
          LinkVault
        </h1>
        <p className="text-sm text-slate-500 text-center mb-8">
          Sign in to access your link library
        </p>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            className="shrink-0"
          >
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.46c-.28 1.48-1.12 2.73-2.39 3.57v2.97h3.86c2.26-2.09 3.56-5.17 3.56-8.78z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.97c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.32c-.24-.72-.38-1.49-.38-2.32s.14-1.6.38-2.32V6.59H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.41l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.59l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
