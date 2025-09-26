'use client';

export interface LocalRecentItem {
  key: string; // unique key, may be 'pending:<ts>:<agentId>' or 'cid:<conversationId>'
  agentId: string;
  conversationId?: string;
  label: string; // display label, e.g. 'New chat' or short id
  dateIso: string; // ISO date string
  status: 'pending' | 'confirmed';
}

const STORAGE_KEY = 'recent-chats-local-v1';
const DISPATCH_EVENT = 'recent-chats-local:update';

function readItems(): LocalRecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: LocalRecentItem[] } | LocalRecentItem[];
    if (Array.isArray(parsed)) return parsed as LocalRecentItem[];
    return Array.isArray(parsed.items) ? (parsed.items as LocalRecentItem[]) : [];
  } catch {
    return [];
  }
}

function writeItems(items: LocalRecentItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
    window.dispatchEvent(new CustomEvent(DISPATCH_EVENT));
  } catch {
    // ignore
  }
}

export function recentLocalAddPending(agentId: string): void {
  if (!agentId) return;
  const nowIso = new Date().toISOString();
  const items = readItems();
  // Remove any stale pending for this agent to avoid duplicates
  const filtered = items.filter((i) => !(i.status === 'pending' && i.agentId === agentId));
  const pending: LocalRecentItem = {
    key: `pending:${Date.now()}:${agentId}`,
    agentId,
    label: 'New chat',
    dateIso: nowIso,
    status: 'pending',
  };
  // Put pending at the top
  writeItems([pending, ...filtered]);
}

export function recentLocalConfirm(agentId: string, conversationId: string): void {
  if (!agentId || !conversationId) return;
  const items = readItems();
  const confirmedKey = `cid:${conversationId}`;
  // Remove duplicates: any existing confirmed with same cid, any pending for this agent
  const filtered = items.filter(
    (i) => i.conversationId !== conversationId && i.key !== confirmedKey && !(i.status === 'pending' && i.agentId === agentId)
  );

  const dateIso = new Date().toISOString();
  const confirmed: LocalRecentItem = {
    key: confirmedKey,
    agentId,
    conversationId,
    label: conversationId.slice(0, 8),
    dateIso,
    status: 'confirmed',
  };

  writeItems([confirmed, ...filtered]);
}

export function recentLocalRemoveByConversation(conversationId: string): void {
  if (!conversationId) return;
  const items = readItems().filter((i) => i.conversationId !== conversationId && i.key !== `cid:${conversationId}`);
  writeItems(items);
}

export function useRecentLocalItems(): LocalRecentItem[] {
  const [items, setItems] = useStateSafe<LocalRecentItem[]>([]);

  function sync() {
    setItems(readItems());
  }

  // Subscribe to local storage and custom event updates
  if (typeof window !== 'undefined') {
    // initialize once on module load for SSR safety
    // noop
  }

  useEffectSafe(() => {
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    const onCustom = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener(DISPATCH_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DISPATCH_EVENT, onCustom as EventListener);
    };
  }, []);

  return items;
}

// Safe React hooks wrappers to avoid SSR references
function useStateSafe<T>(initial: T): [T, (v: T) => void] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react') as typeof import('react');
  return React.useState<T>(initial);
}

function useEffectSafe(effect: () => void | (() => void), deps: any[]): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react') as typeof import('react');
  React.useEffect(effect, deps);
}
