'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ChatStatus } from 'ai';
import { FileIcon, Loader2Icon, PaperclipIcon, PlusIcon, SendIcon, SquareIcon, XIcon } from 'lucide-react';
import Image from 'next/image';
import type {
  ComponentProps,
  FormEvent,
  HTMLAttributes,
  KeyboardEventHandler,
} from 'react';
import { Children, createContext, forwardRef, useContext, useRef, useState } from 'react';

// Types
export interface PromptInputMessage {
  text: string;
  files?: File[];
}

interface FileAttachment {
  id: string;
  file: File;
  preview?: string;
}

interface AttachmentsContextValue {
  files: FileAttachment[];
  add: (files: File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
}

// Context
const AttachmentsContext = createContext<AttachmentsContextValue | null>(null);

export function usePromptInputAttachments() {
  const ctx = useContext(AttachmentsContext);
  if (!ctx) throw new Error('usePromptInputAttachments must be used within PromptInput');
  return ctx;
}

// Props
export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  onSubmit?: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void;
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  syncHiddenInput?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  onError?: (err: { code: 'max_files' | 'max_file_size' | 'accept'; message: string }) => void;
};

export const PromptInput = ({
  className,
  onSubmit,
  accept,
  multiple = false,
  maxFiles,
  maxFileSize,
  onError,
  ...props
}: PromptInputProps) => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const createFileAttachment = (file: File): FileAttachment => {
    const id = `${file.name}-${file.size}-${Date.now()}`;
    const attachment: FileAttachment = { id, file };
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments(prev => 
          prev.map(a => a.id === id ? { ...a, preview: e.target?.result as string } : a)
        );
      };
      reader.readAsDataURL(file);
    }
    
    return attachment;
  };

  const validateAndAddFiles = (files: File[]) => {
    // Check max files
    if (maxFiles && attachments.length + files.length > maxFiles) {
      onError?.({
        code: 'max_files',
        message: `Maximum ${maxFiles} files allowed`,
      });
      return;
    }

    // Check file size and filter
    const validFiles: File[] = [];
    for (const file of files) {
      if (maxFileSize && file.size > maxFileSize) {
        onError?.({
          code: 'max_file_size',
          message: `File ${file.name} exceeds maximum size`,
        });
        continue;
      }
      validFiles.push(file);
    }

    const newAttachments = validFiles.map(createFileAttachment);
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      validateAndAddFiles(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      validateAndAddFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const text = (formData.get('message') as string) || '';
    const files = attachments.map(a => a.file);
    
    onSubmit?.({ text, files }, e);
    
    // Clear form
    if (formRef.current) {
      formRef.current.reset();
    }
    clearAttachments();
  };

  const contextValue: AttachmentsContextValue = {
    files: attachments,
    add: validateAndAddFiles,
    remove: removeAttachment,
    clear: clearAttachments,
    openFileDialog,
  };

  return (
    <AttachmentsContext.Provider value={contextValue}>
      <form
        ref={formRef}
        className={cn(
          'w-full divide-y overflow-hidden rounded-3xl border bg-background shadow-sm',
          isDragging && 'ring-2 ring-primary',
          className
        )}
        onSubmit={handleFormSubmit}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        {...props}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
        />
        {props.children}
      </form>
    </AttachmentsContext.Provider>
  );
};

export type PromptInputTextareaProps = ComponentProps<typeof Textarea>;

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(({
  onChange,
  className,
  placeholder = 'What would you like to know?',
  ...props
}, ref) => {
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter') {
      // Don't submit if IME composition is in progress
      if (e.nativeEvent.isComposing) {
        return;
      }

      if (e.shiftKey) {
        // Allow newline
        return;
      }

      // Submit on Enter (without Shift)
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <Textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded-none border-none p-3 shadow-none outline-none ring-0 ',
        'field-sizing-content max-h-[6lh] bg-transparent dark:bg-transparent',
        'focus-visible:ring-0',
        className
      )}
      name="message"
      onChange={(e) => {
        onChange?.(e);
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
});

PromptInputTextarea.displayName = 'PromptInputTextarea';

// Body Components
export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputBody = ({ className, ...props }: PromptInputBodyProps) => (
  <div className={cn('flex flex-col', className)} {...props} />
);

export type PromptInputFooterProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputFooter = ({
  className,
  ...props
}: PromptInputFooterProps) => (
  <div
    className={cn('flex items-center justify-between p-1', className)}
    {...props}
  />
);

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputToolbar = ({
  className,
  ...props
}: PromptInputToolbarProps) => (
  <div
    className={cn('flex items-center justify-between p-1', className)}
    {...props}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => (
  <div
    className={cn(
      'flex items-center gap-1',
      '[&_button:first-child]:rounded-bl-xl',
      className
    )}
    {...props}
  />
);

// Attachments Components
export type PromptInputAttachmentsProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: (attachment: FileAttachment) => React.ReactNode;
};

export const PromptInputAttachments = ({
  children,
  className,
  ...props
}: PromptInputAttachmentsProps) => {
  const { files } = usePromptInputAttachments();

  if (files.length === 0) return null;

  return (
    <div
      className={cn('flex flex-wrap gap-2 p-3 pb-0', className)}
      {...props}
    >
      {files.map((attachment) => children(attachment))}
    </div>
  );
};

export type PromptInputAttachmentProps = HTMLAttributes<HTMLDivElement> & {
  data: FileAttachment;
};

