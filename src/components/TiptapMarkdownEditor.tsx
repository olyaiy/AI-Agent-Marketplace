'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import Placeholder from '@tiptap/extension-placeholder';

export interface TiptapMarkdownEditorRef {
    getMarkdown: () => string;
    setMarkdown: (markdown: string) => void;
}

interface TiptapMarkdownEditorProps {
    initialContent?: string;
    placeholder?: string;
    onChange?: (markdown: string) => void;
    className?: string;
    minHeight?: string;
    maxHeight?: string;
}

export const TiptapMarkdownEditor = forwardRef<TiptapMarkdownEditorRef, TiptapMarkdownEditorProps>(
    function TiptapMarkdownEditor(
        {
            initialContent = '',
            placeholder,
            onChange,
            className,
            minHeight = '200px',
            maxHeight = '70vh',
        },
        ref
    ) {
        const editor = useEditor({
            extensions: [
                StarterKit.configure({
                    // Configure heading levels
                    heading: {
                        levels: [1, 2, 3, 4, 5, 6],
                    },
                    // BulletList, OrderedList, and ListItem are included by default
                }),
                Markdown.configure({
                    transformPastedText: true,
                    transformCopiedText: true,
                }),
                Placeholder.configure({
                    placeholder: placeholder || 'Start typing...',
                }),
            ],
            content: initialContent,
            contentType: 'markdown',
            immediatelyRender: false, // SSR-safe
            onUpdate: ({ editor }) => {
                if (onChange) {
                    // Get markdown from the editor using the Markdown extension
                    const markdown = (editor as unknown as { getMarkdown?: () => string }).getMarkdown?.() || editor.getText();
                    onChange(markdown);
                }
            },
        });

        // Expose methods via ref
        useImperativeHandle(
            ref,
            () => ({
                getMarkdown: () => {
                    return (editor as unknown as { getMarkdown?: () => string })?.getMarkdown?.() || editor?.getText() || '';
                },
                setMarkdown: (markdown: string) => {
                    if (editor) {
                        editor.commands.setContent(markdown, { contentType: 'markdown' });
                    }
                },
            }),
            [editor]
        );

        // Sync external content changes (only on mount)
        useEffect(() => {
            if (editor && initialContent && !editor.getText()) {
                editor.commands.setContent(initialContent, { contentType: 'markdown' });
            }
        }, [editor, initialContent]);

        return (
            <div className={cn('relative', className)}>
                {/* Editor with scrollable container */}
                <div
                    className="scrollbar-slick overflow-y-auto"
                    style={{ minHeight, maxHeight }}
                >
                    <EditorContent
                        editor={editor}
                        className="min-h-full text-sm"
                    />
                </div>
            </div>
        );
    }
);

TiptapMarkdownEditor.displayName = 'TiptapMarkdownEditor';
