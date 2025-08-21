
import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className="container mx-auto h-full border-2 rounded-lg">
      <div className="h-full max-w-4xl mx-auto">
        <div className="border-2 rounded-lg h-full">
          <Chat />
        </div>
      </div>
    </main>
  );
}
