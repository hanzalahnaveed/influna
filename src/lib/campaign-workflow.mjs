export const campaignCreatorTransitions = Object.freeze({
    invite: { from: ["Suggested"], to: "Invited" },
    accept_application: { from: ["Applied"], to: "Accepted" },
    decline_application: { from: ["Applied"], to: "Declined" },
    withdraw_application: { from: ["Applied"], to: "Withdrawn" },
    accept: { from: ["Invited"], to: "Accepted" },
    decline: { from: ["Invited"], to: "Declined" },
    submit_content: { from: ["Accepted", "ChangesRequested"], to: "ContentSubmitted" },
    request_changes: { from: ["ContentSubmitted"], to: "ChangesRequested" },
    approve_content: { from: ["ContentSubmitted"], to: "Approved" },
    complete: { from: ["Approved"], to: "Completed" },
    cancel: {
        from: ["Suggested", "Invited", "Accepted", "ContentSubmitted", "ChangesRequested", "Approved"],
        to: "Cancelled",
    },
});

export function canTransitionCampaignCreator(action, currentStatus) {
    const transition = campaignCreatorTransitions[action];
    return Boolean(transition && transition.from.includes(currentStatus));
}
