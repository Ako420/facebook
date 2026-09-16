import jwt from 'jsonwebtoken';
import { User } from '../model/user.js';
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/apiError.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw ApiError.unauthorized('Please log in to continue.');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Your session has expired. Please log in again.');
      }
      throw ApiError.unauthorized('Invalid authentication token.');
    }

  
    const user = await User.findById(payload.sub);
    if (!user) {
      throw ApiError.unauthorized('This account no longer exists. Please log in again.');
    }

    // A token issued before deactivation must stop working straight away.
    if (user.status === 'inactive') {
      throw ApiError.unauthorized('This account has been deactivated.');
    }
    
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};
