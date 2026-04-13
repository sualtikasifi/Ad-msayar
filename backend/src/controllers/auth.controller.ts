import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { username, email, password } = parsed.data;
    const result = await authService.registerUser(username, email, password);
    res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { email, password } = parsed.data;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid email or password' });
    } else {
      res.status(500).json({ error: 'Login failed' });
    }
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken required' });
    return;
  }

  try {
    const result = await authService.refreshAccessToken(refreshToken);
    res.json(result);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.revokeRefreshToken(refreshToken).catch(() => {});
  }
  res.json({ message: 'Logged out' });
}

export async function guestLogin(req: Request, res: Response): Promise<void> {
  try {
    const result = await authService.createGuestUser();
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Guest account creation failed' });
  }
}

const claimSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function claimAccount(req: Request, res: Response): Promise<void> {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { username, email, password } = parsed.data;
    const user = await authService.claimGuestAccount(req.userId!, username, email, password);
    res.json({ user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'USERNAME_OR_EMAIL_TAKEN') {
      res.status(409).json({ error: 'Username or email already taken' });
    } else if (msg === 'NOT_GUEST_OR_NOT_FOUND') {
      res.status(400).json({ error: 'Account is not a guest account' });
    } else {
      res.status(500).json({ error: 'Claim failed' });
    }
  }
}
