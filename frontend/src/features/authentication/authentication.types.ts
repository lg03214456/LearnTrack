export type AuthenticationCode =
  | "OK"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "LINK_INVALID"
  | "VALIDATION_ERROR"
  | "FORBIDDEN"
  | "PROVIDER_UNAVAILABLE";

export interface AuthenticationResult {
  ok: boolean;
  code: AuthenticationCode;
  message: string;
  redirectTo?: string;
  cooldownSeconds?: number;
}

export interface AuthenticationModeView {
  isMockMode: boolean;
  label: "Mock 登入模式" | "正式登入模式";
}
