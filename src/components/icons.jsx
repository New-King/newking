const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const IconSend = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const IconCopy = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconCheck = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconSpinner = ({ className }) => (
  <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="42 112"
    />
  </svg>
);

export const IconPlay = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

export const IconPause = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <rect x="5" y="4" width="4" height="16" />
    <rect x="15" y="4" width="4" height="16" />
  </svg>
);

export const IconArrowDown = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

export const IconGlobe = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const IconMenu = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const IconX = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconPhone = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const IconMail = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
);

export const IconBubble = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
  </svg>
);

export const IconLink = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
