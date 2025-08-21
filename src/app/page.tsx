
import Chat from '@/components/Chat';
import AgentInfoSidebar from '@/components/AgentInfoSidebar';

export default function Home() {
  return (
    <main className="h-full px-4 ">
      <div className="h-full  mx-auto flex gap-4  -500">
        <div className="flex-1 max-w-2/4  ml-auto">
          <Chat />
        </div>
        <div className="w-1/4 flex-shrink-0 ">
          <AgentInfoSidebar />
        </div>
      </div>
    </main>
  );
}
