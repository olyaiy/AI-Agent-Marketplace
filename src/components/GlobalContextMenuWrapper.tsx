"use client";

import { GlobalContextMenu } from "@/components/GlobalContextMenu";

interface GlobalContextMenuWrapperProps {
    children: React.ReactNode;
}

export function GlobalContextMenuWrapper({ children }: GlobalContextMenuWrapperProps) {
    return <GlobalContextMenu>{children}</GlobalContextMenu>;
}
