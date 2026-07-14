import type { Platform, PlatformDetails } from "@/lib/platforms";
import { getPlaceDetails, toPlatformDetails } from "@/lib/places";
import { getYelpDetails } from "@/lib/yelp";
import {
  findTrustpilotBusinessUnit,
  getTrustpilotDetails,
} from "@/lib/trustpilot";
import { getFacebookDetails } from "@/lib/facebook";
import {
  refreshAccessToken,
  getBusinessProfileReviews,
} from "@/lib/googleBusinessProfile";

export type ConnectPayload =
  | { platform: "google"; placeId: string }
  | { platform: "yelp"; yelpId: string }
  | { platform: "trustpilot"; domain: string }
  | { platform: "facebook"; pageId: string; accessToken: string };

export async function connectPlatform(
  payload: ConnectPayload
): Promise<{ details: PlatformDetails; accessToken?: string }> {
  switch (payload.platform) {
    case "google":
      return { details: toPlatformDetails(await getPlaceDetails(payload.placeId)) };
    case "yelp":
      return { details: await getYelpDetails(payload.yelpId) };
    case "trustpilot": {
      const candidate = await findTrustpilotBusinessUnit(payload.domain);
      return { details: await getTrustpilotDetails(candidate.businessUnitId) };
    }
    case "facebook":
      return {
        details: await getFacebookDetails(payload.pageId, payload.accessToken),
        accessToken: payload.accessToken,
      };
  }
}

export type RefreshResult = {
  details: PlatformDetails;
  // Present when the platform's credentials were rotated during refresh
  // (Google Business Profile's short-lived access token), so the caller can
  // persist the new value.
  updatedAccessToken?: string;
  updatedTokenExpiresAt?: Date;
};

export async function refreshPlatform(
  platform: Platform,
  externalId: string,
  accessToken: string | null,
  refreshToken: string | null
): Promise<RefreshResult> {
  switch (platform) {
    case "google":
      return { details: toPlatformDetails(await getPlaceDetails(externalId)) };
    case "yelp":
      return { details: await getYelpDetails(externalId) };
    case "trustpilot":
      return { details: await getTrustpilotDetails(externalId) };
    case "facebook":
      if (!accessToken) {
        throw new Error("Missing stored Facebook access token; reconnect the page.");
      }
      return { details: await getFacebookDetails(externalId, accessToken) };
    case "google_business_profile": {
      if (!refreshToken) {
        throw new Error("Missing stored Google refresh token; reconnect the account.");
      }
      const tokens = await refreshAccessToken(refreshToken);
      const [accountId, locationId] = externalId.split("/");
      const details = await getBusinessProfileReviews(
        tokens.accessToken,
        accountId,
        locationId
      );
      return {
        details,
        updatedAccessToken: tokens.accessToken,
        updatedTokenExpiresAt: tokens.expiresAt,
      };
    }
  }
}
