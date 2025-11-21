'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { HomeRowAgent, HomeRowWithAgents } from '@/types/homeRows';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CreateRowFormState {
  title: string;
  slug: string;
  description: string;
  isPublished: boolean;
  maxItems: string;
}

const createInitialForm = (): CreateRowFormState => ({
  title: '',
  slug: '',
  description: '',
  isPublished: true,
  maxItems: '',
});

export function HomepageRowsAdmin() {
  const [rows, setRows] = useState<HomeRowWithAgents[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRowFormState>(createInitialForm());
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/home-rows', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load rows');
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load homepage rows');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleCreateRow = async () => {
    if (!createForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: createForm.title,
        slug: createForm.slug || undefined,
        description: createForm.description || undefined,
        isPublished: createForm.isPublished,
        maxItems: createForm.maxItems ? Number(createForm.maxItems) : undefined,
      };
      const res = await fetch('/api/home-rows', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create row');
      }
      toast.success('Row created');
      setCreateForm(createInitialForm());
      await loadRows();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create row');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorderRows = async (rowId: string, direction: 'up' | 'down') => {
    const index = rows.findIndex((row) => row.id === rowId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rows.length) return;

    const updated = [...rows];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setRows(updated);

    try {
      const res = await fetch('/api/home-rows/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderIds: updated.map((row) => row.id) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to reorder rows');
      }
      toast.success('Row order updated');
      await loadRows();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to reorder rows');
      // revert on failure
      void loadRows();
    }
  };

  const handleUpdateRow = async (rowId: string, payload: Partial<CreateRowFormState> & { isPublished?: boolean }) => {
    try {
      const body: Record<string, unknown> = { ...payload };
      if ('maxItems' in payload) {
        body.maxItems = payload.maxItems === '' || payload.maxItems === undefined ? null : Number(payload.maxItems);
      }
      const res = await fetch(`/api/home-rows/${rowId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update row');
      toast.success('Row updated');
      await loadRows();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update row');
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Delete this row and its assignments?')) return;
    try {
      const res = await fetch(`/api/home-rows/${rowId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to delete row');
      toast.success('Row deleted');
      await loadRows();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete row');
    }
  };

  const handleSaveAgents = async (rowId: string, agents: HomeRowAgent[]) => {
    try {
      setRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, agents } : row)),
      );
      const res = await fetch(`/api/home-rows/${rowId}/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agentTags: agents.map((a) => a.tag) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update agents');
      toast.success('Row agents updated');
      await loadRows();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update agents');
      void loadRows();
    }
  };

  const featuredRowExists = useMemo(() => rows.some((row) => row.slug === 'featured'), [rows]);

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold">Homepage Rows</h2>
          <p className="text-sm text-muted-foreground">
            Curate public rows for the homepage. Rows appear in this order above the paginated list.
          </p>
        </div>
        {!featuredRowExists && (
          <Badge variant="destructive">No featured row detected</Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">Create row</h3>
              <p className="text-xs text-muted-foreground">Keep it short; you can add details later.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="new-row-published">Published</Label>
              <Switch
                id="new-row-published"
                checked={createForm.isPublished}
                onCheckedChange={(value) => setCreateForm((prev) => ({ ...prev, isPublished: value }))}
              />
            </div>
          </div>
          <Input
            placeholder="Title (e.g., Featured Agents)"
            value={createForm.title}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
          />

          <Collapsible open={showCreateAdvanced} onOpenChange={setShowCreateAdvanced} className="space-y-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {showCreateAdvanced ? 'Hide advanced options' : 'Show advanced options'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              <Input
                placeholder="Slug (optional)"
                value={createForm.slug}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
              <Textarea
                placeholder="Description (optional)"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="new-row-max">Max items</Label>
                <Input
                  id="new-row-max"
                  type="number"
                  className="w-24"
                  placeholder="6"
                  value={createForm.maxItems}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, maxItems: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground">Cap how many show in this row</span>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={handleCreateRow} disabled={isSubmitting} className="w-full md:w-auto">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create row
          </Button>
        </div>

        <div className="rounded-lg border p-4 bg-muted/50 space-y-1 text-sm text-muted-foreground">
          <p><strong>Tips</strong></p>
          <p>- Use short slugs for stable URLs and ordering.</p>
          <p>- Published rows show on the homepage; drafts stay hidden.</p>
          <p>- Max items caps how many agents render in the row.</p>
          <p>- Reorder rows to control their vertical placement.</p>
        </div>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading rows...</span>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rows yet. Create one to get started.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => (
            <RowCard
              key={row.id}
              row={row}
              position={index + 1}
              total={rows.length}
              onMove={(direction) => handleReorderRows(row.id, direction)}
              onDelete={() => handleDeleteRow(row.id)}
              onSaveDetails={(payload) => handleUpdateRow(row.id, payload)}
              onSaveAgents={(agents) => handleSaveAgents(row.id, agents)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function RowCard({
  row,
  position,
  total,
  onMove,
  onDelete,
  onSaveDetails,
  onSaveAgents,
}: {
  row: HomeRowWithAgents;
  position: number;
  total: number;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
  onSaveDetails: (payload: Partial<CreateRowFormState> & { isPublished?: boolean }) => void;
  onSaveAgents: (agents: HomeRowAgent[]) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [slug, setSlug] = useState(row.slug);
  const [description, setDescription] = useState(row.description ?? '');
  const [maxItems, setMaxItems] = useState(row.maxItems?.toString() ?? '');
  const [isPublished, setIsPublished] = useState(row.isPublished);
  const [agents, setAgents] = useState<HomeRowAgent[]>(row.agents);
  const [agentSearch, setAgentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<HomeRowAgent[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAgents, setShowAgents] = useState(() => row.agents.length > 0);
  const hasHiddenAgents = agents.some((a) => a.visibility && a.visibility !== 'public');

  useEffect(() => {
    setTitle(row.title);
    setSlug(row.slug);
    setDescription(row.description ?? '');
    setMaxItems(row.maxItems?.toString() ?? '');
    setIsPublished(row.isPublished);
    setAgents(row.agents);
    setShowAgents(row.agents.length > 0);
  }, [row]);

  useEffect(() => {
    if (!agentSearch) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = new URL('/api/home-rows/agent-search', window.location.origin);
        url.searchParams.set('q', agentSearch);
        const res = await fetch(url.toString());
        const data = await res.json();
        setSearchResults((data.agents ?? []) as HomeRowAgent[]);
      } catch (error) {
        console.error(error);
        toast.error('Failed to search agents');
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [agentSearch]);

  const hasChanges =
    title !== row.title ||
    slug !== row.slug ||
    description !== (row.description ?? '') ||
    (maxItems || '') !== (row.maxItems?.toString() ?? '') ||
    isPublished !== row.isPublished;

  const handleSaveDetailsClick = async () => {
    setIsSaving(true);
    await onSaveDetails({
      title,
      slug,
      description,
      maxItems,
      isPublished,
    });
    setIsSaving(false);
  };

  const handleTogglePublished = async (value: boolean) => {
    setIsPublished(value);
    await onSaveDetails({ isPublished: value });
  };

  const handleAddAgent = (agent: HomeRowAgent) => {
    if (agents.some((a) => a.tag === agent.tag)) {
      toast.error('Agent already in row');
      return;
    }
    const updated = [...agents, agent];
    setAgents(updated);
    void onSaveAgents(updated);
    setAgentSearch('');
    setSearchResults([]);
  };

  const handleRemoveAgent = (tag: string) => {
    const updated = agents.filter((a) => a.tag !== tag);
    setAgents(updated);
    void onSaveAgents(updated);
  };

  const handleMoveAgent = (tag: string, direction: 'up' | 'down') => {
    const index = agents.findIndex((a) => a.tag === tag);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= agents.length) return;
    const updated = [...agents];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setAgents(updated);
    void onSaveAgents(updated);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">Row #{position}</Badge>
            {!isPublished && <Badge variant="outline">Draft</Badge>}
            <Badge variant="outline">Agents: {agents.length}</Badge>
            {hasHiddenAgents && <Badge variant="destructive">Contains non-public agents</Badge>}
          </div>
          <p className="font-semibold text-sm">{title || row.title}</p>
          <p className="text-xs text-muted-foreground">Slug: {slug || 'n/a'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={position === 1} onClick={() => onMove('up')}>
            <ArrowUp className="h-4 w-4 mr-1" /> Up
          </Button>
          <Button variant="outline" size="sm" disabled={position === total} onClick={() => onMove('down')}>
            <ArrowDown className="h-4 w-4 mr-1" /> Down
          </Button>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-muted/50">
            <Label htmlFor={`row-${row.id}-publish`} className="text-xs">Publish</Label>
            <Switch
              id={`row-${row.id}-publish`}
              checked={isPublished}
              onCheckedChange={(value) => void handleTogglePublished(value)}
            />
          </div>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <Collapsible open={showSettings} onOpenChange={setShowSettings}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">Row details</p>
            <p className="text-xs text-muted-foreground">Only open when you need to tune copy.</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {showSettings ? 'Hide details' : 'Show details'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="grid md:grid-cols-2 gap-3 mt-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`row-${row.id}-max`}>Max items</Label>
            <Input
              id={`row-${row.id}-max`}
              type="number"
              className="w-24"
              value={maxItems}
              onChange={(e) => setMaxItems(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button onClick={handleSaveDetailsClick} disabled={!hasChanges || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save row
            </Button>
            <p className="text-xs text-muted-foreground">
              Changes auto-preview above; save to lock them in.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      <Collapsible open={showAgents} onOpenChange={setShowAgents}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="font-medium text-sm">Agents in this row</h4>
            <p className="text-xs text-muted-foreground">Keep it focused; reorder with arrows.</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {showAgents ? 'Hide agents' : 'Manage agents'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-3 mt-3">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents yet. Add some below.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {agents.map((agent) => (
                <div key={agent.tag} className="flex items-center justify-between rounded border p-2 bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.tagline || agent.tag}</p>
                    {agent.visibility && agent.visibility !== 'public' && (
                      <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                        {agent.visibility === 'invite_only' ? 'Invite only' : 'Private'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleMoveAgent(agent.tag, 'up')}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleMoveAgent(agent.tag, 'down')}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAgent(agent.tag)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Add agent</Label>
            <Input
              placeholder="Search by name or tag"
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
            />
            {isSearching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Searching...</span>
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="border rounded-md divide-y bg-muted/50">
                {searchResults.map((candidate) => (
                  <button
                    key={candidate.tag}
                    type="button"
                    onClick={() => handleAddAgent(candidate)}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-sm">{candidate.name}</p>
                    <p className="text-xs text-muted-foreground">{candidate.tagline || candidate.tag}</p>
                  </button>
                ))}
              </div>
            )}
            {!isSearching && agentSearch && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground">No agents found.</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
