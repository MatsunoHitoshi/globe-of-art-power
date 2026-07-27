import type { GeometryCollection, Topology } from "topojson-specification";

declare module "world-atlas/land-110m.json" {
  const value: Topology<{ land: GeometryCollection }>;
  export default value;
}
