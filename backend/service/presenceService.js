import { Friend } from "../model/friend.js";
import { User } from "../model/user.js";
import { sendEphemeral } from "../lib/realtime.js";

const friendIdsOf = async (userId) => {
  const rows = await Friend.find({
    status: "accepted",
    $or: [{ userId }, { friendId: userId }],
  })
    .select("userId friendId")
    .lean();

  return rows.map((row) => (String(row.userId) === String(userId) ? row.friendId : row.userId));
};

export const announcePresence = async (userId, online) => {
  try {
    const lastActiveAt = new Date();
    await User.updateOne({ _id: userId }, { $set: { lastActiveAt } });

    const friends = await friendIdsOf(userId);
    await sendEphemeral(friends, "presence:changed", {
      userId: String(userId),
      online,
      lastActiveAt,
    });
  } catch (error) {
    console.error("Presence announcement failed:", error.message);
  }
};