export const PromptInputAttachment = ({
  data,
  className,
  ...props
}: PromptInputAttachmentProps) => {
  const { remove } = usePromptInputAttachments();
  const isImage = data.file.type.startsWith('image/');
  const isPDF = data.file.type === 'application/pdf';
  const isExcel = data.file.type === 'application/vnd.ms-excel' || 
                  data.file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  data.file.type === 'text/csv';
  const isWord = data.file.type === 'application/msword' || 
                 data.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const getFileStyles = () => {
    if (isPDF) return 'bg-red-700 border-red-100 text-zinc-100';
    if (isExcel) return 'bg-green-700 border-green-100 text-white';
    if (isWord) return 'bg-blue-700 border-blue-100 text-white';
    return 'bg-muted/50';
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border p-2',
        isImage && 'flex-col',
        getFileStyles(),
        className
      )}
      {...props}
    >
      {isImage && data.preview ? (
        <Image
          src={data.preview}
          alt={data.file.name}
          width={95}
          height={95}
          className="h-20 w-20 rounded object-cover"
        />
      ) : (
        <FileIcon className={cn(
          "size-5",
          (isPDF || isExcel || isWord) ? "text-white" : "text-muted-foreground"
        )} />
      )}
      <div className="flex flex-col min-w-0 max-w-[120px]">
        <span className="truncate text-xs">{data.file.name}</span>
        <span className={cn(
          "text-xs",
          (isPDF || isExcel || isWord) ? "text-zinc-200/80" : "text-muted-foreground"
        )}>
          {(data.file.size / 1024).toFixed(1)} KB
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'absolute -right-2 -top-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-background border shadow-sm'
        )}
        onClick={() => remove(data.id)}
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  );
};

// Action Menu Components
export type PromptInputActionMenuProps = ComponentProps<typeof DropdownMenu>;

export const PromptInputActionMenu = (props: PromptInputActionMenuProps) => (
  <DropdownMenu {...props} />
);

export type PromptInputActionMenuTriggerProps = ComponentProps<typeof Button>;

export const PromptInputActionMenuTrigger = ({
  className,
  children,
  ...props
}: PromptInputActionMenuTriggerProps) => (
  <DropdownMenuTrigger asChild>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('shrink-0 rounded-lg text-muted-foreground', className)}
      {...props}
    >
      {children ?? <PlusIcon className="size-4" />}
    </Button>
  </DropdownMenuTrigger>
);

export type PromptInputActionMenuContentProps = ComponentProps<typeof DropdownMenuContent>;

export const PromptInputActionMenuContent = ({
  className,
  ...props
}: PromptInputActionMenuContentProps) => (
  <DropdownMenuContent
    className={cn(className)}
    align="start"
    side="top"
    {...props}
  />
);

export type PromptInputActionMenuItemProps = ComponentProps<typeof DropdownMenuItem>;

export const PromptInputActionMenuItem = (props: PromptInputActionMenuItemProps) => (
  <DropdownMenuItem {...props} />
);

export type PromptInputActionAddAttachmentsProps = ComponentProps<typeof DropdownMenuItem> & {
  label?: string;
};

export const PromptInputActionAddAttachments = ({
  label = 'Add photos or files',
  ...props
}: PromptInputActionAddAttachmentsProps) => {
  const { openFileDialog } = usePromptInputAttachments();

  return (
    <DropdownMenuItem onClick={openFileDialog} {...props}>
      <PaperclipIcon className="size-4" />
      {label}
    </DropdownMenuItem>
  );
};

// Button Components
export type PromptInputButtonProps = ComponentProps<typeof Button>;

export const PromptInputButton = ({
  variant = 'ghost',
  className,
  size,
  ...props
}: PromptInputButtonProps) => {
  const newSize =
    (size ?? Children.count(props.children) > 1) ? 'default' : 'icon';

  return (
    <Button
      className={cn(
        'shrink-0 gap-1.5 rounded-lg',
        variant === 'ghost' && 'text-muted-foreground',
        newSize === 'default' && 'px-3',
        className
      )}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );
};

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: ChatStatus;
};

export const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon',
  status,
  children,
  ...props
}: PromptInputSubmitProps) => {
  let Icon = <SendIcon className="size-4" />;

  if (status === 'submitted') {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === 'streaming') {
    Icon = <SquareIcon className="size-4" />;
  } else if (status === 'error') {
    Icon = <XIcon className="size-4" />;
  }

  return (
    <Button
      className={cn('gap-1.5 rounded-2xl', className)}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};

// Model Select Components
export type PromptInputModelSelectProps = ComponentProps<typeof Select>;

export const PromptInputModelSelect = (props: PromptInputModelSelectProps) => (
  <Select {...props} />
);

export type PromptInputModelSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

export const PromptInputModelSelectTrigger = ({
  className,
  ...props
}: PromptInputModelSelectTriggerProps) => (
  <SelectTrigger
    className={cn(
      'border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors',
      'hover:bg-accent hover:text-foreground [&[aria-expanded="true"]]:bg-accent [&[aria-expanded="true"]]:text-foreground',
      className
    )}
    {...props}
  />
);

export type PromptInputModelSelectContentProps = ComponentProps<
  typeof SelectContent
>;

export const PromptInputModelSelectContent = ({
  className,
  ...props
}: PromptInputModelSelectContentProps) => (
  <SelectContent className={cn(className)} {...props} />
);

export type PromptInputModelSelectItemProps = ComponentProps<typeof SelectItem>;

export const PromptInputModelSelectItem = ({
  className,
  ...props
}: PromptInputModelSelectItemProps) => (
  <SelectItem className={cn(className)} {...props} />
);

export type PromptInputModelSelectValueProps = ComponentProps<
  typeof SelectValue
>;

export const PromptInputModelSelectValue = ({
  className,
  ...props
}: PromptInputModelSelectValueProps) => (
  <SelectValue className={cn(className)} {...props} />
);
