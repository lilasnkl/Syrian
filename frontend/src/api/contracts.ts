export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    type:
      | "validation_error"
      | "authentication_error"
      | "permission_error"
      | "business_rule_violation"
      | "not_found"
      | "server_error"
      | string;
    code: string;
    details: Record<string, unknown>;
  };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;
