
import Chat from '@/components/Chat';

export default function Home() {
  return (
    <main className=" mx-auto h-full border-2 border-black/90 px-4 rounded-lg">
      <div className="h-full max-w-5xl mx-auto">
        <div className="border-2 border-black/30 rounded-lg h-full">
          <Chat />
        </div>
      </div>
    </main>
  );
}
