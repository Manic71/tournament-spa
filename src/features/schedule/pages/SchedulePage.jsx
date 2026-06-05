import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { generateSchedule, getFieldNames } from "../utils/scheduleAlgorithm";

const AGE_GROUPS = ["U8", "U9", "U10"];
const SCHEDULE_STORAGE_KEY = "scheduleGames";

function loadTeamTotals() {
  try {
    const raw = localStorage.getItem("teamsList");
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
  if (teamCount === 2) return 4;          // 2× Hin+Rück = 4 je Team
  if (teamCount >= 5) return teamCount * 3; // max 6 je Team → n*6/2
  return teamCount * (teamCount - 1);    // n=3→6, n=4→12 Gesamtspiele
}

const ALL_FIELDS = ["Feld A", "Feld B", "Feld C"];

const AGE_GROUP_COLORS = {
  U8:  "bg-sky-100 text-sky-700",
  U9:  "bg-emerald-100 text-emerald-700",
  U10: "bg-rose-100 text-rose-700",
};

function parseMinutes(timeStr) {
  const [h, m] = (timeStr || "09:00").split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(timeStr, minutes) {
  return formatMinutes(parseMinutes(timeStr) + minutes);
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

  const [schedule, setSchedule] = useState(() => {
    try {
      const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("tournamentSettings");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleCreateSchedule = () => {
    try {
      const rawTeams    = localStorage.getItem("teamsList");
      const rawSettings = localStorage.getItem("tournamentSettings");
      if (!rawTeams) { alert("Keine Teamdaten gefunden. Bitte zuerst Teams erfassen und speichern."); return; }
      const teamsData       = JSON.parse(rawTeams);
      const currentSettings = rawSettings ? JSON.parse(rawSettings) : {};
      const result          = generateSchedule(currentSettings, teamsData);
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(result));
      setSchedule(result);
      setSettings(currentSettings);
    } catch (err) {
      console.error("Fehler bei der Spielplan-Erstellung:", err);
    }
  };

  const handleResetSchedule = () => {
    localStorage.removeItem(SCHEDULE_STORAGE_KEY);
    setSchedule([]);
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
          <button
            type="button"
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Spielplan fixieren
          </button>
        </div>
      </div>
    );
    return () => setFooterActions(null);
  }, [handleCreateSchedule, handleResetSchedule, setFooterActions]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 px-4 w-full max-w-none">
        <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[minmax(0,33%)_minmax(0,67%)]">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900">Spielplan</h1>
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
          title="Übersicht Spielfeld-Belegung"
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
