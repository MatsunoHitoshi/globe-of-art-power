import { PLACE_GAZETTEER } from "../const/place-gazetteer";
import { TOPIC_DEFS, type TopicId } from "../const/topic-defs";
import type { AnalyzedPerson, AnalysisBundle } from "./blurb-analysis";
import type { LabMode } from "./lab-modes";

export type PlaceNodeKind = "city" | "institution" | "event" | "country";

export type PlaceNode = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: PlaceNodeKind;
  /** 紐づく人物 id（AnalyzedPerson.id） */
  personIds: string[];
};

export type ConceptualNeighbor = {
  place: PlaceNode;
  /** 0=同一/最近, 1=最遠 */
  conceptualDistance: number;
  /** 地理的方位角（ラジアン, -π..π）: 原点から見た地理方向 */
  bearing: number;
  /** 地理距離（km, 参考表示用） */
  geoDistanceKm: number;
  similarity: number;
};

export type RelationEdge = {
  fromId: string;
  toId: string;
  /** 0..1 正規化強度 */
  weight: number;
  /** 原点からのスポークか、近傍同士か */
  kind: "spoke" | "peer";
};

export type ConcentricMapModel = {
  origin: PlaceNode;
  year: number;
  mode: LabMode;
  neighbors: ConceptualNeighbor[];
  /** 同心円上に薄く描く関係エッジ */
  relationEdges: RelationEdge[];
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

export const geoDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const geoBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return Math.atan2(y, x);
};

const jaccardSets = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const v of a) {
    if (b.has(v)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

const cosineDistance = (a: number[], b: number[]) => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 1;
  const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return 1 - Math.max(-1, Math.min(1, sim));
};

const countryPlaceId = (code: string) => `country-${code}`;

export const buildPlaceNodes = (bundle: AnalysisBundle): PlaceNode[] => {
  const byId = new Map<string, PlaceNode>();

  const ensure = (node: PlaceNode) => {
    const existing = byId.get(node.id);
    if (!existing) {
      byId.set(node.id, { ...node, personIds: [...node.personIds] });
      return byId.get(node.id)!;
    }
    for (const id of node.personIds) {
      if (!existing.personIds.includes(id)) existing.personIds.push(id);
    }
    return existing;
  };

  for (const place of PLACE_GAZETTEER) {
    ensure({
      id: place.id,
      label: place.label,
      lat: place.lat,
      lng: place.lng,
      kind: place.kind,
      personIds: [],
    });
  }

  for (const person of bundle.people) {
    for (const place of person.places) {
      ensure({
        id: place.id,
        label: place.label,
        lat: place.lat,
        lng: place.lng,
        kind: place.kind,
        personIds: [person.id],
      });
    }
    if (person.countryCode && person.homeLat != null && person.homeLng != null) {
      ensure({
        id: countryPlaceId(person.countryCode),
        label: person.countryName ?? person.countryCode,
        lat: person.homeLat,
        lng: person.homeLng,
        kind: "country",
        personIds: [person.id],
      });
    }
  }

  return [...byId.values()].filter((node) => node.personIds.length > 0);
};

export const findPlaceNode = (
  nodes: PlaceNode[],
  placeId: string,
): PlaceNode | undefined => nodes.find((node) => node.id === placeId);

export const resolvePlaceIdFromLabel = (label: string): string | null => {
  const hit = PLACE_GAZETTEER.find((place) => place.label === label);
  return hit?.id ?? null;
};

const peopleById = (bundle: AnalysisBundle) =>
  new Map(bundle.people.map((person) => [person.id, person]));

const personSet = (node: PlaceNode) => new Set(node.personIds);

const topicVector = (
  personIds: string[],
  people: Map<string, AnalyzedPerson>,
): number[] => {
  const counts = TOPIC_DEFS.map(() => 0);
  for (const id of personIds) {
    const person = people.get(id);
    if (!person) continue;
    for (const topic of person.topics) {
      const idx = TOPIC_DEFS.findIndex((def) => def.id === topic);
      if (idx >= 0) counts[idx] = (counts[idx] ?? 0) + 1;
    }
  }
  return counts;
};

const socialAffinity = (
  a: PlaceNode,
  b: PlaceNode,
  socialEdges: AnalysisBundle["socialEdges"],
  people: Map<string, AnalyzedPerson>,
) => {
  const namesA = new Set(
    a.personIds
      .map((id) => people.get(id)?.name)
      .filter((name): name is string => Boolean(name)),
  );
  const namesB = new Set(
    b.personIds
      .map((id) => people.get(id)?.name)
      .filter((name): name is string => Boolean(name)),
  );
  let weight = 0;
  for (const edge of socialEdges) {
    const aToB = namesA.has(edge.from) && namesB.has(edge.to);
    const bToA = namesB.has(edge.from) && namesA.has(edge.to);
    if (aToB || bToA) weight += edge.weight;
  }
  return weight;
};

const similarAffinity = (
  a: PlaceNode,
  b: PlaceNode,
  people: Map<string, AnalyzedPerson>,
) => {
  const peopleA = a.personIds
    .map((id) => people.get(id))
    .filter((p): p is AnalyzedPerson => Boolean(p));
  const peopleB = b.personIds
    .map((id) => people.get(id))
    .filter((p): p is AnalyzedPerson => Boolean(p));
  if (peopleA.length === 0 || peopleB.length === 0) return 0;

  let total = 0;
  let count = 0;
  for (const pa of peopleA) {
    let best = 0;
    for (const pb of peopleB) {
      const score = jaccardSets(pa.tokens, pb.tokens);
      if (score > best) best = score;
    }
    total += best;
    count += 1;
  }
  return count === 0 ? 0 : total / count;
};

const pairSimilarity = (
  origin: PlaceNode,
  other: PlaceNode,
  mode: LabMode,
  bundle: AnalysisBundle,
  people: Map<string, AnalyzedPerson>,
) => {
  if (mode === "activity") {
    return jaccardSets(personSet(origin), personSet(other));
  }
  if (mode === "topic") {
    const distance = cosineDistance(
      topicVector(origin.personIds, people),
      topicVector(other.personIds, people),
    );
    return 1 - distance;
  }
  if (mode === "social") {
    return socialAffinity(origin, other, bundle.socialEdges, people);
  }
  return similarAffinity(origin, other, people);
};

const MODE_EDGE_THRESHOLD: Record<LabMode, number> = {
  activity: 0.04,
  topic: 0.55,
  social: 0.08,
  similar: 0.08,
};

const buildRelationEdges = (
  origin: PlaceNode,
  neighbors: ConceptualNeighbor[],
  mode: LabMode,
  bundle: AnalysisBundle,
  people: Map<string, AnalyzedPerson>,
): RelationEdge[] => {
  const threshold = MODE_EDGE_THRESHOLD[mode];
  const edges: RelationEdge[] = [];

  // 1) 原点 → 関係のある地点（スポーク）
  for (const neighbor of neighbors) {
    if (neighbor.similarity < threshold) continue;
    edges.push({
      fromId: origin.id,
      toId: neighbor.place.id,
      weight: neighbor.similarity,
      kind: "spoke",
    });
  }

  // 2) 近い地点同士のピアエッジ（上位近傍のみ・上位エッジに制限）
  const peerPool = neighbors.slice(0, 18);
  const peerRaw: { fromId: string; toId: string; similarity: number }[] = [];
  for (let i = 0; i < peerPool.length; i++) {
    for (let j = i + 1; j < peerPool.length; j++) {
      const a = peerPool[i]!;
      const b = peerPool[j]!;
      const similarity = pairSimilarity(
        a.place,
        b.place,
        mode,
        bundle,
        people,
      );
      const normalized =
        mode === "social"
          ? similarity // 後で max 正規化
          : Math.max(0, Math.min(1, similarity));
      if (mode !== "social" && normalized < threshold) continue;
      peerRaw.push({
        fromId: a.place.id,
        toId: b.place.id,
        similarity: normalized,
      });
    }
  }

  if (mode === "social" && peerRaw.length > 0) {
    const maxPeer = Math.max(...peerRaw.map((e) => e.similarity), 1e-9);
    for (const edge of peerRaw) {
      const weight = edge.similarity / maxPeer;
      if (weight < threshold) continue;
      edges.push({
        fromId: edge.fromId,
        toId: edge.toId,
        weight,
        kind: "peer",
      });
    }
  } else {
    for (const edge of peerRaw) {
      edges.push({
        fromId: edge.fromId,
        toId: edge.toId,
        weight: edge.similarity,
        kind: "peer",
      });
    }
  }

  // ピアは強い順に最大 24 本、スポークも最大 28 本に制限
  const spokes = edges
    .filter((e) => e.kind === "spoke")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 28);
  const peers = edges
    .filter((e) => e.kind === "peer")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 24);

  return [...spokes, ...peers];
};

