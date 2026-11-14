// Table 11, Krieglstein et al. (2023), DOI 10.1007/s10648-023-09738-0.
// English reproduced under CC BY 4.0; Indonesian draft supplied by the researcher.
// Reference material for pilot review only. Never replaces the main questionnaire.
import type { CanonicalCLTItemId } from "./clt";
export const CLT_BILINGUAL_VERSION = "table11-en-id-review-1";
export const CLT_ENGLISH: Record<CanonicalCLTItemId, string> = {
  ICL1: "The learning content was difficult to understand",
  ICL2: "The explanations of the learning content were difficult to understand",
  ICL3: "The learning contents were complex",
  ICL4: "The learning content included much complex information",
  ICL5: "Without prior knowledge, the information was not understandable",
  ECL1: "It was difficult to gain an overview of the structure of the learning material",
  ECL2: "The design of the learning material made it difficult to recognise links between individual information units",
  ECL3: "The design of the learning material was inconvenient",
  ECL4: "The design of the learning material made it difficult to find relevant information quickly",
  ECL5: "Because of the design of the learning material, I had the impression that I could not concentrate on the learning content",
  GCL1: "I actively reflected upon the learning content",
  GCL3: "I made an effort to understand the learning content",
  GCL5: "I achieved a comprehensive understanding of the learning content",
  GCL6: "I was able to expand my prior knowledge with the learning content",
  GCL7: "I can apply the knowledge that I acquired through the learning material quickly and accurately",
};
