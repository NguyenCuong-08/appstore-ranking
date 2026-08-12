import type { ChartType } from "./types";

export const CHARTS: ChartType[] = ["top-free", "top-paid", "top-grossing"];

export const CHART_LABELS: Record<ChartType, string> = {
  "top-free": "Top Free",
  "top-paid": "Top Paid",
  "top-grossing": "Top Grossing",
};

export const DEFAULT_PINNED_COUNTRIES = ["us", "vn", "jp", "kr"];

export const GENRE_SLUGS: Record<string, number> = {
  games: 6014,
  business: 6000,
  weather: 6001,
  utilities: 6002,
  travel: 6003,
  sports: 6004,
  social: 6005,
  reference: 6006,
  productivity: 6007,
  "photo-video": 6008,
  news: 6009,
  navigation: 6010,
  music: 6011,
  lifestyle: 6012,
  "health-fitness": 6013,
  finance: 6015,
  entertainment: 6016,
  education: 6017,
  books: 6018,
  medical: 6020,
  magazines: 6021,
  catalogs: 6022,
  "food-drink": 6023,
  shopping: 6024,
  "developer-tools": 6026,
  "graphics-design": 6027,
};

export const GAME_SUBGENRE_SLUGS: Record<string, number> = {
  "games-action": 7001,
  "games-adventure": 7002,
  "games-arcade": 7003,
  "games-board": 7004,
  "games-card": 7005,
  "games-casino": 7006,
  "games-dice": 7007,
  "games-educational": 7008,
  "games-family": 7009,
  "games-kids": 7010,
  "games-music": 7011,
  "games-puzzle": 7012,
  "games-racing": 7013,
  "games-role": 7014,
  "games-simulation": 7015,
  "games-sports": 7016,
  "games-strategy": 7017,
  "games-trivia": 7018,
  "games-word": 7019,
};

export const CATEGORY_LABELS: Record<string, string> = {
  all: "All Categories",
  games: "Games",
  business: "Business",
  weather: "Weather",
  utilities: "Utilities",
  travel: "Travel",
  sports: "Sports",
  social: "Social Networking",
  reference: "Reference",
  productivity: "Productivity",
  "photo-video": "Photo & Video",
  news: "News",
  navigation: "Navigation",
  music: "Music",
  lifestyle: "Lifestyle",
  "health-fitness": "Health & Fitness",
  finance: "Finance",
  entertainment: "Entertainment",
  education: "Education",
  books: "Books",
  medical: "Medical",
  magazines: "Magazines & Newspapers",
  catalogs: "Catalogs",
  "food-drink": "Food & Drink",
  shopping: "Shopping",
  "developer-tools": "Developer Tools",
  "graphics-design": "Graphics & Design",
  "games-action": "Games > Action",
  "games-adventure": "Games > Adventure",
  "games-arcade": "Games > Arcade",
  "games-board": "Games > Board",
  "games-card": "Games > Card",
  "games-casino": "Games > Casino",
  "games-dice": "Games > Dice",
  "games-educational": "Games > Educational",
  "games-family": "Games > Family",
  "games-kids": "Games > Kids",
  "games-music": "Games > Music",
  "games-puzzle": "Games > Puzzle",
  "games-racing": "Games > Racing",
  "games-role": "Games > Role Playing",
  "games-simulation": "Games > Simulation",
  "games-sports": "Games > Sports",
  "games-strategy": "Games > Strategy",
  "games-trivia": "Games > Trivia",
  "games-word": "Games > Word",
};

export function resolveGenreId(category: string): number | undefined {
  if (!category || category === "all") return undefined;
  if (GENRE_SLUGS[category] !== undefined) return GENRE_SLUGS[category];
  if (GAME_SUBGENRE_SLUGS[category] !== undefined)
    return GAME_SUBGENRE_SLUGS[category];
  return undefined;
}

