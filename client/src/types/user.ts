export interface UserSocials {
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  spotify?: string;
}

export interface UserProfileData {
  username: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
  socials?: UserSocials;
  memberSince: string;
}

export interface UserPasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
