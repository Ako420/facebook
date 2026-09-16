import {
  getFriendByIdService,
  createFriendService,
  updateFriendStatusService,
  deleteFriendService,
  getFriendsByUserIdService,
  getSuggestionsService,
} from "../service/friendService.js";


const publicPerson = (user) => ({
  id: user._id,
  name: user.name,
  avatarUrl: user.avatarUrl,
  work: user.work,
  friendsCount: user.friendsCount ?? 0,
});

export const getFriendById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const friend = await getFriendByIdService(id);
    return res.status(200).json({ friend });
  } catch (error) {
    next(error);
  }
};

/** GET /api/friend/user — accepted friends plus pending both ways. */
export const getFriendsByUserId = async (req, res, next) => {
  try {
    const result = await getFriendsByUserIdService(req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/friend/suggestions — people not yet connected to you. */
export const getSuggestions = async (req, res, next) => {
  try {
    const users = await getSuggestionsService(req.user._id, req.query.limit);
    return res.status(200).json({ users: users.map(publicPerson) });
  } catch (error) {
    next(error);
  }
};

export const createFriend = async (req, res, next) => {
  try {
    const { friendId } = req.body;
    const friend = await createFriendService(req.user._id, friendId);
    return res.status(201).json({ message: "Friend request sent", friend });
  } catch (error) {
    next(error);
  }
};

export const updateFriendStatus = async (req, res, next) => {
  const { status } = req.body;
  const { id } = req.params;
  try {
    const friend = await updateFriendStatusService(id, status, req.user._id);
    return res.status(200).json({ message: "Friend status updated", friend });
  } catch (error) {
    next(error);
  }
};

export const deleteFriend = async (req, res, next) => {
  const { id } = req.params;
  try {
    await deleteFriendService(id, req.user._id);
    return res.status(200).json({ message: "Friend deleted" });
  } catch (error) {
    next(error);
  }
};
