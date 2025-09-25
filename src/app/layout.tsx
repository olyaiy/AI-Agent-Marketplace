import "./globals.css";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { auth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

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
        <Navbar userEmail={currentUser?.email} />
        <div className="flex-1 min-h-0 overflow-y-scroll mb-8 mx-8">
          {children}
        </div>
      </body>
    </html>
  );
}
