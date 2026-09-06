/**
 * The two sets of tax numbers a party can have.
 *
 * ─────────────────────────── WHY THIS IS ITS OWN FILE ──────────────────────
 *
 * A Pakistani party has an NTN, an STRN and a CNIC. A Chinese one has none of
 * those: it has a Unified Social Credit Code, a VAT registration and a Resident
 * ID card, and all three look nothing like ours.
 *
 * Two screens need to know that — the form that asks for them and the profile
 * that shows them back — and they used to be the only two places the words
 * lived, separately. That is how a Chinese supplier ended up being saved as a
 * USCC and displayed as an "NTN": one screen was taught and the other was not.
 *
 * So the words live here, once, and both read from them.
 *
 * ─────────────────────────── THE COLUMNS ARE SHARED ────────────────────────
 *
 * `key` is the DATABASE column, and it does not change between the two: an
 * 18-character Social Credit Code is stored in "Ntn" and labelled USCC.
 * Renaming the columns would mean touching every report and export that reads
 * them, to gain nothing a label does not already give.
 */

/** ISO 3166-1 alpha-2, as carried on "Province"."Country". */
export type PartyOrigin = "PK" | "CN";

export type PartyTaxField = {
  /** The column on "Party" — the same one for both countries. */
  key: "ntn" | "strn" | "cnic";
  label: string;
  hint: string;
  placeholder: string;
};

export const PARTY_TAX: Record<PartyOrigin, PartyTaxField[]> = {
  PK: [
    { key: "ntn",  label: "NTN",  hint: "National Tax Number",    placeholder: "1234567-8" },
    { key: "strn", label: "STRN", hint: "Sales Tax Registration", placeholder: "32-77-8901-234-56" },
    { key: "cnic", label: "CNIC", hint: "For sole proprietors",   placeholder: "00000-0000000-0" },
  ],
  CN: [
    { key: "ntn",  label: "USCC",    hint: "Unified Social Credit Code",    placeholder: "91440300MA5EDK8T5H" },
    { key: "strn", label: "VAT No.", hint: "General taxpayer registration", placeholder: "440300123456789" },
    { key: "cnic", label: "ID Card", hint: "Resident ID, for sole traders", placeholder: "440301199001011234" },
  ],
};

/**
 * Reads a country code off whatever the API sent and falls back to Pakistan.
 *
 * The fallback is the honest one: this is a Pakistani business, and a party
 * whose city predates the country column — or whose row simply has not been
 * joined — is far more likely to be a shop in Lahore than a factory in
 * Shenzhen.
 */
export function partyOrigin(country: string | null | undefined): PartyOrigin {
  return (country ?? "").trim().toUpperCase() === "CN" ? "CN" : "PK";
}
