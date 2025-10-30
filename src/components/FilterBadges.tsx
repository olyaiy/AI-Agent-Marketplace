import { Badge } from '@/components/ui/badge';
import {
  Grid3X3,
  PenTool,
  BarChart3,
  Code,
  Search,
  Headphones,
  Megaphone,
  GraduationCap,
  Palette,
  DollarSign,
  Heart,
  Scale,
  TrendingUp,
  Languages,
  FileText
} from 'lucide-react';

const categories = [
  { name: 'All Agents', icon: Grid3X3 },
  { name: 'Content Creation', icon: PenTool },
  { name: 'Data Analysis', icon: BarChart3 },
  { name: 'Programming', icon: Code },
  { name: 'Research', icon: Search },
  { name: 'Customer Support', icon: Headphones },
  { name: 'Marketing', icon: Megaphone },
  { name: 'Education', icon: GraduationCap },
  { name: 'Design', icon: Palette },
  { name: 'Finance', icon: DollarSign },
  { name: 'Healthcare', icon: Heart },
  { name: 'Legal', icon: Scale },
  { name: 'Sales', icon: TrendingUp },
  { name: 'Translation', icon: Languages },
  { name: 'Writing', icon: FileText }
];

interface FilterBadgesProps {
  className?: string;
}

export function FilterBadges({ className = '' }: FilterBadgesProps) {
  return (
    <div className={`mb-6 ${className} overflow-x-auto`}>
      <div className="flex space-x-2 pb-2 min-w-max">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Badge
              key={category.name}
              variant="secondary"
              className="bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 whitespace-nowrap"
            >
              <IconComponent size={14} />
              {category.name}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
