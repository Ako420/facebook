import { signToken } from '../utils/token.js';
import {
  getUserByIdService,
  registerUser,
  loginUser,
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
} from '../service/authService.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone:user.phone,
  avatarUrl:user.avatarUrl,
  profileUrl:user.profileUrl,
  work:user.work,
  location:user.location,
  intro:user.intro,
  friendsCount: user.friendsCount ?? 0,
  createdAt: user.createdAt,
});

const authResponse = (user) => ({
  token: signToken(user._id),
  user: publicUser(user),
});

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    return res.status(201).json({
      message: 'Account created successfully.',
      ...authResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const user = await loginUser(req.body);

    return res.status(200).json({
      message: 'Logged in successfully.',
      ...authResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/user  (protected)
 */
export const getUser = async (req, res, next) => {
  try {
    return res.status(200).json({ user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/user/:id  (protected)
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await getUserByIdService(req.params.id);

    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/auth/user  (protected)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await updateUserProfile(req.user._id, req.body);

    return res.status(200).json({
      message: 'Profile updated.',
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/password  (protected)
 */
export const changePassword = async (req, res, next) => {
  try {
    await changeUserPassword(req.user._id, req.body);

    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/auth/user  (protected)
 */
export const deleteAccount = async (req, res, next) => {
  try {
    await deleteUserAccount(req.user._id, req.body);

    return res.status(200).json({ message: 'Your account has been deactivated.' });
  } catch (error) {
    next(error);
  }
};
