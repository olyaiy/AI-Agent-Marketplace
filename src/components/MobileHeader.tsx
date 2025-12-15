'use client';

import Image from 'next/image';
import { PanelLeftIcon, User } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

interface MobileHeaderProps {
    userAvatarUrl?: string;
    userName?: string;
}

export function MobileHeader({ userAvatarUrl, userName }: MobileHeaderProps) {
    const { toggleSidebar } = useSidebar();

    return (
        <header
            data-mobile-header
            className="md:hidden fixed top-0 left-0 right-0 z-50 w-full flex items-center justify-between px-3 py-2.5 bg-background/95 backdrop-blur-sm border-b border-border/50"
        >
            {/* Left Zone - Menu Button */}
            <button
                onClick={toggleSidebar}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors"
                type="button"
                aria-label="Open sidebar menu"
            >
                <PanelLeftIcon className="w-5 h-5 text-foreground/70" />
            </button>

            {/* Center Zone - Could add logo or title here later */}
            <div className="flex-1" />

            {/* Right Zone - User Avatar Placeholder */}
            <button
                type="button"
                className="flex items-center justify-center w-10 h-10 rounded-full bg-accent hover:bg-accent/80 active:bg-accent/60 transition-colors overflow-hidden"
                aria-label="User menu"
            >
                {userAvatarUrl ? (
                    <Image
                        src={userAvatarUrl}
                        alt={userName || 'User'}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <User className="w-5 h-5 text-foreground/60" />
                )}
            </button>
        </header>
    );
}
