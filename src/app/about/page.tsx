'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function AboutPage() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Function to open the image modal
  const openImageModal = (imagePath: string) => {
    setSelectedImage(imagePath);
  };

  // Function to close the image modal
  const closeImageModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">About Draft Day Trades</h1>
        <button 
          onClick={() => router.back()}
          className="text-blue-600 hover:underline"
        >
          Back
        </button>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">What is Draft Day Trades?</h2>
        <p className="text-blue-700">
          Draft Day Trades is a platform for creating and participating in sports draft confidence pools.
          Predict which players will be drafted at each position, assign confidence points to your picks,
          and compete with friends to see who can make the most accurate predictions!
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">How It Works</h2>
        
        <div className="space-y-12">
          {/* Step 1: Sign Up */}
          <div className="border-b pb-8">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">1</div>
              <h3 className="text-xl font-semibold">Sign Up</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-2/3">
                <p className="text-gray-700 mb-4">
                  Create your account using Google authentication. It&apos;s quick, secure, and gets you started in seconds.
                  After signing up, you&apos;ll be asked to complete your profile by adding a username and optional payment information.
                </p>
                <div className="space-y-2 text-gray-700">
                  <p><span className="font-medium">Username:</span> This is how other users will identify you in leagues and on leaderboards.</p>
                  <p><span className="font-medium">Payment Info:</span> Adding your payment details (like Venmo username) makes it easy for league members to pay you if you win!</p>
                </div>
              </div>
              
              <div className="md:w-1/3 bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                <div 
                  className="text-center text-gray-500 cursor-pointer transition-transform hover:scale-105" 
                  onClick={() => openImageModal("/images/about1.png")}
                >
                  <Image 
                    src="/images/about1.png"
                    alt="Screenshot of the signup process"
                    width={400}
                    height={300}
                    className="rounded-md shadow-md"
                  />
                  <p className="mt-2 text-sm text-blue-600">Click to enlarge</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 2: Create or Join a League */}
          <div className="border-b pb-8">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">2</div>
              <h3 className="text-xl font-semibold">Create or Join a League</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-2/3">
                <p className="text-gray-700 mb-4">
                  You can either create your own league or join an existing one using an invite code.
                </p>
                
                <div className="space-y-3 text-gray-700 mb-4">
                  <div>
                    <p className="font-medium mb-1">Creating a League:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Select the sport (NFL, NBA, etc.)</li>
                      <li>Choose the draft year</li>
                      <li>Set the number of draft picks to predict</li>
                      <li>Invite friends using the generated invite code</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-1">Joining a League:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Get an invite code from a league creator</li>
                      <li>Enter the code on the &quot;Join League&quot; page</li>
                      <li>You&apos;ll be instantly added to the league</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/3 bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                <div 
                  className="text-center text-gray-500 cursor-pointer transition-transform hover:scale-105" 
                  onClick={() => openImageModal("/images/about2.png")}
                >
                  <Image 
                    src="/images/about2.png"
                    alt="Screenshot of league creation"
                    width={400}
                    height={300}
                    className="rounded-md shadow-md"
                  />
                  <p className="mt-2 text-sm text-blue-600">Click to enlarge</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 3: Make Your Predictions */}
          <div className="border-b pb-8">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">3</div>
              <h3 className="text-xl font-semibold">Make Your Predictions</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-2/3">
                <p className="text-gray-700 mb-4">
                  For each draft position, select which player you think will be picked. You can save your progress as you go and come back to finish later.
                </p>
                
                <div className="space-y-3 text-gray-700">
                  <p>Our player database includes all eligible players for the draft, including their position, school/team, and draft ranking. Use the search and filter tools to quickly find the players you&apos;re looking for.</p>
                  <p>You can see which players are already selected in your predictions, making it easy to avoid duplicates. Remember, each player can only be selected once!</p>
                </div>
              </div>
              
              <div className="md:w-1/3 bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                <div 
                  className="text-center text-gray-500 cursor-pointer transition-transform hover:scale-105" 
                  onClick={() => openImageModal("/images/about3.png")}
                >
                  <Image 
                    src="/images/about3.png"
                    alt="Screenshot of prediction interface"
                    width={400}
                    height={300}
                    className="rounded-md shadow-md"
                  />
                  <p className="mt-2 text-sm text-blue-600">Click to enlarge</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 4: Set Confidence Points */}
          <div className="border-b pb-8">
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">4</div>
              <h3 className="text-xl font-semibold">Set Your Confidence Points</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-2/3">
                <p className="text-gray-700 mb-4">
                  Assign confidence points to each of your picks to indicate how sure you are about them. The higher the confidence number, the more points you&apos;ll earn if you&apos;re correct.
                </p>
                
                <div className="space-y-3 text-gray-700">
                  <p>The total number of confidence points equals the total number of picks in your league. For example, in a 32-pick NFL draft, you&apos;ll have confidence points from 1 to 32.</p>
                  <p>Use the &quot;Chalk&quot; button to quickly assign points in order based on draft position, then make adjustments as needed.</p>
                  <p><span className="font-medium">Strategy tip:</span> Assign your highest confidence points to the picks you&apos;re most certain about, and lowest points to the ones you&apos;re least sure of.</p>
                </div>
              </div>
              
              <div className="md:w-1/3 bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                <div 
                  className="text-center text-gray-500 cursor-pointer transition-transform hover:scale-105" 
                  onClick={() => openImageModal("/images/about4.png")}
                >
                  <Image 
                    src="/images/about4.png"
                    alt="Screenshot of confidence points interface"
                    width={400}
                    height={300}
                    className="rounded-md shadow-md"
                  />
                  <p className="mt-2 text-sm text-blue-600">Click to enlarge</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 5: Draft Night */}
          <div>
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-3">5</div>
              <h3 className="text-xl font-semibold">Tune In On Draft Night</h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-2/3">
                <p className="text-gray-700 mb-4">
                  When draft day arrives, our real-time leaderboard will track everyone&apos;s points as picks are announced. See who&apos;s in the lead and watch the standings change with each selection!
                </p>
                
                <div className="space-y-3 text-gray-700">
                  <p>The draft goes &quot;live&quot; approximately 5 minutes before the actual draft begins. At this point, all predictions are locked and can no longer be changed.</p>
                  <p>Our admin team updates the actual picks in real-time as they&apos;re announced, so you&apos;ll see your points update instantly!</p>
                  <p>When the draft is complete, winners are displayed at the top of the league page along with their payment information, making it easy to settle up.</p>
                </div>
              </div>
              
              <div className="md:w-1/3 bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                <div 
                  className="text-center text-gray-500 cursor-pointer transition-transform hover:scale-105" 
                  onClick={() => openImageModal("/images/about5.png")}
                >
                  <Image 
                    src="/images/about5.png"
                    alt="Screenshot of leaderboard"
                    width={400}
                    height={400}
                    className="rounded-md shadow-md"
                  />
                  <p className="mt-2 text-sm text-blue-600">Click to enlarge</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Scoring System</h2>
        
        <p className="text-gray-700 mb-4">
          The scoring system is simple yet strategic:
        </p>
        
        <ul className="list-disc pl-5 mb-4 space-y-2 text-gray-700">
          <li>For each correct prediction, you earn points equal to the confidence value you assigned.</li>
          <li>Incorrect predictions earn zero points.</li>
          <li>Your total score is the sum of all points earned from correct predictions.</li>
        </ul>
        
        <p className="text-gray-700">
          For example, if you assigned 32 confidence points to a pick and got it right, you earn 32 points. If you assigned 1 point and got it right, you earn just 1 point.
        </p>
      </div>
      
      <div className="text-center mb-8">
        <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
          Get Started Now
        </Link>
      </div>
      
      <div className="text-center text-gray-500 text-sm">
        <p>© 2025 Draft Day Trades. All rights reserved.</p>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div 
            className="relative max-w-4xl max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Image
              src={selectedImage}
              alt="Enlarged view"
              width={1200}
              height={900}
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}