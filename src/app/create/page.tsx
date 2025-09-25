import { fetchGatewayLanguageModels } from '@/lib/gateway-models';
import { CreateAgentClient } from './CreateAgentClient';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function readAvatarUrls(): Promise<string[]> {
  const folder = path.join(process.cwd(), 'public', 'avatar');
  try {
    const entries = await readdir(folder, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
      .map((name) => `/avatar/${name}`);
  } catch {
    return [];
  }
}

export default async function CreateAgentPage() {
  const [models, avatars] = await Promise.all([
    fetchGatewayLanguageModels(),
    readAvatarUrls(),
  ]);
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl mb-4">Create Agent</h1>
      <CreateAgentClient models={models} avatars={avatars} />
    </div>
  );
}
