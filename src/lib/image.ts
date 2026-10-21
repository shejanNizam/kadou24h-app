/**
 * Ask Cloudinary for an image at the size it is shown, in a light format (WebP when the
 * phone takes it) — a 64 px thumbnail no longer downloads the 1280 px upload. Slow, paid
 * data in Guinea makes this the biggest speed win. Other URLs pass through unchanged.
 */
import { Dimensions, PixelRatio } from 'react-native';

export type ImageSize = 'thumb' | 'card' | 'full';

/** Widths in dp. Sizes are rounded up to a few buckets so the CDN cache is shared. */
const DP: Record<ImageSize, number> = { thumb: 120, card: 400, full: 0 };
const BUCKETS = [160, 320, 480, 720, 1080, 1440];

const UPLOAD = '/image/upload/';
// A segment like "w_400,c_fill" or "f_auto" right after /upload/ means it is already transformed
const TRANSFORMED = /\/image\/upload\/[a-z]{1,3}_[^/]+\//;

export function img(url: string, size?: ImageSize): string;
export function img(url: string | null | undefined, size?: ImageSize): string | undefined;
export function img(url: string | null | undefined, size: ImageSize = 'card') {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com') || !url.includes(UPLOAD) || TRANSFORMED.test(url)) return url;
  const dp = size === 'full' ? Dimensions.get('window').width : DP[size];
  const px = Math.ceil(dp * PixelRatio.get());
  const width = BUCKETS.find((b) => b >= px) ?? BUCKETS[BUCKETS.length - 1];
  return url.replace(UPLOAD, `${UPLOAD}f_auto,q_auto,c_limit,w_${width}/`);
}
