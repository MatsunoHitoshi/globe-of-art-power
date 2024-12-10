const countries = [
  { country: "US", lat: 39.8283, lon: -98.5795 },
  { country: "DE", lat: 51.1657, lon: 10.4515 },
  { country: "GB", lat: 54, lon: -2 },
  { country: "BR", lat: -14.235, lon: -51.9253 },
  { country: "CH", lat: 46.8182, lon: 8.2275 },
  { country: "IN", lat: 21, lon: 78 },
  { country: "PS", lat: 31.9522, lon: 35.2332 },
  { country: "SA", lat: 23.8859, lon: 45.0792 },
  { country: "CG", lat: -0.228, lon: 15.8277 },
  { country: "CN", lat: 35.8617, lon: 104.1954 },
  { country: "FR", lat: 46.6034, lon: 1.8883 },
  { country: "GH", lat: 7.9465, lon: -1.0232 },
  { country: "HK", lat: 22.3193, lon: 114.1694 },
  { country: "IT", lat: 41.8719, lon: 12.5674 },
  { country: "JP", lat: 36, lon: 138 },
  { country: "KR", lat: 36.5665, lon: 127.978 },
  { country: "SG", lat: 1.3521, lon: 103.8198 },
  { country: "AU", lat: -25.2744, lon: 133.7751 },
  { country: "BD", lat: 23.685, lon: 90.3563 },
  { country: "CL", lat: -35.6751, lon: -71.543 },
  { country: "CM", lat: 7.3697, lon: 12.3547 },
  { country: "CR", lat: 9.7489, lon: -83.7534 },
  { country: "EG", lat: 26.8206, lon: 30.8025 },
  { country: "ES", lat: 40.4637, lon: -3.7492 },
  { country: "HR", lat: 45.1, lon: 15.2 },
  { country: "ID", lat: -0.7893, lon: 113.9213 },
  { country: "LK", lat: 7.8731, lon: 80.7718 },
  { country: "CA", lat: 56.1304, lon: -106.3468 },
  { country: "LB", lat: 33.8547, lon: 35.8623 },
  { country: "MX", lat: 23.6345, lon: -102.5528 },
  { country: "NG", lat: 9.082, lon: 8.6753 },
  { country: "PE", lat: -9.19, lon: -75.0152 },
  { country: "QA", lat: 25.3548, lon: 51.1839 },
  { country: "TH", lat: 15.87, lon: 100.9925 },
  { country: "UA", lat: 48.3794, lon: 31.1656 },
  { country: "UAE", lat: 23.4241, lon: 53.8478 },
];

export const getCountryLocation = (code: string) => {
  return countries.find((data) => {
    return data.country === code;
  });
};
