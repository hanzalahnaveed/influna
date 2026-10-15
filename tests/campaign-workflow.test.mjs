import test from "node:test";
import assert from "node:assert/strict";
import { campaignCreatorTransitions, canTransitionCampaignCreator } from "../src/lib/campaign-workflow.mjs";

test("application lifecycle allows brand decisions and creator withdrawal only while Applied", () => {
    assert.equal(canTransitionCampaignCreator("accept_application", "Applied"), true);
    assert.equal(canTransitionCampaignCreator("decline_application", "Applied"), true);
    assert.equal(canTransitionCampaignCreator("withdraw_application", "Applied"), true);
    assert.equal(canTransitionCampaignCreator("withdraw_application", "Accepted"), false);
    assert.equal(canTransitionCampaignCreator("accept_application", "Withdrawn"), false);
});

test("invitation lifecycle requires a creator response after invitation", () => {
    assert.equal(canTransitionCampaignCreator("invite", "Suggested"), true);
    assert.equal(canTransitionCampaignCreator("accept", "Invited"), true);
    assert.equal(canTransitionCampaignCreator("decline", "Invited"), true);
    assert.equal(canTransitionCampaignCreator("accept", "Suggested"), false);
    assert.equal(canTransitionCampaignCreator("decline", "Accepted"), false);
});

test("legacy content review follows submit, revision, resubmit, approve, complete", () => {
    assert.equal(canTransitionCampaignCreator("submit_content", "Accepted"), true);
    assert.equal(canTransitionCampaignCreator("request_changes", "ContentSubmitted"), true);
    assert.equal(canTransitionCampaignCreator("submit_content", "ChangesRequested"), true);
    assert.equal(canTransitionCampaignCreator("approve_content", "ContentSubmitted"), true);
    assert.equal(canTransitionCampaignCreator("complete", "Approved"), true);
    assert.equal(canTransitionCampaignCreator("complete", "ContentSubmitted"), false);
    assert.equal(canTransitionCampaignCreator("approve_content", "ChangesRequested"), false);
});

test("terminal states cannot be cancelled or silently reopened", () => {
    for (const status of ["Completed", "Cancelled", "Declined", "Withdrawn"]) {
        assert.equal(canTransitionCampaignCreator("cancel", status), false, status);
        assert.equal(canTransitionCampaignCreator("accept", status), false, status);
        assert.equal(canTransitionCampaignCreator("submit_content", status), false, status);
    }
});

test("all transitions have valid source states and a destination", () => {
    assert.ok(Object.keys(campaignCreatorTransitions).length > 0);
    for (const [action, transition] of Object.entries(campaignCreatorTransitions)) {
        assert.ok(Array.isArray(transition.from) && transition.from.length > 0, action);
        assert.equal(typeof transition.to, "string", action);
    }
});
