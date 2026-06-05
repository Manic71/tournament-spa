import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { generateSchedule, getFieldNames } from "../utils/scheduleAlgorithm";
import { AGE_GROUPS, AGE_GROUP_COLORS, STORAGE_KEYS } from "../../../data/constants";
import { parseMinutes, formatMinutes } from "../../../lib/timeUtils";
import { escapeHtml } from "../../../lib/htmlUtils";

const ALL_FIELDS = ["Feld A", "Feld B", "Feld C"];

function loadTeamTotals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEAMS_LIST);
    if (!raw) return { U8: 0, U9: 0, U10: 0 };
    const teams = JSON.parse(raw);
    return AGE_GROUPS.reduce((acc, ag) => {
      acc[ag] = Object.values(teams).reduce((sum, t) => sum + (Number(t[ag]) || 0), 0);
      return acc;
    }, {});
  } catch {
    return { U8: 0, U9: 0, U10: 0 };
  }
}

function calculateGames(teamCount) {
  if (teamCount <= 1) return 0;
  if (teamCount === 2) return 4;
  if (teamCount >= 5) return teamCount * 3;
  return teamCount * (teamCount - 1);
}

// Returns {start, end, pauseEnd} for any round number, derived from settings.
function getRoundTimes(roundNumber, settings) {
  const gameDurMin  = Number(settings?.gameDuration)  || 10;
  const breakDurMin = Number(settings?.breakDuration) || 5;
  const base = parseMinutes(settings?.startTime) + (roundNumber - 1) * (gameDurMin + breakDurMin);
  return {
    start:    formatMinutes(base),
    end:      formatMinutes(base + gameDurMin),
    pauseEnd: formatMinutes(base + gameDurMin + breakDurMin),
  };
}

function buildTeamStats(schedule, settings) {
  const statsMap = {};
  schedule.forEach((game) => {
    [game.home, game.away].forEach((name) => {
      const key = `${game.ageGroup}:${name}`;
      if (!statsMap[key]) statsMap[key] = { name, ageGroup: game.ageGroup, games: 0, lastRound: 0 };
      statsMap[key].games++;
      if (game.round > statsMap[key].lastRound) statsMap[key].lastRound = game.round;
    });
  });
  return Object.values(statsMap).map((s) => ({
    ...s,
    clubName: s.name.replace(/\s+\d+$/, ""),
    endTime: s.lastRound > 0 ? getRoundTimes(s.lastRound, settings).end : "–",
  }));
}

// Grouped by Verein → Altersklasse → Mannschaft
function computeTeamOverview(schedule, settings) {
  const teamList = buildTeamStats(schedule, settings);
  const clubMap = {};
  teamList.forEach((t) => {
    if (!clubMap[t.clubName]) clubMap[t.clubName] = {};
    if (!clubMap[t.clubName][t.ageGroup]) clubMap[t.clubName][t.ageGroup] = [];
    clubMap[t.clubName][t.ageGroup].push(t);
  });
  return Object.entries(clubMap)
    .sort(([a], [b]) => a.localeCompare(b, "de"))
    .map(([clubName, ageGroups]) => ({
      clubName,
      ageGroups: AGE_GROUPS
        .filter((ag) => ageGroups[ag])
        .map((ag) => ({
          ageGroup: ag,
          teams: ageGroups[ag].sort((a, b) => b.name.localeCompare(a.name, "de")),
        })),
    }));
}

// Grouped by Altersklasse → Verein → Mannschaft
function computeTeamOverviewByAge(schedule, settings) {
  const teamList = buildTeamStats(schedule, settings);
  const ageMap = {};
  teamList.forEach((t) => {
    if (!ageMap[t.ageGroup]) ageMap[t.ageGroup] = {};
    if (!ageMap[t.ageGroup][t.clubName]) ageMap[t.ageGroup][t.clubName] = [];
    ageMap[t.ageGroup][t.clubName].push(t);
  });
  return AGE_GROUPS
    .filter((ag) => ageMap[ag])
    .map((ag) => ({
      ageGroup: ag,
      clubs: Object.entries(ageMap[ag])
        .sort(([a], [b]) => a.localeCompare(b, "de"))
        .map(([clubName, teams]) => ({
          clubName,
          teams: teams.sort((a, b) => b.name.localeCompare(a.name, "de")),
        })),
    }));
}

