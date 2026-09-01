export default function Logo({ width = 40, height = 40 }: { width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      aria-label="Master Chef logo"
    >
      <circle cx="100" cy="100" r="88" fill="none" stroke="#e8a33d" strokeWidth="3" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#e8a33d" strokeWidth="1" />
      <path
        d="M 50 148 L 76 48 L 100 108 L 124 48 L 150 148"
        fill="none"
        stroke="#e8a33d"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 70 148 L 100 62 L 130 148"
        fill="none"
        stroke="#e8a33d"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="58" y1="148" x2="142" y2="148" stroke="#e8a33d" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
