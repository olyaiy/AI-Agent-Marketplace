"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Settings,
  MessageSquare,
  Shield,
  Plus,
  Bot,
  LayoutGrid,
  LogOut,
  ChevronsUpDown
} from "lucide-react"
import { RecentConversationsClient } from "@/components/recent-conversations-client"
import { GoogleSignInButton } from "@/components/GoogleSignInButton"
import { signOutAction } from '@/actions/auth'
import { ThemeToggleSidebar } from "@/components/theme-toggle-sidebar"
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
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface AppSidebarProps {
  userEmail?: string | null;
  userRole?: string | null;
}

export function AppSidebar({ userEmail, userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const isExpanded = state === "expanded";
  const isAdmin = userRole === 'admin';
  const initial = userEmail ? userEmail[0].toUpperCase() : "U";

  const isActive = (path: string) => pathname === path;

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-gray-100 bg-[#F4F2F0] dark:bg-sidebar">
      <SidebarHeader className="pb-0">
        <div className="flex items-center gap-3 px-2 py-3 h-14">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black text-white shadow-sm flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden transition-all duration-300">
              <span className="text-sm font-bold text-gray-900 leading-none">Agent Vendor</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Platform Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home" isActive={isActive("/")}>
                  <Link href="/">
                    <Home />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="All Conversations" isActive={isActive("/conversations")}>
                  <Link href="/conversations">
                    <MessageSquare />
                    <span>Conversations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Studio Section (Personal) */}
        {userEmail && (
          <SidebarGroup>
            <SidebarGroupLabel>Studio</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Your Agents" isActive={isActive("/your-agents")}>
                    <Link href="/your-agents">
                      <LayoutGrid />
                      <span>Your Agents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Create Agent" className="text-blue-600 hover:text-blue-700">
                    <Link href="/create">
                      <Plus className="bg-blue-100 text-blue-600 rounded-full p-0.5" />
                      <span>Create Agent</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Recent Chats (Auto-collapsible in sidebar logic) */}
        <div className="mt-2">
          <RecentConversationsClient />
        </div>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings" isActive={isActive("/settings")}>
                  <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <ThemeToggleSidebar />
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin Dashboard" isActive={isActive("/admin")}>
                    <Link href="/admin">
                      <Shield />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="p-2 border-t border-gray-100/50">
        <SidebarMenu>
          <SidebarMenuItem>
            {userEmail ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200"
                  >
                    <Avatar className="h-8 w-8 rounded-lg bg-gray-100 ring-1 ring-gray-200">
                      <AvatarFallback className="rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 font-semibold">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-gray-900">Account</span>
                      <span className="truncate text-xs text-gray-500">{userEmail}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">{userEmail}</span>
                        <span className="truncate text-xs text-gray-500">{userRole || 'User'}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={async () => {
                      await signOutAction();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="group-data-[collapsible=icon]:hidden px-2 pb-2">
                <GoogleSignInButton size="default" className="w-full shadow-sm" />
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
