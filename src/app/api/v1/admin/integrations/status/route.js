import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getIntegrationReadiness } from "@/lib/integrations/status";

export async function GET() {
    const auth = await requireRole("ADMIN");
    if (auth.response) return auth.response;

    // Only configuration presence is exposed. Secret values are never returned.
    return NextResponse.json(getIntegrationReadiness(), {
        headers: { "Cache-Control": "no-store" },
    });
}
