import { fetchGatewayLanguageModels } from '@/lib/gateway-models';
import { CreateAgentClient } from './CreateAgentClient';

export default async function CreateAgentPage() {
  const models = await fetchGatewayLanguageModels();
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl mb-4">Create Agent</h1>
      <CreateAgentClient models={models} />
    </div>
  );
}
