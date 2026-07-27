import { getCountryLocation, normalizeCountryCode } from "../const/country-code";
import { PLACE_GAZETTEER, type PlaceEntry } from "../const/place-gazetteer";
import { TOPIC_DEFS, type TopicId } from "../const/topic-defs";
import type { PowerYearData } from "./globe-data-organizer";

/** Lab ページで扱う解説文分析の年範囲 */
export const LAB_YEAR_START = 2015;
export const LAB_YEAR_END = 2025;

export const LAB_YEARS: number[] = Array.from(
  { length: LAB_YEAR_END - LAB_YEAR_START + 1 },
  (_, i) => LAB_YEAR_END - i,
);

export type MentionedPlace = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: PlaceEntry["kind"];
};

export type AnalyzedPerson = {
  id: string;
  name: string;
  year: number;
  rank: number;
  path: string;
  category: string;
  excerpt: string;
  content: string;
  countryCode: string | null;
  countryName: string | null;
  homeLat: number | null;
  homeLng: number | null;
  places: MentionedPlace[];
  topics: TopicId[];
  tokens: Set<string>;
};

export type ActivityArc = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  personName: string;
  placeLabel: string;
  color: string;
};

export type SocialArc = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  fromName: string;
  toName: string;
  weight: number;
  color: string;
};

export type TopicHeatPoint = {
  lat: number;
  lng: number;
  pos: number;
  placeLabel: string;
  topic: TopicId;
};

export type SimilarArc = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  fromName: string;
  toName: string;
  score: number;
  color: string;
};

export type AnalysisBundle = {
  year: number;
  people: AnalyzedPerson[];
  activityArcs: ActivityArc[];
  socialArcs: SocialArc[];
  similarArcs: SimilarArc[];
  topicHeatByTopic: Record<TopicId, TopicHeatPoint[]>;
  placeMentionCounts: { label: string; count: number }[];
  topicCounts: { id: TopicId; label: string; count: number }[];
  socialEdges: { from: string; to: string; weight: number }[];
};

const STOPWORDS = new Set(
  `a an the and or but if in on at to for of as is was were be been being with by from that this these those it its their his her they them we you your our not no into over after before while about through during without within between among under again further then once here there when where why how all each few more most other some such only own same so than too very can will just should now also has have had did do does doing may might must shall`.split(
    /\s+/,
  ),
);

const resolveHome = (nationalityName: string | null | undefined) => {
  if (!nationalityName) return null;
  const parts = nationalityName.split("-");
  const raw = parts[parts.length - 1] ?? "";
  if (!raw) return null;
  // 国際・不明コードは座標なし
  if (raw === "INT" || raw === "International") return null;
  return getCountryLocation(normalizeCountryCode(raw));
};

const extractPlaces = (content: string): MentionedPlace[] => {
  const found: MentionedPlace[] = [];
  const lower = content.toLowerCase();
  for (const place of PLACE_GAZETTEER) {
    const hit = place.aliases.some((alias) =>
      lower.includes(alias.toLowerCase()),
    );
    if (hit) {
      found.push({
        id: place.id,
        label: place.label,
        lat: place.lat,
        lng: place.lng,
        kind: place.kind,
      });
    }
  }
  return found;
};

const extractTopics = (content: string): TopicId[] => {
  return TOPIC_DEFS.filter((topic) =>
    topic.patterns.some((re) => re.test(content)),
  ).map((t) => t.id);
};

const tokenize = (content: string): Set<string> => {
  const tokens = content
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  return new Set(tokens);
};

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

/** 長い名前から先にマッチさせる（部分一致の誤爆を減らす） */
const findMentionedPeople = (
  content: string,
  selfName: string,
  roster: string[],
) => {
  const sorted = [...roster]
    .filter((n) => n !== selfName && n.length >= 5)
    .sort((a, b) => b.length - a.length);
  const hits: string[] = [];
  let remaining = content;
  for (const name of sorted) {
    if (remaining.includes(name)) {
      hits.push(name);
      remaining = remaining.split(name).join(" ");
    }
  }
  return hits;
};

const ACTIVITY_COLORS = [
  "#7dd3fc",
  "#a5b4fc",
  "#f9a8d4",
  "#86efac",
  "#fcd34d",
  "#fdba74",
];

