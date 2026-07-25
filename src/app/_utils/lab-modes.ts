export type LabMode = "activity" | "topic" | "social" | "similar";

export const LAB_MODE_OPTIONS: { id: LabMode; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "topic", label: "Topic" },
  { id: "social", label: "Social" },
  { id: "similar", label: "Similar" },
];

export const LAB_MODE_DISTANCE_HELP: Record<LabMode, string> = {
  activity:
    "距離軸: 同じ人物が両地点に言及・紐づく度合い（Jaccard）。近いほど活動圏が重なる。",
  topic:
    "距離軸: 紐づく人物のトピック分布のコサイン距離。言説プロファイルが近いほど中心寄り。",
  social:
    "距離軸: 地点に紐づく人物同士の共起の強さ。社会的つながりが強いほど近い。",
  similar:
    "距離軸: 紐づく人物の解説文トークン類似度。言説が似るほど近い。",
};

export const isLabMode = (value: string): value is LabMode =>
  LAB_MODE_OPTIONS.some((option) => option.id === value);
