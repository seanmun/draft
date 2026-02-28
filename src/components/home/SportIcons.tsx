'use client';

import { Icon } from 'lucide-react';
import { football, iceHockey, baseball, basketball } from '@lucide/lab';

const sports = [
  { name: 'NFL', icon: football, active: true },
  { name: 'NBA', icon: basketball, active: false },
  { name: 'MLB', icon: baseball, active: false },
  { name: 'NHL', icon: iceHockey, active: false },
];

export default function SportIcons() {
  return (
    <div className="flex items-center justify-center gap-6 mb-10">
      {sports.map((sport) => (
        <div
          key={sport.name}
          className={`flex flex-col items-center gap-1 ${
            sport.active ? 'opacity-100' : 'opacity-40'
          }`}
        >
          <div className={`p-3 rounded-full ${
            sport.active
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            <Icon iconNode={sport.icon} size={28} />
          </div>
          <span className={`text-xs font-semibold ${
            sport.active ? 'text-blue-600' : 'text-gray-400'
          }`}>
            {sport.name}
          </span>
          {sport.active && (
            <span className="text-[10px] text-blue-500 font-medium">UPCOMING</span>
          )}
        </div>
      ))}
    </div>
  );
}
