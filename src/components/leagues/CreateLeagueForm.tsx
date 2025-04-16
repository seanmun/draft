'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { SportType } from '../../lib/types';

export default function CreateLeagueForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sportType: 'NFL' as SportType,
    draftYear: 2025,
    totalPicks: 32,
    publicJoin: false,
  });

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    // Update total picks based on sportType
    if (name === 'sportType') {
        let totalPicks = 32; // Default for NFL
        if (value === 'NBA') totalPicks = 30;
        if (value === 'NHL') totalPicks = 32;
        if (value === 'MLB') totalPicks = 30;
        if (value === 'WNBA') totalPicks = 12;
        setFormData({ ...formData, [name]: value as SportType, totalPicks });
      } else {
        setFormData({ ...formData, [name]: newValue });
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Form submitted", formData);
    
    if (!user) {
      alert('You must be signed in to create a league');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Generating invite code...");
      const inviteCode = generateInviteCode();
      console.log("Generated invite code:", inviteCode);
      
      console.log("Creating document in Firestore...");
      const leagueRef = await addDoc(collection(db, 'leagues'), {
        name: formData.name,
        description: formData.description,
        sportType: formData.sportType,
        draftYear: Number(formData.draftYear),
        createdBy: user.uid,
        members: [user.uid],
        settings: {
          totalPicks: Number(formData.totalPicks),
          inviteCode,
          publicJoin: formData.publicJoin,
        },
        createdAt: serverTimestamp(),
      });
      
      console.log("League created with ID:", leagueRef.id);
      router.push(`/leagues/${leagueRef.id}`);
    } catch (error) {
      console.error('Error creating league:', error);
      alert('Failed to create league. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Create a New League</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="name">
            League Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My Draft League"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="League description..."
            rows={3}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="sportType">
            Sport *
          </label>
          <select
            id="sportType"
            name="sportType"
            value={formData.sportType}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NFL">NFL</option>
            <option value="NBA">NBA</option>
            <option value="WNBA">WNBA</option>
            <option value="NHL">NHL</option>
            <option value="MLB">MLB</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="draftYear">
            Draft Year *
          </label>
          <input
            id="draftYear"
            name="draftYear"
            type="number"
            value={formData.draftYear}
            onChange={handleChange}
            required
            min="2025"
            max="2030"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="totalPicks">
            Total Picks *
          </label>
          <input
            id="totalPicks"
            name="totalPicks"
            type="number"
            value={formData.totalPicks}
            onChange={handleChange}
            required
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Defaults to 32 for NFL, 30 for NBA/MLB, 12 for WNBA
          </p>
        </div>
        
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="publicJoin"
              checked={formData.publicJoin}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-gray-700">Allow anyone with the invite code to join</span>
          </label>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Creating...' : 'Create League'}
          </button>
        </div>
      </form>
    </div>
  );
}