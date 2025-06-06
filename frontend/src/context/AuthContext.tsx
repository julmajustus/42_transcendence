// context/AuthContext.tsx
import { jwtDecode } from 'jwt-decode';
import React, { createContext, useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';

export interface User {
  id: string;
  username: string;
  // email: string;
  authToken: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: { username: string; authToken: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user:   null,
  login:  () => {},
  logout: () => {},
})

interface DecodedToken {
  id: string;
  username: string;
  exp: number;
  iat: number;
}

interface DecodedToken {
  id: string;
  username: string;
  exp: number;
  iat: number;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  
  // comment out this for testing with one user for each session
/*   const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (user)
      sessionStorage.setItem('authUser', JSON.stringify(user))
    else
      sessionStorage.removeItem('authUser')
  }, [user]) */

  // comment out this for storing only in localhost and having 1 user for all sessions
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) as User : null
    })
  
    useEffect(() => {
      if (!user) {
        localStorage.removeItem('user')
        return
      }
    // decode exp and compute how long until it fires
    const { exp } = jwtDecode<DecodedToken>(user.authToken)
    if (!exp)
      return
    const now = Date.now()
    const msUntilExpiry = exp * 1000 - now
    
    if (msUntilExpiry <= 0) {
      // already expired
      toast.info('Session expired, you are being logged out…1')
      setTimeout(logout, 1000)
      return
    }
        
    // 1) schedule the toast exactly when the token expires
    const toastTimer = setTimeout(() => {
      toast.info('Session expired, you are being logged out…2')
    }, msUntilExpiry)

    // 2) schedule the actual logout a little after the toast
    const logoutTimer = setTimeout(logout, msUntilExpiry + 1000)

    return () => {
      clearTimeout(toastTimer)
      clearTimeout(logoutTimer)
    }
  }, [user])

  const login = (userData: { username: string; authToken: string }) => {
    try {
      // Decode the token to get the user ID
      const decodedToken = jwtDecode<DecodedToken>(userData.authToken);

      // Create the user object with ID from token
      const user = {
        id: decodedToken.id,
        username: userData.username,
        authToken: userData.authToken,
      };

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
