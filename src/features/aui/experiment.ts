import type { ExperimentCondition } from "./types";

// Called only by the server page. The client receives a fixed condition as a prop.
export function getExperimentSettings() {
  const value = process.env.AUI_EXPERIMENT_CONDITION ?? "ADAPTIVE";
  if (value !== "ADAPTIVE" && value !== "NON_ADAPTIVE") throw new Error("AUI_EXPERIMENT_CONDITION harus ADAPTIVE atau NON_ADAPTIVE.");
  const condition: ExperimentCondition = value;
  const debugAllowed = process.env.NODE_ENV === "development" && process.env.AUI_RESEARCH_MODE !== "true" && condition === "ADAPTIVE";
  return { condition, debugAllowed };
}
