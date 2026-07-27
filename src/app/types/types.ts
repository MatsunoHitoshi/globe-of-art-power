export type SelectOption = {
  id: number;
  name: string;
};

export type DataType = {
  path: string;
  category: string;
  lat: number;
  lng: number;
  country: string;
  name: string;
  rank: number;
  year: number;
  pos: number;
  posAreaAdjusted: number;
  /** Prinz (2022) Power Index を可視化スケールに合わせた値 */
  posPowerIndex: number;
  /** 生の Power Index (0 < P ≤ 1) */
  powerIndex: number;
  areaKm2: number;
  countryName: string;
  iconSrc: string;
};

export type View = {
  lat: number;
  lng: number;
  altitude: number;
};

export type CurrentControl = {
  view: View;
  year: SelectOption;
  visualizationMode?: VisualizationMode;
};

export type VisualizationMode = "hex" | "heatmap";

export type EvaluationMode = "total" | "areaAdjusted" | "powerIndex";
