const admin = require('../firebaseAdmin'); // Adjust path as necessary

const authenticate = async (req, res, next) => {
  // console.log('Portfolio Microservice: Authenticating request...'); // Reduced verbosity
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    // console.log('Portfolio Microservice: No Bearer token found in Authorization header.'); // Reduced verbosity
    return res.status(401).json({ error: 'Unauthorized. No Bearer token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];

  if (!idToken) {
    // console.log('Portfolio Microservice: Bearer token is empty.'); // Reduced verbosity
    return res.status(401).json({ error: 'Unauthorized. Bearer token is empty.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach user information to the request object
    console.log(`Portfolio Microservice: User ${decodedToken.uid} authenticated successfully.`); // TODO: Review logging of UIDs in production for privacy compliance.
    next();
  } catch (error) {
    console.error('Portfolio Microservice: Error verifying ID token:', error.message); // Log error message for context
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Unauthorized. Token expired.', errorCode: error.code });
    }
    // auth/argument-error often means the token is malformed or invalid
    if (error.code === 'auth/argument-error') {
        return res.status(401).json({ error: 'Unauthorized. Invalid token.', errorCode: error.code });
    }
    return res.status(403).json({ error: 'Forbidden. Invalid or expired token.', errorCode: error.code });
  }
};

module.exports = { authenticate };
