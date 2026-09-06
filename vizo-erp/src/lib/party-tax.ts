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

/* ───────────────────────── THE REST OF THE FORM ────────────────────────────

   Not just the tax fields: a Chinese party's name, address and phone look
   nothing like a Pakistani one's either, and both the "new party" screen and
   the "edit party" screen have to ask for them the same way.

   THE EXAMPLES ARE IN ENGLISH LETTERS ON PURPOSE. A placeholder exists to show
   somebody the shape of the thing they are about to type. Nobody at this
   company reads Chinese characters, so a placeholder in them would show the
   shape of nothing -- these are real Chinese companies, addresses and numbers,
   written the way they appear on an export invoice.

   Adding a third country one day means adding a third entry here, and nothing
   else moves.                                                                */

export type PartyCopy = {
  /** What the country is called on the chooser. */
  label: string;
  /** The one-line hint under it -- which three numbers this country uses. */
  blurb: string;
  legalName: string;
  displayName: string;
  industry: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  tax: PartyTaxField[];
};

export const PARTY_COPY: Record<PartyOrigin, PartyCopy> = {
  PK: {
    label: "Pakistani",
    blurb: "NTN, STRN and CNIC",
    legalName: "e.g. Hafeez Center Shop #28",
    displayName: "Same as legal name if blank",
    industry: "e.g. Mobile Accessories",
    phone: "03XXXXXXXXX or 021XXXXXXX",
    altPhone: "Optional",
    email: "contact@example.pk",
    address: "Shop #28, Hafeez Center, Liberty",
    tax: PARTY_TAX.PK,
  },
  CN: {
    label: "Chinese",
    blurb: "Social Credit Code, VAT and ID card",
    legalName: "e.g. Shenzhen Huaqiang Electronics Co., Ltd",
    displayName: "e.g. Huaqiang Electronics",
    industry: "e.g. Consumer Electronics",
    phone: "+86 138 0013 8000",
    altPhone: "+86 755 8888 6666 (optional)",
    email: "contact@example.cn",
    address: "Room 1201, Block B, Huaqiang North Road, Futian District",
    tax: PARTY_TAX.CN,
  },
};

/* ───────────────────────────── THE SHAPES ─────────────────────────────────

   The server checks all of these again on the way in
   (PartiesController.CheckTax) -- a shape the browser happens to enforce is
   not a shape the database is protected by. These exist so somebody is told
   before they press Save, not instead of the server knowing.                 */

/* Digits and capitals, minus I, O, S, V and Z -- left out of the Chinese code
   alphabet precisely because they are misread as 1, 0, 5, U and 2. */
const CN_ALPHABET = /^[0-9A-HJ-NP-RTUW-Y]+$/;

/** Unified Social Credit Code: 18 characters. */
export const isUscc = (v: string) => v.length === 18 && CN_ALPHABET.test(v);

/** VAT taxpayer registration: the old 15-digit form or the current 18. */
export const isCnVat = (v: string) =>
  (v.length === 15 || v.length === 18) && CN_ALPHABET.test(v);

/** Resident ID card: 17 digits and a check character, which may be an X. */
export const isCnId = (v: string) => /^\d{17}[\dX]$/.test(v);

/**
 * Mainland mobile, or a landline with its area code. Spaces and dashes ignored.
 *
 * Deliberately permissive: a Pakistani mobile happens to fit the landline
 * shape, and being too strict here would block real numbers, which is the
 * worse failure of the two.
 */
export const isCnPhone = (v: string) =>
  /^(\+?86)?(1[3-9]\d{9}|0\d{9,11})$/.test(v.replace(/[\s-]/g, ""));

export const isPkPhone = (v: string) =>
  /^(03\d{9}|\+923\d{9}|0(21|42|51|31)\d{7,8})$/.test(v.replace(/[\s-]/g, ""));

/**
 * The tax-number and phone rules for one country, as a zod refinement.
 *
 * Both party forms call this from their own superRefine, so "what counts as a
 * valid Social Credit Code" is written once. A third form would call it too.
 */
export function refineParty(
  d: { origin: PartyOrigin; phone?: string; ntn?: string; strn?: string; cnic?: string },
  add: (path: "phone" | "ntn" | "strn" | "cnic", message: string) => void
) {
  const cn = d.origin === "CN";

  if (d.phone && !(cn ? isCnPhone(d.phone) : isPkPhone(d.phone))) {
    add("phone", cn
      ? "Chinese number, e.g. +86 138 0013 8000 or 020 8888 6666"
      : "Pakistani number, e.g. 03001234567 or 02134567890");
  }

  const ntn = (d.ntn ?? "").trim().toUpperCase();
  const strn = (d.strn ?? "").trim().toUpperCase();
  const cnic = (d.cnic ?? "").trim().toUpperCase();

  if (cn) {
    if (ntn && !isUscc(ntn)) add("ntn", "18 characters, e.g. 91440300MA5EDK8T5H");
    if (strn && !isCnVat(strn)) add("strn", "15 or 18 characters, e.g. 440300123456789");
    if (cnic && !isCnId(cnic)) add("cnic", "17 digits and a check character, e.g. 440301199001011234");
    return;
  }

  if (ntn && !/^\d{7}-\d$/.test(ntn)) add("ntn", "Format: 1234567-8");
  if (strn && !/^\d{2}-\d{2}-\d{4}-\d{3}-\d{2}$/.test(strn)) add("strn", "Format: 32-77-8901-234-56");
  if (cnic && !/^\d{5}-\d{7}-\d$/.test(cnic)) add("cnic", "Format: 00000-0000000-0");
}
