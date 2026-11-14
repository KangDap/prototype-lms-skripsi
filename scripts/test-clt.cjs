/* eslint-disable @typescript-eslint/no-require-imports -- Same in-memory TypeScript loader as the existing local tests. */
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { test } = require("node:test");
const assert = require("node:assert/strict");
Module._extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const { CLT_DEFINITION: definition, validateQuestionnaireDefinition, validateCLTAnswers, scoreCLT,
  questionnaireComplete, questionnaireUsable, simulatedCLTAnswers } = require("../src/features/research/clt.ts");

test("15 source IDs retain the five selected GCL items without renumbering", () => {
  validateQuestionnaireDefinition(definition);
  assert.equal(definition.items.length, 15);
  assert.deepEqual(definition.items.filter((item) => item.dimension === "GCL").map((item) => [item.id, item.sourceItem]),
    [["GCL1", 11], ["GCL3", 13], ["GCL5", 15], ["GCL6", 16], ["GCL7", 17]]);
  for (const dimension of ["ICL", "ECL", "GCL"]) assert.equal(definition.items.filter((item) => item.dimension === dimension).length, 5);
});
test("minimum, maximum, and mixed answers yield three separate means", () => {
  assert.deepEqual(scoreCLT(simulatedCLTAnswers(definition, "MIN"), definition), { ICL: 1, ECL: 1, GCL: 1 });
  assert.deepEqual(scoreCLT(simulatedCLTAnswers(definition, "MAX"), definition), { ICL: 9, ECL: 9, GCL: 9 });
  assert.deepEqual(scoreCLT(simulatedCLTAnswers(definition, "MIXED"), definition), { ICL: 3, ECL: 5, GCL: 7 });
});
test("means preserve fractional values without reversing items or summing dimensions", () => {
  const answers = simulatedCLTAnswers(definition, "MIN"); answers.ICL1 = 2; answers.ECL1 = 9;
  assert.deepEqual(scoreCLT(answers, definition), { ICL: 1.2, ECL: 2.6, GCL: 1 });
});
test("incomplete answers can be saved as draft but cannot be submitted", () => {
  assert.deepEqual(validateCLTAnswers({ GCL7: 9 }, definition, false), { GCL7: 9 });
  assert.throws(() => validateCLTAnswers({ GCL7: 9 }, definition));
  const answers = simulatedCLTAnswers(definition, "MIN"); delete answers.ECL5;
  assert.throws(() => scoreCLT(answers, definition));
});
test("server validation rejects out-of-range, fractional, string, and unknown values", () => {
  for (const value of [0, 10, 1.5, "5", null, NaN]) {
    assert.throws(() => validateCLTAnswers({ ...simulatedCLTAnswers(definition, "MIN"), ICL1: value }, definition));
  }
  for (const id of ["GCL2", "GCL4", "unexpected"]) {
    assert.throws(() => validateCLTAnswers({ [id]: 5 }, definition, false));
  }
  assert.throws(() => validateCLTAnswers([], definition, false));
});
test("complete draft wording is usable in TEST/PILOT, requires approval in MAIN", () => {
  assert.equal(questionnaireComplete(definition), true);
  assert.equal(questionnaireUsable(definition, "TEST"), true);
  assert.equal(questionnaireUsable(definition, "PILOT"), true);
  assert.equal(questionnaireUsable(definition, "MAIN"), false);
  assert.equal(questionnaireUsable({ ...definition, status: "APPROVED" }, "MAIN"), true);
  const empty = structuredClone(definition); empty.items[0].text = " ";
  assert.equal(questionnaireUsable(empty, "TEST"), false);
});
test("invalid source mapping and duplicate IDs are rejected", () => {
  const changed = structuredClone(definition); changed.items[14].sourceItem = 15;
  assert.throws(() => validateQuestionnaireDefinition(changed));
  const duplicate = structuredClone(definition); duplicate.items[14] = duplicate.items[13];
  assert.throws(() => validateQuestionnaireDefinition(duplicate));
});
test("historical sequential IDs retain their frozen source mapping", () => {
  const legacy = structuredClone(definition); delete legacy.itemIdScheme;
  legacy.items.filter((item) => item.dimension === "GCL").forEach((item, index) => { item.id = `GCL${index + 1}`; });
  validateQuestionnaireDefinition(legacy);
  assert.deepEqual(scoreCLT(simulatedCLTAnswers(legacy, "MIXED"), legacy), { ICL: 3, ECL: 5, GCL: 7 });
  assert.deepEqual(definition.items.filter((item) => item.dimension === "GCL").map((item) => item.id), ["GCL1", "GCL3", "GCL5", "GCL6", "GCL7"]);
});