export const analyzeYearBlurbs = (
  data: PowerYearData,
  year: number,
): AnalysisBundle => {
  const rawHits = data.results.flatMap((r) => r.hits);
  const roster = rawHits.map((h) => h.title);

  const people: AnalyzedPerson[] = rawHits.map((hit) => {
    const rank =
      hit.acf.artist_power_100.find((i) => i.edition.name === String(year))
        ?.place ?? 0;
    const home = resolveHome(hit.nationality?.name ?? null);
    const content = hit.content ?? "";
    return {
      id: `${year}-${hit.path}`,
      name: hit.title,
      year,
      rank,
      path: hit.path,
      category: hit.artist_category?.name ?? "",
      excerpt: hit.excerpt ?? "",
      content,
      countryCode: home?.code ?? null,
      countryName: home?.countryName ?? null,
      homeLat: home?.lat ?? null,
      homeLng: home?.lng ?? null,
      places: extractPlaces(content),
      topics: extractTopics(content),
      tokens: tokenize(content),
    };
  });

  const byName = new Map(people.map((p) => [p.name, p]));

  const activityArcs: ActivityArc[] = [];
  for (const person of people) {
    if (person.homeLat == null || person.homeLng == null) continue;
    person.places.forEach((place, idx) => {
      // 自国籍付近の都市はアークが短すぎるのでスキップしすぎないよう、同一点のみ除外
      if (
        Math.abs(person.homeLat! - place.lat) < 0.2 &&
        Math.abs(person.homeLng! - place.lng) < 0.2
      ) {
        return;
      }
      activityArcs.push({
        id: `${person.id}-${place.id}`,
        startLat: person.homeLat!,
        startLng: person.homeLng!,
        endLat: place.lat,
        endLng: place.lng,
        personName: person.name,
        placeLabel: place.label,
        color: ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]!,
      });
    });
  }

  const edgeMap = new Map<string, { from: string; to: string; weight: number }>();
  for (const person of people) {
    const mentioned = findMentionedPeople(person.content, person.name, roster);
    for (const other of mentioned) {
      const key = [person.name, other].sort().join("||");
      const existing = edgeMap.get(key);
      if (existing) existing.weight += 1;
      else edgeMap.set(key, { from: person.name, to: other, weight: 1 });
    }
  }
  const socialEdges = [...edgeMap.values()].sort((a, b) => b.weight - a.weight);

  const socialArcs: SocialArc[] = [];
  for (const edge of socialEdges) {
    const a = byName.get(edge.from);
    const b = byName.get(edge.to);
    if (!a || !b) continue;
    if (a.homeLat == null || a.homeLng == null || b.homeLat == null || b.homeLng == null) {
      continue;
    }
    socialArcs.push({
      id: `${edge.from}-${edge.to}`,
      startLat: a.homeLat,
      startLng: a.homeLng,
      endLat: b.homeLat,
      endLng: b.homeLng,
      fromName: edge.from,
      toName: edge.to,
      weight: edge.weight,
      color: "#f472b6",
    });
  }

  const topicHeatByTopic = {} as Record<TopicId, TopicHeatPoint[]>;
  for (const topic of TOPIC_DEFS) {
    const agg = new Map<string, TopicHeatPoint>();
    for (const person of people) {
      if (!person.topics.includes(topic.id)) continue;
      for (const place of person.places) {
        const key = place.id;
        const existing = agg.get(key);
        if (existing) existing.pos += 1;
        else {
          agg.set(key, {
            lat: place.lat,
            lng: place.lng,
            pos: 1,
            placeLabel: place.label,
            topic: topic.id,
          });
        }
      }
      // 言及都市が無い場合は国籍地点に落とす
      if (person.places.length === 0 && person.homeLat != null && person.homeLng != null) {
        const key = `home-${person.countryCode}`;
        const existing = agg.get(key);
        if (existing) existing.pos += 1;
        else {
          agg.set(key, {
            lat: person.homeLat,
            lng: person.homeLng,
            pos: 1,
            placeLabel: person.countryName ?? "Home",
            topic: topic.id,
          });
        }
      }
    }
    topicHeatByTopic[topic.id] = [...agg.values()];
  }

  // 類似アーク: Jaccard上位（同一国ペアは除外して「地理的に遠いが近い言説」を優先）
  const similarCandidates: SimilarArc[] = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i]!;
      const b = people[j]!;
      if (a.homeLat == null || a.homeLng == null || b.homeLat == null || b.homeLng == null) {
        continue;
      }
      const score = jaccard(a.tokens, b.tokens);
      if (score < 0.08) continue;
      similarCandidates.push({
        id: `${a.name}-${b.name}`,
        startLat: a.homeLat,
        startLng: a.homeLng,
        endLat: b.homeLat,
        endLng: b.homeLng,
        fromName: a.name,
        toName: b.name,
        score,
        color: "#34d399",
      });
    }
  }
  similarCandidates.sort((a, b) => b.score - a.score);
  const similarArcs = similarCandidates.slice(0, 40);

  const placeCount = new Map<string, number>();
  for (const person of people) {
    for (const place of person.places) {
      placeCount.set(place.label, (placeCount.get(place.label) ?? 0) + 1);
    }
  }
  const placeMentionCounts = [...placeCount.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const topicCounts = TOPIC_DEFS.map((t) => ({
    id: t.id,
    label: t.label,
    count: people.filter((p) => p.topics.includes(t.id)).length,
  })).sort((a, b) => b.count - a.count);

  return {
    year,
    people,
    activityArcs,
    socialArcs,
    similarArcs,
    topicHeatByTopic,
    placeMentionCounts,
    topicCounts,
    socialEdges,
  };
};
