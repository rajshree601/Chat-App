import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Amplify } from "aws-amplify";
import { confirmSignUp, fetchAuthSession, getCurrentUser, resetPassword, signIn, signOut, signUp } from "aws-amplify/auth";
import { config } from "../lib/config";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId
    }
  }
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    setLoading(true);
    try {
      const current = await getCurrentUser();
      const session = await fetchAuthSession();
      setUser({ ...current, email: session.tokens?.idToken?.payload?.email });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signIn: async (username, password) => {
      await signIn({ username, password });
      await refreshUser();
    },
    signUp: async (email, password, name) => signUp({
      username: email,
      password,
      options: { userAttributes: { email, name } }
    }),
    confirmSignUp: async (email, code) => confirmSignUp({ username: email, confirmationCode: code }),
    forgotPassword: async (email) => resetPassword({ username: email }),
    signOut: async () => {
      await signOut();
      setUser(null);
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

