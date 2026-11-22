// Who may use /addmovie, /watched and /unwatched: server administrators, or members with one of the roles chosen in /setup.
function canManageMovies({ isAdministrator, memberRoleIds, allowedRoleIds }) {
  if (isAdministrator) return true;
  return memberRoleIds.some((id) => allowedRoleIds.includes(id));
}

module.exports = { canManageMovies };
