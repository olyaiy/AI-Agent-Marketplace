'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles,
  Star,
  MessageCircle,
  Zap,
  Target,
  Layers,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  ArrowUpRight
} from 'lucide-react';

export default function AgentInfoSidebar() {
  const [isExpanded, setIsExpanded] = useState({
    overview: true,
    capabilities: true,
    settings: false
  });

  return (
    <div className="w-[320px] h-full bg-[#FCFCFC] border-l border-gray-200/80 flex flex-col">
      {/* Agent Header - Clean & Minimal */}
      <div className="bg-white border-b border-gray-100">
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            {/* Simple geometric avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gray-900" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-medium text-gray-900">Creative Assistant</h2>
                <div className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600">
                  v2.4
                </div>
              </div>
              <p className="text-[12px] text-gray-500 mt-0.5">Specialized in design & strategy</p>
              
              {/* Clean stats */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < 4 ? 'fill-gray-900 text-gray-900' : 'fill-gray-200 text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-600 ml-1">4.8</span>
                </div>
                <span className="text-[11px] text-gray-400">•</span>
                <span className="text-[11px] text-gray-600">12.4k interactions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          {/* Overview Section */}
          <div className="py-2">
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, overview: !prev.overview }))}
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded hover:bg-gray-50 transition-colors"
            >
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Overview</span>
              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded.overview ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.overview && (
              <div className="mt-3 space-y-3">
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  A versatile AI assistant designed to help with creative projects, strategic planning, 
                  and complex problem-solving. Combines analytical thinking with creative exploration.
                </p>
                
                {/* Key Focus Areas */}
                <div className="flex flex-wrap gap-1">
                  {['Strategy', 'Design', 'Analysis', 'Optimization', 'Research'].map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-[11px] text-gray-600 bg-gray-50 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="my-3 h-px bg-gray-100" />

          {/* Capabilities Section */}
          <div className="py-2">
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, capabilities: !prev.capabilities }))}
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded hover:bg-gray-50 transition-colors"
            >
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Capabilities</span>
              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded.capabilities ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.capabilities && (
              <div className="mt-3 space-y-2">
                {[
                  { icon: Zap, label: 'Quick Processing', desc: 'Fast response times' },
                  { icon: Layers, label: 'Multi-Context', desc: 'Handles complex topics' },
                  { icon: Target, label: 'Goal-Oriented', desc: 'Focused outcomes' },
                  { icon: Sparkles, label: 'Creative Thinking', desc: 'Novel solutions' }
                ].map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <div key={capability.label} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-gray-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-medium text-gray-900">{capability.label}</p>
                        <p className="text-[11px] text-gray-500">{capability.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="my-3 h-px bg-gray-100" />

          {/* Settings Section */}
          <div className="py-2">
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, settings: !prev.settings }))}
              className="flex items-center justify-between w-full text-left py-1.5 -mx-1 px-1 rounded hover:bg-gray-50 transition-colors"
            >
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Settings</span>
              <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded.settings ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.settings && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="mode" className="text-[11px] text-gray-500 font-medium">Response Mode</Label>
                  <Select defaultValue="balanced">
                    <SelectTrigger id="mode" className="h-8 mt-1 text-[12px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'memory', label: 'Context Memory', desc: 'Remember conversations', checked: true },
                    { id: 'suggestions', label: 'Proactive Help', desc: 'Offer suggestions', checked: false },
                    { id: 'sources', label: 'Show Sources', desc: 'Include references', checked: false }
                  ].map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 transition-colors">
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

          {/* Recent Activity */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Recent</span>
              <button className="text-[11px] text-gray-400 hover:text-gray-600">See all</button>
            </div>
            <div className="space-y-1.5">
              {[
                { time: '2 hours ago', title: 'Brand strategy session', status: 'completed', icon: CheckCircle2 },
                { time: '5 hours ago', title: 'Design system review', status: 'completed', icon: CheckCircle2 },
                { time: 'Yesterday', title: 'Market analysis', status: 'in-progress', icon: Circle },
                { time: '2 days ago', title: 'Content planning', status: 'completed', icon: CheckCircle2 }
              ].map((item, i) => {
                const StatusIcon = item.icon;
                return (
                  <div key={i} className="group flex items-center gap-2.5 py-2 px-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
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
          <button className="flex items-center gap-2 text-[11px] text-gray-500 hover:text-gray-700 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Send feedback</span>
          </button>
          <button className="p-1.5 hover:bg-gray-50 rounded transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}