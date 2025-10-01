"use client";

import { useTransition } from 'react';
import { LogOut, User } from 'lucide-react';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { signOutAction } from '@/actions/auth';

interface SignOutButtonProps {
  userEmail: string;
}

export function SignOutButton({ userEmail }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <SidebarMenuButton
      onClick={handleSignOut}
      disabled={isPending}
      tooltip={userEmail}
      className="group-data-[collapsible=icon]:justify-center"
    >
      <div className="flex items-center gap-2 w-full min-w-0">
        <User className="h-4 w-4 shrink-0" />
        <span className="truncate text-xs group-data-[collapsible=icon]:hidden">
          {userEmail}
        </span>
        <LogOut className="h-4 w-4 ml-auto shrink-0 group-data-[collapsible=icon]:hidden" />
      </div>
    </SidebarMenuButton>
  );
}

