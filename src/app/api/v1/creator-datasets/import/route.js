import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 1000;
const PLATFORM_NAMES = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", other: "Other" };
const PLATFORMS = new Set(Object.values(PLATFORM_NAMES));

function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
            else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"' && field.length === 0) quoted = true;
        else if (char === ",") { row.push(field); field = ""; }
        else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i += 1;
            row.push(field); field = "";
            if (row.some((cell) => cell.trim() !== "")) rows.push(row);
            row = [];
        } else field += char;
    }
    if (quoted) throw new Error("CSV contains an unclosed quoted field.");
    if (field.length || row.length) {
        row.push(field);
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    }
    if (rows.length < 2) throw new Error("CSV must include a header row and at least one data row.");
    const headers = rows.shift().map((header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_"));
    if (new Set(headers).size !== headers.length) throw new Error("CSV has duplicate column names.");
    return rows.map((cells, index) => {
        if (cells.length > headers.length) throw new Error(`Row ${index + 2} has more values than the header.`);
        return Object.fromEntries(headers.map((header, i) => [header, (cells[i] ?? "").trim()]));
    });
}

function numberValue(value, label, { integer = false, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > max || (integer && !Number.isInteger(parsed))) {
        throw new Error(`Invalid ${label}: "${value}".`);
    }
    return parsed;
}

function listValue(value) {
    return value ? value.split(/[;|]/).map((item) => item.trim()).filter(Boolean).slice(0, 30) : [];
}

export async function POST(request) {
    const auth = await requireRole("BRAND", "ADMIN");
    if (auth.response) return auth.response;

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES) return NextResponse.json({ error: "CSV must be 2 MB or smaller." }, { status: 413 });
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const sourceReference = String(form?.get("source_reference") || "").trim().slice(0, 500);
    if (!file || typeof file.text !== "function" || !file.name?.toLowerCase().endsWith(".csv")) {
        return NextResponse.json({ error: "Upload a .csv file using the file field." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "CSV must be 2 MB or smaller." }, { status: 413 });

    let rows;
    try {
        rows = parseCsv(await file.text());
    } catch (error) {
        return NextResponse.json({ error: error.message || "Could not parse CSV." }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) return NextResponse.json({ error: `CSV may contain at most ${MAX_ROWS} data rows per import.` }, { status: 400 });

    const results = { imported: 0, skipped: 0, errors: [] };
    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const line = index + 2;
        try {
            const displayName = row.display_name || row.name || row.creator_name;
            const platform = PLATFORM_NAMES[(row.platform || "").trim().toLowerCase()] || "";
            const handle = (row.handle || row.username || "").replace(/^@/, "");
            if (!displayName) throw new Error("display_name is required.");
            if (!PLATFORMS.has(platform)) throw new Error("platform must be Instagram, TikTok, YouTube, Facebook, or Other.");
            if (!handle) throw new Error("handle is required.");
            if (handle.length > 200) throw new Error("handle must be 200 characters or fewer.");
            const profileUrl = row.profile_url || row.url || null;
            if (profileUrl && !/^https?:\/\//i.test(profileUrl)) throw new Error("profile_url must be an HTTP(S) URL.");
            const existing = await prisma.socialAccount.findFirst({
                where: { platform, handle: { equals: handle, mode: "insensitive" } },
                select: { id: true },
            });
            if (existing) { results.skipped += 1; continue; }

            const followers = numberValue(row.follower_count || row.followers, "follower_count", { integer: true });
            const following = numberValue(row.following_count || row.following, "following_count", { integer: true });
            const posts = numberValue(row.post_count || row.posts, "post_count", { integer: true });
            const views = numberValue(row.average_views, "average_views");
            const likes = numberValue(row.average_likes, "average_likes");
            const comments = numberValue(row.average_comments, "average_comments");
            const engagement = numberValue(row.engagement_rate, "engagement_rate", { max: 100 });
            const observedAt = row.observed_at ? new Date(row.observed_at) : new Date();
            if (Number.isNaN(observedAt.getTime())) throw new Error("observed_at must be a valid date.");
            const metricsPresent = [followers, following, posts, views, likes, comments, engagement].some((value) => value !== null);
            const isSyntheticDataset = row.dataset_synthetic?.toLowerCase() === "true";
            const metricSource = isSyntheticDataset ? "synthetic_dataset" : "public_dataset";
            const datasetMetadata = Object.fromEntries(
                ["dataset_profile_id", "dataset_archetype", "dataset_is_fraud", "dataset_fraud_severity", "dataset_case_type", "dataset_audience_real_ratio", "dataset_growth_spike_score", "dataset_audience_geo_mismatch", "dataset_account_age_months", "dataset_comment_authenticity", "dataset_profile_pic_flag", "dataset_synthetic"]
                    .filter((key) => row[key] !== undefined && row[key] !== "")
                    .map((key) => [key, row[key]])
            );

            await prisma.creatorProfile.create({
                data: {
                    displayName: displayName.slice(0, 200),
                    bio: (row.bio || "").slice(0, 2000) || null,
                    categories: listValue(row.categories || row.niche),
                    country: (row.country || "").slice(0, 100) || null,
                    city: (row.city || "").slice(0, 100) || null,
                    languages: listValue(row.languages).slice(0, 20),
                    isPublic: true,
                    socialAccounts: {
                        create: {
                            platform,
                            handle,
                            profileUrl,
                            dataSource: metricSource,
                            ...(metricsPresent ? { snapshots: { create: {
                                dataSource: "public_dataset",
                                observedAt,
                                followerCount: followers,
                                followingCount: following,
                                postCount: posts,
                                averageViews: views,
                                averageLikes: likes,
                                averageComments: comments,
                                engagementRate: engagement,
                                rawMetrics: {
                                    source_reference: sourceReference || row.source_reference || row.source || "Not provided",
                                    ...datasetMetadata,
                                    source_file: file.name,
                                    import_line: line,
                                    imported_by_user_id: auth.user.id,
                                    imported_at: new Date().toISOString(),
                                },
                            } } } : {}),
                        },
                    },
                },
            });
            results.imported += 1;
        } catch (error) {
            results.errors.push({ row: line, message: error?.message || "Could not import this row." });
        }
    }
    return NextResponse.json({
        ...results,
        total_rows: rows.length,
        source_reference: sourceReference || null,
        note: "Imported dataset values are unverified reference data, not live platform metrics.",
    }, { status: 200 });
}
