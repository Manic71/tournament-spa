import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { organizers } from "../../../data/organizers";
import { venues } from "../../../data/venues";

const STORAGE_KEY = "teamsList";
const SETTINGS_STORAGE_KEY = "tournamentSettings";
const GUEST_STORAGE_KEY = "guestClubs";
const BETREUER_STORAGE_KEY = "betreuerList";
const AGE_GROUPS = ["U8", "U9", "U10"];

function NumberStepper({ label, value, onChange, min = 0, max = 3 }) {
  const currentValue = Number(value) || min;

  const handleStep = (delta) => {
    const nextValue = Math.max(min, Math.min(max, currentValue + delta));
    onChange(nextValue);
  };

  return (
    <div className={label ? "flex flex-col gap-1" : "flex flex-col"}>
      {label && (
        <label className="text-xs font-medium text-slate-900">{label}</label>
      )}
      <div className="flex items-center gap-1 rounded-md border border-slate-300 bg-white p-0.5">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={currentValue <= min}
          className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
        >
          −
        </button>
        <div className="flex-1 px-2 py-1 text-center text-sm font-medium text-slate-900">
            {currentValue}
          </div>
        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={currentValue >= max}
          className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState(() => {
    const savedTeams = localStorage.getItem(STORAGE_KEY);
    if (savedTeams) {
      try {
        return JSON.parse(savedTeams);
      } catch (error) {
        console.error("Fehler beim Laden gespeicherter Teams:", error);
        return initializeTeams();
      }
    }
    return initializeTeams();
  });

  const [guestClubName, setGuestClubName] = useState("");
  const [guestClubs, setGuestClubs] = useState(() => loadGuestClubs());
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isRemovedModalOpen, setIsRemovedModalOpen] = useState(false);
  const [isBetreuerModalOpen, setIsBetreuerModalOpen] = useState(false);
  const [removedOrganizers, setRemovedOrganizers] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [betreuer, setBetreuer] = useState(() => {
    const saved = localStorage.getItem(BETREUER_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    return {};
  });
  const [betreuerDraft, setBetreuerDraft] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const { setFooterActions } = useOutletContext();

  function initializeTeams() {
    return organizers.reduce((acc, organizer) => {
      acc[organizer.id] = {
        organizerId: organizer.id,
        organizerName: organizer.name,
        U8: 0,
        U9: 0,
        U10: 0,
      };
      return acc;
    }, {});
  }

  const getTotalTeams = (teamData) =>
    AGE_GROUPS.reduce((sum, ageGroup) => sum + (teamData?.[ageGroup] || 0), 0);

  const loadTournamentSettings = () => {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!savedSettings) {
      return { organizer: "", venue: "", date: "" };
    }

    try {
      const parsed = JSON.parse(savedSettings);
      return {
        organizer: parsed.organizer || "",
        venue: parsed.venue || "",
        date: parsed.date || "",
      };
    } catch {
      return { organizer: "", venue: "", date: "" };
    }
  };

  const tournamentSettings = loadTournamentSettings();
  const tournamentOrganizerName = organizers.find((o) => o.id === parseInt(tournamentSettings.organizer, 10))?.name || "";
  const tournamentVenueName = venues.find((v) => v.id === parseInt(tournamentSettings.venue, 10))?.name || "";

  function loadGuestClubs() {
    const savedGuestClubs = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!savedGuestClubs) {
      return [];
    }

    try {
      return JSON.parse(savedGuestClubs);
    } catch {
      return [];
    }
  }

  const allOrganizers = [...organizers, ...guestClubs];

  const getTournamentTotals = () => {
    return AGE_GROUPS.reduce(
      (totals, ageGroup) => {
        const ageCount = allOrganizers
          .filter((organizer) => !removedOrganizers.includes(organizer.id))
          .reduce((sum, organizer) => sum + (teams[organizer.id]?.[ageGroup] || 0), 0);
        totals[ageGroup] = ageCount;
        totals.total += ageCount;
        return totals;
      },
      { total: 0 }
    );
  };

  const getAgeGroupTooltip = (count) => {
    switch (count) {
      case 0:
        return "keine Mannschaft gemeldet - Altersgruppe wird im Spielplan übersprungen";
      case 1:
        return "nur 1 Mannschaft gemeldet, es sind mindestens 2 Mannschaften notwendig.";
      case 2:
        return "nur 2 Mannschaften gemeldet - es wird 2x Doppelrunde (Hin- und Rückrunde) gespielt.";
      case 3:
        return "es sind nur 3 Mannschaften gemeldet - es wird eine Doppelrunde (Hin- und Rückrunde) gespielt.";
      case 4:
        return "es sind 4 Mannschaften gemeldet - es wird eine Doppelrunde (Hin- und Rückrunde) gespielt.";
      default:
        return "Mehr als 4 Mannschaften gemeldet.";
    }
  };

  const handleTeamCountChange = (organizerId, ageGroup, newValue) => {
    setTeams((prev) => ({
      ...prev,
      [organizerId]: {
        ...prev[organizerId],
        [ageGroup]: newValue,
      },
    }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    console.log("Teams gespeichert:", teams);
    setSaveMessage("✓ Teams gespeichert!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleReset = () => {
    const initialTeams = initializeTeams();
    setTeams(initialTeams);
    setGuestClubs([]);
    setGuestClubName("");
    setRemovedOrganizers([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GUEST_STORAGE_KEY);
    setSaveMessage("");
  };

  const getRegisteredTeamsGrouped = () => {
    const sortedOrganizers = [...visibleOrganizers].sort((a, b) =>
      a.name.localeCompare(b.name, "de")
    );
    return sortedOrganizers
      .map((organizer) => {
        const ageGroupEntries = AGE_GROUPS.map((ageGroup) => {
          const count = teams[organizer.id]?.[ageGroup] || 0;
          const teamList = Array.from({ length: count }, (_, i) => ({
            key: `${organizer.id}_${ageGroup}_${i + 1}`,
            label: `${organizer.name} ${i + 1} (${ageGroup})`,
          }));
          return { ageGroup, teamList };
        }).filter((ag) => ag.teamList.length > 0);
        return { organizer, ageGroupEntries };
      })
      .filter((group) => group.ageGroupEntries.length > 0);
  };

  const toggleGroup = (organizerId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(organizerId)) {
        next.delete(organizerId);
      } else {
        next.add(organizerId);
      }
      return next;
    });
  };

  const handleBetreuerSave = () => {
    setBetreuer(betreuerDraft);
    localStorage.setItem(BETREUER_STORAGE_KEY, JSON.stringify(betreuerDraft));
    setIsBetreuerModalOpen(false);
  };

  const handleBetreuerClearAll = () => {
    setBetreuerDraft({});
  };

  useEffect(() => {
    if (isBetreuerModalOpen) {
      setBetreuerDraft({ ...betreuer });
      setCollapsedGroups(new Set(visibleOrganizers.map((o) => o.id)));
    }
    // intentional snapshot: only sync when modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBetreuerModalOpen]);

  const handleAddGuestClub = () => {
    const trimmedName = guestClubName.trim();
    if (!trimmedName) {
      return;
    }

    const newGuestClub = {
      id: `guest-${Date.now()}`,
      name: trimmedName,
    };

    setGuestClubs((prev) => {
      const updated = [...prev, newGuestClub];
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setTeams((prev) => ({
      ...prev,
      [newGuestClub.id]: {
        organizerId: newGuestClub.id,
        organizerName: newGuestClub.name,
        U8: 0,
        U9: 0,
        U10: 0,
      },
    }));

    setGuestClubName("");
    setIsGuestModalOpen(false);
  };

  useEffect(() => {
    if (!setFooterActions) return;
    setFooterActions(
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Zurücksetzen
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setIsGuestModalOpen(true)}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Gastverein hinzufügen
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Druck Teilnahme-Statistik
          </button>
          <button
            type="button"
            onClick={() => setIsBetreuerModalOpen(true)}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Betreuer verwalten
          </button>
        </div>
      </div>
    );

    return () => setFooterActions(null);
  }, [handleReset, handleSave, setFooterActions]);

  const handleRemoveOrganizer = (organizerId) => {
    setRemovedOrganizers((prev) => [...prev, organizerId]);
  };

  const handleRestoreOrganizer = (organizerId) => {
    setRemovedOrganizers((prev) => prev.filter((id) => id !== organizerId));
  };

  const handleRestoreAll = () => {
    setRemovedOrganizers([]);
  };

  const visibleOrganizers = allOrganizers.filter(
    (organizer) => !removedOrganizers.includes(organizer.id)
  );

  return (
    <div className="w-full">
      <div className="print:hidden">
        <div className="mb-6 px-4 w-full max-w-none">
          <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-[minmax(0,33%)_minmax(0,67%)]">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-slate-900">Team-Erfassung</h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Anzahl der Mannschaften pro Verein und Altersgruppe festlegen.
              </p>
            </div>
            <div className="space-y-4 border-t border-slate-200 pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Übersicht</h2>
                  <p className="text-sm text-slate-600">
                    Gesamtanzahl der Mannschaften je Altersgruppe und für das Turnier.
                  </p>
                </div>
                {removedOrganizers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsRemovedModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    entferne Vereine
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                {Object.entries(getTournamentTotals()).map(([key, value]) => {
                  const isAgeGroup = AGE_GROUPS.includes(key);
                  const isError = isAgeGroup && value <= 1;
                  const isWarning = isAgeGroup && value === 2;
                  let tileClasses = 'bg-slate-50';
                  if (isError) {
                    tileClasses = 'bg-rose-50 border border-rose-200';
                  } else if (isWarning) {
                    tileClasses = 'bg-amber-50 border border-amber-200';
                  }
                  return (
                    <div
                      key={key}
                      className={`group relative rounded-2xl px-3 py-3 text-sm text-slate-900 shadow-sm ${tileClasses}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-slate-900">{key === 'total' ? 'Gesamt' : key}</div>
                        {isAgeGroup && (
                          <div className="relative">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                              i
                            </span>
                            <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-lg group-hover:block">
                              {getAgeGroupTooltip(value)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>{value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 gap-4 mb-6 px-4 w-full max-w-none">
        {visibleOrganizers.map((organizer) => {
          const teamData = teams[organizer.id];
          return (
            <div
              key={organizer.id}
              className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-base font-semibold text-slate-900">
                    {organizer.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {organizer.name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                    {getTotalTeams(teamData)} Teams
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOrganizer(organizer.id)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
                  >
                    Entfernen
                  </button>
                </div>
              </div>

              <div className="grid gap-1 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {AGE_GROUPS.map((ageGroup) => (
                  <div key={ageGroup} className="overflow-hidden">
                    <div className="flex h-full rounded-2xl border border-slate-200 bg-slate-50 divide-x divide-slate-200">
                      {/* linke Hälfte: Badge + Stepper */}
                      <div className="w-1/2 px-3 py-2 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                          {ageGroup}
                        </span>
                        <div className="w-24">
                          <NumberStepper
                            value={teamData?.[ageGroup] || 0}
                            onChange={(value) =>
                              handleTeamCountChange(organizer.id, ageGroup, value)
                            }
                            min={0}
                            max={3}
                          />
                        </div>
                      </div>

                      {/* rechte Hälfte: Mannschaftsnamen */}
                      <div className="w-1/2 px-3 py-2 flex items-center">
                        <div className="text-xs text-slate-700 w-full">
                          {(teamData?.[ageGroup] || 0) > 0 ? (
                            <ul className="space-y-1">
                              {Array.from({ length: teamData?.[ageGroup] || 0 }).map((_, i) => (
                                <li key={`${ageGroup}-${i}`}>
                                  {organizer.name} {i + 1} ({ageGroup})
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Page action buttons are rendered in the fixed footer */}

      {saveMessage && (
        <div className="mx-4 max-w-7xl rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          {saveMessage}
        </div>
      )}

      {isGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Gastverein hinzufügen</h2>
                <p className="text-sm text-slate-600">Gib den Namen des Gastvereins ein.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label htmlFor="guest-club-name" className="block text-sm font-medium text-slate-900">
                Vereinsname
              </label>
              <input
                id="guest-club-name"
                type="text"
                value={guestClubName}
                onChange={(event) => setGuestClubName(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Vereinsname eingeben"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsGuestModalOpen(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleAddGuestClub}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Gastverein hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRemovedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Entfernte Vereine</h2>
                <p className="text-sm text-slate-600">Wähle Vereine aus, die wieder zum Turnier hinzugefügt werden sollen.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRemovedModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {removedOrganizers.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Es sind derzeit keine entfernten Vereine vorhanden.
                </div>
              ) : (
                <div className="space-y-3">
                  {removedOrganizers.map((organizerId) => {
                    const organizer = allOrganizers.find((o) => o.id === organizerId);
                    return (
                      <div key={organizerId} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-900 font-medium">{organizer?.name}</div>
                        <button
                          type="button"
                          onClick={() => handleRestoreOrganizer(organizerId)}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                        >
                          Wieder hinzufügen
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsRemovedModalOpen(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRestoreAll();
                    setIsRemovedModalOpen(false);
                  }}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Alle wieder hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBetreuerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Betreuer verwalten</h2>
                <p className="text-sm text-slate-600">Betreuer je gemeldeter Mannschaft eingeben.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBetreuerModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 overflow-y-auto flex-1 space-y-2 pr-1">
              {getRegisteredTeamsGrouped().length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Es sind noch keine Mannschaften gemeldet.
                </div>
              ) : (
                getRegisteredTeamsGrouped().map(({ organizer, ageGroupEntries }) => {
                  const isCollapsed = collapsedGroups.has(organizer.id);
                  return (
                    <div key={organizer.id} className="overflow-hidden rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => toggleGroup(organizer.id)}
                        className="flex w-full items-center justify-between bg-slate-100 px-4 py-3 transition hover:bg-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-900">{organizer.name}</span>
                          {(() => {
                            const allTeams = ageGroupEntries.flatMap((ag) => ag.teamList);
                            const savedCount = allTeams.filter((t) => betreuerDraft[t.key]?.trim()).length;
                            return (
                              <span className="text-xs font-medium text-slate-500">
                                {savedCount} / {allTeams.length}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-slate-500 text-xs">{isCollapsed ? "▶" : "▼"}</span>
                      </button>

                      {!isCollapsed && (
                        <div className="bg-white">
                          {ageGroupEntries.map(({ ageGroup, teamList }, agIndex) => (
                            <React.Fragment key={ageGroup}>
                              {agIndex > 0 && ageGroupEntries[agIndex - 1].teamList.length > 1 && (
                                <div className="mx-4 border-t-2 border-slate-200" />
                              )}
                              {teamList.map((team) => (
                                <div
                                  key={team.key}
                                  className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center"
                                >
                                  <span className="shrink-0 text-sm text-slate-900 sm:w-56">
                                    {team.label}
                                  </span>
                                  <input
                                    type="text"
                                    value={betreuerDraft[team.key] || ""}
                                    onChange={(e) =>
                                      setBetreuerDraft((prev) => ({
                                        ...prev,
                                        [team.key]: e.target.value,
                                      }))
                                    }
                                    placeholder="Betreuer eingeben"
                                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                                  />
                                </div>
                              ))}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between shrink-0">
              <button
                type="button"
                onClick={handleBetreuerClearAll}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Alle löschen
              </button>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsBetreuerModalOpen(false)}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Schließen
                </button>
                <button
                  type="button"
                  onClick={handleBetreuerSave}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="hidden print:block">
        <div className="p-4 space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Teilnahme-Statistik</h1>
          <div className="flex flex-col gap-2 text-sm text-slate-900">
            <div>
              <span className="font-semibold">Veranstalter:</span> {tournamentOrganizerName || '–'}
            </div>
            <div>
              <span className="font-semibold">Datum:</span> {tournamentSettings.date || '–'}
            </div>
            <div>
              <span className="font-semibold">Halle:</span> {tournamentVenueName || '–'}
            </div>
          </div>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-2 border-slate-900 px-4 py-3 text-left font-bold bg-slate-100">Verein</th>
                <th className="border-2 border-slate-900 px-4 py-3 text-center font-bold bg-slate-100 w-24">U8</th>
                <th className="border-2 border-slate-900 px-4 py-3 text-center font-bold bg-slate-100 w-24">U9</th>
                <th className="border-2 border-slate-900 px-4 py-3 text-center font-bold bg-slate-100 w-24">U10</th>
                <th className="border-2 border-slate-900 px-4 py-3 text-center font-bold bg-slate-100 w-24">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrganizers.map((organizer) => {
                const teamData = teams[organizer.id];
                const organizerTotal = getTotalTeams(teamData);
                return (
                  <tr key={organizer.id}>
                    <td className="border-2 border-slate-900 px-4 py-3 text-slate-900">{organizer.name}</td>
                    <td className="border-2 border-slate-900 px-4 py-3 text-center">{teamData?.U8 || 0}</td>
                    <td className="border-2 border-slate-900 px-4 py-3 text-center">{teamData?.U9 || 0}</td>
                    <td className="border-2 border-slate-900 px-4 py-3 text-center">{teamData?.U10 || 0}</td>
                    <td className="border-2 border-slate-900 px-4 py-3 text-center font-semibold">{organizerTotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td className="border-2 border-slate-900 px-4 py-3">Summe</td>
                {AGE_GROUPS.map((ageGroup) => (
                  <td key={ageGroup} className="border-2 border-slate-900 px-4 py-3 text-center">{getTournamentTotals()[ageGroup]}</td>
                ))}
                <td className="border-2 border-slate-900 px-4 py-3 text-center">{getTournamentTotals().total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
