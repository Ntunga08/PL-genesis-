import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = React.memo(({ size = 'md', showText = true, className = '' }) => {
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  useEffect(() => {
    let isMounted = true;
    let hasFetched = false; // Prevent multiple fetches
    
    // Fetch custom logo from settings
    const fetchLogo = async () => {
      if (hasFetched) return; // Already fetched
      hasFetched = true;
      
      try {
        const response = await api.get('/settings/logo');
        if (isMounted && response.data.logo_url) {
          setCustomLogo(response.data.logo_url);
        }
      } catch (error) {
        // Silently fail - use default logo
        if (isMounted) {

        }
      }
    };
    
    fetchLogo();
    
    // Listen for logo updates
    const handleLogoUpdate = (event: any) => {
      if (isMounted) {
        setCustomLogo(event.detail.logoUrl);
      }
    };
    
    window.addEventListener('logoUpdated', handleLogoUpdate);
    
    return () => {
      isMounted = false;
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []); // Empty deps - only run once

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo - Custom or Default SVG */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        {customLogo ? (
          <img 
            src={customLogo} 
            alt="Hospital Logo" 
            className="w-full h-full object-cover rounded-full shadow-md border-2 border-white"
          />
        ) : (
          <svg viewBox="0 0 840 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Pentagon shape - dark green */}
            <path d="M420 50 L800 300 L680 750 L160 750 L40 300 Z" fill="#1a4d3a" />
            
            {/* White checkmark/tick */}
            <path d="M260 580 L360 680 L580 420" stroke="white" strokeWidth="60" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            
            {/* Stethoscope - red */}
            {/* Earpieces */}
            <circle cx="360" cy="180" r="25" fill="#dc2626"/>
            <circle cx="480" cy="180" r="25" fill="#dc2626"/>
            
            {/* Tubes */}
            <path d="M360 205 Q360 280 420 320" stroke="#dc2626" strokeWidth="20" strokeLinecap="round" fill="none"/>
            <path d="M480 205 Q480 280 420 320" stroke="#dc2626" strokeWidth="20" strokeLinecap="round" fill="none"/>
            
            {/* Main tube */}
            <path d="M420 320 L420 450 Q420 480 390 480 L280 480" stroke="#dc2626" strokeWidth="20" strokeLinecap="round" fill="none"/>
            
            {/* Chest piece circles */}
            <circle cx="280" cy="480" r="40" stroke="#dc2626" strokeWidth="20" fill="none"/>
            <circle cx="280" cy="480" r="15" fill="#dc2626"/>
            
            {/* Small circle on tube */}
            <circle cx="560" cy="420" r="25" stroke="#dc2626" strokeWidth="15" fill="none"/>
            <circle cx="560" cy="420" r="10" fill="#dc2626"/>
            
            {/* HASET text - red, bold */}
            <text x="420" y="920" fontFamily="Arial, sans-serif" fontSize="180" fontWeight="900" 
                  fill="#dc2626" textAnchor="middle" letterSpacing="10">HASET</text>
          </svg>
        )}
      </div>
      
      {/* Optional text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-gray-900 ${textSizeClasses[size]} leading-tight`}>
            HASET
          </span>
          <span className="text-xs text-gray-600 uppercase tracking-wide">
            Hospital Management
          </span>
        </div>
      )}
    </div>
  );
});

Logo.displayName = 'Logo';

export default Logo;
