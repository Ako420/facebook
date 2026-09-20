/** Shown wherever an account has no picture of its own. */
export const BLANK_AVATAR = "/assets/images/blank-profile-picture.webp";

/** Covers are wide, so the same picture is cropped rather than stretched. */
export const BLANK_COVER = "/assets/images/blank-profile-picture.webp";

export const avatarOf = (url?: string | null) => url || BLANK_AVATAR;

export const coverOf = (url?: string | null) => url || BLANK_COVER;
