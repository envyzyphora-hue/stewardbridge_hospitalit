import LegacyApp from './legacy/LegacyApp';
import './legacy/legacy.css';
import './legacy/skin.css';

// The existing App Router shell owns auth, hash navigation, workspace routes and the
// globally persistent assistant. The cinematic public homepage is mounted by LegacyApp.
export default function HomePage() {
  return <LegacyApp />;
}
