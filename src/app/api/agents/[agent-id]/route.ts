import { NextResponse } from 'next/server';
import { getAgentByTag } from '@/actions/agents';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ 'agent-id': string }> }
) {
  const { 'agent-id': id } = await params;
  const tag = `@${id}`;
  const found = await getAgentByTag(tag);
  if (!found) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, name: found.name });
}


