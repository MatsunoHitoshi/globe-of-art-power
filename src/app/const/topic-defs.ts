export type TopicId =
  | "biennial"
  | "market"
  | "museum"
  | "palestine"
  | "colonial"
  | "climate"
  | "gender"
  | "digital";

export type TopicDef = {
  id: TopicId;
  label: string;
  /** 短い語の誤検出を避けるため、単語境界やフレーズを優先 */
  patterns: RegExp[];
};

export const TOPIC_DEFS: TopicDef[] = [
  {
    id: "biennial",
    label: "Biennale / Documenta",
    patterns: [/\bbiennale\b/i, /\bbiennial\b/i, /\bdocumenta\b/i],
  },
  {
    id: "market",
    label: "Market / Fair / Gallery",
    patterns: [
      /\bart basel\b/i,
      /\bauction\b/i,
      /\bfair\b/i,
      /\bgallery\b/i,
      /\bgallerist\b/i,
      /\bdealer\b/i,
    ],
  },
  {
    id: "museum",
    label: "Museum / Institution",
    patterns: [
      /\bmuseum\b/i,
      /\bmoma\b/i,
      /\btate\b/i,
      /\bguggenheim\b/i,
      /\bwhitney\b/i,
      /\binstitution\b/i,
    ],
  },
  {
    id: "palestine",
    label: "Palestine / Gaza",
    patterns: [/\bpalestine\b/i, /\bpalestinian\b/i, /\bgaza\b/i],
  },
  {
    id: "colonial",
    label: "Colonial / Decolonial",
    patterns: [/\bcolonial\b/i, /\bdecolon/i, /\bimperial\b/i],
  },
  {
    id: "climate",
    label: "Climate / Ecology",
    patterns: [
      /\bclimate\b/i,
      /\becolog/i,
      /\benvironment/i,
      /\bwildfire\b/i,
    ],
  },
  {
    id: "gender",
    label: "Gender / Queer / Feminist",
    patterns: [
      /\bqueer\b/i,
      /\bfeminist\b/i,
      /\bfeminism\b/i,
      /\btransgender\b/i,
      /\bgender\b/i,
    ],
  },
  {
    id: "digital",
    label: "Digital / Online / NFT",
    patterns: [
      /\bdigital\b/i,
      /\bonline\b/i,
      /\bnft\b/i,
      /\bvirtual\b/i,
      /\bartificial intelligence\b/i,
      /\bmachine learning\b/i,
    ],
  },
];
