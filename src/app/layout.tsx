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
            <div className="flex-1 min-h-0 overflow-y-auto relative overflow-x-none p-2">
              
              {/* Sidebar Trigger - positioned at top left */}
              <div className="sticky top-0 left-0 z-10">
                <div className="absolute top-2 left-2 hover:bg-accent rounded-lg">
                  <SidebarTrigger />
                </div>
              </div>

              {/* Children */}
              <div className="p-4 md:p-6 max-w-full h-full">
                {children}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
