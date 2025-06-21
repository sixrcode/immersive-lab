import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebaseAdmin'; // Assuming firebaseAdmin.ts is in the parent directory (src/)
import logger from '../logger'; // Import logger
import * as admin from 'firebase-admin'; // Import admin for DecodedIdToken type

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  logger.info('Authenticating request...', { path: req.path });
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    logger.warn('No Bearer token found in Authorization header.', { path: req.path, ip: req.ip });
    return res.status(401).send({ message: 'Unauthorized: No token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];

  if (!idToken) {
    logger.warn('Bearer token is empty.', { path: req.path, ip: req.ip });
    return res.status(401).send({ message: 'Unauthorized: Token is empty.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    logger.info(`User ${decodedToken.uid} authenticated successfully.`, { userId: decodedToken.uid, path: req.path });
    next();
  } catch (error) {
    logger.error('Error verifying ID token', { error, path: req.path, ip: req.ip });
    return res.status(403).send({ message: 'Forbidden: Invalid or expired token.' });
  }
};
