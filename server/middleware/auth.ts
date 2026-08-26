import { Request, Response, NextFunction } from 'express';
import { getAdminClient } from '../db/supabase.js';

export interface AuthUser {
  id: string;
  email?: string;
  roles: ('candidate' | 'recruiter' | 'editor' | 'admin' | 'super_admin')[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const supabase = getAdminClient();
  
  if (!supabase) {
    res.status(500).json({ error: 'Server database not configured' });
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error("[Auth Middleware] Error fetching role:", roleError);
      res.status(500).json({ error: 'Internal server error during authentication' });
      return;
    }

    let roles = (roleData || []).map(r => r.role as any);
    if (roles.length === 0) {
      roles = ['candidate'];
    }

    req.user = {
      id: user.id,
      email: user.email,
      roles
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};
