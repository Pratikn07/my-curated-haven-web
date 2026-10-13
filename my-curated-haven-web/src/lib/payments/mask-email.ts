/**
 * An email shown to whoever holds a checkout return link: enough for the buyer to recognise it, not enough to read
 * someone else's address. "parent.name@gmail.com" becomes "p•••e@gmail.com".
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "your email";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const hidden = local.length <= 2 ? `${local[0]}•••` : `${local[0]}•••${local[local.length - 1]}`;
  return `${hidden}@${domain}`;
}
