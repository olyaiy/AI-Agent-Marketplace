import { AgentForm } from './AgentForm';
import { GatewayModelSelect } from '@/components/GatewayModelSelect';
export default async function CreateAgentPage() {
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl mb-4">Create Agent</h1>
      <div className="mb-4">
        <GatewayModelSelect />
      </div>
      {/** Client form auto-generates @tag and allows override */}
      <AgentForm />
    </div>
  );
}
