import { AgentForm } from './AgentForm';
export default function CreateAgentPage() {
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl mb-4">Create Agent</h1>
      {/** Client form auto-generates @tag and allows override */}
      <AgentForm />
    </div>
  );
}
