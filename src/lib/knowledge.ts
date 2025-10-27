export interface KnowledgeItem {
  name: string;
  content: string;
}

export function buildKnowledgeSystemText(items: KnowledgeItem[], maxChars = 8000): string {
  if (!Array.isArray(items) || items.length === 0) return '';

  const header = 'Knowledge Base\n----------------\n';
  const blocks = items.map((k, i) => {
    const title = typeof k.name === 'string' && k.name.trim().length > 0 ? k.name.trim() : `Item ${i + 1}`;
    const body = typeof k.content === 'string' ? k.content.trim() : '';
    return `### ${i + 1}. ${title}\n${body}`;
  });

  const joined = `${header}${blocks.join('\n\n')}`;
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, Math.max(0, maxChars))}\n\n… [truncated]`;
}
