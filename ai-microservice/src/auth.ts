const admin = require('firebase-admin'); // Assuming admin is initialized elsewhere

/**
 * Firebase Authentication Middleware.
 * Verifies the Firebase ID token from the Authorization header.
 * Attaches the decoded token (user information) to req.user if successful.
 */
const authenticate = async (req, res, next) => {
  // TODO: The benchmark bypass functionality needs a secure redesign if required for testing.
  // It should not disable auth in a way that could affect production environments.
  // if (process.env.RUNNING_BENCHMARKS === 'true') {
  //   console.log('RUNNING_BENCHMARKS is true, bypassing authentication.');
  //   req.user = { uid: 'benchmark_user' }; // Optionally mock a user object
  //   return next();
  // }

  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    // console.warn('Authentication error: No Bearer token provided.'); // Reduced verbosity
    return res.status(401).json({ error: 'Unauthorized. No Bearer token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];
  if (!idToken) {
    // console.warn('Authentication error: Bearer token is empty.'); // Reduced verbosity
    return res.status(401).json({ error: 'Unauthorized. Bearer token is empty.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach user information to the request object
    console.log(`User ${decodedToken.uid} authenticated.`);
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Authentication error: Invalid ID token.', error.message); // Log error message for context
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Unauthorized. Token expired.', errorCode: error.code });
    }
    // For other auth errors, return 403 as the token is invalid/forbidden, not just unauthorized
    return res.status(403).json({ error: 'Unauthorized. Invalid token.', errorCode: error.code });
  }
};

module.exports = { authenticate };
