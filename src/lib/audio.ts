/**
 * Play every voice note as MP3. Phones and browsers record different formats (Android
 * AMR .3gp in older builds, browsers WebM, iPhones AAC .m4a) and none of them plays all
 * the others. Cloudinary converts on the fly when the extension changes, then caches it.
 * Other URLs pass through unchanged.
 */
const AUDIO_UPLOAD = /\/video\/upload\//;
const EXTENSION = /\.(3gp|amr|webm|m4a|mp4|aac|ogg|wav)(\?.*)?$/i;

export function playableAudio(url: string) {
  if (!url.includes('res.cloudinary.com') || !AUDIO_UPLOAD.test(url) || !EXTENSION.test(url)) return url;
  return url.replace(EXTENSION, '.mp3$2');
}
