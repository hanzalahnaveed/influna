function normalizedList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    if (typeof value === "string") return value.split(/[,;|]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    return [];
}

function intersects(left, right) {
    const normalizedLeft = normalizedList(left);
    return normalizedLeft.some((item) => right.some((candidate) => item === candidate || item.includes(candidate) || candidate.includes(item)));
}

function accountMetrics(creator) {
    return (creator.socialAccounts ?? []).map((account) => ({
        ...account,
        latestSnapshot: account.snapshots?.[0] ?? null,
        latestAudienceInsight: account.audienceInsights?.[0] ?? null,
    }));
}

function normalizedKey(value) {
    return String(value ?? "").toLowerCase().replace(/[\s\-–—_]/g, "");
}

function breakdownContains(breakdown, expected) {
    if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) return false;
    const expectedKey = normalizedKey(expected);
    return Object.entries(breakdown).some(([key, value]) =>
        normalizedKey(key) === expectedKey && Number(value) > 0
    );
}

export function scoreCreatorForCampaign(campaign, creator) {
    const target = campaign.targetingCriteria ?? {};
    const platformDetails = campaign.platformDetails ?? {};
    const accounts = accountMetrics(creator);
    const reasons = [];
    let score = 0;
    let possible = 0;
    const addFactor = (weight, matched, positive, negative) => {
        possible += weight;
        if (matched) {
            score += weight;
            reasons.push(positive);
        } else reasons.push(negative);
    };

    const wantedCategories = normalizedList(target.campaign_interest ?? target.interests ?? target.categories);
    if (wantedCategories.length) addFactor(35, intersects(creator.categories, wantedCategories),
        "Creator categories match campaign interests.", "Creator categories do not currently match the campaign interests.");

    const wantedLocation = String(target.campaign_location ?? target.location ?? "").trim().toLowerCase();
    if (wantedLocation) {
        const creatorLocation = [creator.city, creator.country].filter(Boolean).join(" ").toLowerCase();
        addFactor(20, creatorLocation.includes(wantedLocation),
            "Creator location matches the campaign location.", "Creator location may not match the campaign location.");
    }

    const wantedLanguages = normalizedList(target.campaign_language ?? target.languages);
    if (wantedLanguages.length) addFactor(10, intersects(creator.languages, wantedLanguages),
        "Creator language matches campaign requirements.", "Creator language does not currently match the requested language.");

    const wantedPlatforms = normalizedList(platformDetails.campaign_platform ?? platformDetails.platforms);
    if (wantedPlatforms.length) addFactor(15, intersects(accounts.map((account) => account.platform), wantedPlatforms),
        "Creator has an account on a requested platform.", "Creator does not have a listed account on a requested platform.");

    const followerValues = accounts.map((account) => account.latestSnapshot?.followerCount).filter((value) => Number.isFinite(value));
    const minFollowers = Number(target.min_followers);
    const maxFollowers = Number(target.max_followers);
    if (followerValues.length && (target.min_followers !== undefined && target.min_followers !== "" || target.max_followers !== undefined && target.max_followers !== "")) {
        const largestAccount = Math.max(...followerValues);
        const meetsMin = !Number.isFinite(minFollowers) || minFollowers <= 0 || largestAccount >= minFollowers;
        const meetsMax = !Number.isFinite(maxFollowers) || maxFollowers <= 0 || largestAccount <= maxFollowers;
        addFactor(10, meetsMin && meetsMax,
            "Recorded follower count fits the requested range.", "Recorded follower count falls outside the requested range.");
    } else if (target.min_followers || target.max_followers) {
        reasons.push("Follower-range fit could not be assessed because creator metrics are unavailable.");
    }

    const wantedAge = String(target.campaign_age_range ?? "").trim();
    if (wantedAge) {
        const ageInsights = accounts.map((account) => account.latestAudienceInsight?.ageBreakdown).filter((breakdown) => breakdown && typeof breakdown === "object" && Object.keys(breakdown).length > 0);
        if (ageInsights.length) addFactor(10, ageInsights.some((breakdown) => breakdownContains(breakdown, wantedAge)),
            "Recorded audience age breakdown includes the target age range.", "Recorded audience age breakdown does not show the target age range.");
        else reasons.push("Audience age fit could not be assessed because audience insights are unavailable.");
    }

    const wantedGender = String(target.campaign_gender ?? "").trim();
    if (wantedGender && wantedGender.toLowerCase() !== "all") {
        const genderInsights = accounts.map((account) => account.latestAudienceInsight?.genderBreakdown).filter((breakdown) => breakdown && typeof breakdown === "object" && Object.keys(breakdown).length > 0);
        if (genderInsights.length) addFactor(10, genderInsights.some((breakdown) => breakdownContains(breakdown, wantedGender)),
            "Recorded audience gender breakdown includes the target.", "Recorded audience gender breakdown does not show the target.");
        else reasons.push("Audience gender fit could not be assessed because audience insights are unavailable.");
    }

    const engagementValues = accounts.map((account) => account.latestSnapshot?.engagementRate).filter((value) => Number.isFinite(value));
    const minEngagement = Number(target.min_engagement_rate);
    if (target.min_engagement_rate !== undefined && target.min_engagement_rate !== "") {
        if (engagementValues.length) addFactor(10, Math.max(...engagementValues) >= minEngagement,
            "Recorded engagement rate meets the requested minimum.", "Recorded engagement rate is below the requested minimum.");
        else reasons.push("Engagement-rate fit could not be assessed because metrics are unavailable.");
    }

    if (accounts.some((account) => account.latestSnapshot?.dataSource === "creator_provided")) {
        reasons.push("Some account metrics are creator-provided and have not been independently verified.");
    }
    const availablePossible = possible;
    return {
        match_score: availablePossible ? Math.round((score / availablePossible) * 100) : 0,
        match_reasons: reasons,
        score_type: "rule_based_v2",
        note: availablePossible
            ? "Explainable profile-fit score based on available campaign criteria. Missing metric data is not scored as a mismatch; this is not a performance prediction."
            : "No supported targeting fields were provided, so this score is not meaningful yet.",
    };
}
