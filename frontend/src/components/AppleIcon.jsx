export default function AppleIcon() {
  return (
    <div className="apple-icon" aria-hidden="true">
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M75 35 C 85 25, 95 30, 95 45 C 85 55, 75 50, 75 35"
          fill="var(--apple-leaf)"
          stroke="var(--ink)"
          strokeWidth="2"
        />
        <path
          d="M60 45 L 65 30"
          stroke="var(--apple-stem)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M60 105 C 30 105, 20 85, 20 65 C 20 45, 40 40, 60 45 C 80 40, 100 45, 100 65 C 100 85, 90 105, 60 105"
          fill="var(--apple-green)"
          stroke="var(--ink)"
          strokeWidth="3"
        />
        <ellipse
          cx="40"
          cy="60"
          rx="6"
          ry="10"
          fill="white"
          opacity="0.6"
          transform="rotate(20, 40, 60)"
        />
        <path
          d="M50 48 Q 60 55 70 48"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