export const COUNTRY_NAMES: Record<string, string> = {
  ae: "United Arab Emirates", af: "Afghanistan", ag: "Antigua and Barbuda",
  ai: "Anguilla", al: "Albania", am: "Armenia", ao: "Angola", ar: "Argentina",
  at: "Austria", au: "Australia", az: "Azerbaijan",
  ba: "Bosnia and Herzegovina", bb: "Barbados", be: "Belgium", bf: "Burkina Faso", bg: "Bulgaria",
  bh: "Bahrain", bj: "Benin", bm: "Bermuda", bn: "Brunei", bo: "Bolivia",
  br: "Brazil", bs: "Bahamas", bt: "Bhutan", bw: "Botswana", by: "Belarus",
  bz: "Belize", ca: "Canada", cd: "Congo DR", cg: "Congo", ch: "Switzerland", ci: "Côte d'Ivoire", cl: "Chile",
  cm: "Cameroon", cn: "China", co: "Colombia", cr: "Costa Rica", cv: "Cape Verde",
  cy: "Cyprus", cz: "Czechia", de: "Germany", dk: "Denmark", dm: "Dominica",
  do: "Dominican Republic", dz: "Algeria", ec: "Ecuador", ee: "Estonia",
  eg: "Egypt", es: "Spain", fi: "Finland", fj: "Fiji", fm: "Micronesia",
  fr: "France", ga: "Gabon", gb: "United Kingdom", gd: "Grenada", ge: "Georgia",
  gh: "Ghana", gm: "Gambia", gr: "Greece", gt: "Guatemala", gw: "Guinea-Bissau",
  gy: "Guyana", hk: "Hong Kong", hn: "Honduras", hr: "Croatia",
  hu: "Hungary", id: "Indonesia", ie: "Ireland", il: "Israel", in: "India",
  iq: "Iraq", is: "Iceland", it: "Italy", jm: "Jamaica", jo: "Jordan",
  jp: "Japan", ke: "Kenya", kg: "Kyrgyzstan", kh: "Cambodia", kn: "Saint Kitts and Nevis",
  kr: "South Korea", kw: "Kuwait", ky: "Cayman Islands", kz: "Kazakhstan",
  la: "Laos", lb: "Lebanon", lc: "Saint Lucia", lk: "Sri Lanka", lr: "Liberia",
  lt: "Lithuania", lu: "Luxembourg", lv: "Latvia", ly: "Libya", ma: "Morocco",
  md: "Moldova", me: "Montenegro", mg: "Madagascar", mk: "North Macedonia",
  ml: "Mali", mm: "Myanmar", mn: "Mongolia", mo: "Macau", mr: "Mauritania",
  ms: "Montserrat", mt: "Malta", mu: "Mauritius", mv: "Maldives", mw: "Malawi",
  mx: "Mexico", my: "Malaysia", mz: "Mozambique", na: "Namibia", ne: "Niger",
  ng: "Nigeria", ni: "Nicaragua", nl: "Netherlands", no: "Norway", np: "Nepal",
  nr: "Nauru", nz: "New Zealand", om: "Oman", pa: "Panama", pe: "Peru",
  pg: "Papua New Guinea", ph: "Philippines", pk: "Pakistan", pl: "Poland",
  pt: "Portugal", pw: "Palau", py: "Paraguay", qa: "Qatar", ro: "Romania",
  rs: "Serbia", ru: "Russia", rw: "Rwanda", sa: "Saudi Arabia", sb: "Solomon Islands",
  sc: "Seychelles", se: "Sweden", sg: "Singapore", si: "Slovenia", sk: "Slovakia",
  sl: "Sierra Leone", sn: "Senegal", sr: "Suriname", st: "Sao Tome and Principe",
  sv: "El Salvador", sz: "Eswatini", tc: "Turks and Caicos", td: "Chad", th: "Thailand",
  tj: "Tajikistan", tm: "Turkmenistan", tn: "Tunisia", to: "Tonga", tr: "Turkey",
  tt: "Trinidad and Tobago", tw: "Taiwan", tz: "Tanzania", ua: "Ukraine",
  ug: "Uganda", us: "United States", uy: "Uruguay", uz: "Uzbekistan",
  vc: "Saint Vincent and the Grenadines", ve: "Venezuela", vg: "British Virgin Islands",
  vn: "Vietnam", vu: "Vanuatu", xk: "Kosovo", ye: "Yemen", za: "South Africa",
  zm: "Zambia", zw: "Zimbabwe",
};

export const COUNTRY_CODES = Object.keys(COUNTRY_NAMES);

// Nước không có App Store riêng → Apple RSS trả lỗi 400 hoặc empty, bỏ qua khi quét
export const COUNTRY_CODES_EXCLUDED: string[] = [
  "aw", "ht", "as", "sm", "vi", "bd", "ws", "ad",
];

export const SCAN_COUNTRY_CODES = COUNTRY_CODES.filter(
  (c) => !COUNTRY_CODES_EXCLUDED.includes(c)
);

// Những nước scan ưu tiên khi live-scan 1 app (trang chi tiết) để không phải
// gọi ~334 request một lúc (count*2 charts) dễ bị Apple throttle → mất dữ liệu,
// trang bị treo. Toàn bộ danh sách country vẫn được cron sync-ranks xử lý đủ.
export const PRIORITY_SCAN_COUNTRIES: string[] = [
  "us", "vn", "jp", "kr",
  "gb", "de", "fr", "ca",
  "au", "cn", "hk", "sg",
  "tw", "th", "id", "my",
  "ph", "in", "br", "mx",
  "ru", "it", "es", "nl",
  "pt",
];

export const COUNTRIES = COUNTRY_CODES.map((code) => ({
  code,
  name: COUNTRY_NAMES[code],
}));

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code.toUpperCase();
}