export const buildConcentricMapModel = (
  bundle: AnalysisBundle,
  originId: string,
  mode: LabMode,
): ConcentricMapModel | null => {
  const nodes = buildPlaceNodes(bundle);
  const origin = findPlaceNode(nodes, originId);
  if (!origin) return null;

  const people = peopleById(bundle);
  const candidates = nodes.filter((node) => node.id !== origin.id);

  const raw = candidates.map((place) => {
    const similarity = pairSimilarity(origin, place, mode, bundle, people);
    return { place, similarity };
  });

  // social は生スコアのスケールが違うので max 正規化
  const maxSim = Math.max(...raw.map((row) => row.similarity), 1e-9);

  const neighbors: ConceptualNeighbor[] = raw
    .map(({ place, similarity }) => {
      const normalizedSim =
        mode === "social"
          ? similarity / maxSim
          : Math.max(0, Math.min(1, similarity));
      return {
        place,
        conceptualDistance: 1 - normalizedSim,
        bearing: geoBearing(origin.lat, origin.lng, place.lat, place.lng),
        geoDistanceKm: geoDistanceKm(
          origin.lat,
          origin.lng,
          place.lat,
          place.lng,
        ),
        similarity: normalizedSim,
      };
    })
    .sort((a, b) => a.conceptualDistance - b.conceptualDistance);

  return {
    origin,
    year: bundle.year,
    mode,
    neighbors,
    relationEdges: buildRelationEdges(origin, neighbors, mode, bundle, people),
  };
};

export const placeHref = (
  placeId: string,
  opts: { year: number; mode: LabMode; topic?: TopicId },
) => {
  const params = new URLSearchParams({
    year: String(opts.year),
    mode: opts.mode,
  });
  if (opts.topic) params.set("topic", opts.topic);
  return `/lab/place/${encodeURIComponent(placeId)}?${params.toString()}`;
};
