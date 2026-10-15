#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DATASET_URL = "https://huggingface.co/datasets/mayacheruty/BON-Synthetic-Influencers/resolve/main/bon_dataset.csv";
const OUTPUT_PATH = path.resolve("data/bon-synthetic-creator-import.csv");
const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;
if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    console.error("Use --limit=N where N is between 1 and 1000 (default 500).");
    process.exit(1);
}

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
    if (quoted) throw new Error("Source CSV has an unclosed quoted field.");
    if (field.length || row.length) {
        row.push(field);
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    }
    if (rows.length < 2) throw new Error("Source CSV is empty or has no data rows.");
    const headers = rows.shift().map((header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_"));
    return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] ?? "").trim()])));
}

function csvCell(value) {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

const response = await fetch(DATASET_URL);
if (!response.ok) throw new Error(`Dataset download failed with HTTP ${response.status}. Source: ${DATASET_URL}`);
const sourceText = await response.text();
const sourceRows = parseCsv(sourceText);
const required = ["profile_id", "niche", "follower_count", "following_count", "posts_count", "avg_likes", "avg_comments", "avg_views", "engagement_rate", "bio"];
const headers = sourceRows.length ? Object.keys(sourceRows[0]) : [];
const missing = required.filter((name) => !headers.includes(name));
if (missing.length) throw new Error(`Source dataset schema changed; missing columns: ${missing.join(", ")}`);

const outputHeaders = [
    "display_name", "platform", "handle", "bio", "categories",
    "follower_count", "following_count", "post_count", "average_views",
    "average_likes", "average_comments", "engagement_rate",
    "source_reference", "dataset_profile_id", "dataset_archetype", "dataset_is_fraud",
    "dataset_fraud_severity", "dataset_case_type", "dataset_audience_real_ratio",
    "dataset_growth_spike_score", "dataset_audience_geo_mismatch", "dataset_account_age_months",
    "dataset_comment_authenticity", "dataset_profile_pic_flag", "dataset_synthetic"
];

const outputRows = sourceRows.slice(0, limit).map((row) => {
    const id = row.profile_id || "BON-UNKNOWN";
    return {
        display_name: `BON Synthetic Creator ${id.replace(/^BON-/, "")}`,
        platform: "Other",
        handle: id.toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
        bio: row.bio || "",
        categories: row.niche || "",
        follower_count: row.follower_count,
        following_count: row.following_count,
        post_count: row.posts_count,
        average_views: row.avg_views,
        average_likes: row.avg_likes,
        average_comments: row.avg_comments,
        engagement_rate: row.engagement_rate,
        source_reference: "https://huggingface.co/datasets/mayacheruty/BON-Synthetic-Influencers (MIT; fully synthetic benchmark data)",
        dataset_profile_id: id,
        dataset_archetype: row.archetype,
        dataset_is_fraud: row.is_fraud,
        dataset_fraud_severity: row.fraud_severity,
        dataset_case_type: row.case_type,
        dataset_audience_real_ratio: row.audience_real_ratio,
        dataset_growth_spike_score: row.growth_spike_score,
        dataset_audience_geo_mismatch: row.audience_geo_mismatch,
        dataset_account_age_months: row.account_age_months,
        dataset_comment_authenticity: row.comment_authenticity,
        dataset_profile_pic_flag: row.profile_pic_flag,
        dataset_synthetic: "true",
    };
});

const csv = [outputHeaders.join(","), ...outputRows.map((row) => outputHeaders.map((header) => csvCell(row[header])).join(","))].join("\n") + "\n";
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, csv, "utf8");
const size = Buffer.byteLength(csv);
console.log(`Prepared ${outputRows.length} synthetic creator rows at ${OUTPUT_PATH} (${size} bytes).`);
if (size > 2 * 1024 * 1024) {
    console.error("Output exceeds the import page's 2 MB limit. Re-run with a smaller --limit value.");
    process.exitCode = 1;
} else {
    console.log("Next: sign in as a BRAND or ADMIN, open /dashboard/creator-data, select this CSV, and import it.");
}
