import {
  Loader2,
  Mail,
  User,
  Lock,
  LogOut,
  type Icon as LucideIcon,
} from "lucide-react";

export type Icon = typeof LucideIcon;

export const Icons = {
  spinner: Loader2,
  google: ({ ...props }) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="google"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 488 512"
      {...props}
    >
      <path
        fill="currentColor"
        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
      ></path>
    </svg>
  ),
  kakao: ({ ...props }) => (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3C6.48 3 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm4.89 12.89l-1.41 1.41L12 13.83l-3.48 3.47-1.41-1.41L10.59 12 7.11 8.52l1.41-1.41L12 10.17l3.48-3.47 1.41 1.41L13.41 12l3.48 3.89z"
        fill="currentColor"
      />
    </svg>
  ),
  apple: ({ ...props }) => (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.05 12.04c-.03-3.01 2.46-4.45 2.57-4.52-1.4-2.04-3.57-2.32-4.34-2.35-1.84-.19-3.6 1.09-4.54 1.09-.94 0-2.39-1.06-3.93-1.03-2.02.03-3.88 1.18-4.92 2.99-2.1 3.64-.54 9.02 1.51 11.97 1 1.45 2.19 3.07 3.75 3.02 1.51-.06 2.08-.97 3.9-.97 1.82 0 2.34.97 3.93.94 1.62-.03 2.65-1.47 3.64-2.93 1.15-1.67 1.62-3.29 1.65-3.37-.04-.02-3.16-1.21-3.19-4.81zm-2.99-8.83c.83-1.01 1.39-2.4 1.24-3.79-1.2.05-2.65.8-3.51 1.81-.77.89-1.44 2.31-1.26 3.67 1.33.1 2.69-.67 3.53-1.69z"
        fill="currentColor"
      />
    </svg>
  ),
  mail: Mail,
  user: User,
  lock: Lock,
  logout: LogOut,
};
