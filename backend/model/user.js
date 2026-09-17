import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const user_role = ["admin", "user"];
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters."],
      maxlength: [60, "Full name must be at most 60 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_REGEX, "Please provide a valid email address."],
    },
    phone: {
      type: String,
      trim: true,
      minlength: [10, "Phone number must be at least 10 characters."],
      maxlength: [15, "Phone number must be at most 15 characters."],
    },
    dateOfBirth: {
      type: Date,
      required:[true, "Date of birth is required."],
    },
    gender: {
      type: String,
      required: [true, "Gender is required."],
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be either male, female, or other.",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [6, "Password must be at least 6 characters."],
      select: false,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be either active or inactive.",
      },
      default: "active",
    },
    role: {
      type: String,
      enum: {
        values: user_role,
        message: "Role must be either admin or user.",
      },
      default: "user",
    },
    profileUrl: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    work: {
      type: String,
      trim: true,
      minlength: [5, "Work must be at least 5 characters."],
      maxlength: [100, "Work must be at most 100 characters."],
    },
    intro: {
      type: String,
      trim: true,
      maxlength: [200, "Intro must be at most 200 characters."],
    },
    
    location: {
      city: {
        type: String,
        trim: true,
        minlength: [2, "City must be at least 2 characters."],
        maxlength: [50, "City must be at most 50 characters."],
      },
      country: {
        type: String,
        trim: true,
        minlength: [2, "Country must be at least 2 characters."],
        maxlength: [50, "Country must be at most 50 characters."],
      },
    },
    friendsCount: {
      type: Number,
      default: 0,
      min: [0, "Friends count cannot be negative."],
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip the hash from every JSON response as a second line of defence.
userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

export const User = mongoose.model("users", userSchema);
