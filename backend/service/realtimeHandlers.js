import { onClientMessage, onPresenceChange, setTopicAuthorizer } from "../lib/realtime.js";
import { relayTyping } from "./conversationEvents.js";
import { postIdFromTopic } from "./postEvents.js";
import { getPostService } from "./postService.js";
import { announcePresence } from "./presenceService.js";

const canViewPost = async (postId, userId) => {
  try {
    await getPostService(postId, userId);
    return true;
  } catch {
    return false;
  }
};

export const registerRealtimeHandlers = () => {
  onClientMessage("typing", (user, message) => relayTyping(message.conversationId, user));

  onPresenceChange(announcePresence);

  setTopicAuthorizer((topic, userId) => {
    const postId = postIdFromTopic(topic);
    return postId ? canViewPost(postId, userId) : false;
  });
};
