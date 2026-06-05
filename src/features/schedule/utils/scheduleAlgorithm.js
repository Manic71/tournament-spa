const AGE_GROUPS = ["U8", "U9", "U10"];

export function getFieldNames(count) {
  const n = Number(count) || 1;
  if (n === 1) return ["Feld A"];
  if (n === 2) return ["Feld A", "Feld C"];
  return ["Feld A", "Feld B", "Feld C"];
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 9 * 60;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Circle-method round-robin: returns array of rounds, each round = [{home, away}, ...]
function buildRRRounds(teams) {
  const n = teams.length;
  if (n < 2) return [];

  const list = [...teams];
  if (n % 2 !== 0) list.push(null); // phantom for odd n
  const size = list.length;
  const rounds = [];

  for (let r = 0; r < size - 1; r++) {
    const games = [];
    for (let i = 0; i < size / 2; i++) {
      const home = list[i];
      const away = list[size - 1 - i];
      if (home !== null && away !== null) games.push({ home, away });
    }
    if (games.length > 0) rounds.push(games);

    // Rotate: keep list[0] fixed, shift rest right by one
    const tail = list.slice(1);
    tail.unshift(tail.pop());
    for (let i = 1; i < size; i++) list[i] = tail[i - 1];
  }

  return rounds;
}

// Maximum games any single team may play. Applied as a hard cap when
// Hin+Rück would produce more (e.g. 8 games for 5 teams).
const MAX_GAMES_PER_TEAM = 6;

// Returns ordered flat game list interleaved by internal RR-round index, then age group.
// Games that would push a team past MAX_GAMES_PER_TEAM are skipped so that
// every team plays at most MAX_GAMES_PER_TEAM games.
//
// Schedule by team count:
//   n=2 → 2× Hin+Rück = 4 games each   (below cap, kept as-is)
//   n=3 → 1× Hin+Rück = 4 games each   (below cap)
//   n=4 → 1× Hin+Rück = 6 games each   (exactly at cap)
//   n≥5 → Hin+partial Rück, capped at 6 games each
//   n≥7 → Hin alone already ≥ 6, Rück skipped entirely
function buildGameList(agTeams) {
  const byRR = {};

  for (const ag of AGE_GROUPS) {
    const teams = agTeams[ag] || [];
    if (teams.length < 2) continue;

    let hinRunden, rueckRunden;
    if (teams.length === 2) {
      hinRunden   = [[{ home: teams[0], away: teams[1] }],
                     [{ home: teams[0], away: teams[1] }]];
      rueckRunden = [[{ home: teams[1], away: teams[0] }],
                     [{ home: teams[1], away: teams[0] }]];
    } else {
      hinRunden   = buildRRRounds(teams);
      rueckRunden = hinRunden.map(round =>
        round.map(g => ({ home: g.away, away: g.home }))
      );
    }

    [...hinRunden, ...rueckRunden].forEach((roundGames, rrIdx) => {
      if (!byRR[rrIdx]) byRR[rrIdx] = {};
      byRR[rrIdx][ag] = roundGames.map(g => ({ ...g, ageGroup: ag }));
    });
  }

  const maxRR    = Math.max(-1, ...Object.keys(byRR).map(Number));
  const counts   = {}; // `${ag}:${teamName}` → games already in result
  const result   = [];

  for (let r = 0; r <= maxRR; r++) {
    for (const ag of AGE_GROUPS) {
      if (!byRR[r]?.[ag]) continue;
      for (const game of byRR[r][ag]) {
        const hk = `${ag}:${game.home}`;
        const ak = `${ag}:${game.away}`;
        if ((counts[hk] || 0) >= MAX_GAMES_PER_TEAM) continue;
        if ((counts[ak] || 0) >= MAX_GAMES_PER_TEAM) continue;
        counts[hk] = (counts[hk] || 0) + 1;
        counts[ak] = (counts[ak] || 0) + 1;
        result.push(game);
      }
    }
  }
  return result;
}

function tk(ageGroup, name) {
  return `${ageGroup}:${name}`;
}

// Returns the earliest tournament round (in display-round units) at which this
// game can be scheduled, given each team's last-played display round.
//
// Rule: after playing in round R, a team must skip at least `pauseRounds`
// rounds before playing again, so the earliest next round is R + pauseRounds + 1.
function earliestRound(game, lastPlayed, pauseRounds) {
  const hLast = lastPlayed[tk(game.ageGroup, game.home)];
  const aLast = lastPlayed[tk(game.ageGroup, game.away)];
  const hEarliest = hLast !== undefined ? hLast + pauseRounds + 1 : 1;
  const aEarliest = aLast !== undefined ? aLast + pauseRounds + 1 : 1;
  return Math.max(hEarliest, aEarliest);
}

/**
 * Generates a complete tournament schedule.
 *
 * Key correctness property: rest is measured in *display* round units.
 * Instead of remapping internal counters at the end (which breaks the
 * rest guarantee), we jump directly to the earliest round any game can
 * be placed.  This guarantees:
 *   – no team plays in consecutive display rounds when pauseAfterGame ≥ 1
 *   – round numbers in the output may be non-sequential (e.g. 1, 3, 5…)
 *     when rest constraints force "empty" rounds; these empty slots show
 *     up as time gaps in the Uhrzeit column.
 *
 * @param {object} settings  – tournamentSettings from localStorage
 * @param {object} teamsData – teamsList from localStorage
 * @returns {Array<{round, gameNumber, time, field, ageGroup, home, away}>}
 */
export function generateSchedule(settings, teamsData) {
  const numFields   = Number(settings.numberOfFields) || 1;
  const pauseRounds = Number(settings.pauseAfterGame) || 0;
  const gameDurMin  = Number(settings.gameDuration)   || 10;
  const breakDurMin = Number(settings.breakDuration)  || 5;
  const fields      = getFieldNames(numFields);
  const startMins   = parseTimeToMinutes(settings.startTime);

  // Build alphabetically-sorted team lists per age group
  const agTeams = { U8: [], U9: [], U10: [] };
  Object.values(teamsData)
    .sort((a, b) => (a.organizerName || "").localeCompare(b.organizerName || "", "de"))
    .forEach(entry => {
      for (const ag of AGE_GROUPS) {
        const count = Number(entry[ag]) || 0;
        for (let i = 1; i <= count; i++) {
          agTeams[ag].push(`${entry.organizerName} ${i}`);
        }
      }
    });

  const remaining  = buildGameList(agTeams);
  if (remaining.length === 0) return [];

  const scheduled  = [];
  const lastPlayed = {}; // teamKey → last display round the team played in
  let displayRound = 0;
  let gameNumber   = 0;

  while (remaining.length > 0) {
    // Compute the earliest round in which *any* remaining game can be played.
    const minEarliest = Math.min(
      ...remaining.map(g => earliestRound(g, lastPlayed, pauseRounds))
    );

    // Advance to the next feasible round (always at least one step forward).
    // This may jump over several rounds, representing enforced rest periods.
    // Those skipped rounds appear as time gaps between games in the schedule.
    displayRound = Math.max(displayRound + 1, minEarliest);

    // Start time of this round: every round slot (played or rested) takes
    // gameDuration + breakDuration minutes.
    const roundTimeMins = startMins + (displayRound - 1) * (gameDurMin + breakDurMin);

    // Collect all games eligible for this round (with their index in `remaining`).
    const eligible = [];
    for (let i = 0; i < remaining.length; i++) {
      if (earliestRound(remaining[i], lastPlayed, pauseRounds) <= displayRound) {
        eligible.push({ i, g: remaining[i], conflicts: 0 });
      }
    }

    // Count pairwise team conflicts so we can prefer least-blocking games.
    for (const ea of eligible) {
      const hka = tk(ea.g.ageGroup, ea.g.home);
      const aka = tk(ea.g.ageGroup, ea.g.away);
      for (const eb of eligible) {
        if (ea === eb) continue;
        const hkb = tk(eb.g.ageGroup, eb.g.home);
        const akb = tk(eb.g.ageGroup, eb.g.away);
        if (hka === hkb || hka === akb || aka === hkb || aka === akb) ea.conflicts++;
      }
    }

    // Greedy field-by-field selection with age-group diversity priority.
    // For each field slot we sort remaining candidates by:
    //   1. Age group not yet represented in this round (0 = new, 1 = duplicate).
    //   2. Fewest conflicts (least blocking of other eligible games).
    const picked     = [];
    const pickedIdxs = new Set();
    const usedTeams  = new Set();
    const ageInRound = new Set();

    for (let f = 0; f < fields.length; f++) {
      const candidates = eligible.filter(e => {
        if (pickedIdxs.has(e.i)) return false;
        const hk = tk(e.g.ageGroup, e.g.home);
        const ak = tk(e.g.ageGroup, e.g.away);
        return !usedTeams.has(hk) && !usedTeams.has(ak);
      });
      if (candidates.length === 0) break;

      candidates.sort((a, b) => {
        const aNew = ageInRound.has(a.g.ageGroup) ? 1 : 0;
        const bNew = ageInRound.has(b.g.ageGroup) ? 1 : 0;
        if (aNew !== bNew) return aNew - bNew;
        return a.conflicts - b.conflicts;
      });

      const chosen = candidates[0];
      picked.push(chosen);
      pickedIdxs.add(chosen.i);
      usedTeams.add(tk(chosen.g.ageGroup, chosen.g.home));
      usedTeams.add(tk(chosen.g.ageGroup, chosen.g.away));
      ageInRound.add(chosen.g.ageGroup);
    }

    // Remove picked games from remaining (descending index order to keep indices valid).
    picked
      .map(p => p.i)
      .sort((a, b) => b - a)
      .forEach(i => remaining.splice(i, 1));

    // Schedule onto fields in pick order.
    picked.forEach(({ g }, fieldIdx) => {
      const hk = tk(g.ageGroup, g.home);
      const ak = tk(g.ageGroup, g.away);
      lastPlayed[hk] = displayRound;
      lastPlayed[ak] = displayRound;
      gameNumber++;
      scheduled.push({
        round: displayRound,
        gameNumber,
        time: minutesToTimeStr(roundTimeMins),
        field: fields[fieldIdx],
        ageGroup: g.ageGroup,
        home: g.home,
        away: g.away,
      });
    });
    // At least one game is always picked per iteration (minEarliest guarantees
    // eligibility for at least one game), so the loop always terminates.
  }

  return scheduled;
}
