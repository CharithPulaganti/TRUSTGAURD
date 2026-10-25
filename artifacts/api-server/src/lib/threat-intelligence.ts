import type { AnalysisResult } from "@workspace/api-zod";
import { parseSafePublicUrl } from "./analysis";

const SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const LOOKUP_TIMEOUT_MS = 4_000;

type SafeBrowsingMatch = {
  threatType?: string;
};

type SafeBrowsingResponse = {
  matches?: SafeBrowsingMatch[];
};


function reputationState(
  result: AnalysisResult,
  status: AnalysisResult["external_intelligence"]["status"],
  message: string,
): AnalysisResult {
  const lookupCompleted =
    status === "checked_clean" || status === "threat_detected";

  return {
    ...result,
    risk_level:
      result.risk_score === 0
        ? status === "checked_clean"
          ? "LOW"
          : "UNKNOWN"
        : result.risk_level,
    external_intelligence: {
      provider_available: Boolean(
        process.env.GOOGLE_SAFE_BROWSING_API_KEY,
      ),
      status,
      message,
    },
    technical_analysis: {
      ...result.technical_analysis,
      engine: lookupCompleted
        ? `${result.technical_analysis.engine} + Google Safe Browsing`
        : result.technical_analysis.engine,
      semantic_analysis: lookupCompleted
        ? "URL structure reviewed locally; Google Safe Browsing reputation lookup completed. The destination was not opened."
        : result.technical_analysis.semantic_analysis,
      external_reputation: message,
    },
  };
}

/**
 * Queries only Google's fixed Safe Browsing endpoint. The submitted destination
 * is never requested by this server, and lookup errors do not discard local findings.
 */
export async function checkGoogleSafeBrowsing(
  result: AnalysisResult,
  submittedUrl: string,
): Promise<AnalysisResult> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    return reputationState(
      result,
      "unavailable",
      "Google Safe Browsing is not configured; no external lookup was performed.",
    );
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = parseSafePublicUrl(submittedUrl).toString();
  } catch {
    return reputationState(
      result,
      "lookup_failed",
      "The URL could not be sent for reputation checking. No destination was visited.",
    );
  }

  try {
    const endpoint = new URL(SAFE_BROWSING_ENDPOINT);
    endpoint.searchParams.set("key", apiKey);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "trustguard-ai", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url: normalizedUrl }],
        },
      }),
      redirect: "error",
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Safe Browsing returned a non-success response.");
    const data = await response.json() as SafeBrowsingResponse;
    const matches = Array.isArray(data.matches) ? data.matches : [];

    if (matches.length > 0) {
      const indicatorId = "external_threat_match";
      const label = "Google Safe Browsing threat match";
      const message = "Google Safe Browsing reported a known threat match. Avoid opening this URL; provider data can be incomplete or out of date.";
      const indicators = result.indicators.some((item) => item.id === indicatorId)
        ? result.indicators
        : [...result.indicators, {
          id: indicatorId,
          label,
          description: "Google Safe Browsing returned a threat-list match for this URL.",
          weight: 75,
          severity: "high" as const,
        }];
      const evidence = result.evidence.some((item) => item.indicator_id === indicatorId)
        ? result.evidence
        : [...result.evidence, {
          text: "Google Safe Browsing returned a threat-list match.",
          indicator_id: indicatorId,
          indicator_label: label,
        }];
      return {
        ...result,
        risk_score: Math.max(result.risk_score, 90),
        risk_level: "CRITICAL",
        category: "SUSPICIOUS_URL",
        indicators,
        evidence,
        explanation: `${result.explanation} An opted-in Google Safe Browsing lookup also returned a threat match.`,
        recommendations: [
          "Avoid opening this URL. If you already opened it, close the page and review the security of any accounts or device involved.",
          ...result.recommendations,
        ],
        external_intelligence: { provider_available: true, status: "threat_detected", message },
        
technical_analysis: {
  ...result.technical_analysis,
  engine: `${result.technical_analysis.engine} + Google Safe Browsing`,
  semantic_analysis:
    "URL structure reviewed locally; Google Safe Browsing reputation lookup completed and returned a threat match. The destination was not opened.",
  external_reputation: "Google Safe Browsing returned a threat-list match.",
},

      };
    }

    return reputationState(
      result,
      "checked_clean",
      "Google Safe Browsing returned no threat match. This is not a guarantee that the destination is safe.",
    );
  } catch {
    return reputationState(
      result,
      "lookup_failed",
      "Google Safe Browsing could not complete the lookup. Local findings are shown; no destination was visited.",
    );
  }
}
