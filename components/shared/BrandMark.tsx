import React from 'react';

interface BrandMarkProps {
  /** Pixel size of the sign square */
  size?: number;
  /** Show the iDAM / இடம் wordmark beside the sign */
  withWordmark?: boolean;
  /** Light text for use on dark or blue surfaces */
  inverted?: boolean;
  className?: string;
}

/**
 * The iDAM sign: a blue parking-sign square carrying the Tamil letter இ
 * (the first letter of இடம், "place") where a P would normally sit.
 */
export const BrandSign: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    role="img"
    aria-label="iDAM"
    className={`shrink-0 ${className}`}
  >
    <rect x="0.5" y="0.5" width="39" height="39" rx="5" fill="#1846A3" />
    <rect x="3" y="3" width="34" height="34" rx="3" fill="none" stroke="#fff" strokeWidth="1.6" />
    <text
      x="20"
      y="29.5"
      textAnchor="middle"
      fill="#fff"
      fontFamily="'Anek Tamil', sans-serif"
      fontWeight="800"
      fontSize="27"
    >
      இ
    </text>
  </svg>
);

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 36, withWordmark = true, inverted = false, className = '' }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <BrandSign size={size} />
    {withWordmark && (
      <span className="flex flex-col leading-none">
        <span className={`text-[1.2rem] font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}>
          iDAM
        </span>
        <span className={`font-tamil text-[0.8rem] font-semibold mt-0.5 ${inverted ? 'text-white/70' : 'text-slate-500'}`}>
          இடம்
        </span>
      </span>
    )}
  </span>
);
