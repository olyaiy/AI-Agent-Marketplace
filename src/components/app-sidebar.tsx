import Link from "next/link"
import { Home, Settings } from "lucide-react"
import { headers } from "next/headers"
import { sql } from "drizzle-orm"
import { db } from "@/db/drizzle"
import { conversation } from "@/db/schema"
import { auth } from "@/lib/auth"
import { unstable_noStore as noStore } from "next/cache"
import { RecentChatsClientItems } from "@/components/RecentChatsClient"
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
  noStore()
  const headerList = await headers()
  const session = await auth.api.getSession({ headers: headerList }).catch(() => null)
  if (!session?.user) return null

  const rows = await db
    .select({
      id: conversation.id,
      agentTag: conversation.agentTag,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    })
    .from(conversation)
    .where(sql`${conversation.userId} = ${session.user.id}`)
    .orderBy(
      sql`COALESCE(${conversation.lastMessageAt}, ${conversation.updatedAt}, ${conversation.createdAt}) DESC`
    )
    .limit(5)

  if (rows.length === 0) return null

  const serverIds = rows.map((r) => r.id)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* Client-side pending items, filtered to avoid duplicates with server */}
          <RecentChatsClientItems serverIds={serverIds} />
          {rows.map((row) => {
            const date = row.lastMessageAt ?? row.updatedAt ?? row.createdAt
            const dateStr = date ? new Date(date as unknown as string).toLocaleDateString() : ""
            const agentId = row.agentTag?.startsWith("@") ? row.agentTag.slice(1) : row.agentTag
            const href = `/agent/${agentId}/${row.id}`
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