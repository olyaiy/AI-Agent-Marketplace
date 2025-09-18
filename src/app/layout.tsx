import "./globals.css";
import Link from "next/link";

import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased h-screen flex flex-col`}
      >
        <nav className="h-16 flex items-center px-6 flex-shrink-0">
          <Link href="/" className="text-xl font-semibold">
            AV
          </Link>
        </nav>
        
        <div className="flex-1 overflow-hidden mb-8 mx-8">
          {children}
        </div>
      </body>
    </html>
  );
}