function FieldOccupancyTable({ games, settings }) {
  const numFields    = Number(settings?.numberOfFields) || 1;
  const activeFields = new Set(getFieldNames(numFields));

  const gameRoundSet = new Set(games.map((g) => g.round));
  const maxRound     = games.length > 0 ? Math.max(...games.map((g) => g.round)) : 0;
  const allRounds    = Array.from({ length: maxRound }, (_, i) => i + 1);

  const byRoundAndField = {};
  games.forEach((g) => {
    if (!byRoundAndField[g.round]) byRoundAndField[g.round] = {};
    byRoundAndField[g.round][g.field] = g;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse border border-slate-200">
        <thead>
          <tr className="bg-slate-100 border-b-2 border-slate-300 text-left text-xs font-semibold uppercase tracking-wide">
            <th className="px-3 py-2 whitespace-nowrap text-slate-500 border-r border-slate-200 w-[1%]">Runde</th>
            {ALL_FIELDS.map((field) => {
              const active = activeFields.has(field);
              return (
                <th
                  key={field}
                  className={`px-3 py-2 whitespace-nowrap border-r border-slate-200 w-1/3 text-center ${active ? "text-slate-500" : "text-slate-300"}`}
                >
                  {field}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {allRounds.map((round) => {
            const isFree = !gameRoundSet.has(round);
            const times  = getRoundTimes(round, settings);

            if (isFree) {
              return (
                <tr key={round} className="border-b border-slate-100">
                  <td className="px-3 py-2 align-middle whitespace-nowrap bg-slate-50 border-r border-slate-200">
                    <div className="font-semibold text-slate-400">Runde {round}</div>
                    <div className="text-xs text-slate-400">{times.start} – {times.pauseEnd}</div>
                  </td>
                  {ALL_FIELDS.map((field) => {
                    const active = activeFields.has(field);
                    return (
                      <td
                        key={field}
                        className={`px-3 py-2 text-center align-middle border-r border-slate-200 ${!active ? "bg-slate-50" : "bg-slate-50/40"}`}
                      >
                        <span className="text-xs italic text-slate-300">
                          {active ? "Freie Runde" : "–"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            }

            return (
              <tr key={round} className="border-b border-slate-100">
                <td className="px-3 py-3 align-top whitespace-nowrap bg-slate-50 border-r border-slate-200">
                  <div className="font-semibold text-slate-900">Runde {round}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{times.start} – {times.pauseEnd}</div>
                </td>
                {ALL_FIELDS.map((field) => {
                  const active = activeFields.has(field);
                  const game   = byRoundAndField[round]?.[field];

                  if (!active) {
                    return (
                      <td key={field} className="px-3 py-3 bg-slate-50 text-center align-middle border-r border-slate-200">
                        <span className="text-slate-300 text-sm select-none">–</span>
                      </td>
                    );
                  }

                  if (!game) {
                    return (
                      <td key={field} className="px-3 py-3 text-center align-middle border-r border-slate-200">
                        <span className="text-slate-300 text-sm">–</span>
                      </td>
                    );
                  }

                  return (
                    <td key={field} className="px-3 py-3 align-top border-r border-slate-200">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${AGE_GROUP_COLORS[game.ageGroup] ?? "bg-slate-200 text-slate-700"}`}>
                            {game.ageGroup}
                          </span>
                          <span className="text-xs text-slate-400">Spiel {game.gameNumber}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 leading-snug">
                          {game.home} ({game.ageGroup}) <span className="text-xs font-semibold text-slate-400">vs</span>
                        </div>
                        <div className="text-sm font-medium text-slate-900 leading-snug">{game.away} ({game.ageGroup})</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GamesTable({ games, settings }) {
  const gameRoundSet  = new Set(games.map((g) => g.round));
  const maxRound      = games.length > 0 ? Math.max(...games.map((g) => g.round)) : 0;
  const allRounds     = Array.from({ length: maxRound }, (_, i) => i + 1);

  const byRound = {};
  games.forEach((g) => {
    if (!byRound[g.round]) byRound[g.round] = [];
    byRound[g.round].push(g);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-300 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 whitespace-nowrap">Runde</th>
            <th className="px-3 py-2 whitespace-nowrap">Spiel-Nr.</th>
            <th className="px-3 py-2 whitespace-nowrap">Uhrzeit</th>
            <th className="px-3 py-2 whitespace-nowrap">Spielfeld</th>
            <th className="px-3 py-2 whitespace-nowrap">Altersgruppe</th>
            <th className="px-3 py-2">Heim</th>
            <th className="px-3 py-2 text-center">vs</th>
            <th className="px-3 py-2">Gast</th>
          </tr>
        </thead>
        {allRounds.map((round, idx) => {
          const isFree = !gameRoundSet.has(round);
          const times  = getRoundTimes(round, settings);

          if (isFree) {
            return (
              <tbody key={round}>
                {idx > 0 && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <div className="border-t-4 border-slate-200" />
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-50/60">
                  <td className="px-3 py-2 font-medium text-slate-500">Runde {round}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{times.start}</td>
                  <td colSpan={5} className="px-3 py-2 text-sm italic text-slate-400">Freie Runde</td>
                </tr>
              </tbody>
            );
          }

          return (
            <tbody key={round}>
              {idx > 0 && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <div className="border-t-4 border-slate-300" />
                  </td>
                </tr>
              )}
              {byRound[round].map((game) => (
                <tr key={game.gameNumber} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">Runde {game.round}</td>
                  <td className="px-3 py-2 text-slate-700">{game.gameNumber}</td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{game.time}</td>
                  <td className="px-3 py-2 text-slate-700">{game.field}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${AGE_GROUP_COLORS[game.ageGroup] ?? "bg-slate-200 text-slate-700"}`}>
                      {game.ageGroup}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{game.home} ({game.ageGroup})</td>
                  <td className="px-3 py-2 text-center text-xs font-semibold text-slate-400">vs</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{game.away} ({game.ageGroup})</td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function CollapsibleSection({ title, isOpen, onToggle, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-3xl px-6 py-4 text-left transition hover:bg-slate-50"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="text-sm text-slate-500">{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && (
        <div className="border-t border-slate-200 px-6 py-6">
          {children}
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const { setFooterActions } = useOutletContext();
  const [gamesOpen, setGamesOpen] = useState(true);
  const [fieldOverviewOpen, setFieldOverviewOpen] = useState(true);
  const [isTeamOverviewOpen, setIsTeamOverviewOpen] = useState(false);
  const [teamOverviewGroupBy, setTeamOverviewGroupBy] = useState("club");
  const [scheduleFixed, setScheduleFixed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.SCHEDULE_FIXED) === "true"; } catch { return false; }
  });

  const [schedule, setSchedule] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE_GAMES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TOURNAMENT_SETTINGS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleCreateSchedule = () => {
    try {
      const rawTeams    = localStorage.getItem(STORAGE_KEYS.TEAMS_LIST);
      const rawSettings = localStorage.getItem(STORAGE_KEYS.TOURNAMENT_SETTINGS);
      if (!rawTeams) { alert("Keine Teamdaten gefunden. Bitte zuerst Teams erfassen und speichern."); return; }
      const teamsData       = JSON.parse(rawTeams);
      const currentSettings = rawSettings ? JSON.parse(rawSettings) : {};
      const result          = generateSchedule(currentSettings, teamsData);
      localStorage.setItem(STORAGE_KEYS.SCHEDULE_GAMES, JSON.stringify(result));
      setSchedule(result);
      setSettings(currentSettings);
    } catch (err) {
      console.error("Fehler bei der Spielplan-Erstellung:", err);
    }
  };

  const handleResetSchedule = () => {
    localStorage.removeItem(STORAGE_KEYS.SCHEDULE_GAMES);
    setSchedule([]);
  };

  const handlePrintFieldOccupancy = () => {
    if (schedule.length === 0) {
      alert("Kein Spielplan vorhanden. Bitte zuerst einen Spielplan erstellen.");
      return;
    }

    const numFields = Number(settings?.numberOfFields) || 1;
    const fields    = getFieldNames(numFields);

    // game lookup: field → round → game
    const gameByFieldRound = {};
    fields.forEach(f => { gameByFieldRound[f] = {}; });
    schedule.forEach(g => { if (gameByFieldRound[g.field]) gameByFieldRound[g.field][g.round] = g; });

    const fieldPages = fields.map((field, idx) => {
      let lastGameRound = 0;
      schedule.forEach(g => { if (g.field === field && g.round > lastGameRound) lastGameRound = g.round; });

      const rows = Array.from({ length: lastGameRound }, (_, i) => i + 1).map(round => {
        const game  = gameByFieldRound[field][round];
        const times = getRoundTimes(round, settings);
        if (game) {
          return `<tr>
            <td>${round}</td>
            <td>${times.start}</td>
            <td>${game.ageGroup}</td>
            <td>${escapeHtml(game.home)} : ${escapeHtml(game.away)}</td>
          </tr>`;
        }
        return `<tr class="free-row">
          <td>${round}</td>
          <td>${times.start}</td>
          <td>--</td>
          <td>---- frei ----</td>
        </tr>`;
      }).join("");

      return `<div class="field-page${idx === fields.length - 1 ? " last" : ""}">
  <h1>${field}</h1>
  <table>
    <thead><tr>
      <th>Runde</th><th>Uhrzeit</th><th>Altersgruppe</th><th>Spiel</th>
    </tr></thead>
    <tbody>
      ${rows}
      <tr class="end-row"><td colspan="4">Ende des Spieltags</td></tr>
    </tbody>
  </table>
</div>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Feldbelegung</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; background: #fff; }
    .field-page { page-break-after: always; }
    .field-page.last { page-break-after: avoid; }
    h1 { text-align: center; font-size: 22pt; font-weight: bold; margin-bottom: 12mm; text-transform: uppercase; letter-spacing: 4px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 4px 10px 6px; text-align: left; font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5pt solid #000; }
    tbody td { padding: 5px 10px; font-size: 11pt; }
    .free-row td { color: #888; font-style: italic; }
    .end-row td { padding-top: 10px; font-style: italic; color: #555; border-top: 0.75pt solid #aaa; }
    @media print { html, body { margin: 0; } }
  </style>
  <script>window.onload = function() { window.print(); }</script>
</head>
<body>
${fieldPages}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Popup wurde blockiert. Bitte Popups für diese Seite erlauben."); return; }
    win.document.write(html);
    win.document.close();
  };

  const handlePrintSchedule = () => {
    if (schedule.length === 0) {
      alert("Kein Spielplan vorhanden. Bitte zuerst einen Spielplan erstellen.");
      return;
    }

    // Load supporting data from localStorage
    let betreuerList = {};
    let teamsData    = {};
    try { const r = localStorage.getItem(STORAGE_KEYS.BETREUER_LIST); if (r) betreuerList = JSON.parse(r); } catch {}
    try { const r = localStorage.getItem(STORAGE_KEYS.TEAMS_LIST);   if (r) teamsData    = JSON.parse(r); } catch {}

    // Build organizerName → organizerId mapping (needed to look up betreuer key)
    const nameToId = {};
    Object.values(teamsData).forEach(t => { nameToId[t.organizerName] = t.organizerId; });

    // Collect unique teams from schedule, enrich with betreuer
    const teamMap = new Map();
    schedule.forEach(game => {
      for (const teamName of [game.home, game.away]) {
        const key = `${game.ageGroup}:${teamName}`;
        if (teamMap.has(key)) continue;
        const clubName      = teamName.replace(/\s+\d+$/, "");
        const numMatch      = teamName.match(/\s+(\d+)$/);
        const teamNumber    = numMatch ? parseInt(numMatch[1], 10) : 1;
        const organizerId   = nameToId[clubName];
        const betreuerKey   = organizerId !== undefined ? `${organizerId}_${game.ageGroup}_${teamNumber}` : null;
        const betreuer      = (betreuerKey && betreuerList[betreuerKey]?.trim()) || "----";
        teamMap.set(key, { ageGroup: game.ageGroup, name: teamName, clubName, teamNumber, betreuer });
      }
    });

    // Sort: club name, then U8 → U9 → U10, then team number
    const AG_ORDER = { U8: 0, U9: 1, U10: 2 };
    const sortedTeams = [...teamMap.values()].sort((a, b) => {
      const clubDiff = a.clubName.localeCompare(b.clubName, "de");
      if (clubDiff !== 0) return clubDiff;
      const agDiff = (AG_ORDER[a.ageGroup] ?? 9) - (AG_ORDER[b.ageGroup] ?? 9);
      if (agDiff !== 0) return agDiff;
      return a.teamNumber - b.teamNumber;
    });

    const formatDate = (d) => {
      if (!d) return "–";
      const [y, m, day] = d.split("-");
      return `${day}.${m}.${y}`;
    };

    const gameDurMin  = Number(settings?.gameDuration)  || 10;
    const breakDurMin = Number(settings?.breakDuration) || 5;
    const formattedDate = formatDate(settings?.date);

    // Generate HTML for a single team section (returns "" when team has no games)
    const makeTeamSection = (team) => {
      const { ageGroup, name, betreuer } = team;
      const teamGames = schedule
        .filter(g => g.ageGroup === ageGroup && (g.home === name || g.away === name))
        .sort((a, b) => a.round - b.round);
      if (teamGames.length === 0) return "";
      const lastGame = teamGames[teamGames.length - 1];
      const endTime  = getRoundTimes(lastGame.round, settings).end;
      const rows = teamGames.map(game => {
        const times = getRoundTimes(game.round, settings);
        return `<tr>
          <td>${game.round}</td>
          <td>${times.start}</td>
          <td>${game.field}</td>
          <td>${escapeHtml(game.home)} : ${escapeHtml(game.away)}</td>
        </tr>`;
      }).join("");
      return `<div class="team-section">
  <div class="hdr">
    <div class="hdr-row1">
      <span class="team-name">${escapeHtml(name)} (${ageGroup})</span>
      <span class="betreuer-label">Betreuer: ${escapeHtml(betreuer)}</span>
    </div>
    <div class="hdr-row2">
      <span>${formattedDate}</span>
      <span>Spieldauer: ${gameDurMin} min (Pause: ${breakDurMin} min)</span>
      <span>Anzahl Spiele: ${teamGames.length}</span>
      <span>Ende des Spieltags: ${endTime}</span>
    </div>
    <div class="hdr-row3">
      <strong>Wichtiger HINWEIS:</strong> Welche Runde aktuell läuft, wird auf der Anzeigetafel unter HEIM angezeigt.
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Runde</th><th>Uhrzeit</th><th>Spielfeld</th><th>Spiel</th>
    </tr></thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>`;
    };

    // Group teams by club, then chunk each club into pages of ≤3 teams.
    // Teams from different clubs always start on a new page.
    const pageGroups = [];
    let prevClub = null;
    let chunk    = [];
    for (const team of sortedTeams) {
      if (team.clubName !== prevClub || chunk.length >= 3) {
        if (chunk.length > 0) pageGroups.push(chunk);
        chunk    = [team];
        prevClub = team.clubName;
      } else {
        chunk.push(team);
      }
    }
    if (chunk.length > 0) pageGroups.push(chunk);

    const pages = pageGroups.map((group, pageIdx) => {
      const sections = group.map(makeTeamSection).filter(Boolean);
      if (sections.length === 0) return "";
      const isLast = pageIdx === pageGroups.length - 1;
      return `<div class="team-page${isLast ? " last" : ""}">
${sections.join('\n<div class="cut-line"></div>\n')}
</div>`;
    }).filter(Boolean).join("\n");

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Spielpläne</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; background: #fff; }
    .team-page { page-break-after: always; }
    .team-page.last { page-break-after: avoid; }
    .cut-line { border-top: 1.5pt dashed #777; margin: 7mm 0; }
    .hdr { margin-bottom: 6mm; border-bottom: 2pt solid #000; padding-bottom: 3mm; }
    .hdr-row1 { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2mm; }
    .team-name { font-size: 18pt; font-weight: bold; }
    .betreuer-label { font-size: 11pt; }
    .hdr-row2 { display: flex; gap: 20px; font-size: 9pt; color: #444; }
    .hdr-row3 { margin-top: 3mm; font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; }
    thead th { padding: 4px 10px 6px; text-align: left; font-size: 8pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5pt solid #000; }
    tbody td { padding: 5px 10px; font-size: 11pt; }
    .end-row td { padding-top: 10px; font-weight: bold; border-top: 0.75pt solid #aaa; }
    @media print { html, body { margin: 0; } }
  </style>
  <script>window.onload = function() { window.print(); }</script>
</head>
<body>
${pages}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Popup wurde blockiert. Bitte Popups für diese Seite erlauben."); return; }
    win.document.write(html);
    win.document.close();
  };

  const handleToggleFixed = () => {
    const next = !scheduleFixed;
    setScheduleFixed(next);
    localStorage.setItem(STORAGE_KEYS.SCHEDULE_FIXED, String(next));
  };

  const teamTotals = useMemo(() => loadTeamTotals(), []);
  const gameCounts = useMemo(() => {
    const perGroup = AGE_GROUPS.reduce((acc, ag) => {
      acc[ag] = calculateGames(teamTotals[ag]);
      return acc;
    }, {});
    perGroup.total = AGE_GROUPS.reduce((sum, ag) => sum + perGroup[ag], 0);
    return perGroup;
  }, [teamTotals]);

  useEffect(() => {
    if (!setFooterActions) return;
    setFooterActions(
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleCreateSchedule}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Spielplan erstellen
          </button>
          <button
            type="button"
            onClick={handleResetSchedule}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Zurücksetzen
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setIsTeamOverviewOpen(true)}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Übersicht Spiele je Mannschaft
          </button>
          {scheduleFixed && (
            <>
              <button
                type="button"
                onClick={handlePrintFieldOccupancy}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
              >
                Feldbelegung drucken
              </button>
              <button
                type="button"
                onClick={handlePrintSchedule}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
              >
                Spielpläne drucken
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleToggleFixed}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium transition sm:w-auto ${scheduleFixed ? "bg-slate-900 text-white hover:bg-slate-700" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"}`}
          >
            {scheduleFixed ? "Spielplan freigeben" : "Spielplan fixieren"}
          </button>
        </div>
      </div>
    );
    return () => setFooterActions(null);
  }, [handleCreateSchedule, handleResetSchedule, handlePrintFieldOccupancy, handlePrintSchedule, handleToggleFixed, setFooterActions]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 px-4 w-full max-w-none">
        <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[minmax(0,33%)_minmax(0,67%)]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900">Spielplan</h1>
              {scheduleFixed && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-600" title="Spielplan fixiert">
                  <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm text-slate-600">
              Automatische Spielplanerstellung für alle Altersgruppen und Spielfelder.
            </p>
          </div>
          <div className="flex items-center border-t border-slate-200 pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
              {AGE_GROUPS.map((ag) => (
                <div key={ag} className="rounded-2xl bg-slate-50 px-3 py-3 text-sm shadow-sm">
                  <div className="font-semibold text-slate-900">{ag}</div>
                  <div className="text-slate-700">{gameCounts[ag]} Spiele</div>
                </div>
              ))}
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm shadow-sm">
                <div className="font-semibold text-slate-900">Gesamt</div>
                <div className="text-slate-700">{gameCounts.total} Spiele</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible sections */}
      <div className="flex flex-col gap-4 px-4">
        <CollapsibleSection
          title="Spiele"
          isOpen={gamesOpen}
          onToggle={() => setGamesOpen((prev) => !prev)}
        >
          {schedule.length === 0 ? (
            <p className="text-sm text-slate-500">Noch kein Spielplan erstellt.</p>
          ) : (
            <GamesTable games={schedule} settings={settings} />
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Belegung Spielfelder"
          isOpen={fieldOverviewOpen}
          onToggle={() => setFieldOverviewOpen((prev) => !prev)}
        >
          {schedule.length === 0 ? (
            <p className="text-sm text-slate-500">Noch kein Spielplan erstellt.</p>
          ) : (
            <FieldOccupancyTable games={schedule} settings={settings} />
          )}
        </CollapsibleSection>
      </div>

      {isTeamOverviewOpen && (() => {
        const groups       = computeTeamOverview(schedule, settings);
        const ageGroupList = computeTeamOverviewByAge(schedule, settings);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <div className="flex shrink-0 items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Übersicht Spiele je Mannschaft</h2>
                  <p className="text-sm text-slate-600">Alle gemeldeten Mannschaften mit Spielanzahl und Turnierende.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTeamOverviewOpen(false)}
                  className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Gruppierung umschalten */}
              <div className="mt-4 shrink-0 flex items-center gap-2">
                <span className="text-xs text-slate-500">Gruppierung:</span>
                <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setTeamOverviewGroupBy("club")}
                    className={`px-3 py-1.5 transition ${teamOverviewGroupBy === "club" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    Verein / Altersklasse
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamOverviewGroupBy("ageGroup")}
                    className={`border-l border-slate-200 px-3 py-1.5 transition ${teamOverviewGroupBy === "ageGroup" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    Altersklasse / Verein
                  </button>
                </div>
              </div>

              <div className="mt-5 flex-1 overflow-y-auto">
                {schedule.length === 0 ? (
                  <p className="text-sm text-slate-500">Noch kein Spielplan erstellt.</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-300 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Mannschaft</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Anz. Spiele</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Letzte Runde</th>
                        <th className="px-3 py-2 text-center whitespace-nowrap">Endzeit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamOverviewGroupBy === "club"
                        ? groups.map(({ clubName, ageGroups }) => (
                            <React.Fragment key={clubName}>
                              <tr className="bg-slate-50">
                                <td colSpan={4} className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-t-2 border-slate-200">
                                  {clubName}
                                </td>
                              </tr>
                              {ageGroups.map(({ ageGroup, teams }) =>
                                teams.map((team) => (
                                  <tr key={`${ageGroup}:${team.name}`} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-3 py-2 font-medium text-slate-900">
                                      <div className="flex items-center gap-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${AGE_GROUP_COLORS[ageGroup] ?? "bg-slate-200 text-slate-700"}`}>
                                          {ageGroup}
                                        </span>
                                        {team.name}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-center text-slate-700">{team.games}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{team.lastRound}</td>
                                    <td className="px-3 py-2 text-center text-slate-700">{team.endTime}</td>
                                  </tr>
                                ))
                              )}
                            </React.Fragment>
                          ))
                        : ageGroupList.map(({ ageGroup, clubs }) => (
                            <React.Fragment key={ageGroup}>
                              <tr>
                                <td colSpan={4} className="px-3 py-2 border-t-2 border-slate-200">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${AGE_GROUP_COLORS[ageGroup] ?? "bg-slate-200 text-slate-700"}`}>
                                    {ageGroup}
                                  </span>
                                </td>
                              </tr>
                              {clubs.map(({ clubName, teams }) => (
                                <React.Fragment key={clubName}>
                                  <tr className="bg-slate-50">
                                    <td colSpan={4} className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                      {clubName}
                                    </td>
                                  </tr>
                                  {teams.map((team) => (
                                    <tr key={team.name} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="py-2 pl-6 pr-3 font-medium text-slate-900">{team.name}</td>
                                      <td className="px-3 py-2 text-center text-slate-700">{team.games}</td>
                                      <td className="px-3 py-2 text-center text-slate-700">{team.lastRound}</td>
                                      <td className="px-3 py-2 text-center text-slate-700">{team.endTime}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          ))
                      }
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-5 flex shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setIsTeamOverviewOpen(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
