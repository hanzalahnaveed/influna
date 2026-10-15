function normalizedList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
    if (typeof value === "string") return value.split(/[,;|]/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    return [];
}

function normalizedKey(value) {
    return String(value ?? "").toLowerCase().replace(/[\s\-–—_]/g, "");
}

function intersects(left, right) {
    const normalizedLeft = normalizedList(left);
    const normalizedRight = normalizedList(right);
    return normalizedLeft.some((item) => normalizedRight.some((candidate) =>
        item === candidate || item.includes(candidate) || candidate.includes(item)
    ));
}

function breakdownShare(breakdown, expected) {
    if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) return null;
    const wanted = normalizedKey(expected);
    const entry = Object.entries(breakdown).find(([key]) => normalizedKey(key) === wanted);
    if (!entry) return 0;
    const value = Number(entry[1]);
    if (!Number.isFinite(value)) return 0;
    // Audience APIs commonly represent shares as either 0..1 or 0..100.
    return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));
}

function accountMetrics(creator) {
    return (creator.socialAccounts ?? []).map((account) => ({
        ...account,
        latestSnapshot: account.snapshots?.[0] ?? null,
        latestAudienceInsight: account.audienceInsights?.[0] ?? null,
    }));
}

function textContainsAny(text, terms) {
    const haystack = String(text ?? "").toLowerCase();
    return terms.some((term) => term.length > 2 && haystack.includes(term));
}

function objectiveTerms(objective, description) {
    const text = [objective, description].filter(Boolean).join(" ").toLowerCase();
    const groups = [
        { terms: ["awareness", "reach", "visibility", "recognition"], label: "awareness" },
        { terms: ["engagement", "community", "conversation", "interaction"], label: "engagement" },
        { terms: ["sales", "conversion", "purchase", "revenue", "orders"], label: "sales and conversions" },
        { terms: ["traffic", "clicks", "website", "visits"], label: "website traffic" },
        { terms: ["launch", "new product", "product introduction"], label: "product launch" },
        { terms: ["content", "ugc", "user generated"], label: "content creation" },
        { terms: ["leads", "lead generation", "signups", "registrations"], label: "lead generation" },
    ];
    return groups.filter((group) => group.terms.some((term) => text.includes(term)));
}

function classifyScore(score, confidence) {
    if (confidence < 30) return { tier: "insufficient_data", label: "More data needed" };
    if (score >= 80) return { tier: "strong_fit", label: "Strong profile fit" };
    if (score >= 60) return { tier: "promising_fit", label: "Promising fit" };
    return { tier: "limited_fit", label: "Limited profile fit" };
}

