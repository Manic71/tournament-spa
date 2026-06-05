import React, { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";

const AGE_GROUPS = ["U8", "U9", "U10"];

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
  if (teamCount === 2) return 4; // 2× Doppelrunde
  return teamCount * (teamCount - 1); // Doppelrunde
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
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Spielplan erstellen
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:w-auto"
          >
            Zurücksetzen
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
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
  }, [setFooterActions]);

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
          <p className="text-sm text-slate-500">Noch kein Spielplan erstellt.</p>
        </CollapsibleSection>

        <CollapsibleSection
          title="Übersicht Spielfeld-Belegung"
          isOpen={fieldOverviewOpen}
          onToggle={() => setFieldOverviewOpen((prev) => !prev)}
        >
          <p className="text-sm text-slate-500">Noch kein Spielplan erstellt.</p>
        </CollapsibleSection>
      </div>
    </div>
  );
}
