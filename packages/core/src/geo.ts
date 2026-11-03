import { Mode } from "./schema.js";

export const KERALA_CITIES: Record<string, string> = {
  // Thiruvananthapuram
  thiruvananthapuram: "Thiruvananthapuram",
  trivandrum: "Thiruvananthapuram",
  tvm: "Thiruvananthapuram",
  kazhakkoottam: "Thiruvananthapuram",
  technopark: "Thiruvananthapuram",

  // Ernakulam / Kochi
  kochi: "Kochi",
  cochin: "Kochi",
  ernakulam: "Kochi",
  kakkanad: "Kochi",
  infopark: "Kochi",
  kalamassery: "Kochi",
  angamaly: "Kochi",
  kaloor: "Kochi",
  kothamangalam: "Kochi",

  // Kozhikode
  kozhikode: "Kozhikode",
  calicut: "Kozhikode",

  // Thrissur
  thrissur: "Thrissur",
  trichur: "Thrissur",

  // Kannur
  kannur: "Kannur",
  cannapore: "Kannur",
  thalassery: "Kannur",

  // Kollam
  kollam: "Kollam",
  quilon: "Kollam",

  // Palakkad
  palakkad: "Palakkad",
  palghat: "Palakkad",

  // Kottayam
  kottayam: "Kottayam",
  pala: "Kottayam",
  changanassery: "Kottayam",

  // Alappuzha
  alappuzha: "Alappuzha",
  alleppey: "Alappuzha",
  cherthala: "Alappuzha",

  // Malappuram
  malappuram: "Malappuram",
  manjeri: "Malappuram",
  perinthalmanna: "Malappuram",

  // Kasaragod
  kasaragod: "Kasaragod",
  kanhangad: "Kasaragod",

  // Wayanad
  wayanad: "Wayanad",
  kalpetta: "Wayanad",

  // Idukki
  idukki: "Idukki",
  munnar: "Idukki",
  thodupuzha: "Idukki",

  // Pathanamthitta & Regional
  pathanamthitta: "Pathanamthitta",
  adivaram: "Pathanamthitta",
  adoor: "Pathanamthitta",
  thiruvalla: "Pathanamthitta",
  myladi: "Myladi",
};

export const NEARBY_CITIES: Record<string, string> = {
  bengaluru: "Bengaluru",
  bangalore: "Bengaluru",
  coimbatore: "Coimbatore",
  chennai: "Chennai",
  madras: "Chennai",
  mangaluru: "Mangaluru",
  mangalore: "Mangaluru",
  mysore: "Mysuru",
  mysuru: "Mysuru",
};

/**
 * Normalizes a city name against Kerala known locations.
 */
export function normalizeKeralaCity(city?: string | null): string | undefined {
  if (!city) return undefined;
  const cleaned = city.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, normalized] of Object.entries(KERALA_CITIES)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return normalized;
    }
  }
  return undefined;
}

/**
 * Normalizes a city name against nearby non-Kerala tech hubs.
 */
export function normalizeNearbyCity(city?: string | null): string | undefined {
  if (!city) return undefined;
  const cleaned = city.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, normalized] of Object.entries(NEARBY_CITIES)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return normalized;
    }
  }
  return undefined;
}

/**
 * Checks if a city, state, or free text references Kerala.
 */
export function isKerala(
  city?: string | null,
  state?: string | null,
  text?: string | null
): boolean {
  if (state && /kerala/i.test(state)) return true;
  if (city && normalizeKeralaCity(city)) return true;
  if (text) {
    if (/\bkerala\b/i.test(text)) return true;
    for (const key of Object.keys(KERALA_CITIES)) {
      const reg = new RegExp(`\\b${key}\\b`, "i");
      if (reg.test(text)) return true;
    }
  }
  return false;
}

/**
 * Checks if a city or text references nearby hubs (Bengaluru, Coimbatore, Chennai, Mangaluru).
 */
export function isNearby(
  city?: string | null,
  state?: string | null,
  text?: string | null
): boolean {
  if (city && normalizeNearbyCity(city)) return true;
  if (text) {
    for (const key of Object.keys(NEARBY_CITIES)) {
      const reg = new RegExp(`\\b${key}\\b`, "i");
      if (reg.test(text)) return true;
    }
  }
  return false;
}

/**
 * Priority Ranking:
 * 1. Offline/Hybrid in Kerala
 * 2. Online open to India/Kerala
 * 3. Offline/Hybrid Nearby (Bengaluru, Coimbatore, etc.)
 * 4. Other
 */
export function getGeoPriority(event: {
  mode: Mode;
  city?: string | null;
  state?: string | null;
  isNearby?: boolean;
}): number {
  const inKerala = isKerala(event.city, event.state);

  if (inKerala && (event.mode === "offline" || event.mode === "hybrid")) {
    return 1;
  }
  if (event.mode === "online") {
    return 2;
  }
  if (event.isNearby || isNearby(event.city, event.state)) {
    return 3;
  }
  return 4;
}
