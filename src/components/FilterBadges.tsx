import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const categories = [
  'All Agents',
  'Content Creation',
  'Data Analysis',
  'Programming',
  'Research',
  'Customer Support',
  'Marketing',
  'Education',
  'Design',
  'Finance',
  'Healthcare',
  'Legal',
  'Sales',
  'Translation',
  'Writing'
];

interface FilterBadgesProps {
  className?: string;
}

export function FilterBadges({ className = '' }: FilterBadgesProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 pb-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="bg-[#FCFAF1] py-1.5  px-4 rounded-full text-yellow-800 border-yellow-200 hover:bg-amber-50 transition-colors cursor-pointer shrink-0 hober:border-amber-900 hover:border-1.5"
            >
              {category}
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}