const hasValue = (name) => typeof process.env[name] === "string" && process.env[name].trim().length > 0;

export function getIntegrationReadiness() {
    const metaRequired = ["META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI", "META_GRAPH_API_VERSION"];
    const metaConfigured = metaRequired.every(hasValue);
    const metaApproved = process.env.META_API_ACCESS_APPROVED === "true";

    return {
        generated_at: new Date().toISOString(),
        integrations: [
            {
                id: "meta_instagram",
                name: "Meta / Instagram",
                purpose: "Official creator account authorization and social metrics",
                status: !metaApproved
                    ? "approval_required"
                    : !metaConfigured
                        ? "configuration_required"
                        : "configured_not_connected",
                configured: metaConfigured,
                approved_for_api_access: metaApproved,
                required_environment_variables: metaRequired,
                missing_environment_variables: metaRequired.filter((name) => !hasValue(name)),
                implementation_status: "oauth_and_sync_pending",
                message: !metaApproved
                    ? "Meta API access approval is not marked complete. Do not attempt OAuth or label metrics as API-sourced."
                    : !metaConfigured
                        ? "Access approval is marked complete, but one or more server-side environment variables are missing."
                        : "Credentials are present, but OAuth, token storage, and live metric synchronization still need to be implemented.",
            },
            {
                id: "notifications",
                name: "Email and notifications",
                purpose: "Invitation, review, and workflow updates",
                status: "deferred",
                configured: false,
                required_environment_variables: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
                missing_environment_variables: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"].filter((name) => !hasValue(name)),
                implementation_status: "not_implemented",
                message: "Notification delivery is intentionally deferred until the core application workflows are complete.",
            },
            {
                id: "payment_processing",
                name: "Payment processing",
                purpose: "Execute creator payments through a payment provider",
                status: "not_implemented",
                configured: false,
                required_environment_variables: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
                missing_environment_variables: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].filter((name) => !hasValue(name)),
                implementation_status: "manual_ledger_only",
                message: "Influna currently stores manual payment records only. No payment provider is connected and no money is transferred.",
            },
        ],
    };
}
