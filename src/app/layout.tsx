import "./globals.css";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalContextMenuWrapper } from "@/components/GlobalContextMenuWrapper";

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
  const userRole = (currentUser as { role?: string })?.role;


  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased h-dvh relative`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalContextMenuWrapper>
            <Toaster />
            <SidebarProvider>
              <AppSidebar userEmail={currentUser?.email} userRole={userRole} />
              <SidebarInset className="min-w-0 w-full flex flex-col">
                {/* Mobile Header - fixed at top, only visible on mobile */}
                <MobileHeader
                  userAvatarUrl={currentUser?.image || undefined}
                  userName={currentUser?.name || currentUser?.email || undefined}
                />

                {/* Desktop Sidebar Trigger - only visible on desktop */}
                <div className="hidden md:block absolute top-2 left-2 z-50">
                  <SidebarTrigger className="bg-transparent" />
                </div>

                {/* Main content */}
                <div className="flex-1 min-h-0 overflow-y-auto relative overflow-x-hidden pt-[52px] md:pt-0">
                  <div className="md:p-6 max-w-full relative h-full md:pt-4">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </SidebarProvider>
          </GlobalContextMenuWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
