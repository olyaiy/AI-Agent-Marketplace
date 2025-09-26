"use client";

import Link from "next/link";
import React from "react";

interface NavbarProps {
  userEmail?: string;
}

export function Navbar({ userEmail: _userEmail }: NavbarProps) {
  return (
    <nav className="h-10  w-dvw flex items-end justify-between px-6 flex-shrink-0 relative z-40">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-xl font-semibold">
          AV
        </Link>
      </div>
    </nav>
  );
}
