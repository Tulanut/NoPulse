export interface UserProfileData {
  username: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
  memberSince: string;
}

export interface UserPasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
