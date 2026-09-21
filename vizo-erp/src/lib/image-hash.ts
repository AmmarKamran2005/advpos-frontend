/**
 * A fingerprint of a picture, small enough to compare two of them instantly.
 *
 * WHY THIS EXISTS. The new-customer screen takes both sides of a CNIC, and the
 * commonest slip is photographing the front, then choosing the same file again
 * for the back. Nothing about that is wrong as far as a file input can tell, and
 * a machine reading two copies of the front would fill the form from half a
 * card. The owner's rule: if the back is "very much the same" as the front, say
 * so and refuse it.
 *
 * WHICH KIND OF FINGERPRINT. A byte comparison only catches the identical FILE.
 * Somebody who photographs the card twice gets two different files that look the
 * same to a person, so this is a difference hash (dHash): the picture is shrunk
 * to 9 x 8 greys and each pixel is compared with its right-hand neighbour --
 * 64 yes/no answers. Lighting, JPEG quality and a slight change of angle move a
 * few of them; a different side of the card moves about half.
 *
 * Two unrelated pictures differ in about 32 of the 64 bits. How close counts as
 * "the same" depends on the kind of document -- see SAME_PICTURE_BITS, whose
 * numbers were measured rather than guessed.
 *
 * WHAT IT CANNOT DO. It cannot tell the same side photographed from two very
 * different angles or rotated, and it says nothing about WHICH side a picture
 * is. The API's reader answers that from the printed content (see
 * PartyDocumentsController) and is the second line of defence.
 */

const COLS = 9;
const ROWS = 8;

/** Average grey of each cell after shrinking to COLS x ROWS. */
function greys(source: CanvasImageSource, sw: number, sh: number): number[] | null {
  /* Shrink in two steps. Going from a 4000 px photograph straight to 9 x 8 in
     one drawImage aliases badly -- the browser samples a few source pixels and
     ignores the rest. Down to 72 x 64 first (smoothing on), then average each
     8 x 8 block by hand. */
  const big = document.createElement("canvas");
  big.width = COLS * 8;
  big.height = ROWS * 8;
  const ctx = big.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sw || !sh) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, big.width, big.height);
  ctx.drawImage(source, 0, 0, big.width, big.height);

  const { data } = ctx.getImageData(0, 0, big.width, big.height);
  const cells: number[] = [];
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      let sum = 0;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const i = ((cy * 8 + y) * big.width + (cx * 8 + x)) * 4;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
      }
      cells.push(sum / 64);
    }
  }
  return cells;
}

function bitsOf(cells: number[]): string {
  let bits = "";
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS - 1; x++) {
      bits += cells[y * COLS + x] > cells[y * COLS + x + 1] ? "1" : "0";
    }
  }
  /* 64 bits as 16 hex digits: short enough to keep in state and in a log line. */
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** The fingerprint of a File or Blob, or null when the browser cannot decode it. */
export async function dHashOfFile(file: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const cells = greys(bitmap, bitmap.width, bitmap.height);
      return cells ? bitsOf(cells) : null;
    } finally {
      bitmap.close?.();
    }
  } catch {
    return null;
  }
}

/**
 * The fingerprint of a picture that is already up on Cloudinary.
 *
 * Cloudinary answers with permissive CORS headers, which is what lets a canvas
 * read the pixels of an image from another origin. If a picture is somewhere
 * that does not, the canvas is "tainted", getImageData throws, and this returns
 * null -- and the caller simply does not compare, rather than blocking anybody.
 */
export function dHashOfUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cells = greys(img, img.naturalWidth, img.naturalHeight);
        resolve(cells ? bitsOf(cells) : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** How many of the 64 bits differ. 64 when either fingerprint is missing or malformed. */
export function hashDistance(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b || a.length !== b.length) return 64;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { n += x & 1; x >>= 1; }
  }
  return n;
}

/**
 * At or under this many differing bits, two pictures are "very much the same" --
 * and the number depends on WHAT they are, because how alike two different
 * pages look depends on how much is printed on them.
 *
 * MEASURED on the sample documents used to test this screen (bits of 64 that
 * differ):
 *
 *     the same file twice                                   0
 *     the same CNIC front photographed a second time       12   (2 degrees off, darker, softer)
 *     a CNIC front against its own back                    23
 *     a CNIC front against a business card                 22
 *     two DIFFERENT affidavit pages                        10   (mostly white, lines of text)
 *
 * CNIC   15  the two faces of a CNIC look nothing alike (23 apart), and a
 *            second photograph of one face is 12 away, so 15 sits between them.
 * card    8  sides of a card are less predictable; catch only the near-identical.
 * affidavit 4  two pages of typed text are ALWAYS fairly close (10 in the sample),
 *            so anything looser would refuse a perfectly good page 2. Only a
 *            file chosen twice, or very nearly, is caught here.
 *
 * Whatever slips under a threshold is the API's to catch: it reads which face of
 * the CNIC each picture actually is.
 */
export const SAME_PICTURE_BITS = { cnic: 15, card: 8, affidavit: 4 } as const;

export type DocumentKind = keyof typeof SAME_PICTURE_BITS;
