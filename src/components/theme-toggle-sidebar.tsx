"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggleSidebar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const getIcon = () => {
    if (!mounted) return <Sun className="h-4 w-4" />

    switch (theme) {
      case "dark":
        return <Moon className="h-4 w-4" />
      case "light":
        return <Sun className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getLabel = () => {
    if (!mounted) return "Theme"

    switch (theme) {
      case "dark":
        return "Dark"
      case "light":
        return "Light"
      default:
        return "System"
    }
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip="Theme">
            {getIcon()}
            <span>Theme: {getLabel()}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-[150px]">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}