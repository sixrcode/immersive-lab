import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebaseAdmin'; // Assuming firebaseAdmin.ts is in the parent directory (src/)

import * as admin from 'firebase-admin'; // Import admin for DecodedIdToken type

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // console.log('Authenticating request...'); // Reduced verbosity
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    // console.log('No Bearer token found in Authorization header.'); // Reduced verbosity
    return res.status(401).json({ error: 'Unauthorized. No Bearer token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];

  if (!idToken) {
    // console.log('Bearer token is empty.'); // Reduced verbosity
    return res.status(401).json({ error: 'Unauthorized. Bearer token is empty.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    console.log(`User ${decodedToken.uid} authenticated successfully.`); // TODO: Review logging of UIDs in production for privacy compliance.
    next();
  } catch (error: any) { // Explicitly type error as any to access error.code
    console.error('Error verifying ID token:', error.message); // Log error message for context
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Unauthorized. Token expired.', errorCode: error.code });
    }
    return res.status(403).json({ error: 'Forbidden. Invalid or expired token.', errorCode: error.code });
  }
};
