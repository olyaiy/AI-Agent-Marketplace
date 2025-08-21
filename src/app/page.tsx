
import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';

export default function Home() {
  return (
    <main className="mx-auto h-full px-4 bg-red-500  ">
      <div className="h-full max-w-7xl mx-auto flex gap-4">
        <div className="flex-1 border-2 border-black/30 rounded-lg h-full">
          <Chat />
        </div>
        <div className="w-1/4 ">
        <AgentInfoSidebar />
        </div>
      </div>
    </main>
  );
}
