import { isIP } from "node:net";
import { randomUUID } from "node:crypto";
import type {
  AnalysisResult,
  EvidenceItem,
  Indicator,
  AnalysisResultInputType,
} from "@workspace/api-zod";

type Rule = {
  id: string;
  label: string;
  description: string;
  weight: number;
  severity: Indicator["severity"];
  pattern: RegExp;
};

const rules: Rule[] = [
  { id: "authority_impersonation", label: "Authority impersonation", description: "The sender presents themselves as law enforcement, a regulator, or another official authority.", weight: 20, severity: "high", pattern: /\b(?:(?:i am|i'm|this is|we are|calling from|speaking from)\s+(?:a\s+|an\s+|the\s+)?(?:police|police officer|cbi|ed|enforcement directorate|customs|court|fbi|investigation bureau|cyber cell|cybercrime(?: officer)?|cyber crime(?: officer)?|investigating officer|government|bank officer)|(?:police|cbi|ed|enforcement directorate|customs|court|fbi|cyber cell|cybercrime|cyber crime)\s+(?:officer|department|unit|official))\b/i },
  { id: "criminal_accusation", label: "Criminal accusation", description: "The recipient is accused of a crime, investigation, or illegal activity.", weight: 15, severity: "high", pattern: /\b(?:you are|you've been|you have been|your (?:account|number|identity|aadhaar))\s+(?:is\s+)?(?:under investigation|accused|linked to|involved in|charged|implicated|flagged|used for|connected to)\b|\b(?:money laundering|drug trafficking|criminal case|illegal activity|terror financing)\b/i },
  { id: "legal_threat", label: "Legal threat", description: "The message threatens arrest, prosecution, detention, or immediate legal action.", weight: 15, severity: "high", pattern: /\b(?:you will be arrested|arrest warrant|face immediate arrest|put you in custody|police will come|legal action will be taken|prosecution will begin|your account will be frozen|court order|face prosecution|to avoid arrest|avoid being arrested|unless you (?:pay|comply|cooperate).{0,35}(?:arrest|custody)|(?:arrest|detain|take you into custody).{0,35}(?:unless|if you do not|if you fail)|disconnect.{0,35}(?:arrest|custody)|(?:arrest|custody).{0,35}(?:if you disconnect|if you do not comply))\b/i },
  { id: "isolation", label: "Isolation instruction", description: "The recipient is told not to disconnect or contact other people.", weight: 20, severity: "high", pattern: /\b(?:do not|don't|never|must not)\s+(?:disconnect|hang up|leave|contact|call|tell|speak to|message|discuss|inform|notify|visit the police|go to the police)\b|\b(?:stay on|keep this line|remain on)\s+(?:the\s+)?(?:call|video|line)\b/i },
  { id: "secrecy", label: "Secrecy pressure", description: "The recipient is pressured to keep the interaction secret.", weight: 10, severity: "medium", pattern: /\b(?:keep (?:this|the matter|our conversation|the case|the investigation) confidential|do not tell anyone|don't tell anyone|do not discuss (?:this|the) (?:case|matter|investigation) with anyone|do not inform (?:your family|your relatives|anyone)|do not contact (?:your family|your relatives|anyone)|keep this secret|under no circumstances.*(?:tell|share)|confidential investigation|do not share (?:this|the) (?:case|matter|investigation))\b/i },
  { id: "urgency", label: "Urgency pressure", description: "The message uses a short deadline or immediate action demand.", weight: 10, severity: "medium", pattern: /\b(?:immediately|right now|urgent(?:ly)?|today|by tonight|within (?:\d+|one|two|three|four|five|an?)\s*(?:minutes?|hours?|days?)|before (?:today|midnight|the deadline)|last chance|act now|time is running out)\b/i },
  { id: "financial_demand", label: "Financial demand", description: "The message asks for a transfer, payment, deposit, or fee under pressure.", weight: 20, severity: "high", pattern: /\b(?:transfer|send|pay|deposit|wire|remit)\b.{0,65}\b(?:money|funds|₹|rs\.?|inr|rupees?|account|wallet|verification|security deposit|fee)\b|\b(?:pay|transfer|send)\s+(?:₹|rs\.?|inr)?\s*[\d,]+\b|\b(?:security deposit|verification fee|refundable fee)\b/i },
  { id: "identity_pressure", label: "Identity verification pressure", description: "The message requests identity documents or sensitive personal details.", weight: 10, severity: "medium", pattern: /\b(?:share|send|provide|verify|confirm)\b.{0,55}\b(?:aadhaar|passport|pan card|social security|date of birth|identity (?:document|card)|personal details)\b/i },
  { id: "video_call_pressure", label: "Video-call pressure", description: "The sender pressures the recipient to stay on a video call or use a video-call app.", weight: 12, severity: "medium", pattern: /\b(?:video call|whatsapp video|skype|zoom call|camera on|keep your camera|digital arrest|stay on (?:the )?video call|remain on (?:the )?video call)\b/i },
  { id: "fake_warrant", label: "Unverified warrant or case claim", description: "A warrant, case number, or legal document is asserted without a verifiable source.", weight: 15, severity: "high", pattern: /\b(?:fake|digital|online|non[- ]?bailable|issued)\s+(?:arrest\s+)?warrant\b|\b(?:case|fir|complaint|warrant)\s+(?:number|no\.?)\s*[:#-]?\s*[a-z0-9/-]{3,}\b/i },
  { id: "credential_request", label: "Credential or authentication-code request", description: "The message asks for an OTP, PIN, password, or authentication code.", weight: 15, severity: "high", pattern: /\b(?:share|tell|send|read out|provide|confirm)\b.{0,50}\b(?:otp|one[- ]time password|pin|password|cvv|verification code|authentication code)\b|\b(?:otp|one[- ]time password|pin|password|cvv)\b.{0,40}\b(?:share|send|tell|provide|read out)\b/i },
  { id: "phishing_link", label: "Credential or account link", description: "The message includes a link paired with an account, login, or verification request.", weight: 20, severity: "high", pattern: /\b(?:verify|secure|unlock|restore|suspend|update)\b.{0,55}\b(?:account|bank|wallet|password|login|payment)\b|\b(?:click|open|visit)\b.{0,40}\b(?:link|url|below)\b/i },
  { id: "impersonation", label: "Organization impersonation", description: "The sender invokes a known organization while requesting action or information.", weight: 12, severity: "medium", pattern: /\b(?:bank|amazon|microsoft|google|apple|paytm|phonepe|support team|customer care)\b.{0,65}\b(?:verify|suspended|blocked|refund|payment|otp|password|account)\b/i },
  { id: "job_payment", label: "Job-related upfront payment", description: "A job or recruitment message asks for an upfront payment.", weight: 12, severity: "medium", pattern: /\b(?:job|recruit(?:er|ment)?|work from home|offer letter)\b.{0,80}\b(?:registration fee|training fee|deposit|payment|pay upfront)\b|\b(?:registration fee|training fee)\b.{0,80}\b(?:job|recruit|offer)\b/i },
  { id: "investment_pressure", label: "Investment return or pressure claim", description: "The message promises unusually high returns or pressures an investment.", weight: 15, severity: "high", pattern: /\b(?:guaranteed|risk[- ]free|assured)\s+(?:returns?|profit|income)\b|\b(?:double|triple)\s+your\s+money\b|\b(?:invest|investment)\b.{0,60}\b(?:immediately|today|guaranteed|secret|limited time)\b/i },
];

const educationalContext = /\b(?:article|news report|awareness|research|training|explains|explaining|warning about|how .* (?:scam|fraud)|scam tactics|fraud prevention|fictional|example of|example message)\b/i;
const directTargeting = /\b(?:you are|your account|your identity|you must|do not|don't|transfer|send me|pay now|call me|stay on this|reply now)\b/i;

function configuredWeight(rule: Rule): number {
  try {
    const overrides = JSON.parse(process.env.TRUSTGUARD_RULE_WEIGHTS ?? "{}") as Record<string, unknown>;
    const value = overrides[rule.id];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.min(40, Math.round(value)));
    }
  } catch {
    // Invalid optional configuration does not override the safe defaults.
  }
  return rule.weight;
}

function riskLevel(score: number): AnalysisResult["risk_level"] {
  const thresholds = { caution: 25, high: 50, critical: 75 };
  try {
    const custom = JSON.parse(process.env.TRUSTGUARD_RISK_THRESHOLDS ?? "{}") as Record<string, unknown>;
    for (const key of Object.keys(thresholds) as (keyof typeof thresholds)[]) {
      const value = key === "caution" ? custom.caution ?? custom.medium : custom[key];
      if (typeof value === "number" && Number.isInteger(value)) {
        thresholds[key] = Math.max(1, Math.min(100, value));
      }
    }
  } catch {
    // Use documented thresholds when optional JSON is invalid.
  }
  if (score >= thresholds.critical) return "CRITICAL";
  if (score >= thresholds.high) return "HIGH";
  if (score >= thresholds.caution) return "CAUTION";
  return "LOW";
}

function categoryFor(ids: string[], inputType: AnalysisResultInputType): string {
  if (ids.includes("financial_demand") && (ids.includes("authority_impersonation") || ids.includes("legal_threat"))) return "DIGITAL_ARREST_PATTERN";
  if (ids.includes("authority_impersonation")) return "AUTHORITY_IMPERSONATION";
  if (ids.includes("credential_request") || ids.includes("phishing_link")) return "PHISHING";
  if (ids.includes("job_payment")) return "JOB_SCAM";
  if (ids.includes("investment_pressure")) return "INVESTMENT_SCAM";
  if (ids.includes("financial_demand")) return "FINANCIAL_COERCION";
  if (ids.includes("impersonation")) return "IMPERSONATION";
  if (inputType === "url" || inputType === "qr") return ids.length > 0 ? "SUSPICIOUS_URL" : "INSUFFICIENT_EVIDENCE";
  return ids.length > 0 ? "SOCIAL_ENGINEERING" : "INSUFFICIENT_EVIDENCE";
}

function recommendations(ids: string[], inputType: AnalysisResultInputType): string[] {
  const items: string[] = [];
  if (ids.includes("financial_demand")) items.push("Do not transfer money based solely on an unsolicited demand.");
  if (ids.includes("credential_request")) items.push("Never share an OTP, PIN, password, CVV, or authentication code.");
  if (ids.includes("authority_impersonation") || ids.includes("fake_warrant")) items.push("Independently contact the claimed organization using contact details from its official website or paperwork.");
  if (ids.includes("isolation") || ids.includes("secrecy")) items.push("Contact someone you trust through a separate, known channel; legitimate help should not require secrecy or isolation.");
  if (ids.includes("urgency")) items.push("Pause before acting. A demand to act immediately is not proof that the claim is genuine.");
  if (inputType === "url" || ids.includes("phishing_link")) items.push("Do not sign in or enter payment details through a link in an unexpected message.");
  if (ids.includes("job_payment")) items.push("Verify a recruiter and employer independently before paying any recruitment or training fee.");
  if (ids.includes("investment_pressure")) items.push("Verify investment claims with an independent, regulated source; guaranteed high returns are a warning sign.");
  if (items.length === 0) items.push("No strong pattern was found, but automated analysis cannot verify who sent this content. Verify important requests independently.");
  items.push("Preserve the original message and relevant transaction records if you need to report the incident.");
  return [...new Set(items)];
}

export function analyzeText(text: string, inputType: AnalysisResultInputType = "text"): AnalysisResult {
  const normalized = text.replace(/\u0000/g, "").normalize("NFKC");
  const discussion = educationalContext.test(normalized) && !directTargeting.test(normalized);
  const indicators: Indicator[] = [];
  const evidence: EvidenceItem[] = [];

  for (const rule of rules) {
    if (discussion && ["authority_impersonation", "criminal_accusation", "legal_threat", "isolation", "secrecy", "urgency", "financial_demand", "fake_warrant", "video_call_pressure"].includes(rule.id)) continue;
    const match = rule.pattern.exec(normalized);
    if (!match) continue;
    const weight = configuredWeight(rule);
    if (weight === 0) continue;
    indicators.push({ id: rule.id, label: rule.label, description: rule.description, weight, severity: rule.severity });
    const quote = match[0].trim().slice(0, 300);
    if (quote) evidence.push({ text: quote, indicator_id: rule.id, indicator_label: rule.label });
  }

  const directnessBonus = indicators.length >= 3 && directTargeting.test(normalized) ? 10 : 0;
  const score = Math.min(100, indicators.reduce((sum, item) => sum + item.weight, 0) + directnessBonus);
  const ids = indicators.map((item) => item.id);
  const level = riskLevel(score);
  const confidence = evidence.length >= 3 && directTargeting.test(normalized) ? "STRONG" : evidence.length >= 1 ? "MODERATE" : "LIMITED";
  const chainLabels = [
    ["authority_impersonation", "Authority claim"],
    ["criminal_accusation", "Criminal accusation"],
    ["legal_threat", "Threat"],
    ["isolation", "Isolation"],
    ["urgency", "Urgency"],
    ["financial_demand", "Money demand"],
  ] as const;
  const attackChain = chainLabels.filter(([id]) => ids.includes(id)).map(([, label]) => label);
  let explanation = discussion
    ? "The text appears to discuss scam tactics rather than directly target the recipient. Discussion context reduced the risk assessment; review the content in context."
    : indicators.length
      ? `${indicators.length} risk indicator${indicators.length === 1 ? "" : "s"} matched. The assessment is based on explicit patterns in the supplied text, not a verified identity or legal finding.`
      : "No strong suspicious pattern was found in the supplied text. This does not verify the sender or prove the content is safe.";

  if (directnessBonus) explanation += " Multiple indicators are combined with direct instructions addressed to the recipient.";
  if (!normalized.trim()) explanation = "There was not enough text to assess.";

  return {
    analysis_id: randomUUID(),
    input_type: inputType,
    risk_score: score,
    risk_level: level,
    category: categoryFor(ids, inputType),
    evidence_quality: confidence,
    indicators,
    evidence,
    attack_chain: attackChain,
    explanation,
    recommendations: recommendations(ids, inputType),
    external_intelligence: { provider_available: false, status: "unavailable", message: "External reputation intelligence is unavailable; no external lookup was performed." },
    technical_analysis: { engine: "TrustGuard local weighted rules v1", semantic_analysis: discussion ? "Educational/discussion context detected; direct-targeting check applied." : "Context and phrase patterns evaluated locally; no LLM interpretation was used.", extracted_text_available: Boolean(normalized.trim()), external_reputation: "Not checked; the destination was not visited.", audio_transcription: "Not applicable." },
    extracted_text: inputType === "text" || inputType === "digital_arrest" ? normalized : null,
    disclaimer: "This automated assessment is informational, not an official law-enforcement, legal, or identity verification. A low score does not establish that content is safe.",
  };
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19));
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") || host.endsWith(".home.arpa")) return true;
  const ipVersion = isIP(host);
  if (ipVersion === 4) return isPrivateIpv4(host);
  if (ipVersion === 6) {
    const normalized = host.toLowerCase();
    if (normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized)) return true;
    const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIpv4(mapped[1]) : false;
  }
  return false;
}

export function parseSafePublicUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a complete URL beginning with http:// or https://.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http:// and https:// URLs are accepted.");
  if (url.username || url.password) throw new Error("URLs containing embedded usernames or passwords are not accepted.");
  if (isPrivateHost(url.hostname)) throw new Error("Local, private-network, and internal hostnames are blocked for safety.");
  return url;
}

export function analyzeUrl(input: string): AnalysisResult {
  const url = parseSafePublicUrl(input);
  const text = url.toString();
  const indicators: Indicator[] = [];
  const evidence: EvidenceItem[] = [];
  const add = (id: string, label: string, description: string, weight: number, severity: Indicator["severity"], quote: string) => {
    indicators.push({ id, label, description, weight, severity });
    evidence.push({ text: quote, indicator_id: id, indicator_label: label });
  };
  const host = url.hostname.toLowerCase();
  if (host.startsWith("xn--") || host.split(".").some((segment) => segment.startsWith("xn--"))) {
    add("internationalized_domain", "Internationalized domain", "The hostname uses punycode encoding. This can be legitimate, but can also make look-alike domains harder to recognize.", 8, "medium", host);
  }
  if (host.split(".").length > 4) add("excessive_subdomains", "Many subdomains", "The URL has several subdomain levels; check the registered domain carefully.", 6, "low", host);
  if (host.length > 55) add("long_hostname", "Unusually long hostname", "A long hostname can obscure the actual registered domain.", 6, "low", host);
  if (url.protocol === "http:") add("no_https", "Unencrypted HTTP", "The URL uses HTTP rather than HTTPS. This does not by itself prove malicious intent.", 8, "medium", `${url.protocol}//${host}`);
  if (/%[0-9a-f]{2}/i.test(url.pathname + url.search)) add("encoded_path", "Encoded path or query", "The URL includes percent-encoded characters that can hide or transform destination details.", 5, "low", url.pathname + url.search.slice(0, 90));
  if (url.search.length > 180) add("long_query", "Long query string", "The URL contains a long query string; review it before opening.", 5, "low", url.search.slice(0, 180));
  if (/\b(?:login|signin|verify|secure|account|wallet|payment|password|update)\b/i.test(url.pathname + url.search)) {
    add("sensitive_path", "Sensitive-action wording", "The path or query references a login, account, or payment action. This is a caution signal, not proof of a threat.", 8, "medium", (url.pathname + url.search).slice(0, 180));
  }
  const tld = host.split(".").at(-1) ?? "";
  if (["zip", "mov", "click", "country", "gq", "tk", "work"].includes(tld)) {
    add("uncommon_tld", "Uncommon top-level domain", "The top-level domain is sometimes used in deceptive links. It is not an authoritative reputation result.", 8, "medium", `.${tld}`);
  }
  const score = Math.min(100, indicators.reduce((sum, item) => sum + item.weight, 0));
  const providerAvailable = Boolean(process.env.GOOGLE_SAFE_BROWSING_API_KEY);
  const reputationStatus = providerAvailable ? "not_requested" : "unavailable";
  const level = score === 0 ? "UNKNOWN" : riskLevel(score);
  return {
    analysis_id: randomUUID(),
    input_type: "url",
    risk_score: score,
    risk_level: level,
    category: categoryFor(indicators.map((item) => item.id), "url"),
    evidence_quality: indicators.length >= 3 ? "MODERATE" : indicators.length ? "LIMITED" : "LIMITED",
    indicators,
    evidence,
    attack_chain: [],
    explanation: indicators.length
  ? `${indicators.length} structural caution signal${indicators.length === 1 ? "" : "s"} were found. The URL structure was analyzed locally. The destination was not opened or fetched.`
  : "No notable structural caution signal was found in the local URL analysis. The destination was not opened or fetched. This is not a safety guarantee.",
  recommendations: ["Do not enter passwords or payment details after following an unexpected link.", "If the link claims to come from an organization, navigate to its official site independently."],
    external_intelligence: {
      provider_available: providerAvailable,
      status: reputationStatus,
      message: providerAvailable
        ? "Not checked. The full URL is shared with Google Safe Browsing only if you explicitly opt in."
        : "Google Safe Browsing is not configured; no external lookup was performed.",
    },
    technical_analysis: {
      engine: "Local URL structure checks",
      semantic_analysis: "Hostname, protocol, subdomains, path, query, and encoding reviewed. No external request was made.",
      extracted_text_available: true,
      external_reputation: providerAvailable ? "Not checked; explicit opt-in required." : "Unavailable; destination not visited.",
      audio_transcription: "Not applicable.",
    },
    extracted_text: text,
    disclaimer: "URL structure alone cannot determine whether a site is malicious or safe. This is an informational assessment, not a reputation verdict.",
  };
}