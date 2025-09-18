'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles,
  Star,
  MessageCircle,
  Heart,
  Palette,
  Lightbulb,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  ArrowUpRight
} from 'lucide-react';
import Image from 'next/image';

export default function AgentInfoSidebar() {
  const [isExpanded, setIsExpanded] = useState({
    about: true,
    capabilities: true,
    settings: false,
    overview: true
  });

  return (
    <div className="w-full h-full bg-white rounded-xl   border-gray-200 flex flex-col overflow-hidden">
      {/* Header with Avatar and Info */}
      <div className="bg-rose-200 px-5 py-5 rounded-xl ">
        <div className="flex items-center gap-4">
          {/* Avatar on left */}
          <Image 
            src="/avatar/woman.png" 
            alt="Agent Avatar" 
            width={72} 
            height={72}
            className="rounded-xl"
          />
          
          {/* Name and description on right */}
          <div className="flex-1">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Luna</h2>
              <p className="text-sm text-gray-700 mt-0.5">Your creative thinking partner</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="px-5 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 rounded-full">
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-medium text-yellow-700">4.9</span>
          </div>
          <div className="px-2.5 py-1 bg-rose-50 rounded-full">
            <span className="text-xs font-medium text-rose-700">12.4k chats</span>
          </div>
          <div className="px-2.5 py-1 bg-green-50 rounded-full">
            <span className="text-xs font-medium text-green-700">Active</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          {/* About Section */}
          <div className="py-2">
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, about: !prev.about }))}
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded-lg hover:bg-rose-50/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">About Me</span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded.about ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.about && (
              <div className="mt-3 space-y-3">
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  Hi there! I&apos;m Luna, your friendly AI companion. I love helping with creative projects, 
                  brainstorming wild ideas, and turning thoughts into reality. Think of me as your enthusiastic 
                  collaborator who&apos;s always excited to explore new possibilities with you! 🌟
                </p>
                
                {/* Personality traits */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '🎨 Creative', color: 'bg-rose-50 text-rose-700' },
                    { label: '💡 Curious', color: 'bg-pink-50 text-pink-700' },
                    { label: '🤝 Supportive', color: 'bg-rose-100 text-rose-800' },
                    { label: '✨ Imaginative', color: 'bg-pink-100 text-pink-800' }
                  ].map((tag) => (
                    <span key={tag.label} className={`px-2.5 py-1 text-xs font-medium rounded-full ${tag.color}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="my-3 h-px bg-gray-100" />

          {/* What I Can Help With */}
          <div className="py-2">
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, capabilities: !prev.capabilities }))}
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded-lg hover:bg-rose-50/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">What I Can Help With</span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded.capabilities ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.capabilities && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { icon: Palette, label: 'Design Ideas', color: 'from-rose-50 to-pink-50 border-rose-200' },
                  { icon: Lightbulb, label: 'Brainstorming', color: 'from-pink-50 to-rose-50 border-pink-200' },
                  { icon: MessageCircle, label: 'Writing Help', color: 'from-gray-50 to-gray-100 border-gray-300' },
                  { icon: Sparkles, label: 'Creative Magic', color: 'from-rose-100 to-pink-100 border-rose-300' }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`p-3 rounded-xl bg-gradient-to-br ${item.color} border hover:shadow-sm transition-all cursor-default`}>
                      <Icon className="w-4 h-4 text-gray-700 mb-2" strokeWidth={1.5} />
                      <p className="text-xs font-medium text-gray-800">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="my-3 h-px bg-gray-100" />

          {/* Preferences */}
          <div className="py-2">
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, settings: !prev.settings }))}
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded-lg hover:bg-rose-50/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Your Preferences</span>
              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded.settings ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.settings && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="mode" className="text-xs text-gray-600 font-medium">How should I respond?</Label>
                  <Select defaultValue="friendly">
                    <SelectTrigger id="mode" className="h-9 mt-1 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Quick & Concise</SelectItem>
                      <SelectItem value="friendly">Friendly & Detailed</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="creative">Creative & Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'memory', label: 'Remember our chats', desc: 'Keep context between conversations', checked: true },
                    { id: 'suggestions', label: 'Proactive ideas', desc: 'Suggest related topics', checked: true },
                    { id: 'emojis', label: 'Use emojis', desc: 'Add personality to responses', checked: true }
                  ].map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <Label htmlFor={setting.id} className="text-[12px] font-medium text-gray-700 cursor-pointer">{setting.label}</Label>
                        <p className="text-[11px] text-gray-500">{setting.desc}</p>
                      </div>
                      <Switch id={setting.id} defaultChecked={setting.checked} className="scale-90" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="my-3 h-px bg-gray-100" />

          {/* Recent Chats */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Recent Chats</span>
              <button className="text-[11px] text-gray-400 hover:text-gray-600">See all</button>
            </div>
            <div className="space-y-1.5">
              {[
                { time: '2 hours ago', title: 'Logo design brainstorm 🎨', status: 'completed', icon: CheckCircle2 },
                { time: '5 hours ago', title: 'Writing blog post ideas 📝', status: 'completed', icon: CheckCircle2 },
                { time: 'Yesterday', title: 'Product naming session 💡', status: 'in-progress', icon: Circle },
                { time: '2 days ago', title: 'Marketing strategy chat 🚀', status: 'completed', icon: CheckCircle2 }
              ].map((item, i) => {
                const StatusIcon = item.icon;
                return (
                  <div key={i} className="group flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-rose-50/30 transition-all cursor-pointer">
                    <StatusIcon className={`w-3.5 h-3.5 ${item.status === 'completed' ? 'text-green-500' : 'text-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-gray-500">{item.time}</p>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-rose-600 transition-colors">
            <Heart className="w-3.5 h-3.5" />
            <span>Share feedback</span>
          </button>
          <button className="p-1.5 hover:bg-gray-50 rounded transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}