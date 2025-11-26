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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HomeRowAgent, HomeRowWithAgents } from '@/types/homeRows';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRowFormState>(createInitialForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      setIsCreateOpen(false);
      await loadRows();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create row');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const oldIndex = rows.findIndex((row) => row.id === active.id);
      const newIndex = rows.findIndex((row) => row.id === over?.id);

      const newRows = arrayMove(rows, oldIndex, newIndex);
      setRows(newRows);

      try {
        const res = await fetch('/api/home-rows/reorder', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderIds: newRows.map((row) => row.id) }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Failed to reorder rows');
        }
        toast.success('Row order updated');
      } catch (error) {
        console.error(error);
        toast.error('Failed to save row order');
        // Revert on failure
        void loadRows();
      }
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Homepage Rows</h2>
          <p className="text-sm text-muted-foreground">
            Manage the sections that appear on the homepage. Drag to reorder.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!featuredRowExists && (
            <Badge variant="destructive" className="hidden sm:inline-flex">
              Missing 'featured' row
            </Badge>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Row
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Row</DialogTitle>
                <DialogDescription>
                  Add a new section to the homepage. You can add agents to it later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Featured Agents"
                    value={createForm.title}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (Optional)</Label>
                  <Input
                    placeholder="featured-agents"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, slug: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Used for stable URLs and identification.</p>
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="A brief description of this collection..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="create-published"
                    checked={createForm.isPublished}
                    onCheckedChange={(checked) => setCreateForm((prev) => ({ ...prev, isPublished: checked }))}
                  />
                  <Label htmlFor="create-published">Publish immediately</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRow} disabled={isSubmitting || !createForm.title}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Row
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading rows...
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <p>No rows found. Create one to get started.</p>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveId(event.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {rows.map((row) => (
                <SortableRowItem
                  key={row.id}
                  row={row}
                  onDelete={() => handleDeleteRow(row.id)}
                  onSaveDetails={(payload) => handleUpdateRow(row.id, payload)}
                  onSaveAgents={(agents) => handleSaveAgents(row.id, agents)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <RowCard
                row={rows.find((r) => r.id === activeId)!}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function SortableRowItem({
  row,
  onDelete,
  onSaveDetails,
  onSaveAgents,
}: {
  row: HomeRowWithAgents;
  onDelete: () => void;
  onSaveDetails: (payload: Partial<CreateRowFormState> & { isPublished?: boolean }) => void;
  onSaveAgents: (agents: HomeRowAgent[]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <RowCard
        row={row}
        dragHandleProps={{ ...attributes, ...listeners }}
        onDelete={onDelete}
        onSaveDetails={onSaveDetails}
        onSaveAgents={onSaveAgents}
      />
    </div>
  );
}

function RowCard({
  row,
  dragHandleProps,
  onDelete,
  onSaveDetails,
  onSaveAgents,
  isOverlay,
}: {
  row: HomeRowWithAgents;
  dragHandleProps?: any;
  onDelete?: () => void;
  onSaveDetails?: (payload: Partial<CreateRowFormState> & { isPublished?: boolean }) => void;
  onSaveAgents?: (agents: HomeRowAgent[]) => void;
  isOverlay?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('agents');

  // Local state for editing
  const [title, setTitle] = useState(row.title);
  const [slug, setSlug] = useState(row.slug);
  const [description, setDescription] = useState(row.description ?? '');
  const [maxItems, setMaxItems] = useState(row.maxItems?.toString() ?? '');
  const [isPublished, setIsPublished] = useState(row.isPublished);

  useEffect(() => {
    setTitle(row.title);
    setSlug(row.slug);
    setDescription(row.description ?? '');
    setMaxItems(row.maxItems?.toString() ?? '');
    setIsPublished(row.isPublished);
  }, [row]);

  const hasChanges =
    title !== row.title ||
    slug !== row.slug ||
    description !== (row.description ?? '') ||
    (maxItems || '') !== (row.maxItems?.toString() ?? '') ||
    isPublished !== row.isPublished;

  const handleSave = async () => {
    if (onSaveDetails) {
      await onSaveDetails({
        title,
        slug,
        description,
        maxItems,
        isPublished,
      });
    }
  };

  return (
    <Card className={cn('transition-all', isOverlay ? 'shadow-lg rotate-2' : 'hover:border-primary/50')}>
      <div className="p-4 flex items-center gap-4">
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0 grid gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{row.title}</h3>
            {row.slug && <Badge variant="outline" className="text-[10px] font-normal">{row.slug}</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {row.agents.length} agents
            </span>
            <span className={cn('flex items-center gap-1.5', row.isPublished ? 'text-green-600' : 'text-amber-600')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', row.isPublished ? 'bg-green-600' : 'bg-amber-600')} />
              {row.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Close' : 'Manage'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setIsExpanded(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Edit Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Row
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && !isOverlay && (
        <div className="border-t bg-muted/30 p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max Items</Label>
                  <Input
                    type="number"
                    value={maxItems}
                    onChange={(e) => setMaxItems(e.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2 md:col-span-2 pt-2">
                  <Switch
                    id={`publish-${row.id}`}
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                  <Label htmlFor={`publish-${row.id}`}>Published</Label>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={!hasChanges}>
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="agents">
              <AgentsManager row={row} onSave={onSaveAgents!} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Card>
  );
}

function AgentsManager({ row, onSave }: { row: HomeRowWithAgents; onSave: (agents: HomeRowAgent[]) => void }) {
  const [agents, setAgents] = useState(row.agents);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<HomeRowAgent[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setAgents(row.agents);
  }, [row.agents]);

  useEffect(() => {
    if (!search) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/home-rows/agent-search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults((data.agents ?? []) as HomeRowAgent[]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAdd = (agent: HomeRowAgent) => {
    if (agents.some((a) => a.tag === agent.tag)) {
      toast.error('Agent already in row');
      return;
    }
    const newAgents = [...agents, agent];
    setAgents(newAgents);
    onSave(newAgents);
    setSearch('');
    setResults([]);
  };

  const handleRemove = (tag: string) => {
    const newAgents = agents.filter((a) => a.tag !== tag);
    setAgents(newAgents);
    onSave(newAgents);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = agents.findIndex((a) => a.tag === active.id);
      const newIndex = agents.findIndex((a) => a.tag === over?.id);
      const newAgents = arrayMove(agents, oldIndex, newIndex);
      setAgents(newAgents);
      onSave(newAgents);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agents to add..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No agents found</div>
            ) : (
              results.map((agent) => (
                <button
                  key={agent.tag}
                  className="w-full text-left px-4 py-2 hover:bg-muted/50 text-sm flex items-center justify-between"
                  onClick={() => handleAdd(agent)}
                >
                  <span>{agent.name}</span>
                  <span className="text-xs text-muted-foreground">{agent.tag}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={agents.map((a) => a.tag)} strategy={verticalListSortingStrategy}>
            {agents.map((agent) => (
              <SortableAgentItem key={agent.tag} agent={agent} onRemove={() => handleRemove(agent.tag)} />
            ))}
          </SortableContext>
        </DndContext>
        {agents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            No agents in this row yet.
          </div>
        )}
      </div>
    </div>
  );
}

function SortableAgentItem({ agent, onRemove }: { agent: HomeRowAgent; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: agent.tag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-md group"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{agent.name}</p>
        <p className="text-xs text-muted-foreground truncate">{agent.tagline || agent.tag}</p>
      </div>
      {agent.visibility && agent.visibility !== 'public' && (
        <Badge variant="outline" className="text-[10px]">
          {agent.visibility}
        </Badge>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
