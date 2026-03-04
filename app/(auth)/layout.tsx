import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | NLSD",
  description: "Sign in to your NLSD account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
