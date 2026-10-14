import { z } from "zod";

const campaignStatusSchema = z.enum(["Active", "Draft", "Completed", "Cancelled"]);
const dataSectionSchema = z.record(z.string(), z.unknown());

export const campaignInputSchema = z.object({
    campaign_details: dataSectionSchema.optional(),
    targeting_criteria: dataSectionSchema.optional(),
    platform_details: dataSectionSchema.optional(),
    payment_information: dataSectionSchema.optional(),
    status: campaignStatusSchema.optional(),
}).strict();

export { campaignStatusSchema };

export function getCampaignValidationErrors(campaign) {
    const requiredValues = [
        ["campaign_details.campaign_title", campaign.campaign_details.campaign_title],
        ["campaign_details.campaign_objective", campaign.campaign_details.campaign_objective],
        ["campaign_details.campaign_start_date", campaign.campaign_details.campaign_start_date],
        ["campaign_details.campaign_end_date", campaign.campaign_details.campaign_end_date],
        ["campaign_details.campaign_description", campaign.campaign_details.campaign_description],
        ["targeting_criteria.campaign_location", campaign.targeting_criteria.campaign_location],
        ["targeting_criteria.campaign_age_range", campaign.targeting_criteria.campaign_age_range],
        ["targeting_criteria.campaign_gender", campaign.targeting_criteria.campaign_gender],
        ["targeting_criteria.campaign_interest", campaign.targeting_criteria.campaign_interest],
        ["platform_details.campaign_platform", campaign.platform_details.campaign_platform],
        ["platform_details.campaign_genere", campaign.platform_details.campaign_genere],
        ["platform_details.campaign_language", campaign.platform_details.campaign_language],
        ["payment_information.campaign_payment_model", campaign.payment_information.campaign_payment_model],
    ];
    const errors = requiredValues
        .filter(([, value]) => typeof value !== "string" || !value.trim())
        .map(([field]) => ({ field, message: "This field is required." }));

    const startDateValue = campaign.campaign_details.campaign_start_date;
    const endDateValue = campaign.campaign_details.campaign_end_date;
    const startDate = typeof startDateValue === "string" && startDateValue
        ? new Date(startDateValue)
        : null;
    const endDate = typeof endDateValue === "string" && endDateValue
        ? new Date(endDateValue)
        : null;

    if (startDate && Number.isNaN(startDate.getTime())) {
        errors.push({
            field: "campaign_details.campaign_start_date",
            message: "Enter a valid start date.",
        });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
        errors.push({
            field: "campaign_details.campaign_end_date",
            message: "Enter a valid end date.",
        });
    }
    if (startDate &&
        endDate &&
        !Number.isNaN(startDate.getTime()) &&
        !Number.isNaN(endDate.getTime()) &&
        startDate > endDate) {
        errors.push({
            field: "campaign_details.campaign_end_date",
            message: "End date must be on or after the start date.",
        });
    }

    return errors;
}

export function serializeCampaign(campaign) {
    const createdAt = campaign.createdAt.toISOString();
    const updatedAt = campaign.updatedAt.toISOString();

    return {
        id: campaign.id,
        campaign_details: campaign.campaignDetails,
        targeting_criteria: campaign.targetingCriteria,
        platform_details: campaign.platformDetails,
        payment_information: campaign.paymentInformation,
        status: campaign.status,
        createdAt,
        created_at: createdAt,
        updatedAt,
        updated_at: updatedAt,
    };
}
