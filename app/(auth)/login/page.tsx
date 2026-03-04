import { LoginForm } from "@/components/auth/LoginForm";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo.jpeg" alt="Logo" width={80} height={80} className="mx-auto rounded-2xl mb-4" />
          <p className="text-slate-400 text-sm mt-1">Sign in with your Microsoft account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
