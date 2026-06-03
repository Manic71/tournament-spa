import React, { useState } from "react";
import { organizers } from "../../../data/organizers";

const STORAGE_KEY = "teamsList";
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

  const [removedOrganizers, setRemovedOrganizers] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");

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
    setRemovedOrganizers([]);
    localStorage.removeItem(STORAGE_KEY);
    setSaveMessage("");
  };

  const handleRemoveOrganizer = (organizerId) => {
    setRemovedOrganizers((prev) => [...prev, organizerId]);
  };

  const handleRestoreOrganizer = (organizerId) => {
    setRemovedOrganizers((prev) => prev.filter((id) => id !== organizerId));
  };

  const handleRestoreAll = () => {
    setRemovedOrganizers([]);
  };

  const visibleOrganizers = organizers.filter(
    (organizer) => !removedOrganizers.includes(organizer.id)
  );

  return (
    <div className="w-full">
      <div className="mb-6 px-4 w-full max-w-none">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Team-Erfassung</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Anzahl der Mannschaften pro Verein und Altersgruppe festlegen.
        </p>
      </div>

      <div className="mb-4 px-4 w-full max-w-none">
        {removedOrganizers.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong>{removedOrganizers.length}</strong> entfernte Vereine
              </div>
              <div className="flex flex-wrap gap-2">
                {removedOrganizers.map((organizerId) => {
                  const organizer = organizers.find((o) => o.id === organizerId);
                  return (
                    <button
                      key={organizerId}
                      type="button"
                      onClick={() => handleRestoreOrganizer(organizerId)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 hover:bg-slate-100 transition"
                    >
                      Wieder hinzufügen: {organizer?.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleRestoreAll}
                  className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition"
                >
                  Alle wieder hinzufügen
                </button>
              </div>
            </div>
          </div>
        )}
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

              <div className="grid gap-1 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {AGE_GROUPS.map((ageGroup) => (
                  <div key={ageGroup} className="overflow-hidden">
                    <div className="flex h-full rounded-2xl border border-slate-200 bg-slate-50 divide-x divide-slate-200">
                      {/* linke Hälfte: Badge + Stepper */}
                      <div className="w-1/2 p-3 flex items-center justify-between gap-3">
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
                      <div className="w-1/2 p-3 flex items-center">
                        <div className="text-sm text-slate-700 w-full">
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

      <div className="flex flex-col gap-3 px-4 mb-6 max-w-7xl sm:flex-row sm:items-center">
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

      {saveMessage && (
        <div className="mx-4 max-w-7xl rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          {saveMessage}
        </div>
      )}
    </div>
  );
}
