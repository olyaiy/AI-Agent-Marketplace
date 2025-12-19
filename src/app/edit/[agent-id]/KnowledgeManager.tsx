"use client";

import * as React from "react";
import { createKnowledge, updateKnowledge, deleteKnowledge, getKnowledgeByAgent } from "@/actions/knowledge";

export interface KnowledgeItem {
  id: string;
  name: string;
  content: string;
  type: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

interface Props {
  agentTag: string;
  initialItems?: KnowledgeItem[];
  onItemsChange?: (items: KnowledgeItem[]) => void;
}

export function KnowledgeManager({ agentTag, initialItems, onItemsChange }: Props) {
  const hasInitialItems = initialItems !== undefined;
  const [items, setItems] = React.useState<KnowledgeItem[]>(() => initialItems ?? []);
  const [loading, setLoading] = React.useState(!hasInitialItems);
  const [selectedItem, setSelectedItem] = React.useState<KnowledgeItem | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const hasLoadedOnceRef = React.useRef(hasInitialItems);

  const updateItems = React.useCallback((next: KnowledgeItem[]) => {
    setItems(next);
    onItemsChange?.(next);
  }, [onItemsChange]);

  // Form state for editing/creating
  const [formName, setFormName] = React.useState("");
  const [formContent, setFormContent] = React.useState("");

  // Load knowledge items
  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getKnowledgeByAgent(agentTag);
      updateItems(data);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error("Failed to load knowledge items:", error);
    } finally {
      setLoading(false);
    }
  }, [agentTag, updateItems]);

  React.useEffect(() => {
    if (hasInitialItems || hasLoadedOnceRef.current) return;
    loadItems();
  }, [hasInitialItems, loadItems]);

  React.useEffect(() => {
    if (!hasInitialItems || hasLoadedOnceRef.current) return;
    updateItems(initialItems ?? []);
    setLoading(false);
    hasLoadedOnceRef.current = true;
  }, [hasInitialItems, initialItems, updateItems]);

  const handleCreate = async () => {
    if (!formName.trim() || !formContent.trim()) return;

    try {
      const result = await createKnowledge({
        agentTag,
        name: formName.trim(),
        content: formContent.trim(),
        type: 'text',
      });

      if (result.ok) {
        setFormName("");
        setFormContent("");
        setIsCreating(false);
        await loadItems();
      }
    } catch (error) {
      console.error("Failed to create knowledge:", error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem || !formName.trim() || !formContent.trim()) return;

    try {
      const result = await updateKnowledge({
        id: selectedItem.id,
        name: formName.trim(),
        content: formContent.trim(),
      });

      if (result.ok) {
        setSelectedItem(null);
        setFormName("");
        setFormContent("");
        await loadItems();
      }
    } catch (error) {
      console.error("Failed to update knowledge:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this knowledge item?")) return;

    try {
      const result = await deleteKnowledge(id);
      if (result.ok) {
        if (selectedItem?.id === id) {
          setSelectedItem(null);
          setFormName("");
          setFormContent("");
        }
        await loadItems();
      }
    } catch (error) {
      console.error("Failed to delete knowledge:", error);
    }
  };

  const handleCardClick = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setFormName(item.name);
    setFormContent(item.content);
    setIsCreating(false);
  };

  const startCreating = () => {
    setIsCreating(true);
    setSelectedItem(null);
    setFormName("");
    setFormContent("");
  };

  const cancelEdit = () => {
    setSelectedItem(null);
    setIsCreating(false);
    setFormName("");
    setFormContent("");
  };

  if (loading) {
    return <div className="text-gray-500 text-sm py-8 text-center">Loading knowledge items...</div>;
  }

  // Show editor when creating or editing
  if (isCreating || selectedItem) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {isCreating ? "Create Knowledge Item" : "Edit Knowledge Item"}
          </h3>
          <button
            type="button"
            onClick={cancelEdit}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Library
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              placeholder="e.g., Company Overview, Product Guidelines"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full border rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Content</label>
            <textarea
              placeholder="Enter the knowledge content..."
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={12}
              className="w-full border rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            {isCreating ? (
              <button
                type="button"
                onClick={handleCreate}
                disabled={!formName.trim() || !formContent.trim()}
                className="px-4 py-2 text-sm rounded-md bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!formName.trim() || !formContent.trim()}
                  className="px-4 py-2 text-sm rounded-md bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={(e) => selectedItem && handleDelete(selectedItem.id, e)}
                  className="px-4 py-2 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 text-sm rounded-md border hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show grid library view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Knowledge Library</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button
          type="button"
          onClick={startCreating}
          className="px-4 py-2 text-sm rounded-md bg-rose-500 text-white hover:bg-rose-600 transition-colors"
        >
          + New Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-1">No knowledge items yet</p>
          <p className="text-xs text-gray-500">Create your first knowledge item to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCardClick(item);
                }
              }}
              className="group relative border rounded-lg p-4 text-left hover:border-rose-300 hover:shadow-md transition-all duration-200 bg-white"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-sm group-hover:text-rose-600 transition-colors line-clamp-1">
                  {item.name}
                </h4>
                <button
                  type="button"
                  onClick={(e) => handleDelete(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 line-clamp-3 mb-3">
                {item.content}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                  {item.type}
                </span>
                <span className="group-hover:text-rose-500 transition-colors">
                  Click to edit →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
