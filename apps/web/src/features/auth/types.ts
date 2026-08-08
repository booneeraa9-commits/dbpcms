/** The shape of the logged-in user the backend returns. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}
