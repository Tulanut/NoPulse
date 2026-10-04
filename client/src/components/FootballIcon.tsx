import React from 'react';

interface FootballIconProps {
  className?: string;
  size?: number;
}

export const FootballIcon: React.FC<FootballIconProps> = ({ className = 'w-5 h-5', size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Outer Ball Perimeter */}
      <circle cx="12" cy="12" r="10" />

      {/* Central Pentagon */}
      <polygon
        points="12,8.5 15.5,11 14.2,15 9.8,15 8.5,11"
        fill="currentColor"
        fillOpacity="0.22"
      />

      {/* Connecting Seam Lines from Center Pentagon to Outer Seams */}
      <line x1="12" y1="8.5" x2="12" y2="2" />
      <line x1="15.5" y1="11" x2="21.5" y2="8.5" />
      <line x1="14.2" y1="15" x2="18" y2="20" />
      <line x1="9.8" y1="15" x2="6" y2="20" />
      <line x1="8.5" y1="11" x2="2.5" y2="8.5" />

      {/* Peripheral Corner Seam Nodes */}
      <path d="M7 3.5 L12 2 L17 3.5" strokeWidth="1.3" opacity="0.6" />
      <path d="M21.5 8.5 L21 14.5" strokeWidth="1.3" opacity="0.6" />
      <path d="M18 20 L12 22 L6 20" strokeWidth="1.3" opacity="0.6" />
      <path d="M2.5 8.5 L3 14.5" strokeWidth="1.3" opacity="0.6" />
    </svg>
  );
};
