'use client';

import Image from 'next/image';
import { useAuth } from '../hooks/useAuth';
import { TrackableLink } from '../components/seo/TrackableLink';
import { StructuredData, FAQSchema } from '../components/seo/StructuredData';
import { ScrollTracker } from '../app/analytics/ScrollTracker';

export default function Home() {
  const { user, loading } = useAuth();

  // FAQ data for SEO
  const faqs = [
    {
      question: "What is Draft Day Trades?",
      answer: "Draft Day Trades is a platform where you can create prediction leagues for sports drafts. Pick which players will be drafted, assign confidence points, and compete with friends across NFL, NBA, MLB, NHL, and WNBA drafts."
    },
    {
      question: "How do confidence points work?",
      answer: "You assign confidence points to each of your draft predictions. Your most confident pick gets the highest points, and your least confident gets the lowest. You earn points when your predictions are correct."
    },
    {
      question: "What sports are supported?",
      answer: "We support NFL, NBA, MLB, NHL, and WNBA drafts. You can create prediction leagues for any of these sports."
    },
    {
      question: "Is it free to play?",
      answer: "Yes! Creating leagues and making predictions is completely free. Just sign up and start predicting with your friends."
    },
    {
      question: "How do I invite friends to my league?",
      answer: "After creating a league, you'll get a unique invite link that you can share with friends. They can join instantly using the link."
    }
  ];

  // Organization schema for business info
  const organizationSchema = {
    name: "Draft Day Trades",
    url: "https://draftdaytrades.com",
    logo: "https://draftdaytrades.com/images/ddt_jd.png",
    description: "Sports draft prediction leagues and confidence pools for NFL, NBA, MLB, NHL, and WNBA drafts",
    applicationCategory: "Sports Game",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock"
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {/* Add scroll tracking for homepage engagement */}
      <ScrollTracker pageName="/" />
      
      {/* Schema markup for the organization */}
      <StructuredData type="Organization" data={organizationSchema} />
      
      {/* FAQ Schema */}
      <FAQSchema faqs={faqs} />

      <div className="min-h-[calc(100vh-16rem)] flex flex-col items-center justify-center text-center">
        {/* Logo */}
        <div className="mb-6">
          <Image 
            src="/images/ddt_jd.png"
            alt="Draft Day Trades - Sports Draft Prediction Leagues Logo"
            width={250}
            height={250}
            priority
          />
        </div>
        
        {/* Main heading with better SEO */}
        <h1 className="text-4xl font-bold mb-4">Sports Draft Prediction Leagues | Draft Day Trades</h1>
        <p className="text-xl mb-8 max-w-2xl">
          Create prediction leagues for NFL, NBA, MLB, NHL & WNBA drafts. Assign confidence points to your picks and compete with friends in real-time during draft night!
        </p>
        
        {/* CTA Buttons with tracking */}
        {user ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <TrackableLink 
              href="/leagues/create" 
              fromPage="/"
              linkText="Create a League"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
            >
              Create a League
            </TrackableLink>
            <TrackableLink 
              href="/leagues" 
              fromPage="/"
              linkText="My Leagues"
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
            >
              My Leagues
            </TrackableLink>
          </div>
        ) : (
          <TrackableLink 
            href="/login" 
            fromPage="/"
            linkText="Get Started"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
          >
            Get Started
          </TrackableLink>
        )}
        
        {/* Features section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
          <div className="border p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Predict Draft Picks</h3>
            <p>Select which players will be drafted and in what order across NFL, NBA, MLB, NHL, and WNBA drafts</p>
          </div>
          <div className="border p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Assign Confidence Points</h3>
            <p>Rate your predictions with confidence points - higher points for picks you&rsquo;re most sure about</p>
          </div>
          <div className="border p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Compete with Friends</h3>
            <p>Create private leagues, invite friends, and compete in real-time during draft night</p>
          </div>
        </div>

        {/* Internal linking section for SEO */}
        <div className="mt-16 w-full max-w-4xl">
          <h2 className="text-2xl font-bold mb-6">Popular Draft Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrackableLink 
              href="/mock-drafts" 
              fromPage="/"
              linkText="Expert Mock Drafts"
              className="border border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors group"
            >
              <div className="font-semibold text-lg mb-2 group-hover:text-blue-600">Expert Mock Drafts</div>
              <div className="text-sm text-gray-600 mb-3">
                Compare NFL & NBA mock drafts from top analysts like Mel Kiper Jr., Daniel Jeremiah, and more
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Updated Daily</span>
                <span>Accuracy Scores →</span>
              </div>
            </TrackableLink>
            <TrackableLink 
              href="/leagues/create" 
              fromPage="/"
              linkText="Create Prediction League"
              className="border border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors group"
            >
              <div className="font-semibold text-lg mb-2 group-hover:text-blue-600">Create Prediction League</div>
              <div className="text-sm text-gray-600 mb-3">
                Start your own draft prediction contest with friends across NFL, NBA, and more sports
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Free to Play</span>
                <span>Get Started →</span>
              </div>
            </TrackableLink>
          </div>
        </div>
      </div>

      {/* FAQ Section for SEO */}
      <section className="bg-gray-50 py-16 mt-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="bg-white border border-gray-200 rounded-lg">
                <summary className="p-4 cursor-pointer hover:bg-gray-50 font-medium text-left">
                  {faq.question}
                </summary>
                <div className="px-4 pb-4 text-gray-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Draft Prediction League?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of sports fans creating prediction leagues for the 2025 drafts
          </p>
          {!user && (
            <TrackableLink 
              href="/login"
              fromPage="/"
              linkText="Create Free Account"
              className="bg-white text-blue-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition-colors inline-block"
            >
              Create Free Account
            </TrackableLink>
          )}
        </div>
      </section>
    </>
  );
}