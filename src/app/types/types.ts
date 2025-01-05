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
};
