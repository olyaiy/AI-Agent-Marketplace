// src/components/HeroCards.tsx
// Hero cards component for the home page featuring AI customization and monetization

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * HeroCards component that displays two promotional cards:
 * 1. AI customization card (spans 2 columns)
 * 2. Monetization card (spans 1 column)
 * 
 * Uses a 3-column grid layout for responsive design
 */
export function HeroCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* First card - AI Customization (spans 2 columns on desktop) */}
      <Card className="md:col-span-2 bg-[#F4F8FE] border-none md:min-h-64">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">
            AI
          </CardTitle>
          <CardDescription className="text-base text-gray-700 mt-2">
            Your agent, your rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 leading-relaxed">
            Connect any page to your agent to customize how your agent talks, thinks, and works. 
            Take full control of your AI&apos;s personality and capabilities.
          </p>
        </CardContent>
      </Card>

      {/* Second card - Monetization (spans 1 column) */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-none">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Monetize
          </CardTitle>
          <CardDescription className="text-sm text-gray-700">
            Earn from your creations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm leading-relaxed">
            Make money from your agents by sharing them with others or offering premium features.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
