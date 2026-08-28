import { describe, expect, it } from "vitest";
import { demoToday } from "./fixtures";
import { attentionCount, campfireReady, categoryLabel, confidenceLabel, confirmCampfireMember, confirmedCampfireCount, experienceArtifactPayload, experiencePercent, intersectTags, matchPercent, observationCopy, openFollowUpCount, pendingCandidateCount, profileCompletion, rankMatches, relationshipPeerName, relativeTime, sortExperienceMatches, sortRelationships, splitProfileList, strongestReason } from "./logic";
import { demoRadar } from "./fixtures";
import { demoExperienceMatches } from "./fixtures";
import { demoCampfires, demoProfileStudio, demoRelationships, demoSession } from "./fixtures";

describe("KIN Today presentation", () => {
  it("counts only open attention items", () => expect(attentionCount(demoToday)).toBe(4));
  it("maps KIN categories", () => expect(categoryLabel("match_found")).toBe("MATCH"));
  it("renders runtime state", () => expect(observationCopy(demoToday)).toContain("AGENT ONLINE"));
  it("formats relative time", () => expect(relativeTime(0, 3_600_000)).toBe("1 小时前"));
});

describe("Ask the Room presentation", () => {
  it("bounds experience score for the result badge", () => expect(experiencePercent(1.2)).toBe(100));
  it("sorts experience matches without mutating the response", () => {
    const reversed = [...demoExperienceMatches].reverse();
    expect(sortExperienceMatches(reversed)[0].id).toBe("exp_match_ble");
    expect(reversed[0].id).not.toBe("exp_match_ble");
  });
  it("labels confidence instead of exposing a raw number", () => expect(confidenceLabel(0.92)).toBe("HIGH CONFIDENCE"));
});

describe("Builder Radar presentation", () => {
  it("converts a normalized score into a bounded percentage", () => {
    expect(matchPercent(0.864)).toBe(86);
    expect(matchPercent(1.4)).toBe(100);
  });
  it("ranks strongest matches first without mutating the source", () => {
    const reversed = [...demoRadar].reverse();
    expect(rankMatches(reversed)[0].id).toBe("mat_momo");
    expect(reversed[0].id).not.toBe("mat_momo");
  });
  it("keeps explanation-first matching", () => expect(strongestReason(demoRadar[0])).toContain("正在寻找"));
  it("finds case-insensitive capability intersections", () => expect(intersectTags(["ESP32", "Agent UX"], ["esp32", "Go"])).toEqual(["ESP32"]));
});

describe("Relationship Memory presentation", () => {
  it("counts only unfinished commitments", () => expect(openFollowUpCount(demoRelationships[0])).toBe(1));
  it("uses the authorized peer identity", () => expect(relationshipPeerName(demoRelationships[0], demoSession.agent_id)).toBe("Momo"));
  it("sorts newest memories first without mutating the source", () => {
    const reversed = [...demoRelationships].reverse();
    expect(sortRelationships(reversed)[0].id).toBe("rel_momo_01");
    expect(reversed[0].id).toBe("rel_lin_01");
  });
});

describe("Builder Profile and Context Studio", () => {
  it("calculates completion from the six public matching fields", () => expect(profileCompletion(demoProfileStudio.refreshContext.editable_fields)).toBe(100));
  it("normalizes comma, Chinese comma and newline lists", () => expect(splitProfileList("ESP32，Agent UX\nTiDB")).toEqual(["ESP32", "Agent UX", "TiDB"]));
  it("counts only candidates awaiting explicit review", () => expect(pendingCandidateCount(demoProfileStudio.candidates)).toBe(2));
  it("builds a publish payload without raw or source metadata", () => expect(Object.keys(experienceArtifactPayload(demoProfileStudio.candidates[0])).sort()).toEqual(["cause", "confidence", "context", "failed", "problem", "visibility", "worked"]));
});

describe("Campfire team proposal", () => {
  it("requires every member to confirm", () => expect(campfireReady(demoCampfires[0])).toBe(false));
  it("counts individual confirmations", () => expect(confirmedCampfireCount(demoCampfires[0])).toBe(1));
  it("forms only after the final member confirms", () => {
    const nova = confirmCampfireMember(demoCampfires[0], demoSession.agent_id);
    const formed = confirmCampfireMember(nova, "agent_kai");
    expect(campfireReady(formed)).toBe(true);
    expect(formed.proposal.status).toBe("formed");
    expect(demoCampfires[0].members[0].confirmation).toBe("pending");
  });
});
