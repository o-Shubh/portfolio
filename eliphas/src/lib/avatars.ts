export const AVATAR_BUCKET = "avatars";
/** Public URL of a profile photo, or null (pages then show initials). */
export const avatarUrl = (path: string | null | undefined) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}` : null;