export function scoreCreatorForCampaign(campaign, creator) {
    const target = campaign.targetingCriteria ?? {};
    const platformDetails = campaign.platformDetails ?? {};
    const campaignDetails = campaign.campaignDetails ?? {};
    const accounts = accountMetrics(creator);
    const reasons = [];
    const factors = [];
    const missingData = [];
    let weightedScore = 0;
    let evaluatedWeight = 0;
    let potentialWeight = 0;

    const addFactor = ({ key, label, weight, value, reason, unavailable }) => {
        potentialWeight += weight;
        if (value === null || value === undefined) {
            if (unavailable) missingData.push(unavailable);
            return;
        }
        const normalized = Math.max(0, Math.min(1, value));
        evaluatedWeight += weight;
        weightedScore += normalized * weight;
        factors.push({ key, label, weight, score: Math.round(normalized * 100) });
        if (reason) reasons.push(reason);
    };

    const wantedCategories = normalizedList(target.campaign_interest ?? target.interests ?? target.categories ?? platformDetails.campaign_genere);
    if (wantedCategories.length) {
        const matched = intersects(creator.categories, wantedCategories);
        addFactor({
            key: "category_alignment", label: "Category alignment", weight: 25, value: matched ? 1 : 0,
            reason: matched ? "Creator categories align with the campaign interests." : "Listed creator categories do not currently align with the campaign interests.",
        });
    }

    const objective = String(campaignDetails.campaign_objective ?? "").trim();
    const description = String(campaignDetails.campaign_description ?? "").trim();
    const objectiveGroups = objectiveTerms(objective, description);
    if (objectiveGroups.length) {
        const terms = objectiveGroups.flatMap((group) => group.terms);
        const creatorText = [creator.bio, ...(creator.categories ?? [])].filter(Boolean).join(" ");
        const matched = textContainsAny(creatorText, terms);
        addFactor({
            key: "objective_alignment", label: "Objective/content alignment", weight: 15, value: matched ? 1 : 0,
            reason: matched
                ? "Creator bio or categories contain signals related to the campaign objective."
                : "Campaign objective is set, but creator profile text does not yet show a clear related signal.",
        });
    } else if (objective || description) {
        missingData.push("Objective alignment could not be categorized from the current campaign brief.");
    }

    const wantedLocation = String(target.campaign_location ?? target.location ?? "").trim().toLowerCase();
    if (wantedLocation) {
        const creatorLocation = [creator.city, creator.country].filter(Boolean).join(" ").toLowerCase();
        const locationAvailable = Boolean(creator.city || creator.country);
        addFactor({
            key: "creator_location", label: "Creator location", weight: 10,
            value: locationAvailable ? (creatorLocation.includes(wantedLocation) ? 1 : 0) : null,
            reason: locationAvailable ? (creatorLocation.includes(wantedLocation)
                ? "Creator location matches the requested campaign location."
                : "Creator location does not exactly match the requested campaign location.") : null,
            unavailable: "Creator location is not provided.",
        });
    }

    const wantedLanguages = normalizedList(target.campaign_language ?? target.languages ?? platformDetails.campaign_language);
    if (wantedLanguages.length) {
        const hasLanguages = Array.isArray(creator.languages) && creator.languages.length > 0;
        const matched = intersects(creator.languages, wantedLanguages);
        addFactor({
            key: "language_alignment", label: "Language alignment", weight: 10,
            value: hasLanguages ? (matched ? 1 : 0) : null,
            reason: hasLanguages ? (matched ? "Creator lists a requested campaign language." : "Creator has not listed one of the requested languages.") : null,
            unavailable: "Creator language information is missing.",
        });
    }

    const wantedPlatforms = normalizedList(platformDetails.campaign_platform ?? platformDetails.platforms);
    if (wantedPlatforms.length) {
        const availablePlatforms = accounts.map((account) => account.platform);
        addFactor({
            key: "platform_alignment", label: "Platform alignment", weight: 15,
            value: accounts.length ? (intersects(availablePlatforms, wantedPlatforms) ? 1 : 0) : null,
            reason: accounts.length ? (intersects(availablePlatforms, wantedPlatforms)
                ? "Creator has a listed account on a requested platform."
                : "No listed creator account matches the requested platforms.") : null,
            unavailable: "Creator has no listed social accounts.",
        });
    }

    const minFollowers = target.min_followers === undefined || target.min_followers === "" ? null : Number(target.min_followers);
    const maxFollowers = target.max_followers === undefined || target.max_followers === "" ? null : Number(target.max_followers);
    if ((minFollowers !== null && Number.isFinite(minFollowers)) || (maxFollowers !== null && Number.isFinite(maxFollowers))) {
        const followerValues = accounts.map((account) => account.latestSnapshot?.followerCount).filter((value) => Number.isFinite(value));
        if (followerValues.length) {
            const fits = followerValues.some((count) =>
                (minFollowers === null || !Number.isFinite(minFollowers) || minFollowers <= 0 || count >= minFollowers) &&
                (maxFollowers === null || !Number.isFinite(maxFollowers) || maxFollowers <= 0 || count <= maxFollowers)
            );
            addFactor({
                key: "follower_range", label: "Follower range", weight: 10, value: fits ? 1 : 0,
                reason: fits ? "A recorded follower count fits the requested range." : "Recorded follower counts fall outside the requested range.",
            });
        } else {
            missingData.push("Follower range cannot be assessed because recent follower counts are unavailable.");
        }
    }

    const minEngagement = target.min_engagement_rate === undefined || target.min_engagement_rate === "" ? null : Number(target.min_engagement_rate);
    if (minEngagement !== null && Number.isFinite(minEngagement)) {
        const values = accounts.map((account) => account.latestSnapshot?.engagementRate).filter((value) => Number.isFinite(value));
        if (values.length) {
            const best = Math.max(...values);
            const fit = minEngagement <= 0 ? 1 : Math.min(1, best / minEngagement);
            addFactor({
                key: "engagement_rate", label: "Engagement rate", weight: 10, value: fit,
                reason: best >= minEngagement
                    ? "Recorded engagement rate meets the requested minimum."
                    : "Recorded engagement rate is below the requested minimum.",
            });
        } else {
            addFactor({ key: "engagement_rate", label: "Engagement rate", weight: 10, value: null, unavailable: "Engagement-rate fit cannot be assessed because recent metrics are unavailable." });
        }
    }

    const wantedAge = String(target.campaign_age_range ?? "").trim();
    if (wantedAge) {
        const ageBreakdowns = accounts.map((account) => account.latestAudienceInsight?.ageBreakdown).filter(Boolean);
        if (ageBreakdowns.length) {
            const shares = ageBreakdowns.map((breakdown) => breakdownShare(breakdown, wantedAge)).filter((value) => value !== null);
            if (shares.length) {
                const bestShare = Math.max(...shares);
                addFactor({
                    key: "audience_age", label: "Audience age", weight: 10, value: bestShare / 100,
                    reason: bestShare > 0 ? "Recorded audience age data includes the requested age segment." : "Recorded audience age data does not include the requested age segment.",
                });
            } else {
                addFactor({ key: "audience_age", label: "Audience age", weight: 10, value: null, unavailable: "Audience age breakdown is not in a recognized format." });
            }
        } else {
            addFactor({ key: "audience_age", label: "Audience age", weight: 10, value: null, unavailable: "Audience age fit cannot be assessed because audience insights are unavailable." });
        }
    }

    const wantedGender = String(target.campaign_gender ?? "").trim();
    if (wantedGender && wantedGender.toLowerCase() !== "all") {
        const genderBreakdowns = accounts.map((account) => account.latestAudienceInsight?.genderBreakdown).filter(Boolean);
        if (genderBreakdowns.length) {
            const shares = genderBreakdowns.map((breakdown) => breakdownShare(breakdown, wantedGender)).filter((value) => value !== null);
            if (shares.length) {
                const bestShare = Math.max(...shares);
                addFactor({
                    key: "audience_gender", label: "Audience gender", weight: 10, value: bestShare / 100,
                    reason: bestShare > 0 ? "Recorded audience data includes the requested gender segment." : "Recorded audience data does not include the requested gender segment.",
                });
            } else {
                addFactor({ key: "audience_gender", label: "Audience gender", weight: 10, value: null, unavailable: "Audience gender breakdown is not in a recognized format." });
            }
        } else {
            addFactor({ key: "audience_gender", label: "Audience gender", weight: 10, value: null, unavailable: "Audience gender fit cannot be assessed because audience insights are unavailable." });
        }
    }

    const wantedAudienceCountry = String(target.audience_country ?? target.target_audience_country ?? "").trim();
    if (wantedAudienceCountry) {
        const countryBreakdowns = accounts.map((account) => account.latestAudienceInsight?.countryBreakdown).filter(Boolean);
        if (countryBreakdowns.length) {
            const shares = countryBreakdowns.map((breakdown) => breakdownShare(breakdown, wantedAudienceCountry)).filter((value) => value !== null);
            if (shares.length) {
                const bestShare = Math.max(...shares);
                addFactor({
                    key: "audience_geography", label: "Audience geography", weight: 15, value: bestShare / 100,
                    reason: bestShare >= 25 ? "Recorded audience geography shows a meaningful share in the target market." : "Recorded audience geography shows limited share in the target market.",
                });
            } else {
                addFactor({ key: "audience_geography", label: "Audience geography", weight: 15, value: null, unavailable: "Audience geography breakdown is not in a recognized format." });
            }
        } else {
            addFactor({ key: "audience_geography", label: "Audience geography", weight: 15, value: null, unavailable: "Audience geography fit cannot be assessed because audience insights are unavailable." });
        }
    }

    const metricSources = accounts.map((account) => account.latestSnapshot?.dataSource).filter(Boolean);
    if (metricSources.includes("creator_provided")) {
        reasons.push("Some account metrics are creator-provided and have not been independently verified.");
    }
    if (metricSources.includes("synthetic_dataset")) {
        reasons.push("Synthetic benchmark metrics are included; these fictional records are for development and evaluation, not real creator assessment.");
    }
    if (metricSources.includes("public_dataset")) {
        reasons.push("Public-dataset reference metrics are included and have not been independently verified as live platform data.");
    }
    if (metricSources.some((source) => !["creator_provided", "synthetic_dataset", "public_dataset"].includes(source))) {
        reasons.push("At least one metric has another recorded source; review its provenance and verification status.");
    }
    if (accounts.some((account) => account.verificationStatus !== "VERIFIED" && !account.verifiedAt)) {
        missingData.push("Some social accounts are not verified.");
    }
    if (!creator.bio) missingData.push("Creator bio is not provided.");
    if (!creator.categories?.length) missingData.push("Creator categories are not provided.");

    const score = evaluatedWeight ? Math.round((weightedScore / evaluatedWeight) * 100) : 0;
    const criteriaCoverage = potentialWeight ? (evaluatedWeight / potentialWeight) : 0;

    // Data quality affects confidence, never the underlying profile-fit score.
    // Missing profile fields reduce confidence modestly rather than counting as mismatches.
    const completenessChecks = [
        Boolean(creator.bio?.trim()),
        Boolean(creator.categories?.length),
        Boolean(creator.country?.trim() || creator.city?.trim()),
        Boolean(creator.languages?.length),
        accounts.length > 0,
        accounts.some((account) => Boolean(account.profileUrl)),
    ];
    const completenessRatio = completenessChecks.filter(Boolean).length / completenessChecks.length;
    let qualityMultiplier = 0.75 + (0.25 * completenessRatio);
    if (completenessRatio < 1) {
        reasons.push(`Profile completeness is ${Math.round(completenessRatio * 100)}%; missing profile fields lower confidence, not profile fit.`);
    }

    const metricDependentKeys = new Set(["follower_range", "engagement_rate", "audience_age", "audience_gender", "audience_geography"]);
    const usesMetrics = factors.some((factor) => metricDependentKeys.has(factor.key));
    const latestObservedAt = accounts
        .map((account) => account.latestSnapshot?.observedAt)
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const metricAgeDays = latestObservedAt
        ? Math.max(0, (Date.now() - latestObservedAt.getTime()) / 86400000)
        : null;
    const metricsFreshness = !latestObservedAt
        ? "no_metrics"
        : metricAgeDays <= 30
            ? "recent"
            : metricAgeDays <= 90
                ? "aging"
                : "stale";

    if (usesMetrics) {
        if (metricsFreshness === "aging") {
            qualityMultiplier *= 0.9;
            reasons.push("Metrics used for matching are 31–90 days old, so confidence is reduced.");
        }
        if (metricsFreshness === "stale") {
            qualityMultiplier *= 0.75;
            reasons.push("Metrics used for matching are more than 90 days old, so confidence is reduced.");
        }
        if (metricsFreshness === "no_metrics") {
            qualityMultiplier *= 0.8;
            reasons.push("No dated metric snapshot is available to support metric-dependent matching.");
        }

        const metricAccounts = accounts.filter((account) => account.latestSnapshot);
        if (metricAccounts.length) {
            const verifiedRatio = metricAccounts.filter((account) =>
                Boolean(account.verifiedAt) || account.verificationStatus === "VERIFIED"
            ).length / metricAccounts.length;
            qualityMultiplier *= 0.85 + (0.15 * verifiedRatio);
            if (verifiedRatio < 1) reasons.push("Some metric-bearing social accounts are unverified, which reduces confidence but does not change profile fit.");
        } else {
            qualityMultiplier *= 0.85;
            reasons.push("Metric-dependent criteria have no metric-bearing accounts to support verification checks.");
        }
    }

    const creatorSource = creator.ownerUserId
        ? "creator_submitted"
        : accounts.some((account) => account.latestSnapshot?.dataSource === "synthetic_dataset" || account.dataSource === "synthetic_dataset")
            ? "synthetic_dataset"
            : accounts.some((account) => account.latestSnapshot?.dataSource === "public_dataset" || account.dataSource === "public_dataset")
                ? "public_dataset_reference"
                : "unknown_source";
    if (creatorSource === "synthetic_dataset") {
        qualityMultiplier = Math.min(qualityMultiplier, 0.25);
        reasons.push("This is a fictional synthetic benchmark profile; its confidence is capped and it should not be treated as a real creator recommendation.");
    } else if (creatorSource === "public_dataset_reference") {
        qualityMultiplier *= 0.8;
        reasons.push("Public-dataset reference data lowers confidence because it is not independently verified as live platform data.");
    }

    const confidence = Math.round(criteriaCoverage * qualityMultiplier * 100);
    const recommendation = classifyScore(score, confidence);
    const campaignBudget = Number(campaign.paymentInformation?.campaign_budget);
    const hasBudget = Number.isFinite(campaignBudget) && campaignBudget > 0;
    if (hasBudget) missingData.push("Budget fit is not scored because creator rate cards are not yet captured in creator profiles.");
    if (!evaluatedWeight) reasons.push("Not enough matching criteria are configured to produce a meaningful profile-fit score.");

    return {
        match_score: score,
        match_confidence: confidence,
        criteria_coverage: Math.round(criteriaCoverage * 100),
        data_quality_confidence: Math.round(qualityMultiplier * 100),
        metrics_freshness: metricsFreshness,
        metrics_age_days: metricAgeDays === null ? null : Math.floor(metricAgeDays),
        recommendation_tier: recommendation.tier,
        recommendation_label: recommendation.label,
        match_reasons: reasons,
        match_factors: factors,
        missing_data: [...new Set(missingData)],
        score_type: "rule_based_v4",
        note: evaluatedWeight
            ? "Profile-fit score reflects criterion matches only and is not reduced for missing profile information. Confidence combines criterion coverage with data completeness, metric recency, account verification status when metrics are used, and source reliability. This is not a prediction of campaign performance."
            : "No applicable matching criteria could be assessed. Complete the campaign brief and creator data before relying on this recommendation.",
    };
}
