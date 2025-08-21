
import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className="container mx-auto p-4 h-screen">
      <div className="h-full max-w-4xl mx-auto">
        <div className="border rounded-lg h-full">
          <Chat />
        </div>
      </div>
    </main>
  );
}
