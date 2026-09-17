import jwt from 'jsonwebtoken';


const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  }
  return secret;
};

// The payload carries the user id and the account's token version.
export const signToken = (userId, version = 0) =>
  jwt.sign({ sub: String(userId), v: version }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const verifyToken = (token) => jwt.verify(token, getSecret());
