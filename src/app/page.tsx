import Image from 'next/image';
import { TrackableLink } from '../components/seo/TrackableLink';
import { StructuredData, FAQSchema } from '../components/seo/StructuredData';
import HomeCTA from '../components/home/HomeCTA';
import BottomCTA from '../components/home/BottomCTA';
import FeatureCards from '../components/home/FeatureCards';
import SportIcons from '../components/home/SportIcons';

const faqs = [
  {
    question: "What is Draft Day Trades?",
    answer: "Draft Day Trades is a platform where you can create prediction leagues for sports drafts. Pick which players will be drafted, assign confidence points, and compete with friends across NBA, NFL, MLB, NHL, and WNBA drafts."
  },
  {
    question: "How do confidence points work?",
    answer: "You assign confidence points to each of your draft predictions. Your most confident pick gets the highest points, and your least confident gets the lowest. You earn points when your predictions are correct."
  },
  {
    question: "What sports are supported?",
    answer: "We support NBA, NFL, MLB, NHL, and WNBA drafts. You can create prediction leagues for any of these sports."
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

const organizationSchema = {
  name: "Draft Day Trades",
  url: "https://draftdaytrades.com",
  logo: "https://draftdaytrades.com/images/ddt_jd.png",
  description: "Sports draft prediction leagues and confidence pools for NBA, NFL, MLB, NHL, and WNBA drafts",
  applicationCategory: "Sports Game",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock"
  }
};

export default function Home() {
  return (
    <>
      {/* Schema markup */}
      <StructuredData type="Organization" data={organizationSchema} />
      <FAQSchema faqs={faqs} />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <div className="mb-8">
            <Image
              src="/images/ddt_jd.png"
              alt="Draft Day Trades - Sports Draft Prediction Leagues Logo"
              width={220}
              height={220}
              priority
            />
            <p className="text-xs text-gray-400 mt-2 italic text-center">You could be the next Sam Presti!</p>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight text-gray-900">
            Sports Draft <span className="text-gradient">Prediction Leagues</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl text-gray-600">
            Create prediction leagues for NBA, NFL, MLB, NHL & WNBA drafts. Assign confidence points to your picks and compete with friends in real-time during draft night!
          </p>

          <SportIcons />

          <HomeCTA />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-900">How It Works</h2>
          <FeatureCards />
        </div>
      </section>

      {/* Popular Draft Content */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-900">Popular Draft Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrackableLink
              href="/mock-drafts"
              fromPage="/"
              linkText="Expert Mock Drafts"
              className="card-hover bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-blue-400 transition-colors group block"
            >
              <div className="font-bold text-lg mb-2 text-gray-900 group-hover:text-blue-600">Expert Mock Drafts</div>
              <div className="text-sm text-gray-500 mb-4">
                Compare NBA & NFL mock drafts from top analysts like Sam Vecenie, Jeremy Woo, and more
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Updated Daily</span>
                <span className="text-blue-500 font-medium">Accuracy Scores &rarr;</span>
              </div>
            </TrackableLink>
            <TrackableLink
              href="/leagues/create"
              fromPage="/"
              linkText="Create Prediction League"
              className="card-hover bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-blue-400 transition-colors group block"
            >
              <div className="font-bold text-lg mb-2 text-gray-900 group-hover:text-blue-600">Create Prediction League</div>
              <div className="text-sm text-gray-500 mb-4">
                Start your own draft prediction contest with friends across NBA, NFL, and more sports
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Free to Play</span>
                <span className="text-blue-500 font-medium">Get Started &rarr;</span>
              </div>
            </TrackableLink>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-900">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details key={index} className="bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors group">
                <summary className="p-4 cursor-pointer font-medium text-left text-gray-900">
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

      {/* Bottom CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Draft Prediction League?</h2>
          <p className="text-lg mb-8 text-blue-100">
            Join thousands of sports fans creating prediction leagues for the 2026 drafts
          </p>
          <BottomCTA />
        </div>
      </section>
    </>
  );
}
