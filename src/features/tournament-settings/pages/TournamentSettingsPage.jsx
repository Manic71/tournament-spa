import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { FormInput, FormSelect, FormSection, FormGrid } from "../../../components/ui/FormInput";
import { RegistrationForm } from "../components/RegistrationForm";
import { organizers } from "../../../data/organizers";
import { venues } from "../../../data/venues";
import { defaultSettings } from "../../../data/settings";

const STORAGE_KEY = "tournamentSettings";
const STEP_MINUTES = 15;

function formatTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

function adjustTime(value, minutesDelta) {
  const { hour, minute } = parseTime(value || defaultSettings.startTime);
  const totalMinutes = hour * 60 + minute + minutesDelta;
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const nextHour = Math.floor(normalized / 60);
  const nextMinute = normalized % 60;
  return formatTime(nextHour, nextMinute - (nextMinute % STEP_MINUTES));
}

function isEndBeforeStart(startTime, endTime) {
  const { hour: startHour, minute: startMinute } = parseTime(startTime);
  const { hour: endHour, minute: endMinute } = parseTime(endTime);
  return endHour * 60 + endMinute < startHour * 60 + startMinute;
}

function calculateTotalMinutes(startTime, endTime) {
  if (isEndBeforeStart(startTime, endTime)) return 0;
  const { hour: startHour, minute: startMinute } = parseTime(startTime);
  const { hour: endHour, minute: endMinute } = parseTime(endTime);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return Math.max(0, endTotal - startTotal);
}

function calculateMaxRounds(totalMinutes, gameDuration, breakDuration) {
  const gameMinutes = Number(gameDuration) || 0;
  const breakMinutes = Number(breakDuration) || 0;
  if (gameMinutes <= 0) return 0;
  const roundLength = gameMinutes + breakMinutes;
  return roundLength > 0 ? Math.floor((totalMinutes + breakMinutes) / roundLength) : 0;
}

function formatMinutesToHoursMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} Stunden ${mins} Minuten`;
}

function TimeStepper({ label, name, value, onChange }) {
  const handleStep = (delta) => {
    const nextValue = adjustTime(value, delta);
    onChange({ target: { name, value: nextValue } });
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white p-1">
        <button
          type="button"
          onClick={() => handleStep(-STEP_MINUTES)}
          className="px-3 py-2 text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition"
        >
          −
        </button>
        <input
          id={name}
          name={name}
          type="time"
          step={STEP_MINUTES * 60}
          value={value}
          onChange={onChange}
          className="flex-1 min-w-[6rem] border-none bg-transparent px-2 py-2 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleStep(STEP_MINUTES)}
          className="px-3 py-2 text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition"
        >
          +
        </button>
      </div>
    </div>
  );
}

function NumberStepper({ label, name, value, onChange, min = 0, max = 10 }) {
  const currentValue = Number(value) || min;
  
  const handleStep = (delta) => {
    const nextValue = Math.max(min, Math.min(max, currentValue + delta));
    onChange({ target: { name, value: nextValue } });
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white p-1">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={currentValue <= min}
          className="px-3 py-2 text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
        >
          −
        </button>
        <div className="flex-1 px-4 py-2 text-center font-medium text-slate-900">
          {currentValue}
        </div>
        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={currentValue >= max}
          className="px-3 py-2 text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function TournamentSettingsPage() {
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge mit defaultSettings um sicherzustellen, dass neue Felder vorhanden sind
        return { ...defaultSettings, ...parsed };
      } catch (error) {
        console.error("Fehler beim Laden gespeicherter Einstellungen:", error);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  const [saveMessage, setSaveMessage] = useState("");
  const { setFooterActions } = useOutletContext();
  const hasInvalidTimeRange = isEndBeforeStart(settings.startTime, settings.endTime);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    if (hasInvalidTimeRange) {
      setSaveMessage("⚠️ Ende darf nicht vor Beginn liegen.");
      return;
    }

    // Einstellungen in localStorage speichern
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    console.log("Einstellungen gespeichert:", settings);
    
    // Erfolgsmeldung anzeigen
    setSaveMessage("✓ Einstellungen gespeichert!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const totalTournamentMinutes = calculateTotalMinutes(settings.startTime, settings.endTime);
  const maxRounds = calculateMaxRounds(totalTournamentMinutes, settings.gameDuration, settings.breakDuration);

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    setSaveMessage("");
  };

  useEffect(() => {
    if (!setFooterActions) return;
    setFooterActions(
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            onClick={handleSave}
            className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors font-medium"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-slate-300 text-slate-900 rounded-md hover:bg-slate-50 transition-colors font-medium"
          >
            Zurücksetzen
          </button>
        </div>
        <div className="flex justify-start sm:justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-300 text-slate-900 rounded-md hover:bg-slate-50 transition-colors font-medium"
          >
            Meldeformular drucken
          </button>
        </div>
      </div>
    );
    return () => setFooterActions(null);
  }, [handleReset, handleSave, setFooterActions]);

  return (
    <div className="w-[90%] max-w-full mx-auto print:max-w-full print:p-0">
      <h1 className="text-3xl font-bold text-slate-900 mb-4 print:hidden">Turnier Einstellungen</h1>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6 print:space-y-0">
        
        {/* Grundinformationen */}
        <div className="print:hidden">
          <FormSection title="Grundinformationen">
          <FormGrid columns={2}>
            <FormSelect
              label="Veranstalter"
              name="organizer"
              value={settings.organizer}
              onChange={handleChange}
              options={organizers}
              placeholder="Veranstalter wählen..."
            />
            <FormSelect
              label="Halle"
              name="venue"
              value={settings.venue}
              onChange={handleChange}
              options={venues}
              placeholder="Halle wählen..."
            />
          </FormGrid>
          <FormGrid columns={1}>
            <FormInput
              label="Datum"
              name="date"
              type="date"
              value={settings.date}
              onChange={handleChange}
            />
          </FormGrid>
        </FormSection>
        </div>

        {/* Zeiteinstellungen */}
        <div className="print:hidden">
          <FormSection title="Zeiteinstellungen" divider>
          <FormGrid columns={2}>
            <TimeStepper
              label="Beginn"
              name="startTime"
              value={settings.startTime}
              onChange={handleChange}
            />
            <TimeStepper
              label="Ende"
              name="endTime"
              value={settings.endTime}
              onChange={handleChange}
            />
            <NumberStepper
              label="Spieldauer (Minuten)"
              name="gameDuration"
              value={settings.gameDuration}
              onChange={handleChange}
              min={1}
              max={30}
            />
            <NumberStepper
              label="Pause (Minuten)"
              name="breakDuration"
              value={settings.breakDuration}
              onChange={handleChange}
              min={0}
              max={15}
            />
          </FormGrid>

          <FormGrid columns={2}>
            <NumberStepper
              label="Pause nach Spiel"
              name="pauseAfterGame"
              value={settings.pauseAfterGame}
              onChange={handleChange}
              min={0}
              max={2}
            />
            <NumberStepper
              label="Anzahl Spielfelder"
              name="numberOfFields"
              value={settings.numberOfFields}
              onChange={handleChange}
              min={1}
              max={3}
            />
          </FormGrid>

          {hasInvalidTimeRange && (
            <div className="mt-4 rounded-md border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Achtung: Die Endzeit darf nicht vor der Beginnzeit liegen.
            </div>
          )}
        </FormSection>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 print:hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold text-slate-900">Gesamtdauer des Turniers:</span>
            <span>{formatMinutesToHoursMinutes(totalTournamentMinutes)} ({totalTournamentMinutes} Minuten)</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
            <span className="font-semibold text-slate-900">Maximal mögliche Runden:</span>
            <span>{maxRounds}</span>
          </div>
        </div>

        {/* Page action buttons are rendered in the fixed footer */}

        <RegistrationForm settings={settings} />

        {saveMessage && (
          <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 print:hidden">
            {saveMessage}
          </div>
        )}
      </form>
    </div>
  );
}
