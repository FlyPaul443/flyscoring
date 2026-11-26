export type MatchType = "club" | "state" | "registered";
export type ShootClass = "RF" | "CF" | "LG" | "HG";

export const CLASS_NAMES: Record<ShootClass, string> = {
  RF: "Rimfire",
  CF: "Centrefire",
  LG: "Light Gun",
  HG: "Heavy Gun",
};

export const MATCH_NAMES: Record<MatchType, string> = {
  club: "Club shoot",
  state: "State match",
  registered: "Registered match",
};

// Club shoots: RF or CF. State and Registered matches: RF, LG or HG.
export function classesFor(t: MatchType | undefined): ShootClass[] {
  return t === "state" || t === "registered" ? ["RF", "LG", "HG"] : ["RF", "CF"];
}

export const CLASS_ORDER: ShootClass[] = ["RF", "CF", "LG", "HG"];
export const className = (c: string) => `${c} · ${CLASS_NAMES[c as ShootClass] ?? c}`;
