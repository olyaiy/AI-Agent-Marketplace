"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AccountNavActions } from "@/components/AccountNavActions";

interface NavbarProps {
  userEmail?: string;
}

export function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();
  const isAgentPage = useMemo(() => pathname?.startsWith("/agent/") === true, [pathname]);
  const agentId = useMemo(() => {
    if (!isAgentPage) return null;
    const parts = pathname!.split("/");
    return parts.length >= 3 ? parts[2] : null;
  }, [isAgentPage, pathname]);

  const [agentName, setAgentName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!agentId) {
      setAgentName(null);
      return;
    }
    (async function fetchName() {
      try {
        const res = await fetch(`/api/agents/${agentId}`, { cache: "no-store" });
        if (!res.ok) {
          if (active) setAgentName(null);
          return;
        }
        const data = (await res.json()) as { ok: boolean; name?: string };
        if (active) setAgentName(data.ok && data.name ? data.name : null);
      } catch {
        if (active) setAgentName(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [agentId]);

  return (
    <nav className="h-16 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-xl font-semibold">
          AV
        </Link>
        {isAgentPage && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>/</span>
            <span className="truncate max-w-[40vw]" title={agentName ?? agentId ?? undefined}>
              {agentName ?? agentId}
            </span>
            <span>/</span>
            <span>New Chat</span>
          </div>
        )}
      </div>
      <AccountNavActions userEmail={userEmail} callbackURL={pathname ?? '/'} />
    </nav>
  );
}
