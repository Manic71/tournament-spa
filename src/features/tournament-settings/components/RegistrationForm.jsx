import React from "react";
import { organizers } from "../../../data/organizers";

/**
 * RegistrationForm Komponente
 * Druckbares Meldeformular mit allen Vereinen
 */
export function RegistrationForm({ settings }) {
  const handlePrint = () => {
    window.print();
  };

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
          {/* Header */}
          <div className="mb-6 border-b-2 border-slate-900 pb-4">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Meldeformular</h1>
            {settings.date && (
              <p className="text-sm text-slate-700">Datum: {new Date(settings.date).toLocaleDateString('de-DE')}</p>
            )}
            {settings.venue && (
              <p className="text-sm text-slate-700">
                Halle: {organizers.find(o => o.id === parseInt(settings.venue))?.name || settings.venue}
              </p>
            )}
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

          {/* Footer / Hinweise */}
          <div className="mt-6 text-xs text-slate-600">
            <p>Bitte tragen Sie die Anzahl der gemeldeten Teams pro Altersklasse ein.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
