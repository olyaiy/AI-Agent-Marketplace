
import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className="container mx-auto p-4 h-screen">
      <div className="h-full max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">AI Chatbot</h1>
        <div className="border rounded-lg h-[calc(100vh-8rem)]">
          <Chat />
        </div>
      </div>
    </main>
  );
}
