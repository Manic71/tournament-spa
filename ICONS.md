# Icons-Anleitung

Dieses Projekt verwendet **lucide-react** für schwarz-weiße Icons.

## Installation

Icons sind bereits in `package.json` eingetragen. Nach dem Update müssen die Dependencies installiert werden:

```bash
npm install
```

## Verwendung

### Option 1: Direkt aus lucide-react importieren

```jsx
import { Calendar, Users, Settings } from "lucide-react";

function MyComponent() {
  return <Calendar size={24} className="text-slate-900" />;
}
```

### Option 2: Icon-Mapping aus `lib/icons.js`

```jsx
import { icons } from "@/lib/icons";

const ScheduleIcon = icons.schedule;
<ScheduleIcon size={24} />;
```

### Option 3: IconButton-Komponente verwenden

```jsx
import { IconButton } from "@/components/ui/IconButton";
import { icons } from "@/lib/icons";

<IconButton 
  icon={icons.add} 
  label="Hinzufügen" 
  onClick={handleAdd}
  variant="primary"
  size="md"
/>;
```

## Verfügbare Icons

### Navigation
- `schedule` - Calendar (Spielplan)
- `teams` - Users (Teams)
- `settings` - Settings (Einstellungen)
- `live` - Radio (Live-Ticker)
- `print` - Printer (Drucken)
- `viewer` - Eye (Viewer)

### Aktionen
- `add` - Plus (Hinzufügen)
- `edit` - Edit (Bearbeiten)
- `delete` - Trash2 (Löschen)
- `search` - Search (Suchen)
- `download` - Download (Herunterladen)
- `upload` - Upload (Hochladen)
- `share` - Share2 (Teilen)
- `filter` - Filter (Filtern)

### Navigation
- `chevronDown` - ChevronDown
- `chevronUp` - ChevronUp
- `arrowRight` - ArrowRight
- `arrowLeft` - ArrowLeft

### Status
- `alert` - AlertCircle (Warnung)
- `success` - CheckCircle (Erfolg)
- `error` - XCircle (Fehler)
- `info` - Info (Information)

### UI
- `menu` - Menu (Menü)
- `close` - X (Schließen)

## Größen

Lucide-React Icons können mit der `size`-Property skaliert werden:

```jsx
<Calendar size={16} />  // Klein
<Calendar size={20} />  // Standard
<Calendar size={24} />  // Groß
<Calendar size={32} />  // Sehr groß
```

## Farben mit Tailwind

```jsx
<Calendar className="text-slate-900" />      // Schwarz
<Calendar className="text-slate-500" />      // Grau
<Calendar className="text-white" />          // Weiß
<Calendar className="text-red-600" />        // Rot
```

## Weitere Icons hinzufügen

1. Icon aus [lucide-react](https://lucide.dev) wählen
2. In `src/lib/icons.js` importieren und hinzufügen:

```javascript
import { NewIcon } from "lucide-react";

export const icons = {
  // ... existing icons
  newIcon: NewIcon,
};
```

3. Im Code verwenden:

```jsx
import { icons } from "@/lib/icons";

<icons.newIcon size={20} />
```

## Styling-Best-Practices

- **Aktive Navigation**: `text-white` auf dunklem Hintergrund
- **Hover-State**: `hover:bg-slate-100` für Icon-Buttons
- **Disabled-State**: `opacity-50 cursor-not-allowed` auf Buttons
- **Konsistente Größe**: 18px für Navigation, 16px für Inline-Icons
