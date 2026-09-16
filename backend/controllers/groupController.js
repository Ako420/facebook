import {
  approveMemberService,
  createGroupService,
  deleteGroupService,
  getGroupService,
  inviteMembersService,
  joinGroupService,
  leaveGroupService,
  listDiscoverService,
  listInvitationsService,
  listMembersService,
  listMyGroupsService,
  removeMemberService,
  setMemberRoleService,
  updateGroupService,
} from '../service/groupService.js';

const publicPerson = (user) =>
  user && typeof user === 'object'
    ? {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        work: user.work,
        friendsCount: user.friendsCount ?? 0,
      }
    : { id: user };


const publicGroup = (group, membership) => {
  const isMember = membership?.status === 'active';
  const canRead = group.privacy === 'public' || isMember;

  return {
    id: group._id,
    name: group.name,
    description: group.description ?? '',
    privacy: group.privacy,
    coverUrl: group.coverUrl,
    memberCount: group.memberCount ?? 0,
    createdAt: group.createdAt,
    createdBy: canRead ? publicPerson(group.createdBy) : null,
    viewerRole: isMember ? membership.role : null,
    viewerStatus: membership?.status ?? null,
    isMember,
    canRead,
  };
};

const publicMember = (row) => ({
  id: row._id,
  role: row.role,
  status: row.status ?? 'active',
  joinedAt: row.createdAt,
  user: publicPerson(row.userId),
  invitedBy: row.invitedBy ? publicPerson(row.invitedBy) : null,
});

/** GET /api/groups */
export const listGroups = async (req, res, next) => {
  try {
    if (String(req.query.mine) === 'true') {
      const rows = await listMyGroupsService(req.user._id);

      return res.status(200).json({
        groups: rows.map(({ group, role }) =>
          publicGroup(group, { role, status: 'active' }),
        ),
      });
    }

    const rows = await listDiscoverService(req.user._id, {
      limit: req.query.limit,
      q: req.query.q,
    });

    return res.status(200).json({
      groups: rows.map(({ group, viewerStatus }) =>
        publicGroup(group, viewerStatus ? { status: viewerStatus } : null),
      ),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/groups/invitations */
export const listInvitations = async (req, res, next) => {
  try {
    const rows = await listInvitationsService(req.user._id);

    return res.status(200).json({
      invitations: rows.map(({ group, invitedBy, invitedAt }) => ({
        group: publicGroup(group, { status: 'invited' }),
        invitedBy: invitedBy ? publicPerson(invitedBy) : null,
        invitedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/groups */
export const createGroup = async (req, res, next) => {
  try {
    const group = await createGroupService(req.user._id, req.body);
    await group.populate('createdBy', 'name avatarUrl');

    return res.status(201).json({
      message: 'Group created.',
      group: publicGroup(group.toObject(), { role: 'admin', status: 'active' }),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/groups/:id */
export const getGroup = async (req, res, next) => {
  try {
    const { group, membership } = await getGroupService(req.params.id, req.user._id);
    await group.populate('createdBy', 'name avatarUrl');

    return res.status(200).json({ group: publicGroup(group.toObject(), membership) });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/groups/:id */
export const editGroup = async (req, res, next) => {
  try {
    const group = await updateGroupService(req.params.id, req.user._id, req.body);
    await group.populate('createdBy', 'name avatarUrl');

    return res.status(200).json({
      message: 'Group updated.',
      group: publicGroup(group.toObject(), { role: 'admin', status: 'active' }),
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/groups/:id */
export const removeGroup = async (req, res, next) => {
  try {
    await deleteGroupService(req.params.id, req.user._id);

    return res.status(200).json({ message: 'Group deleted.' });
  } catch (error) {
    next(error);
  }
};

/** POST /api/groups/:id/members */
export const joinGroup = async (req, res, next) => {
  try {
    const { status } = await joinGroupService(req.params.id, req.user._id);

    return res.status(201).json({
      status,
      message:
        status === 'requested'
          ? 'Your request was sent to the group admins.'
          : 'You joined the group.',
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/groups/:id/invites */
export const inviteMembers = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { invited, approved, awaitingAdmin } = await inviteMembersService(
      req.params.id,
      req.user._id,
      body.userIds ?? body.userId,
    );

    return res.status(201).json({
      message:
        invited.length === 0
          ? 'They were already waiting to join, so they are in.'
          : 'Invitations sent.',
      invited: invited.map(String),
      approved: approved.map(String),
      awaitingAdmin: awaitingAdmin.map(String),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/groups/:id/members/:userId
 * Accepting your own invitation, or an admin letting a request in.
 */
export const approveMember = async (req, res, next) => {
  try {
    const row = await approveMemberService(
      req.params.id,
      req.user._id,
      req.params.userId,
    );

    return res.status(200).json({
      message: String(req.user._id) === String(req.params.userId)
        ? 'You joined the group.'
        : 'They are in the group.',
      status: row.status,
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/groups/:id/members */
export const leaveGroup = async (req, res, next) => {
  try {
    await leaveGroupService(req.params.id, req.user._id);

    return res.status(200).json({ message: 'You left the group.' });
  } catch (error) {
    next(error);
  }
};

/** GET /api/groups/:id/members */
export const listMembers = async (req, res, next) => {
  try {
    const rows = await listMembersService(req.params.id, req.user._id, {
      limit: req.query.limit,
      status: req.query.status || 'active',
    });

    return res.status(200).json({ members: rows.map(publicMember) });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/groups/:id/members/:userId */
export const removeMember = async (req, res, next) => {
  try {
    const row = await removeMemberService(
      req.params.id,
      req.user._id,
      req.params.userId,
    );

    const isSelf = String(req.user._id) === String(req.params.userId);

    const messages = isSelf
      ? { invited: 'Invitation declined.', requested: 'Request withdrawn.' }
      : {
          active: 'Member removed.',
          invited: 'Invitation withdrawn.',
          requested: 'Request declined.',
        };

    return res.status(200).json({ message: messages[row.status] ?? 'Removed.' });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/groups/:id/members/:userId/role */
export const setMemberRole = async (req, res, next) => {
  try {
    const row = await setMemberRoleService(
      req.params.id,
      req.user._id,
      req.params.userId,
      req.body?.role,
    );

    return res.status(200).json({
      message: row.role === 'admin' ? 'They are now an admin.' : 'They are no longer an admin.',
      role: row.role,
    });
  } catch (error) {
    next(error);
  }
};
