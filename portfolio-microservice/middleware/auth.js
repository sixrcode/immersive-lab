const admin = require('../firebaseAdmin'); // Adjust path as necessary

const authenticate = async (req, res, next) => {
  console.log('Portfolio Microservice: Authenticating request...');
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    console.log('Portfolio Microservice: No Bearer token found in Authorization header.');
    return res.status(401).send({ message: 'Unauthorized: No token provided.' });
  }

  const idToken = authorizationHeader.split('Bearer ')[1];

  if (!idToken) {
    console.log('Portfolio Microservice: Bearer token is empty.');
    return res.status(401).send({ message: 'Unauthorized: Token is empty.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Attach user information to the request object
    console.log(`Portfolio Microservice: User ${decodedToken.uid} authenticated successfully.`);
    next();
  } catch (error) {
    console.error('Portfolio Microservice: Error verifying ID token:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).send({ message: 'Unauthorized: Token expired.' });
    }
    if (error.code === 'auth/argument-error') {
        return res.status(401).send({ message: 'Unauthorized: Invalid token.' });
    }
    return res.status(403).send({ message: 'Forbidden: Invalid or expired token.' });
  }
};

module.exports = { authenticate };
