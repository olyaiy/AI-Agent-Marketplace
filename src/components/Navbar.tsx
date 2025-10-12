"use client";

import Link from "next/link";
import React from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface NavbarProps {
  userEmail?: string | null;
}

export function Navbar({ userEmail }: NavbarProps) {
  return (
    <nav className="h-8  w-dvw flex items-end justify-between px-4 md:px-6 flex-shrink-0 relative z-40">
      {/* Mobile Layout: Trigger (left) | Logo (center) | Sign In (right) */}
      <div className="md:hidden flex items-center justify-between w-full">
        <div className="flex items-center">
          <SidebarTrigger className="hover:bg-accent rounded-lg" />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="text-xl font-semibold">
            AV
          </Link>
        </div>
        {!userEmail && (
          <div className="flex items-center">
            <GoogleSignInButton size="sm" />
          </div>
        )}
        {userEmail && <div className="w-9" />} {/* Spacer for balance when no sign in button */}
      </div>

      {/* Desktop Layout: Logo (left) | Sign In (right) */}
      <div className="hidden md:flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-semibold">
            AV
          </Link>
        </div>
        {!userEmail && (
          <div className="flex items-center">
            <GoogleSignInButton size="sm" />
          </div>
        )}
      </div>
    </nav>
  );
}
