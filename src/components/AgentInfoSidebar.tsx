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
  ArrowUpRight,
  Smile
} from 'lucide-react';

export default function AgentInfoSidebar() {
  const [isExpanded, setIsExpanded] = useState({
    about: true,
    capabilities: true,
    settings: false,
    overview: true
  });

  return (
    <div className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      {/* Banner & Agent Header */}
      <div className="relative">
        {/* Banner Image */}
        <div className="h-32 bg-gradient-to-br from-purple-400 via-pink-300 to-orange-300 relative overflow-hidden">
          {/* Placeholder pattern for banner */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>
        
        {/* Avatar overlapping banner */}
        <div className="absolute -bottom-8 left-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <Smile className="w-7 h-7 text-purple-600" strokeWidth={1.5} />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Agent Info */}
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Luna</h2>
            <p className="text-sm text-gray-600 mt-0.5">Your creative thinking partner</p>
          </div>
          <button className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors">
            <Heart className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
          </button>
        </div>
        
        {/* Warm stats */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 rounded-full">
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-medium text-yellow-700">4.9</span>
          </div>
          <div className="px-2.5 py-1 bg-purple-50 rounded-full">
            <span className="text-xs font-medium text-purple-700">12.4k chats</span>
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
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded-lg hover:bg-purple-50/50 transition-colors"
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
                    { label: '🎨 Creative', color: 'bg-purple-50 text-purple-700' },
                    { label: '💡 Curious', color: 'bg-yellow-50 text-yellow-700' },
                    { label: '🤝 Supportive', color: 'bg-blue-50 text-blue-700' },
                    { label: '✨ Imaginative', color: 'bg-pink-50 text-pink-700' }
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
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded-lg hover:bg-purple-50/50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">What I Can Help With</span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded.capabilities ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.capabilities && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { icon: Palette, label: 'Design Ideas', color: 'from-purple-50 to-pink-50 border-purple-100' },
                  { icon: Lightbulb, label: 'Brainstorming', color: 'from-yellow-50 to-orange-50 border-yellow-100' },
                  { icon: MessageCircle, label: 'Writing Help', color: 'from-blue-50 to-cyan-50 border-blue-100' },
                  { icon: Sparkles, label: 'Creative Magic', color: 'from-pink-50 to-rose-50 border-pink-100' }
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
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded-lg hover:bg-purple-50/50 transition-colors"
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
                  <div key={i} className="group flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-purple-50/30 transition-all cursor-pointer">
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
          <button className="flex items-center gap-2 text-xs text-gray-500 hover:text-purple-600 transition-colors">
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