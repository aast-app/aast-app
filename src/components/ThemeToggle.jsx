import { useState } from 'react';
import { Icon } from './WorkspaceUI';
export default function ThemeToggle() {
const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
const toggle = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem('cept_theme', next); };
return <button className="workspace-theme" onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>;
}
