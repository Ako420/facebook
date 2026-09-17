import { User } from '../model/user.js';
import { ApiError } from '../utils/apiError.js';
import { CLOSE, disconnectUser } from '../lib/realtime.js';
import {
  isValidObjectId,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
} from '../utils/validators.js';


export const registerUser = async(body) => {
  
    const { name, email,phone,gender,dateOfBirth, password, confirmPassword  } = body || {};

    const errors = validateRegistration({ name, email,phone,gender,dateOfBirth, password, confirmPassword });
    if (Object.keys(errors).length > 0) {
      throw ApiError.badRequest('Please correct the highlighted fields.', errors);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      throw ApiError.conflict('Email already exists.');
    }
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      password,
      gender: String(gender).trim(),
      dateOfBirth: new Date(dateOfBirth),
    });
    return user
};

/**
 * POST /api/auth/login
 */
export const loginUser = async (body) => {
    const { email, password } = body || {};

    const errors = validateLogin({ email, password });
    if (Object.keys(errors).length > 0) {
      throw ApiError.badRequest('Please correct the highlighted fields.', errors);
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select('+password');
   
    if (!user || !(await user.comparePassword(String(password)))) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    if (user.status === 'inactive') {
      throw ApiError.forbidden(
        'This account has been deactivated. Contact support to restore it.',
      );
    }

    return user;
};
/**
 * PATCH /api/auth/user
 * itself by sending extra fields.
 */
export const getUserByIdService = async (id) => {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid user id.');
  }

  const user = await User.findById(id);

  if (!user || user.status === 'inactive') {
    throw ApiError.notFound('User not found.');
  }

  return user;
};

export const updateUserProfile = async (userId, body) => {
  const { name, email,intro,work,location,avatarUrl,profileUrl,phone } = body || {};

  const errors = validateProfileUpdate({ name, email });
  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest('Please correct the highlighted fields.', errors);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('This account no longer exists. Please log in again.');
  }

  if (name !== undefined) {
    user.name = String(name).trim();
  }

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();

    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        throw ApiError.conflict('Email already exists.');
      }
      user.email = normalizedEmail;
    }
  }

  if(intro !== undefined){
    user.intro =String(intro).trim()
  }

  if(phone !==undefined){
    user.phone = String(phone).trim()
  }

  if(work !==undefined){
    user.work = String(work).trim()
  }
  
  if(avatarUrl !== undefined){
    user.avatarUrl = String(avatarUrl).trim()
  }

  if(profileUrl !== undefined){
   user.profileUrl = String(profileUrl).trim()
  }


  if(location !== undefined && location !== null){
    user.location.city = location.city
    user.location.country = location.country
  }
 
  await user.save();
  return user;
};

/**
 * PUT /api/auth/password
 */
export const changeUserPassword = async (userId, body) => {
  const { currentPassword, newPassword, confirmNewPassword } = body || {};

  const errors = validatePasswordChange({ currentPassword, newPassword, confirmNewPassword });
  if (Object.keys(errors).length > 0) {
    throw ApiError.badRequest('Please correct the highlighted fields.', errors);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.unauthorized('This account no longer exists. Please log in again.');
  }

  if (!(await user.comparePassword(String(currentPassword)))) {
    throw ApiError.badRequest('Please correct the highlighted fields.', {
      currentPassword: 'Current password is incorrect.',
    });
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  await disconnectUser(user._id, CLOSE.AUTH_FAILED, 'Your password was changed.');

  return user;
};

/**
 * DELETE /api/auth/user
 */
export const deleteUserAccount = async (userId, body) => {
  const { password } = body || {};

  if (!password) {
    throw ApiError.badRequest('Please correct the highlighted fields.', {
      password: 'Enter your password to confirm.',
    });
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.unauthorized('This account no longer exists. Please log in again.');
  }

  if (!(await user.comparePassword(String(password)))) {
    throw ApiError.badRequest('Please correct the highlighted fields.', {
      password: 'Password is incorrect.',
    });
  }

  user.status = 'inactive';
  await user.save();

  await disconnectUser(user._id, CLOSE.ACCOUNT_CLOSED, 'This account has been deactivated.');

  return user;
};
