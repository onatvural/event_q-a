// ─── Utility helpers for the attendee-facing Q&A pages ───

export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  const key = "qa_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateId();
    localStorage.setItem(key, id);
  }
  return id;
}

export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  { from: '#E8D5C4', to: '#C4A882' }, // Warm
  { from: '#C4D4E8', to: '#8AAAC4' }, // Blue
  { from: '#D4E8C4', to: '#82C4A8' }, // Green
  { from: '#E8C4D4', to: '#C482A8' }, // Pink
  { from: '#E8E4C4', to: '#C4BA82' }, // Gold
  { from: '#C4E8E4', to: '#82C4BA' }, // Teal
];

export function getAvatarGradient(index: number): { from: string; to: string } {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
}

export function hashGradient(str: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  const key = "qa_fingerprint";
  let fp = localStorage.getItem(key);
  if (fp) return fp;

  const signals = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(",") ?? "",
    screen.width + "x" + screen.height,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() ?? "",
    navigator.platform ?? "",
    (navigator as unknown as Record<string, boolean>).cookieEnabled ? "1" : "0",
    typeof (window as unknown as Record<string, unknown>).ontouchstart !== "undefined" ? "1" : "0",
    window.devicePixelRatio?.toString() ?? "",
  ];

  // Simple hash
  const raw = signals.join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h = ((h << 5) - h) + ch;
    h |= 0;
  }
  fp = "fp_" + Math.abs(h).toString(36);
  localStorage.setItem(key, fp);
  return fp;
}
