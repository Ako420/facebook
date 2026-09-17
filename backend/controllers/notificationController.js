import {
  listNotificationsService,
  markAllNotificationsReadService,
  markNotificationReadService,
  unreadNotificationsService,
} from '../service/notificationService.js';

/** GET /api/notifications?limit&before */
export const listNotifications = async (req, res, next) => {
  try {
    const page = await listNotificationsService(req.user._id, {
      limit: req.query.limit,
      before: req.query.before,
    });

    return res.status(200).json(page);
  } catch (error) {
    next(error);
  }
};

/** GET /api/notifications/unread */
export const getUnreadNotifications = async (req, res, next) => {
  try {
    const unread = await unreadNotificationsService(req.user._id);

    return res.status(200).json({ unread });
  } catch (error) {
    next(error);
  }
};

/** POST /api/notifications/:id/read */
export const markNotificationRead = async (req, res, next) => {
  try {
    const unread = await markNotificationReadService(req.user._id, req.params.id);

    return res.status(200).json({ message: 'Notification marked as read.', unread });
  } catch (error) {
    next(error);
  }
};

/** POST /api/notifications/read */
export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const unread = await markAllNotificationsReadService(req.user._id);

    return res.status(200).json({ message: 'All notifications marked as read.', unread });
  } catch (error) {
    next(error);
  }
};
