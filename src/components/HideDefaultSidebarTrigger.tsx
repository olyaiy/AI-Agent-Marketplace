'use client';

import { useEffect } from 'react';

/**
 * Client component that hides the default sidebar trigger from the layout.
 * This is used on pages that have their own sidebar trigger in a custom header.
 */
export function HideDefaultSidebarTrigger() {
    useEffect(() => {
        // Add class to hide the default desktop sidebar trigger
        document.body.classList.add('hide-desktop-sidebar-trigger');

        return () => {
            document.body.classList.remove('hide-desktop-sidebar-trigger');
        };
    }, []);

    return null;
}
