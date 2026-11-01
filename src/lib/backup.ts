/** Shape of a "Download my page" file. Kept stable so old backups keep restoring. */
export type BackupImage = { type: string; data: string } | null; // data is base64

export type BackupLink = {
  title: string;
  url: string;
  heading?: boolean;
  embed?: boolean;
  sensitive?: boolean;
  spotlight?: boolean;
  icon?: string;
  lockCode?: string | null;
  discountCode?: string | null;
  androidUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  thumb?: BackupImage;
};

export type Backup = {
  app: "linksh.it";
  version: 1;
  exportedAt: string;
  page: {
    handle: string;
    displayName: string;
    bio: string;
    theme: string;
    style: Record<string, unknown>;
    socials: Record<string, string>;
    tips: Record<string, string>;
    openInApp: boolean;
    signupEnabled: boolean;
    signupPrompt: string;
    contactEnabled?: boolean;
    qaEnabled?: boolean;
    qaPrompt?: string;
    lockCode: string | null;
    seoTitle: string;
    seoDescription: string;
    metaPixel: string;
    googleAnalytics: string;
    tiktokPixel: string;
    utm: boolean;
  };
  avatar: BackupImage;
  background: BackupImage;
  links: BackupLink[];
};

/** Biggest backup file we accept back (server actions cap the request just above this). */
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
