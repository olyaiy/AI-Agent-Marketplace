"use client";

import * as React from "react";

interface LiveEditContextValue {
  model: string | undefined;
  systemPrompt: string | undefined;
  setModel: (value: string | undefined) => void;
  setSystemPrompt: (value: string | undefined) => void;
}

const LiveEditContext = React.createContext<LiveEditContextValue | undefined>(undefined);

interface ProviderProps {
  initialModel?: string;
  initialSystemPrompt?: string;
  children: React.ReactNode;
}

export function LiveEditProvider({ initialModel, initialSystemPrompt, children }: ProviderProps) {
  const [model, setModel] = React.useState<string | undefined>(initialModel);
  const [systemPrompt, setSystemPrompt] = React.useState<string | undefined>(initialSystemPrompt);

  const value = React.useMemo(
    () => ({ model, systemPrompt, setModel, setSystemPrompt }),
    [model, systemPrompt]
  );

  return <LiveEditContext.Provider value={value}>{children}</LiveEditContext.Provider>;
}

export function useLiveEdit() {
  const ctx = React.useContext(LiveEditContext);
  if (!ctx) throw new Error("useLiveEdit must be used within LiveEditProvider");
  return ctx;
}


