import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';

export default function AgentPage() {
  return (
    <main className="h-full px-4">
      <div className="h-full mx-auto flex gap-4">
        <div className="w-1/4 flex-shrink-0">
          <AgentInfoSidebar />
        </div>
        <div className="flex-1 max-w-3/4 items-center justify-center r-auto ">
          <Chat className=' mx-auto' />
        </div>
      </div>
    </main>
  );
}