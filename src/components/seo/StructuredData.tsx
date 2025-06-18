// src/components/seo/StructuredData.tsx

// Define the structure for schema.org data
interface SchemaOrgData {
  '@context'?: string;
  '@type'?: string;
  [key: string]: string | number | boolean | Date | SchemaOrgData | SchemaOrgData[] | undefined;
}

interface StructuredDataProps {
  type: 'Article' | 'WebPage' | 'Organization' | 'Event' | 'FAQPage' | 'Game' | 'BreadcrumbList';
  data: SchemaOrgData;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const baseStructure: SchemaOrgData = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(baseStructure)
      }}
    />
  );
}

// Helper components for specific schema types

interface DraftArticleSchemaProps {
  title: string;
  description: string;
  publishDate: string;
  modifiedDate?: string;
  authorName: string;
  sport: string;
  year: number;
  url: string;
}

export function DraftArticleSchema({
  title,
  description,
  publishDate,
  modifiedDate,
  authorName,
  sport,
  year,
  url
}: DraftArticleSchemaProps) {
  const schema: SchemaOrgData = {
    headline: title,
    description: description,
    author: {
      '@type': 'Person',
      name: authorName
    },
    publisher: {
      '@type': 'Organization',
      name: 'Draft Day Trades',
      logo: {
        '@type': 'ImageObject',
        url: 'https://draftdaytrades.com/logo.jpg'
      }
    },
    datePublished: publishDate,
    ...(modifiedDate && { dateModified: modifiedDate }),
    url: url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url
    },
    about: {
      '@type': 'SportsEvent',
      name: `${year} ${sport} Draft`,
      sport: sport
    }
  };

  return <StructuredData type="Article" data={schema} />;
}

interface LeagueSchemaProps {
  leagueName: string;
  description: string;
  sport: string;
  year: number;
  memberCount: number;
  totalPicks: number;
  url: string;
}

export function LeagueSchema({
  leagueName,
  description,
  sport,
  year,
  memberCount,
  totalPicks,
  url
}: LeagueSchemaProps) {
  const schema: SchemaOrgData = {
    name: leagueName,
    description: description,
    sport: sport,
    numberOfParticipants: memberCount,
    url: url,
    event: {
      '@type': 'SportsEvent',
      name: `${year} ${sport} Draft`,
      startDate: `${year}-04-01`, // Adjust for actual draft dates
      sport: sport
    },
    gameItem: {
      '@type': 'Thing',
      name: 'Draft Predictions',
      description: `Predict ${totalPicks} picks in the ${year} ${sport} draft`
    }
  };

  return <StructuredData type="Game" data={schema} />;
}

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQ[];
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema: SchemaOrgData = {
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return <StructuredData type="FAQPage" data={schema} />;
}