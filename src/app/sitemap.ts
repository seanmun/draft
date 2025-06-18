// src/app/sitemap.ts
import { MetadataRoute } from 'next';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://draftdaytrades.com';
  
  // Static pages
  const staticPages: SitemapEntry[] = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/leagues`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    }
  ];

  // Dynamic sport/year pages
  const sportPages: SitemapEntry[] = [];
  const sports = ['NFL', 'NBA', 'NHL', 'MLB', 'WNBA'];
  const years = [2024, 2025, 2026];

  for (const sport of sports) {
    // Sport landing page
    sportPages.push({
      url: `${baseUrl}/${sport.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    });

    for (const year of years) {
      // Year-specific pages
      sportPages.push({
        url: `${baseUrl}/${sport.toLowerCase()}/${year}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });

      // Predictions pages
      sportPages.push({
        url: `${baseUrl}/${sport.toLowerCase()}/${year}/predictions`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      // Mock drafts pages
      sportPages.push({
        url: `${baseUrl}/${sport.toLowerCase()}/${year}/mock-drafts`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });

      // Team needs pages (NFL example)
      if (sport === 'NFL') {
        const nflTeams = [
          'arizona-cardinals', 'atlanta-falcons', 'baltimore-ravens', 'buffalo-bills',
          'carolina-panthers', 'chicago-bears', 'cincinnati-bengals', 'cleveland-browns',
          'dallas-cowboys', 'denver-broncos', 'detroit-lions', 'green-bay-packers',
          'houston-texans', 'indianapolis-colts', 'jacksonville-jaguars', 'kansas-city-chiefs',
          'las-vegas-raiders', 'los-angeles-chargers', 'los-angeles-rams', 'miami-dolphins',
          'minnesota-vikings', 'new-england-patriots', 'new-orleans-saints', 'new-york-giants',
          'new-york-jets', 'philadelphia-eagles', 'pittsburgh-steelers', 'san-francisco-49ers',
          'seattle-seahawks', 'tampa-bay-buccaneers', 'tennessee-titans', 'washington-commanders'
        ];

        for (const team of nflTeams) {
          sportPages.push({
            url: `${baseUrl}/${sport.toLowerCase()}/${year}/teams/${team}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    }
  }

  // Dynamic player pages
  const playerPages: SitemapEntry[] = await generatePlayerSitemap(baseUrl);
  
  // Dynamic league pages (public ones only)
  const leaguePages: SitemapEntry[] = await generateLeagueSitemap(baseUrl);

  return [
    ...staticPages,
    ...sportPages,
    ...playerPages,
    ...leaguePages
  ];
}

async function generatePlayerSitemap(baseUrl: string): Promise<SitemapEntry[]> {
  try {
    const playerPages: SitemapEntry[] = [];
    const sports = ['NFL', 'NBA', 'NHL', 'MLB', 'WNBA'];
    
    for (const sport of sports) {
      const playersQuery = query(
        collection(db, 'players'),
        where('sportType', '==', sport),
        where('draftYear', '==', 2025)
      );
      
      const playersSnapshot = await getDocs(playersQuery);
      
      playersSnapshot.docs.forEach(doc => {
        const player = doc.data();
        const playerSlug = player.name.toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
          
        playerPages.push({
          url: `${baseUrl}/${sport.toLowerCase()}/2025/players/${playerSlug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      });
    }
    
    return playerPages;
  } catch (error) {
    console.error('Error generating player sitemap:', error);
    return [];
  }
}

async function generateLeagueSitemap(baseUrl: string): Promise<SitemapEntry[]> {
  try {
    const leaguePages: SitemapEntry[] = [];
    
    // Only include public leagues in sitemap
    const leaguesQuery = query(
      collection(db, 'leagues'),
      where('settings.publicJoin', '==', true)
    );
    
    const leaguesSnapshot = await getDocs(leaguesQuery);
    
    leaguesSnapshot.docs.forEach(doc => {
      const league = doc.data();
      leaguePages.push({
        url: `${baseUrl}/leagues/${doc.id}`,
        lastModified: new Date(league.updatedAt?.toDate() || league.createdAt?.toDate()),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    });
    
    return leaguePages;
  } catch (error) {
    console.error('Error generating league sitemap:', error);
    return [];
  }
}

// src/app/robots.txt/route.ts
export async function GET() {
  const baseUrl = 'https://draftdaytrades.com';
  
  const robotsTxt = `
User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private pages
Disallow: /admin/
Disallow: /api/
Disallow: /leagues/*/manage
Disallow: /profile
Disallow: /login

# Allow specific sport and year pages
Allow: /nfl/
Allow: /nba/
Allow: /nhl/
Allow: /mlb/
Allow: /wnba/

# Crawl delay (optional)
Crawl-delay: 1
`.trim();

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}