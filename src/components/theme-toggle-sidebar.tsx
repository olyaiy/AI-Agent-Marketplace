"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "motion/react"
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function ThemeToggleSidebar() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const isDark = resolvedTheme === "dark"

  // Prevent hydration mismatch by rendering a static placeholder until mounted
  if (!mounted) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton>
          <div className="size-4" />
          <span>Theme</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        onClick={toggleTheme}
        className="group/theme"
      >
        <div className="relative size-4">
          {/* Sun Icon - Shows when NOT dark (Light Mode) */}
          <motion.div
            initial={false}
            animate={{
              scale: isDark ? 0 : 1,
              rotate: isDark ? 90 : 0,
              opacity: isDark ? 0 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Sun className="size-4" />
          </motion.div>

          {/* Moon Icon - Shows when dark (Dark Mode) */}
          <motion.div
            initial={false}
            animate={{
              scale: isDark ? 1 : 0,
              rotate: isDark ? 0 : -90,
              opacity: isDark ? 1 : 0,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Moon className="size-4" />
          </motion.div>
        </div>
        <span className="transition-colors duration-200">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}