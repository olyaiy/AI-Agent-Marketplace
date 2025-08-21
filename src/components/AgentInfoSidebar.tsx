'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Heart,
  Star,
  MessageCircle,
  Smile,
  Coffee,
  BookOpen,
  Users,
  Calendar,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

export default function AgentInfoSidebar() {
  const [isExpanded, setIsExpanded] = useState({
    about: true,
    personality: true,
    preferences: false
  });

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Agent Profile Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Smile className="w-8 h-8 text-amber-600" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-medium text-gray-900">Dr. Sarah Chen</h2>
            <p className="text-sm text-gray-500">Life Coach & Therapist</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs text-gray-600">4.9</span>
              </div>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-600">2.3k sessions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* About Section */}
          <div>
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, about: !prev.about }))}
              className="flex items-center justify-between w-full text-left mb-3 group"
            >
              <span className="text-sm font-medium text-gray-900">About</span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded.about ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.about && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  I&apos;m here to help you navigate life&apos;s challenges with empathy and wisdom. 
                  Together, we&apos;ll work on building resilience, finding clarity, and creating 
                  positive change in your life.
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {['Mindfulness', 'Goal Setting', 'Stress Management', 'Relationships'].map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Personality Section */}
          <div>
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, personality: !prev.personality }))}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <span className="text-sm font-medium text-gray-900">Personality</span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded.personality ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.personality && (
              <div className="space-y-3">
                <div className="space-y-3">
                  {[
                    { icon: Heart, label: 'Empathetic', desc: 'Understanding and compassionate' },
                    { icon: Coffee, label: 'Warm', desc: 'Friendly and approachable' },
                    { icon: BookOpen, label: 'Knowledgeable', desc: 'Evidence-based guidance' },
                    { icon: Users, label: 'Supportive', desc: 'Non-judgmental and encouraging' }
                  ].map((trait) => {
                    const Icon = trait.icon;
                    return (
                      <div key={trait.label} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mt-0.5">
                          <Icon className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{trait.label}</p>
                          <p className="text-xs text-gray-500">{trait.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Preferences Section */}
          <div>
            <button
              onClick={() => setIsExpanded(prev => ({ ...prev, preferences: !prev.preferences }))}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <span className="text-sm font-medium text-gray-900">Your Preferences</span>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded.preferences ? 'rotate-90' : ''}`} />
            </button>
            
            {isExpanded.preferences && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tone" className="text-xs text-gray-600">Conversation style</Label>
                  <Select defaultValue="supportive">
                    <SelectTrigger id="tone" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="supportive">Supportive</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="motivational">Motivational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="checkins" className="text-sm text-gray-700">Regular check-ins</Label>
                      <p className="text-xs text-gray-500 mt-0.5">Get gentle reminders</p>
                    </div>
                    <Switch id="checkins" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="exercises" className="text-sm text-gray-700">Practice exercises</Label>
                      <p className="text-xs text-gray-500 mt-0.5">Homework & activities</p>
                    </div>
                    <Switch id="exercises" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="summaries" className="text-sm text-gray-700">Session notes</Label>
                      <p className="text-xs text-gray-500 mt-0.5">Save key insights</p>
                    </div>
                    <Switch id="summaries" defaultChecked />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-900">Recent Sessions</span>
              <button className="text-xs text-gray-500 hover:text-gray-700">View all</button>
            </div>
            <div className="space-y-2">
              {[
                { date: 'Today', topic: 'Managing work stress', mood: '😊' },
                { date: 'Yesterday', topic: 'Setting boundaries', mood: '🤔' },
                { date: 'Dec 20', topic: 'Self-care routine', mood: '😌' }
              ].map((session, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{session.topic}</p>
                    <p className="text-xs text-gray-500">{session.date}</p>
                  </div>
                  <span className="text-lg">{session.mood}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 p-4 bg-gray-50/50">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Schedule
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs">
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Feedback
          </Button>
          <Button variant="ghost" size="sm" className="px-2">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}