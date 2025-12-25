"use client";

import * as React from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Copy,
    Clipboard,
    TextSelect,
    ExternalLink,
} from "lucide-react";

interface GlobalContextMenuProps {
    children: React.ReactNode;
}

export function GlobalContextMenu({ children }: GlobalContextMenuProps) {
    const [canGoBack, setCanGoBack] = React.useState(false);
    const [canGoForward, setCanGoForward] = React.useState(false);
    const [hasSelection, setHasSelection] = React.useState(false);
    // Key to force remount of ContextMenu when right-clicking in a new location
    const [menuKey, setMenuKey] = React.useState(0);
    const isMenuOpenRef = React.useRef(false);
    const retriggerTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Update navigation state on mount and history changes
    React.useEffect(() => {
        const updateNavState = () => {
            setCanGoBack(window.history.length > 1);
            setCanGoForward(false); // Can't reliably detect forward in browser
        };

        updateNavState();
        window.addEventListener("popstate", updateNavState);
        return () => window.removeEventListener("popstate", updateNavState);
    }, []);

    // Handle right-click to fix the issue where opening a new context menu
    // before closing the first one would reopen at the old location.
    React.useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            // Clear any pending retrigger
            if (retriggerTimeoutRef.current) {
                clearTimeout(retriggerTimeoutRef.current);
                retriggerTimeoutRef.current = null;
            }

            if (isMenuOpenRef.current) {
                // Menu is currently open - intercept this event
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const clickX = e.clientX;
                const clickY = e.clientY;
                const targetElement = e.target as Element;

                // Force close the menu by incrementing the key
                setMenuKey((prev) => prev + 1);
                isMenuOpenRef.current = false;

                // Wait for the menu to fully close and component to remount,
                // then dispatch a new contextmenu event
                retriggerTimeoutRef.current = setTimeout(() => {
                    retriggerTimeoutRef.current = null;

                    // Find the element at the clicked position (in case target moved)
                    const elementAtPoint = document.elementFromPoint(clickX, clickY) || targetElement;

                    const syntheticEvent = new MouseEvent("contextmenu", {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: clickX,
                        clientY: clickY,
                        screenX: e.screenX,
                        screenY: e.screenY,
                        button: 2,
                        buttons: 2,
                        relatedTarget: null,
                    });

                    elementAtPoint.dispatchEvent(syntheticEvent);
                }, 50); // Small delay to let React re-render
            }
        };

        // Use capture phase to intercept before Radix
        document.addEventListener("contextmenu", handleContextMenu, true);
        return () => {
            document.removeEventListener("contextmenu", handleContextMenu, true);
            if (retriggerTimeoutRef.current) {
                clearTimeout(retriggerTimeoutRef.current);
            }
        };
    }, []);

    // Check for text selection when context menu opens
    const handleContextMenuOpen = (open: boolean) => {
        isMenuOpenRef.current = open;
        if (open) {
            const selection = window.getSelection();
            setHasSelection(!!selection && selection.toString().length > 0);
        }
    };

    const handleBack = () => {
        window.history.back();
    };

    const handleForward = () => {
        window.history.forward();
    };

    const handleReload = () => {
        window.location.reload();
    };

    const handleCopy = async () => {
        const selection = window.getSelection();
        if (selection && selection.toString()) {
            try {
                await navigator.clipboard.writeText(selection.toString());
            } catch (err) {
                // Fallback for older browsers
                document.execCommand("copy");
            }
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            // Try to paste into active element if it's an input/textarea
            const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
            if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
                const start = activeElement.selectionStart ?? 0;
                const end = activeElement.selectionEnd ?? 0;
                const currentValue = activeElement.value;
                activeElement.value = currentValue.slice(0, start) + text + currentValue.slice(end);
                activeElement.selectionStart = activeElement.selectionEnd = start + text.length;

                // Trigger input event for React to pick up the change
                activeElement.dispatchEvent(new Event("input", { bubbles: true }));
            }
        } catch (err) {
            // Clipboard API not available or permission denied
            console.warn("Paste not available:", err);
        }
    };

    const handleSelectAll = () => {
        const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
        if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
            activeElement.select();
        } else {
            // Select all text in the document
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(document.body);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    };

    const handleOpenInNewTab = () => {
        window.open(window.location.href, "_blank");
    };

    return (
        <ContextMenu key={menuKey} onOpenChange={handleContextMenuOpen} modal={false}>
            <ContextMenuTrigger asChild>
                <div className="contents">{children}</div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 backdrop-blur-xl bg-popover/95 border-border/50 shadow-2xl [&[data-state=closed]]:animate-none">
                {/* Navigation Group */}
                <ContextMenuItem
                    onClick={handleBack}
                    disabled={!canGoBack}
                    className="cursor-pointer"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                    <ContextMenuShortcut>⌘[</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={handleForward}
                    disabled={!canGoForward}
                    className="cursor-pointer"
                >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Forward
                    <ContextMenuShortcut>⌘]</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={handleReload} className="cursor-pointer">
                    <RotateCw className="mr-2 h-4 w-4" />
                    Reload
                    <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                </ContextMenuItem>

                <ContextMenuSeparator />

                {/* Clipboard Group */}
                {hasSelection && (
                    <ContextMenuItem onClick={handleCopy} className="cursor-pointer">
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={handlePaste} className="cursor-pointer">
                    <Clipboard className="mr-2 h-4 w-4" />
                    Paste
                    <ContextMenuShortcut>⌘V</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onClick={handleSelectAll} className="cursor-pointer">
                    <TextSelect className="mr-2 h-4 w-4" />
                    Select All
                    <ContextMenuShortcut>⌘A</ContextMenuShortcut>
                </ContextMenuItem>

                <ContextMenuSeparator />

                {/* Page Actions */}
                <ContextMenuItem onClick={handleOpenInNewTab} className="cursor-pointer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
