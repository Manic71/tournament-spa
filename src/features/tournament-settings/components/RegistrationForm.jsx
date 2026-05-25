import React from "react";
import { organizers } from "../../../data/organizers";
import { venues } from "../../../data/venues";

/**
 * RegistrationForm Komponente
 * Druckbares Meldeformular mit allen Vereinen
 */
export function RegistrationForm({ settings }) {
  const handlePrint = () => {
    window.print();
  };

  // Finde die Namen für Veranstalter und Halle
  const organizerName = organizers.find(o => o.id === parseInt(settings.organizer))?.name || "";
  const venueName = venues.find(v => v.id === parseInt(settings.venue))?.name || "";
  const formattedDate = settings.date ? new Date(settings.date).toLocaleDateString('de-DE') : "";

  return (
    <div>
      {/* Print Button - wird beim Drucken ausgeblendet */}
      <button
        type="button"
        onClick={handlePrint}
        className="px-4 py-2 border border-slate-300 text-slate-900 rounded-md hover:bg-slate-50 transition-colors font-medium print:hidden"
      >
        Meldeformular drucken
      </button>

      {/* Druckbarer Inhalt - nur beim Drucken sichtbar */}
      <div className="hidden print:block">
        <div className="p-8">
          {/* Kompakte Header-Info */}
          <div className="mb-4 text-sm">
            {organizerName && <span className="font-semibold">Veranstalter: {organizerName}</span>}
            {organizerName && formattedDate && <span className="mx-2">|</span>}
            {formattedDate && <span className="font-semibold">Datum: {formattedDate}</span>}
            {formattedDate && venueName && <span className="mx-2">|</span>}
            {venueName && <span className="font-semibold">Halle: {venueName}</span>}
          </div>

          {/* Tabelle */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-2 border-slate-900 px-4 py-3 text-left font-bold bg-slate-100">
                  Verein
                </th>
                <th className="border-2 border-slate-900 px-4 py-3 text-center font-bold bg-slate-100 w-24">
                  U6
                </th>
                <th className="border-2 border-slate-900 px-4 py-3 text-center font-bold bg-slate-100 w-24">
                  U8
                </th>
                <th className="border-2 border-slate-900 px-4 py-3 text-center font-bold bg-slate-100 w-24">
                  U10
                </th>
              </tr>
            </thead>
            <tbody>
              {organizers.map((organizer) => (
                <tr key={organizer.id}>
                  <td className="border-2 border-slate-900 px-4 py-3 text-slate-900">
                    {organizer.name}
                  </td>
                  <td className="border-2 border-slate-900 px-4 py-3 text-center h-12">
                    {/* Leer für handschriftliche Einträge */}
                  </td>
                  <td className="border-2 border-slate-900 px-4 py-3 text-center h-12">
                    {/* Leer für handschriftliche Einträge */}
                  </td>
                  <td className="border-2 border-slate-900 px-4 py-3 text-center h-12">
                    {/* Leer für handschriftliche Einträge */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
