import jwt from 'jsonwebtoken';


const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. Add it to your .env file.');
  }
  return secret;
};

// The payload  carries only the user id. 
export const signToken = (userId) =>
  jwt.sign({ sub: String(userId)}, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const verifyToken = (token) => jwt.verify(token, getSecret());
