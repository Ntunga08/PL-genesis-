import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@/types/auth';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

type AppRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab_tech' | 'pharmacist' | 'billing' | 'patient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  rolesLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [primaryRole, setPrimaryRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const navigate = useNavigate();

  // Helper function to normalize role names
  const normalizeRole = (role: string): AppRole => {
    // Map backend role names to frontend role names
    const roleMap: Record<string, AppRole> = {
      'lab_technician': 'lab_tech',
      'lab technician': 'lab_tech',
      'labtechnician': 'lab_tech',
      'labtech': 'lab_tech',
    };
    
    const normalizedRole = roleMap[role.toLowerCase()] || role.toLowerCase();
    return normalizedRole as AppRole;
  };

  useEffect(() => {
    // Check for existing session on mount - only run once
    let isMounted = true;
    
    const checkSession = async () => {
      try {

        const token = localStorage.getItem('auth_token');

        if (!isMounted) return; // Prevent state updates if unmounted
        
        if (token) {
          try {

            // Verify token and get user profile with timeout
            const { data } = await Promise.race([
              api.get('/auth/me'),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout - backend not responding')), 5000)
              )
            ]) as any;

            if (data && data.user) {
              // Normalize the role name to handle backend inconsistencies
              const userRole = normalizeRole(data.user.role);


              const user: User = {
                id: data.user.id,
                email: data.user.email,
                user_metadata: {
                  full_name: data.user.name, // Laravel uses 'name' not 'full_name'
                  role: userRole,
                },
              };
              
              const session: Session = {
                access_token: token,
                user: user,
              };
              
              setUser(user);
              setSession(session);
              
              // Set roles (convert single role to array)
              setRoles([userRole]);
              setPrimaryRole(userRole);
              setRolesLoaded(true);
            } else {
              // Invalid token

              localStorage.removeItem('auth_token');
              setUser(null);
              setSession(null);
              setRoles([]);
              setPrimaryRole(null);
              setRolesLoaded(true);
            }
          } catch (error: any) {


            // Don't remove token on network errors, only on auth errors
            if (error.response?.status === 401 || error.response?.status === 403) {

              localStorage.removeItem('auth_token');
            } else {

            }
            
            setUser(null);
            setSession(null);
            setRoles([]);
            setPrimaryRole(null);
            setRolesLoaded(true);
          }
        } else {

          setUser(null);
          setSession(null);
          setRoles([]);
          setPrimaryRole(null);
          setRolesLoaded(true);
        }
      } catch (error) {

        // Ensure state is always set even on unexpected errors
        setUser(null);
        setSession(null);
        setRoles([]);
        setPrimaryRole(null);
        setRolesLoaded(true);
      } finally {
        // Always set loading to false, no matter what

        setLoading(false);
      }
    };

    checkSession();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const signIn = async (email: string, password: string) => {
    try {

      const { data } = await api.post('/auth/login', {
        email,
        password,
      });

      if (data && data.token) {
        // Store token
        localStorage.setItem('auth_token', data.token);
        
        // Laravel returns 'role' (singular) and 'name', not 'roles' and 'full_name'
        // Normalize the role name to handle backend inconsistencies
        const userRole = normalizeRole(data.user.role);


        // Set user and session
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          user_metadata: {
            full_name: data.user.name, // Laravel uses 'name' not 'full_name'
            role: userRole,
          },
        };
        
        const session: Session = {
          access_token: data.token,
          user: user,
        };
        
        setUser(user);
        setSession(session);
        
        // Set roles from login response (convert single role to array)
        setRoles([userRole]);
        setPrimaryRole(userRole);
        setRolesLoaded(true);


        return { error: null };
      }

      return { error: { message: 'Login failed' } };
    } catch (error: any) {



      setRolesLoaded(true); // Ensure rolesLoaded is set even on error
      return { 
        error: { 
          message: error.response?.data?.error || 'Invalid email or password' 
        } 
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        phone: phone,
      });
      
      if (data && data.success) {
        return { error: null };
      }
      
      return { error: { message: 'Registration failed' } };
    } catch (error: any) {

      return { 
        error: { 
          message: error.response?.data?.message || 'Registration failed' 
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('auth_token');
      
      // Clear state
      setUser(null);
      setSession(null);
      setRoles([]);
      setPrimaryRole(null);
      
      // Navigate to auth page only if not already there
      if (window.location.pathname !== '/auth') {
        navigate('/auth');
      }
    } catch (error) {

      // Force redirect even if there's an error
      window.location.href = '/auth';
    }
  };

  const refreshRoles = async () => {
    // Roles are now fetched with the user data, no separate fetch needed
    if (user) {
      try {
        const { data } = await api.get('/auth/me');
        if (data && data.user) {
          // Normalize the role name
          const userRole = normalizeRole(data.user.role);

          setRoles([userRole]);
          setPrimaryRole(userRole);
        }
      } catch (error) {

      }
    }
  };

  const hasRole = (role: AppRole) => {
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, primaryRole, loading, rolesLoaded, signIn, signUp, signOut, hasRole, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      user: null,
      session: null,
      roles: [],
      primaryRole: null,
      loading: true,
      rolesLoaded: false,
      signIn: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => {},
      hasRole: () => false,
      refreshRoles: async () => {},
    };
  }
  return context;
};