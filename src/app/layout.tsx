import "./globals.css";
import { headers } from "next/headers";
import { Inter } from "next/font/google";

import { auth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
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
        className={`${inter.variable} font-sans antialiased h-screen flex flex-col`}
      >
        <SidebarProvider>
          <div className="flex flex-col h-full">
            <Navbar userEmail={currentUser?.email} />
            <div className="flex flex-1 min-h-0">
              <AppSidebar />
              <SidebarInset>
                <div className="flex-1 min-h-0 overflow-y-auto relative ">

                  {/* Sidebar Trigger */}
                  <div className="sticky top-0 left-0 z-10 cursor-pointer">
                    <div className="absolute top-2 left-2 md:top-2 md:left-2 cursor-pointer hover:bg-accent rounded-lg">
                      <SidebarTrigger />
                    </div>
                  </div>

                  {/* Children */}
                  <div className="p-4 md:p-6 size-full">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
