import React, { createContext, useState, useContext, type ReactNode, type FC, useEffect, useRef } from 'react';
import { LOCALE_LOCATION_EVENT } from '../src/locale';
import { createAuthSession } from '../src/auth/session';
import { isStaffIdentity, needsAuthSession } from '../src/auth/access';

interface User { name: string; email: string; uid?: string; emailVerified: boolean; staff: boolean }
interface AuthContextType {
  user: User | null; loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<User>;
}
const AuthContext = createContext<AuthContextType | null>(null);
type Runtime = typeof import('firebase/auth') & { auth: import('firebase/auth').Auth };
let runtime: Promise<Runtime> | null = null;
function authRuntime(): Promise<Runtime> {
  if (!runtime) {
    const pending = Promise.all([import('firebase/auth'), import('./firebase')]).then(([sdk, instance]) => ({ ...sdk, auth: instance.auth }));
    runtime = pending;
    void pending.catch(() => { if (runtime === pending) runtime = null; });
  }
  return runtime;
}
async function authenticatedUser(person: import('firebase/auth').User): Promise<User> {
  const claims = await person.getIdTokenResult();
  return {
    name: person.displayName || person.email || 'Client', email: person.email || '', uid: person.uid,
    emailVerified: person.emailVerified && claims.claims.email_verified === true,
    staff: isStaffIdentity({ email: person.email, emailVerified: person.emailVerified && claims.claims.email_verified === true, admin: claims.claims.admin }),
  };
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => typeof window !== 'undefined' && needsAuthSession(window.location.pathname));
  const session = useRef<ReturnType<typeof createAuthSession<Runtime, import('firebase/auth').User, User>> | null>(null);
  if (!session.current) session.current = createAuthSession({
    load: authRuntime,
    subscribe: (sdk, receive, failed) => sdk.onIdTokenChanged(sdk.auth, person => receive(person && !person.isAnonymous ? person : null), failed),
    current: sdk => sdk.auth.currentUser && !sdk.auth.currentUser.isAnonymous ? sdk.auth.currentUser : null,
    resolve: authenticatedUser,
    signOut: sdk => sdk.signOut(sdk.auth),
    changed: state => { if ('user' in state) setUser(state.user!); if ('loading' in state) setLoading(state.loading!); },
  });
  const controller = session.current;
  useEffect(() => {
    controller.mount();
    const sync = () => { if (needsAuthSession(window.location.pathname)) void controller.start(); };
    sync();
    window.addEventListener(LOCALE_LOCATION_EVENT, sync); window.addEventListener('popstate', sync);
    return () => { controller.unmount(); window.removeEventListener(LOCALE_LOCATION_EVENT, sync); window.removeEventListener('popstate', sync); };
  }, [controller]);
  const login = (email: string, pass: string) => controller.authenticate(async sdk => (await sdk.signInWithEmailAndPassword(sdk.auth, email, pass)).user);
  const register = (name: string, email: string, pass: string) => controller.authenticate(async sdk => {
    const person = (await sdk.createUserWithEmailAndPassword(sdk.auth, email, pass)).user;
    // An optional display-name update failing does not undo an already created customer account.
    try { await sdk.updateProfile(person, { displayName: name }); } catch { /* The verified account identity remains authoritative. */ }
    return person;
  });
  const loginWithGoogle = () => controller.authenticate(async sdk => (await sdk.signInWithPopup(sdk.auth, new sdk.GoogleAuthProvider())).user);
  const logout = () => controller.logout();
  return <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, register }}>{children}</AuthContext.Provider>;
};
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
