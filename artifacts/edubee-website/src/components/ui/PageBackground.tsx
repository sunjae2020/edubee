import React from 'react'

type Variant =
  | 'dots'
  | 'globe'
  | 'hexagons'
  | 'circuit'
  | 'wave'
  | 'diagonal'
  | 'orbits'
  | 'topography'

interface Props {
  variant?: Variant
  className?: string
}

const C = '#F5821F'

function DotsPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="pb-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill={C} fillOpacity="0.13" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pb-dots)" />
      <circle cx="85%" cy="20%" r="160" fill={C} fillOpacity="0.04" />
      <circle cx="12%" cy="75%" r="110" fill={C} fillOpacity="0.04" />
    </svg>
  )
}

function GlobePattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1280 500" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="640" cy="250" r="380" stroke={C} strokeWidth="1" opacity="0.07" />
      <circle cx="640" cy="250" r="280" stroke={C} strokeWidth="1" opacity="0.07" />
      <circle cx="640" cy="250" r="180" stroke={C} strokeWidth="1" opacity="0.06" />
      <ellipse cx="640" cy="250" rx="70"  ry="380" stroke={C} strokeWidth="0.8" opacity="0.055" />
      <ellipse cx="640" cy="250" rx="160" ry="380" stroke={C} strokeWidth="0.8" opacity="0.05"  />
      <ellipse cx="640" cy="250" rx="260" ry="380" stroke={C} strokeWidth="0.8" opacity="0.05"  />
      <ellipse cx="640" cy="250" rx="340" ry="380" stroke={C} strokeWidth="0.8" opacity="0.045" />
      <line x1="260" y1="250" x2="1020" y2="250" stroke={C} strokeWidth="1" opacity="0.09" />
      <line x1="260" y1="150" x2="1020" y2="150" stroke={C} strokeWidth="0.7" opacity="0.055" />
      <line x1="260" y1="350" x2="1020" y2="350" stroke={C} strokeWidth="0.7" opacity="0.055" />
    </svg>
  )
}

function HexagonsPattern() {
  const hexPath = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    })
    return `M${pts.join('L')}Z`
  }
  const grid = [
    [80, 70, 40], [160, 110, 40], [80, 150, 40], [160, 190, 40], [80, 230, 40],
    [960, 60, 36], [1040, 100, 36], [960, 140, 36], [1040, 180, 36], [960, 220, 36],
    [1110, 130, 28], [1110, 76, 28],
    [500, 30, 24], [560, 60, 24], [620, 30, 24],
  ]
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1280 400" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
      {grid.map(([cx, cy, r], i) => (
        <path key={i} d={hexPath(cx, cy, r)} stroke={C} strokeWidth="1.2" fillOpacity="0.04" fill={C} opacity={0.18 + (i % 3) * 0.05} />
      ))}
    </svg>
  )
}

function CircuitPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1280 400" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="pb-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0 L0 0 0 60" stroke={C} strokeWidth="0.5" strokeOpacity="0.08" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pb-grid)" />
      <path d="M0,200 H120 V80 H320 V140 H500 V80 H700" stroke={C} strokeWidth="1.2" opacity="0.14" fill="none" />
      <path d="M1280,150 H1100 V250 H900 V180 H700 V250 H500" stroke={C} strokeWidth="1.2" opacity="0.12" fill="none" />
      <path d="M200,400 V300 H400 V200 H560" stroke={C} strokeWidth="1" opacity="0.10" fill="none" />
      <path d="M1080,400 V320 H880 V220" stroke={C} strokeWidth="1" opacity="0.10" fill="none" />
      {[[120,200],[320,80],[500,140],[700,80],[700,250],[900,180],[1100,150],[1100,250]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="4" fill={C} fillOpacity="0.25" stroke={C} strokeWidth="1" opacity="0.35" />
      ))}
      {[[560,200],[200,300],[400,200],[1080,320],[880,220]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="3" fill={C} fillOpacity="0.18" opacity="0.3" />
      ))}
    </svg>
  )
}

function WavePattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1280 400" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,280 Q160,230 320,260 Q480,290 640,240 Q800,190 960,230 Q1120,270 1280,220" stroke={C} strokeWidth="1.5" opacity="0.10" fill="none" />
      <path d="M0,320 Q160,270 320,300 Q480,330 640,280 Q800,230 960,270 Q1120,310 1280,260" stroke={C} strokeWidth="1" opacity="0.07" fill="none" />
      <path d="M0,360 Q160,310 320,340 Q480,370 640,320 Q800,270 960,310 Q1120,350 1280,300" stroke={C} strokeWidth="0.8" opacity="0.06" fill="none" />
      <path d="M0,240 Q160,190 320,220 Q480,250 640,200 Q800,150 960,190 Q1120,230 1280,180" stroke={C} strokeWidth="1" opacity="0.08" fill="none" />
      <path d="M0,200 Q160,150 320,180 Q480,210 640,160 Q800,110 960,150 Q1120,190 1280,140" stroke={C} strokeWidth="0.7" opacity="0.06" fill="none" />
      <circle cx="15%"  cy="30%" r="90"  fill={C} fillOpacity="0.04" />
      <circle cx="85%"  cy="70%" r="120" fill={C} fillOpacity="0.04" />
    </svg>
  )
}

function DiagonalPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="pb-diag" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="40" stroke={C} strokeWidth="1" strokeOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pb-diag)" />
      <circle cx="20%"  cy="50%" r="200" fill={C} fillOpacity="0.04" />
      <circle cx="80%"  cy="40%" r="150" fill={C} fillOpacity="0.035" />
      <circle cx="55%"  cy="85%" r="100" fill={C} fillOpacity="0.03" />
    </svg>
  )
}

function OrbitsPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1280 400" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="150" stroke={C} strokeWidth="1" opacity="0.10" />
      <circle cx="200" cy="200" r="100" stroke={C} strokeWidth="1" opacity="0.10" />
      <circle cx="200" cy="200" r="55"  stroke={C} strokeWidth="1.5" opacity="0.14" />
      <circle cx="200" cy="200" r="22"  fill={C} fillOpacity="0.08" stroke={C} strokeWidth="1.5" opacity="0.18" />
      <ellipse cx="200" cy="200" rx="150" ry="55" stroke={C} strokeWidth="0.8" strokeDasharray="5 4" opacity="0.12" transform="rotate(-20 200 200)" />

      <circle cx="1080" cy="200" r="180" stroke={C} strokeWidth="1" opacity="0.09" />
      <circle cx="1080" cy="200" r="120" stroke={C} strokeWidth="1" opacity="0.09" />
      <circle cx="1080" cy="200" r="65"  stroke={C} strokeWidth="1.5" opacity="0.13" />
      <circle cx="1080" cy="200" r="25"  fill={C} fillOpacity="0.08" stroke={C} strokeWidth="1.5" opacity="0.17" />
      <ellipse cx="1080" cy="200" rx="180" ry="65" stroke={C} strokeWidth="0.8" strokeDasharray="6 4" opacity="0.10" transform="rotate(25 1080 200)" />

      {[[200,52],[344,170],[200,148],[56,200],[1080,22],[1228,170],[1080,78]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="6" fill={C} fillOpacity="0.25" />
      ))}
    </svg>
  )
}

function TopographyPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1280 400" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M-50,350 Q150,280 350,320 Q550,360 750,290 Q950,220 1150,270 Q1250,295 1330,260" stroke={C} strokeWidth="1.2" opacity="0.09" fill="none" />
      <path d="M-50,310 Q150,240 350,280 Q550,320 750,250 Q950,180 1150,230 Q1250,255 1330,220" stroke={C} strokeWidth="1" opacity="0.08" fill="none" />
      <path d="M-50,270 Q150,200 350,240 Q550,280 750,210 Q950,140 1150,190 Q1250,215 1330,180" stroke={C} strokeWidth="0.9" opacity="0.07" fill="none" />
      <path d="M-50,230 Q200,160 400,200 Q600,240 800,170 Q1000,100 1200,150 Q1260,170 1330,140" stroke={C} strokeWidth="0.8" opacity="0.06" fill="none" />
      <path d="M-50,190 Q200,120 400,160 Q600,200 800,130 Q1000,60  1200,110 Q1260,130 1330,100" stroke={C} strokeWidth="0.7" opacity="0.055" fill="none" />
      <path d="M-50,150 Q250,80  450,120 Q650,160 850,90  Q1050,20  1250,70  Q1270,77  1330,60"  stroke={C} strokeWidth="0.6" opacity="0.05" fill="none" />
      <defs>
        <pattern id="pb-topo-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={C} fillOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pb-topo-dots)" />
    </svg>
  )
}

const PATTERNS: Record<Variant, () => React.ReactElement> = {
  dots:       DotsPattern,
  globe:      GlobePattern,
  hexagons:   HexagonsPattern,
  circuit:    CircuitPattern,
  wave:       WavePattern,
  diagonal:   DiagonalPattern,
  orbits:     OrbitsPattern,
  topography: TopographyPattern,
}

export function PageBackground({ variant = 'dots', className = '' }: Props) {
  const Pattern = PATTERNS[variant]
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden ${className}`}
    >
      <Pattern />
    </span>
  )
}
