/**
 * Sizes a Cloudinary picture on the way down.
 *
 * A product photo is uploaded once at up to 1600 px and then shown in a dozen
 * places, most of them a few hundred pixels wide. Sending the full file to a
 * phone on a shop's mobile data so it can be drawn 112 px wide is what makes a
 * picker of thirty items feel slow -- and the owner has asked for those
 * pictures to be BIGGER, which would make that worse, not better.
 *
 * So the width is asked for in the URL. `f_auto` lets Cloudinary send WebP or
 * AVIF where the browser takes it, `q_auto` picks the quality, and `c_limit`
 * never enlarges a small original.
 *
 * Anything that is not a Cloudinary upload URL comes back untouched, and a URL
 * that already carries a transformation is not stacked on top of.
 */
export function imageAt(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (at < 0 || !url.includes("res.cloudinary.com")) return url;

  const head = url.slice(0, at + marker.length);
  const rest = url.slice(at + marker.length);

  /* After /upload/ comes either a version (v1234567890/...) or a folder path.
     A transformation looks like f_auto,q_auto,... -- underscores and commas. */
  const first = rest.split("/")[0];
  if (/^[a-z]{1,3}_[^/]+/.test(first) && !/^v\d+$/.test(first)) return url;

  return `${head}f_auto,q_auto,w_${width},c_limit/${rest}`;
}
