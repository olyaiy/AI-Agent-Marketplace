'use client';

import Image from 'next/image';

interface AgentInfoSidebarProps {
  name: string;
  avatarUrl?: string;
  tagline?: string | null;
  description?: string | null;
}

export default function AgentInfoSidebar({ name, avatarUrl, tagline, description }: AgentInfoSidebarProps) {
  const effectiveTagline = (tagline && tagline.trim().length > 0) ? tagline : 'Your creative thinking partner';
  const effectiveDescription = (description && description.trim().length > 0)
    ? description
    : `Hi there! I'm ${name}, your friendly AI companion. I love helping with creative projects, brainstorming ideas, and turning thoughts into reality.`;

  return (
    <div className="w-full h-full bg-white rounded-xl   border-gray-200 flex flex-col overflow-hidden">
      {/* Header with Avatar and Info */}
      <div className="bg-white border border-rose-200 px-5 py-5 rounded-xl ">
        <div className="flex items-center gap-4">
          {/* Avatar on left */}
          {avatarUrl ? (
            <Image 
              src={avatarUrl} 
              alt="Agent Avatar" 
              width={72} 
              height={72}
              className="rounded-xl"
            />
          ) : null}
          
          {/* Name and tagline on right */}
          <div className="flex-1">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
              <p className="text-sm text-gray-700 mt-0.5">{effectiveTagline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className=" pt-4 pb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[13px] text-gray-600 leading-relaxed">
            {effectiveDescription}
          </p>
        </div>
      </div>
    </div>
  );
}