import mongoose from "mongoose";

export const group_roles = ["admin", "member"];



export const group_member_states = ["active", "invited", "requested"];

const groupMemberSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Groups",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    role: {
      type: String,
      enum: {
        values: group_roles,
        message: "Role must be either admin or member.",
      },
      default: "member",
    },
    status: {
      type: String,
      enum: {
        values: group_member_states,
        message: "Status must be active, invited or requested.",
      },
      default: "active",
      index: true,
    },
    // Who sent the invitation, so the invitee can see who asked them in.
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true },
);

// One row per person per group, enforced by the database so two requests
// arriving together cannot both write one.
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export const GroupMember = mongoose.model("GroupMembers", groupMemberSchema);
