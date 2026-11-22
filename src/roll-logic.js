// Pure dice logic, kept separate from Discord so it can be tested.
// `rng` is injectable (defaults to Math.random) so tests are deterministic.
function rollDie(sides, rng = Math.random) {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new RangeError('sides must be an integer of at least 2');
  }
  return Math.floor(rng() * sides) + 1;
}

module.exports = { rollDie };
