// src/components/HeroCards.tsx
// Hero cards component for the home page featuring AI customization and monetization

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * HeroCards component that displays two promotional cards:
 * 1. AI customization card (spans 2 columns)
 * 2. Monetization card (spans 1 column)
 * 
 * Desktop: 3-column grid layout
 * Mobile: Horizontal swipable carousel with square cards
 */
export function HeroCards() {
  return (
    <>
      {/* Mobile: Swipable carousel */}
      <div className="md:hidden mb-6 -mx-4 px-4">
        <div 
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Create Agent Card - Mobile */}
          <Link href="/create" className="flex-shrink-0 snap-start">
            <Card className="w-36 h-36 bg-[#F0F6FD] border-none relative overflow-hidden group">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm font-bold text-gray-900 leading-tight">
                  Create Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-gray-600 text-[10px] leading-tight line-clamp-2">
                  Build your own AI assistant
                </p>
              </CardContent>
              <div className="absolute bottom-0 right-0 -mb-1">
                <Image
                  src="/assets/Hero Card Agent.png"
                  alt="AI Agents"
                  width={70}
                  height={50}
                  className="object-contain"
                />
              </div>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-gray-700">
                <ArrowRight className="w-3 h-3" />
              </div>
            </Card>
          </Link>

          {/* Monetize Card - Mobile */}
          <div className="flex-shrink-0 snap-start">
            <Card className="w-36 h-36 bg-gradient-to-br from-green-50 to-emerald-100 border-none relative overflow-hidden group">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm font-bold text-gray-900 leading-tight">
                  Monetize
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-gray-600 text-[10px] leading-tight line-clamp-2">
                  Earn from your agents
                </p>
              </CardContent>
              <div className="absolute bottom-0 right-0">
                <Image
                  src="/assets/Hand Coin.png"
                  alt="Hand Coin"
                  width={60}
                  height={45}
                  className="object-contain"
                />
              </div>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-gray-700">
                <ArrowRight className="w-3 h-3" />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8">
      {/* First card - AI Customization (spans 2 columns on desktop) */}
      <Link href="/create" className="md:col-span-2">
        <Card className="bg-[#F0F6FD] border-none md:min-h-64 relative overflow-hidden group opacity hover:opacity-100 transition-all duration-300 cursor-pointer">
        <CardHeader className="pr-[30%]">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Create Your Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="pr-[30%]">
          <p className="text-gray-600 leading-relaxed text-sm">
            Create your own AI assistant that understands exactly what you need. Choose how it talks, 
            what it knows, and how it helps you get things done.
          </p>
        </CardContent>
        
        {/* AI Agents image - peeking from bottom right */}
        <div className="absolute bottom-0 right-0 -mb-4 transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/assets/Hero Card Agent.png"
            alt="AI Agents"
            width={180}
            height={120}
            className="object-contain"
          />
        </div>
        
        {/* Create button - appears on hover */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <span className="text-sm font-medium">Create</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </Card>
      </Link>

      {/* Second card - Monetization (spans 1 column) */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-none relative overflow-hidden group hover:brightness-105 transition-all duration-300 cursor-pointer">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            Monetize
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-xs leading-relaxed w-[60%]">
            Make money from your agents by sharing them with others or offering premium features.
          </p>
        </CardContent>
        
        {/* Hand Coin image - peeking from bottom right */}
        <div className="absolute bottom-0 right-0 transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/assets/Hand Coin.png"
            alt="Hand Coin"
            width={150}
            height={100}
            className="object-contain"
          />
        </div>
        
        {/* Explore button - appears on hover */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <span className="text-sm font-medium">Explore</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </Card>
    </div>
    </>
  );
}
