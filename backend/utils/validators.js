import mongoose from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


export const validateRegistration = ({ name, email,phone,gender,dateOfBirth, password, confirmPassword }) => {
  const errors = {};

  if (!name || !String(name).trim()) {
    errors.name = 'Full name is required.';
  } else if (String(name).trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters.';
  }
  if (!dateOfBirth || !String(dateOfBirth).trim()) {
    errors.dateOfBirth = 'Date of birth is required.';
  } 

  if (!gender || !String(gender).trim()) {
    errors.gender = 'Gender is required.';
  } else if (!['male', 'female', 'other'].includes(String(gender).trim())) {
    errors.gender = 'Invalid gender. Please choose either male, female, or other.';
  }

  if (!email || !String(email).trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(String(email).trim())) {
    errors.email = 'Please provide a valid email address.';
  }
  
  if (String(phone).trim().length < 10 || String(phone).trim().length > 15) {
    errors.phone = 'Phone number must be between 10 and 15 characters.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (String(password).length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }


  if (confirmPassword === undefined || confirmPassword === null || confirmPassword === '') {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password && String(password) !== String(confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

export const validateLogin = ({ email, password }) => {
  const errors = {};
  if (!email || !String(email).trim()) errors.email = 'Email is required.';
  if (!password) errors.password = 'Password is required.';
  return errors;
};

export const validateProfileUpdate = ({ name, email }) => {
  const errors = {};

  if (name !== undefined) {
    if (!String(name).trim()) {
      errors.name = 'Full name is required.';
    } else if (String(name).trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters.';
    }
  }

  if (email !== undefined) {
    if (!String(email).trim()) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(String(email).trim())) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  return errors;
};

export const validatePasswordChange = ({ currentPassword, newPassword, confirmNewPassword }) => {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required.';
  }

  if (!newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (String(newPassword).length < 6) {
    errors.newPassword = 'Password must be at least 6 characters.';
  }

  if (!confirmNewPassword) {
    errors.confirmNewPassword = 'Please confirm your new password.';
  } else if (newPassword && String(newPassword) !== String(confirmNewPassword)) {
    errors.confirmNewPassword = 'Passwords do not match.';
  }

  return errors;
};

