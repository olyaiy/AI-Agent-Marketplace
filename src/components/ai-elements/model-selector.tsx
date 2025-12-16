import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ComponentProps, ElementRef, ReactNode } from "react";
import { forwardRef } from "react";
import Image from "next/image";

export type ModelSelectorProps = ComponentProps<typeof Dialog>;

export const ModelSelector = (props: ModelSelectorProps) => (
  <Dialog {...props} />
);

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <DialogTrigger {...props} />
);

export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
  /** Disable cmdk filtering when we already filter via React. */
  disableFiltering?: boolean;
};

export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  disableFiltering = true,
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent
    className={cn(
      "p-0 w-[90vw] max-w-[800px] overflow-hidden",
      className
    )}
    {...props}
  >
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command
      className="**:data-[slot=command-input-wrapper]:h-auto h-full"
      shouldFilter={!disableFiltering}
    >
      {children}
    </Command>
  </DialogContent>
);

export type ModelSelectorDialogProps = ComponentProps<typeof CommandDialog>;

export const ModelSelectorDialog = (props: ModelSelectorDialogProps) => (
  <CommandDialog {...props} />
);

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>;

export const ModelSelectorInput = ({
  className,
  ...props
}: ModelSelectorInputProps) => (
  <CommandInput className={cn("h-auto py-3.5", className)} {...props} />
);

export type ModelSelectorListProps = ComponentProps<typeof CommandList>;

export const ModelSelectorList = forwardRef<
  ElementRef<typeof CommandList>,
  ModelSelectorListProps
>(function ModelSelectorList(props, ref) {
  return <CommandList ref={ref} {...props} />;
});

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
  <CommandEmpty {...props} />
);

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>;

export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => (
  <CommandGroup {...props} />
);

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>;

export const ModelSelectorItem = (props: ModelSelectorItemProps) => (
  <CommandItem {...props} />
);

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => (
  <CommandShortcut {...props} />
);

export type ModelSelectorSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;

export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => (
  <CommandSeparator {...props} />
);

export type ModelSelectorLogoProps = Omit<
  ComponentProps<typeof Image>,
  "src" | "alt" | "fill" | "loader" | "width" | "height"
> & {
  provider:
  | "moonshotai-cn"
  | "lucidquery"
  | "moonshotai"
  | "zai-coding-plan"
  | "alibaba"
  | "xai"
  | "vultr"
  | "nvidia"
  | "upstage"
  | "groq"
  | "github-copilot"
  | "mistral"
  | "vercel"
  | "nebius"
  | "deepseek"
  | "alibaba-cn"
  | "google-vertex-anthropic"
  | "venice"
  | "chutes"
  | "cortecs"
  | "github-models"
  | "togetherai"
  | "azure"
  | "baseten"
  | "huggingface"
  | "opencode"
  | "fastrouter"
  | "google"
  | "google-vertex"
  | "cloudflare-workers-ai"
  | "inception"
  | "wandb"
  | "openai"
  | "zhipuai-coding-plan"
  | "perplexity"
  | "openrouter"
  | "zenmux"
  | "v0"
  | "iflowcn"
  | "synthetic"
  | "deepinfra"
  | "zhipuai"
  | "submodel"
  | "zai"
  | "inference"
  | "requesty"
  | "morph"
  | "lmstudio"
  | "anthropic"
  | "aihubmix"
  | "fireworks-ai"
  | "modelscope"
  | "llama"
  | "scaleway"
  | "amazon-bedrock"
  | "cerebras"
  | (string & {});
  size?: number;
};

export const ModelSelectorLogo = ({
  provider,
  className,
  size = 12,
  ...props
}: ModelSelectorLogoProps) => (
  <Image
    {...props}
    alt={`${provider} logo`}
    className={cn(
      "rounded-full bg-background p-px ring-1 dark:bg-foreground dark:invert",
      className
    )}
    height={size}
    src={`https://models.dev/logos/${provider}.svg`}
    width={size}
  />
);

export type ModelSelectorLogoGroupProps = ComponentProps<"div">;

export const ModelSelectorLogoGroup = ({
  className,
  ...props
}: ModelSelectorLogoGroupProps) => (
  <div
    className={cn(
      "-space-x-1 flex shrink-0 items-center",
      className
    )}
    {...props}
  />
);

export type ModelSelectorNameProps = ComponentProps<"span">;

export const ModelSelectorName = ({
  className,
  ...props
}: ModelSelectorNameProps) => (
  <span className={cn("flex-1 truncate text-left", className)} {...props} />
);
