import Link from "next/link"
import { Home, Settings } from "lucide-react"
import { fetchRecentConversations } from "@/components/recent-conversations-server"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar variant="inset" collapsible="icon" className="top-10">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home" isActive>
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

        {/* Recent conversations */}
        <RecentConversations />
      </SidebarContent>
      <SidebarRail className="top-10" />
    </Sidebar>
  )
}

async function RecentConversations() {
  const rows = await fetchRecentConversations()
  if (!rows || rows.length === 0) return null

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {rows.map((row) => {
            const dateStr = new Date(row.dateIso).toLocaleDateString()
            const href = `/agent/${row.agentId}/${row.id}`
            return (
              <SidebarMenuItem key={row.id}>
                <SidebarMenuButton asChild>
                  <Link href={href}>
                    <span className="font-mono text-xs">{row.id.slice(0, 8)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{dateStr}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}