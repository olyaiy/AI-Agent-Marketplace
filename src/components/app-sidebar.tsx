import Link from "next/link"
import { Home, Settings, MessageSquare } from "lucide-react"
import { RecentConversationsClient } from "@/components/recent-conversations-client"
import { SignOutButton } from "@/components/SignOutButton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
    <Sidebar variant="inset" collapsible="icon" className="top-10 bg-purple-500">
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
      
      {/* Footer with sign out button - only when user is signed in */}
      {(() => {
        console.log('[AppSidebar] Rendering footer check, userEmail:', userEmail);
        if (userEmail) {
          console.log('[AppSidebar] Rendering SidebarFooter with email:', userEmail);
          return (
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem className=" mb-10">
                  <SignOutButton userEmail={userEmail} className="" />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          );
        }
        console.log('[AppSidebar] Not rendering footer - no userEmail');
        return null;
      })()}
      
      <SidebarRail className="top-10" />
    </Sidebar>
  )
}