import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeText, analyzeUrl, parseSafePublicUrl } from "./analysis.ts";

test("direct authority pressure combines into a high digital-arrest signal", () => {
  const result = analyzeText(
    "This is a CBI officer. You are under investigation for money laundering. Do not disconnect. Keep this confidential. Transfer ₹25,000 immediately to avoid arrest.",
    "digital_arrest",
  );
  assert.equal(result.category, "DIGITAL_ARREST_PATTERN");
  assert.equal(result.risk_level, "CRITICAL");
  assert.ok(result.indicators.some(({ id }) => id === "authority_impersonation"));
  assert.ok(result.indicators.some(({ id }) => id === "financial_demand"));
  assert.ok(result.evidence.length >= 4);
  assert.ok(result.recommendations.length > 0);
});

test("digital-arrest fee demand with arrest threat, secrecy, and urgency is high risk", () => {
  const result = analyzeText(
    "This is a cybercrime officer. Your Aadhaar is linked to an illegal account. Pay a police verification fee of ₹12,000 today to avoid arrest. Do not discuss this case with anyone.",
    "digital_arrest",
  );
  const ids = result.indicators.map(({ id }) => id);
  assert.equal(result.category, "DIGITAL_ARREST_PATTERN");
  assert.ok(["HIGH", "CRITICAL"].includes(result.risk_level), `unexpected risk level: ${result.risk_level} (${result.risk_score})`);
  for (const id of ["authority_impersonation", "criminal_accusation", "legal_threat", "financial_demand", "secrecy", "urgency"]) {
    assert.ok(ids.includes(id), `expected indicator ${id}; got ${ids.join(", ")}`);
  }
});

test("digital-arrest isolation and video-call pressure are detected", () => {
  const result = analyzeText(
    "I am a police officer. You are under investigation for an illegal account. Stay on the video call and do not tell your family. Transfer ₹45,000 now or you will be arrested.",
    "digital_arrest",
  );
  const ids = result.indicators.map(({ id }) => id);
  assert.equal(result.category, "DIGITAL_ARREST_PATTERN");
  assert.ok(["HIGH", "CRITICAL"].includes(result.risk_level));
  for (const id of ["authority_impersonation", "criminal_accusation", "legal_threat", "isolation", "financial_demand", "video_call_pressure"]) {
    assert.ok(ids.includes(id), `expected indicator ${id}; got ${ids.join(", ")}`);
  }
});

test("bank OTP and password threat is detected as phishing", () => {
  const result = analyzeText(
    "Your bank account will be suspended today. Send your OTP and password immediately to restore your account.",
  );
  const ids = result.indicators.map(({ id }) => id);
  assert.ok(["HIGH", "CRITICAL"].includes(result.risk_level));
  assert.ok(ids.includes("credential_request"));
  assert.ok(ids.includes("phishing_link"));
});

test("ordinary fee notice without coercion is not automatically high risk", () => {
  const result = analyzeText(
    "The college library renewal fee is ₹500. Please pay at the office during normal working hours.",
  );
  assert.ok(!["HIGH", "CRITICAL"].includes(result.risk_level), `unexpected risk level: ${result.risk_level} (${result.risk_score})`);
});

test("educational reporting about scams is not scored as a message targeting the reader", () => {
  const result = analyzeText(
    "This awareness article explains how scammers impersonate police. Learn to verify a claim independently.",
  );
  assert.equal(result.risk_score, 0);
  assert.equal(result.risk_level, "LOW");
  assert.equal(result.indicators.length, 0);
  assert.match(result.explanation, /discussion context/i);
});

test("ordinary neutral text does not trigger a suspicious-message score", () => {
  const result = analyzeText("The meeting is scheduled for 3 pm. Please confirm if you can attend.");
  assert.equal(result.risk_score, 0);
  assert.equal(result.category, "INSUFFICIENT_EVIDENCE");
});

test("URL inspection parses public HTTP(S) addresses without fetching them", () => {
  const parsed = parseSafePublicUrl("https://example.com/verify/account?session=abc");
  assert.equal(parsed.hostname, "example.com");
  const result = analyzeUrl(parsed.toString());
  assert.equal(result.input_type, "url");
  assert.ok(result.indicators.some(({ id }) => id === "sensitive_path"));
  assert.match(result.technical_analysis.semantic_analysis, /No external request/i);
});

test("local, private, credential-bearing and non-HTTP URL destinations are rejected", () => {
  for (const url of [
    "http://localhost/",
    "http://127.0.0.1/",
    "http://10.4.5.6/",
    "http://192.168.1.2/",
    "http://[::1]/",
    "https://user:pass@example.com/",
    "ftp://example.com/file",
  ]) {
    assert.throws(() => parseSafePublicUrl(url));
  }
});
