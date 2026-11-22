// Pure helpers for movie night (no Discord, no network) so they can be tested.

// True for a timezone name the runtime knows (IANA names such as "America/New_York"). Spaces around it are not accepted.
function isValidTimezone(tz) {
  if (typeof tz !== 'string' || tz === '' || tz !== tz.trim() || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

module.exports = { isValidTimezone };
