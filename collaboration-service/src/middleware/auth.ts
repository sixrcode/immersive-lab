import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebaseAdmin';           // Firebase Admin wrapper
import * as admin from 'firebase-admin';           // For DecodedIdToken typing
import logger from '../logger';                    // Centralised Winston/Pino logger (assumed)

/**
 * Extend Express Request with a verified Firebase user object.
 */
export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

/**
 * Authentication middleware
 * 1. Checks for `Authorization: Bearer <token>`
 * 2. Verifies the Firebase ID token
 * 3. Attaches `req.user` if valid
 * 4. Logs at each step with contextual metadata
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  logger.info('Authenticating request', { path: req.path, ip: req.ip });

  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    logger.warn('No Bearer token found in Authorization header', {
      path: req.path,
      ip: req.ip,
    });
    return res
      .status(401)
      .json({ message: 'Unauthorized: No Bearer token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) {
    logger.warn('Bearer token is empty', { path: req.path, ip: req.ip });
    return res
      .status(401)
      .json({ message: 'Unauthorized: Bearer token is empty.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    logger.info('User authenticated', {
      userId: decodedToken.uid,
      path: req.path,
    });
    return next();
  } catch (error: any) {
    logger.error('Error verifying ID token', {
      error: error.message,
      code: error.code,
      path: req.path,
      ip: req.ip,
    });

    if (error.code === 'auth/id-token-expired') {
      return res
        .status(401)
        .json({ message: 'Unauthorized: Token expired.', errorCode: error.code });
    }

    return res
      .status(403)
      .json({ message: 'Forbidden: Invalid or expired token.', errorCode: error.code });
  }
};
