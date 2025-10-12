import Link from "next/link"
import { Home, Settings, MessageSquare } from "lucide-react"
import { RecentConversationsClient } from "@/components/recent-conversations-client"
import { SignOutButton } from "@/components/SignOutButton"
import { GoogleSignInButton } from "@/components/GoogleSignInButton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

interface AppSidebarProps {
  userEmail?: string | null;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  console.log('[AppSidebar] Received userEmail:', userEmail);
  console.log('[AppSidebar] Should show footer?', !!userEmail);
  
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <Link href="/" className="text-xl font-semibold hover:opacity-80 transition-opacity">
            AV
          </Link>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link href="/">
                    <Home />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversations icon - visible when collapsed */}
        <SidebarGroup className="group-data-[collapsible=icon]:block hidden">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="All Conversations">
                  <Link href="/conversations">
                    <MessageSquare />
                    <span>All Conversations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent conversations - client component with SWR - hidden when collapsed */}
        <RecentConversationsClient />
      </SidebarContent>
      
      {/* Footer with sign out or sign in button */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {userEmail ? (
              <SignOutButton userEmail={userEmail} />
            ) : (
              <div className="group-data-[collapsible=icon]:hidden">
                <GoogleSignInButton size="default" className="w-full" />
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}