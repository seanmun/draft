'use client';

import { Icon, Target, Trophy } from 'lucide-react';
import { football } from '@lucide/lab';

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card-hover bg-white border border-gray-200 rounded-xl p-6 shadow-sm border-t-4 border-t-blue-500">
        <div className="mb-3 text-blue-500">
          <Icon iconNode={football} size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2 text-gray-900">Predict Draft Picks</h3>
        <p className="text-gray-600 text-sm">Select which players will be drafted and in what order across NFL, NBA, MLB, NHL, and WNBA drafts</p>
      </div>
      <div className="card-hover bg-white border border-gray-200 rounded-xl p-6 shadow-sm border-t-4 border-t-emerald-500">
        <div className="mb-3 text-emerald-500">
          <Target size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2 text-gray-900">Assign Confidence Points</h3>
        <p className="text-gray-600 text-sm">Rate your predictions with confidence points &mdash; higher points for picks you&rsquo;re most sure about</p>
      </div>
      <div className="card-hover bg-white border border-gray-200 rounded-xl p-6 shadow-sm border-t-4 border-t-amber-500">
        <div className="mb-3 text-amber-500">
          <Trophy size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2 text-gray-900">Compete with Friends</h3>
        <p className="text-gray-600 text-sm">Create private leagues, invite friends, and compete in real-time during draft night</p>
      </div>
    </div>
  );
}
