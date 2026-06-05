import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";

const AGE_GROUP_COLORS = {
  U8:  "bg-sky-100 text-sky-700",
  U9:  "bg-emerald-100 text-emerald-700",
  U10: "bg-rose-100 text-rose-700",
};

function decodePayload(hash) {
  try {
    const clean = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!clean) return null;
    // Restore URL-safe base64url (- → +, _ → /) and re-add = padding
    const b64 = clean.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
    const binary = atob(padded);
    const bytes  = Uint8Array.from(binary, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function formatDate(d) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="rounded-full bg-slate-100 p-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="w-12 h-12 text-slate-400">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <rect x="7" y="7" width="3" height="3" />
          <rect x="14" y="7" width="3" height="3" />
          <rect x="7" y="14" width="3" height="3" />
          <path d="M14 14h3v3" />
          <path d="M14 17h3" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Spielplan abrufen</h2>
        <p className="text-slate-500 max-w-xs leading-relaxed">
          Scanne den QR-Code deiner Mannschaft, um deinen persönlichen Spielplan anzuzeigen.
        </p>
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <div className="rounded-full bg-rose-100 p-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className="w-10 h-10 text-rose-500">
          <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Ungültiger QR-Code</h2>
        <p className="text-slate-500">Bitte scanne den QR-Code deiner Mannschaft erneut.</p>
      </div>
    </div>
  );
}

export default function ViewerPage() {
  const { setFooterActions } = useOutletContext();
  const [payload, setPayload] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (setFooterActions) setFooterActions(null);
  }, [setFooterActions]);

  useEffect(() => {
    function readHash() {
      const hash = window.location.hash;
      if (!hash || hash === "#") {
        setPayload(null);
        setHasError(false);
        return;
      }
      const decoded = decodePayload(hash);
      if (!decoded) {
        setHasError(true);
        setPayload(null);
      } else {
        setHasError(false);
        setPayload(decoded);
      }
    }

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  if (hasError) return <ErrorState />;
  if (!payload)  return <EmptyState />;

  const { name, ageGroup, betreuer, venue, date, gameDurMin, breakDurMin, games = [] } = payload;
  const agColor     = AGE_GROUP_COLORS[ageGroup] || "bg-slate-100 text-slate-600";
  const formattedDate = formatDate(date);
  const hasBetreuer = betreuer && betreuer !== "----";

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">

      {/* Team header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{name}</h1>
            <span className={`inline-block mt-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ${agColor}`}>
              {ageGroup}
            </span>
          </div>
          {(formattedDate || venue) && (
            <div className="text-right text-sm text-slate-500 shrink-0">
              {formattedDate && <div className="font-medium text-slate-700">{formattedDate}</div>}
              {venue && <div>{venue}</div>}
            </div>
          )}
        </div>

        {hasBetreuer && (
          <div className="mt-3 text-sm text-slate-600">
            Betreuer: <span className="font-medium text-slate-800">{betreuer}</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
          <span>Spieldauer: {gameDurMin} min</span>
          <span>·</span>
          <span>Pause: {breakDurMin} min</span>
          <span>·</span>
          <span>{games.length} Spiele</span>
        </div>
      </div>

      {/* Schedule table */}
      {games.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-400 text-sm">
          Keine Spiele gefunden.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 text-left w-12">Runde</th>
                <th className="px-3 py-3 text-left w-16">Uhrzeit</th>
                <th className="px-3 py-3 text-left w-10">Feld</th>
                <th className="px-3 py-3 text-left">Gegner</th>
                <th className="px-3 py-3 text-center w-10">H/G</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {games.map((game, i) => {
                const isHome  = game.home === name;
                const opponent = isHome ? game.away : game.home;
                const fieldShort = game.field.replace("Feld ", "");

                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-700">{game.round}</td>
                    <td className="px-3 py-3 text-slate-600 tabular-nums">{game.time}</td>
                    <td className="px-3 py-3 font-medium text-slate-700">{fieldShort}</td>
                    <td className="px-3 py-3 text-slate-800 font-medium">{opponent}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${isHome ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                        {isHome ? "H" : "G"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-slate-300 pt-2">OÖHV Mini-Spieltag</p>
    </div>
  );
}
