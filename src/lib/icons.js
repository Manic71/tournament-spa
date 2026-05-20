/**
 * Icon-Mapping für die Anwendung
 * Zentrale Stelle für Icon-Definitionen
 */
import {
  Calendar,
  Users,
  Settings,
  Radio,
  Printer,
  Eye,
  Plus,
  Edit,
  Trash2,
  Search,
  Download,
  Upload,
  Share2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Menu,
  X,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

export const icons = {
  // Navigation
  schedule: Calendar,
  teams: Users,
  settings: Settings,
  live: Radio,
  print: Printer,
  viewer: Eye,

  // Aktionen
  add: Plus,
  edit: Edit,
  delete: Trash2,
  search: Search,
  download: Download,
  upload: Upload,
  share: Share2,
  filter: Filter,

  // Navigation-Chevrons
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,

  // Status
  alert: AlertCircle,
  success: CheckCircle,
  error: XCircle,
  info: Info,

  // UI
  menu: Menu,
  close: X,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
};

export default icons;
