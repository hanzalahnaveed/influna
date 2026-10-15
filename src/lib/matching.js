function normalizedList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    if (typeof value === "string") return value.split(/[,;|]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    return [];
}

function intersects(left, right) {
    const normalizedLeft = normalizedList(left);
    return normalizedLeft.some((item) => right.some((candidate) => item === candidate || item.includes(candidate) || candidate.includes(item)));
}

export function scoreCreatorForCampaign(campaign, creator) {
    const target = campaign.targetingCriteria ?? {};
    const platformDetails = campaign.platformDetails ?? {};
    const reasons = [];
    let score = 0;
    let possible = 0;

    const wantedCategories = normalizedList(target.campaign_interest ?? target.interests ?? target.categories);
    if (wantedCategories.length) {
        possible += 45;
        if (intersects(creator.categories, wantedCategories)) {
            score += 45;
            reasons.push("Creator categories match campaign interests.");
        } else reasons.push("Creator categories do not currently match the campaign interests.");
    }

    const wantedLocation = String(target.campaign_location ?? target.location ?? "").trim().toLowerCase();
    if (wantedLocation) {
        possible += 25;
        const creatorLocation = [creator.city, creator.country].filter(Boolean).join(" ").toLowerCase();
        if (creatorLocation.includes(wantedLocation)) {
            score += 25;
            reasons.push("Creator location matches the campaign location.");
        } else reasons.push("Creator location may not match the campaign location.");
    }

    const wantedLanguages = normalizedList(target.campaign_language ?? target.languages);
    if (wantedLanguages.length) {
        possible += 15;
        if (intersects(creator.languages, wantedLanguages)) {
            score += 15;
            reasons.push("Creator language matches campaign requirements.");
        } else reasons.push("Creator language does not currently match the requested language.");
    }

    const wantedPlatforms = normalizedList(platformDetails.campaign_platform ?? platformDetails.platforms);
    if (wantedPlatforms.length) {
        possible += 15;
        if (intersects(creator.socialAccounts.map((account) => account.platform), wantedPlatforms)) {
            score += 15;
            reasons.push("Creator has an account on a requested platform.");
        } else reasons.push("Creator does not have a listed account on a requested platform.");
    }

    return {
        match_score: possible ? Math.round((score / possible) * 100) : 0,
        match_reasons: reasons,
        score_type: "rule_based_v1",
        note: possible
            ? "Preliminary rule-based fit score. It is not a prediction of campaign performance."
            : "No supported targeting fields were provided, so this score is not meaningful yet.",
    };
}
