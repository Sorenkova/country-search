export interface RawCountry {
  name: string;
  nativeName?: string;
  demonym?: string;
  flag?: string;
  flags?: { png?: string; svg?: string };
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  borders?: string[];
  languages?: { name: string }[];
  currencies?: { name: string; symbol?: string }[];
}

export interface Country {
  name: string;
  nativeName: string;
  demonym: string;
  flag: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  area: number;
  borders: string[];
  languages: string[];
  currencies: string[];
  description: string;
}
