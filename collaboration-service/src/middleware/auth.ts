import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebaseAdmin'; // Assuming firebaseAdmin.ts is in the parent directory (src/)

import * as admin from 'firebase-admin'; // Import admin for DecodedIdToken type

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('Authenticating request...');
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    console.log('No Bearer token found in Authorization header.');
    return res.status(401).send({ message: 'Unauthorized: No token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];

  if (!idToken) {
    console.log('Bearer token is empty.');
    return res.status(401).send({ message: 'Unauthorized: Token is empty.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    console.log(`User ${decodedToken.uid} authenticated successfully.`);
    next();
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return res.status(403).send({ message: 'Forbidden: Invalid or expired token.' });
  }
};
