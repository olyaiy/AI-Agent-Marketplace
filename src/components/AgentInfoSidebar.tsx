'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Sparkles, Brain, Settings, Info, Zap, Globe, Shield } from 'lucide-react';

export default function AgentInfoSidebar() {
  const [isCapabilitiesOpen, setIsCapabilitiesOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="w-80 h-full bg-white/50 backdrop-blur-sm border-l border-gray-200/50 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Agent Header */}
        <div className="space-y-4">
          <div className="relative h-32 bg-gradient-to-br from-violet-500/20 via-blue-500/20 to-cyan-500/20 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
            <div className="absolute bottom-4 left-4 bg-white rounded-full p-3 shadow-lg">
              <Brain className="w-8 h-8 text-violet-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Research Assistant</h2>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-0">
                Active
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Advanced AI agent specialized in deep research, analysis, and knowledge synthesis</p>
          </div>

          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">GPT-4 Turbo</Badge>
            <Badge variant="outline" className="text-xs">Context: 128k</Badge>
            <Badge variant="outline" className="text-xs">v2.1.4</Badge>
          </div>
        </div>

        <Separator className="bg-gray-200/50" />

        {/* Capabilities Section */}
        <div className="space-y-3">
          <button
            onClick={() => setIsCapabilitiesOpen(!isCapabilitiesOpen)}
            className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
          >
            {isCapabilitiesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-sm font-medium text-gray-700">Capabilities</span>
          </button>
          
          {isCapabilitiesOpen && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-gray-600">Real-time web search</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">Multi-language support</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">Data privacy protection</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600">Creative synthesis</span>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-gray-200/50" />

        {/* Settings Section */}
        <div className="space-y-3">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
          >
            {isSettingsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </button>
          
          {isSettingsOpen && (
            <div className="space-y-4 pl-6">
              <div className="space-y-2">
                <Label htmlFor="temperature" className="text-xs text-gray-600">Response Style</Label>
                <Select defaultValue="balanced">
                  <SelectTrigger id="temperature" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="precise">Precise</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="streaming" className="text-sm text-gray-600">Stream responses</Label>
                <Switch id="streaming" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="memory" className="text-sm text-gray-600">Memory enabled</Label>
                <Switch id="memory" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="citations" className="text-sm text-gray-600">Show citations</Label>
                <Switch id="citations" />
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-gray-200/50" />

        {/* About Section */}
        <div className="space-y-3">
          <button
            onClick={() => setIsAboutOpen(!isAboutOpen)}
            className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
          >
            {isAboutOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-sm font-medium text-gray-700">About</span>
          </button>
          
          {isAboutOpen && (
            <div className="space-y-3 pl-6">
              <p className="text-xs text-gray-600 leading-relaxed">
                This agent leverages advanced language models to provide comprehensive research assistance, 
                fact-checking, and analytical support across various domains.
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-700">Dec 15, 2024</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Last updated</span>
                  <span className="text-gray-700">2 hours ago</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total interactions</span>
                  <span className="text-gray-700">1,247</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-2">
          <Button variant="outline" className="w-full text-sm" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Advanced Settings
          </Button>
          <Button variant="outline" className="w-full text-sm" size="sm">
            <Info className="w-4 h-4 mr-2" />
            Documentation
          </Button>
        </div>
      </div>
    </div>
  );
}