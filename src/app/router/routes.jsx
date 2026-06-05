import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import TournamentSettingsPage from "../../features/tournament-settings/pages/TournamentSettingsPage";
import TeamsPage from "../../features/teams/pages/TeamsPage";
import SchedulePage from "../../features/schedule/pages/SchedulePage";

function Placeholder({ name }) {
  return (
    <div className="p-6 bg-white rounded shadow-sm">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <p className="mt-2 text-slate-600">Diese Seite ist noch in Entwicklung.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <SchedulePage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "einstellungen", element: <TournamentSettingsPage /> },
      { path: "live", element: <Placeholder name="Live-Ticker" /> },
      { path: "viewer", element: <Placeholder name="Viewer" /> },
    ]
  }
]);
