import "./globals.css";
import Link from "next/link";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { auth } from "@/lib/auth";
import { AccountNavActions } from "@/components/AccountNavActions";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const session = await auth.api
    .getSession({ headers: headerList })
    .catch(() => null);

  const currentUser = session?.user ?? null;

  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased h-screen flex flex-col`}
      >
        <nav className="h-16 flex items-center justify-between px-6 flex-shrink-0">
          <Link href="/" className="text-xl font-semibold">
            AV
          </Link>
          <AccountNavActions userEmail={currentUser?.email} />
        </nav>
        <div className="flex-1 min-h-0 overflow-y-scroll mb-8 mx-8">
          {children}
        </div>
      </body>
    </html>
  );
}
