import "./globals.css";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
        className={`${inter.variable} font-sans antialiased h-dvh relative`}
      >
        <SidebarProvider>
          <AppSidebar userEmail={currentUser?.email} />
          <SidebarInset className="min-w-0 w-full">
            {/* Sidebar Trigger - fixed at top left on mobile, sticky on desktop */}
            <div className="fixed md:sticky top-2 left-2 z-50">
              <SidebarTrigger className="bg-background/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none shadow-sm md:shadow-none" />
            </div>

            {/* Main content */}
            <div className="flex-1 min-h-0 overflow-y-auto relative overflow-x-none">
              <div className="md:p-6 max-w-full relative  h-dvh md:h-full  md:pt-4">
                {children}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
