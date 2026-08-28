import React from "react";

export interface AuthContext {
  isAuthenticated: boolean;
}

export const AuthContext = React.createContext<AuthContext | null>(null);
