// src/components/seo/OptimizedImage.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sport?: string;
  playerName?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sport,
  playerName
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  
  // Generate fallback image URL using sport if available
  const fallbackSrc = sport 
    ? `/images/placeholders/${sport.toLowerCase()}-player.jpg`
    : '/images/placeholders/default-player.jpg';
  
  // Optimize alt text for SEO using playerName and sport if available
  const optimizedAlt = playerName && sport
    ? `${playerName} - ${sport} Draft Prospect Profile Photo`
    : alt;

  return (
    <Image
      src={imageError ? fallbackSrc : src}
      alt={optimizedAlt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={85}
      onError={() => setImageError(true)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}

// Simplified version without the unused props
export function SimpleOptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <Image
      src={imageError ? '/images/placeholders/default.jpg' : src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={85}
      onError={() => setImageError(true)}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}