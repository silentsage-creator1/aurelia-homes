import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = 'Aurelia Homes property',
  className = '',
  fallbackTitle,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#142D4E] to-[#263445] text-white p-6 relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C5A46D_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="w-12 h-12 rounded-full bg-[#C5A46D]/20 border border-[#C5A46D]/40 flex items-center justify-center mb-2">
          <Building2 className="w-6 h-6 text-[#C5A46D]" />
        </div>
        <span className="text-xs font-serif text-[#C5A46D] tracking-wider uppercase text-center max-w-[200px]">
          {fallbackTitle || 'Aurelia Homes Architectural Asset'}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-[#E4DFD3]/40 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-all duration-300 ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-102'
        }`}
        {...props}
      />
    </div>
  );
};
