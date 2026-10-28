import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { Brand, Icon } from './WorkspaceUI';
import api from '../api';
export default function Sidebar() {
const { user, logout } = useAuth();
const [online, setOnline] = useState(null);
useEffect(() => { let alive = true; const check = async () => { if(document.hidden) return; try { const r = await api.get('/health'); if(alive) setOnline(r.data?.status === 'ok'); } catch { if(alive) setOnline(false); } }; check(); const timer = setInterval(check, 30000); return () => { alive=false; clearInterval(timer); }; }, []);
const links = [['/', 'Overview', 'grid'], ['/cept-data', 'CEPT data', 'calendar'], ['/cept-create', 'CEPT Create', 'create']];
if(user?.role === 'admin') links.push(['/master-database', 'Master database', 'database'], ['/admin', 'Admin control', 'shield'], ['/user-logs', 'Activity log', 'history']);
return <aside className="steam-sidebar"><Brand/><p className="nav-caption">WORKSPACE</p><nav className="nav-links" aria-label="Main navigation">{links.map(([path,label,icon],i) => <NavLink data-nav-icon={icon} key={path} to={path} end={path === '/'} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><Icon name={icon}/><span>{label}</span><small>{String(i+1).padStart(2,'0')}</small></NavLink>)}</nav><div className="sidebar-bottom"><div className="sidebar-person"><span className="person-avatar">{user?.username?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}</span><div><strong>{user?.username}</strong><small>{user?.role === 'admin' ? 'Administrator' : user?.role === 'mod' ? 'Moderator' : 'Team member'}</small></div></div><button className="workspace-signout" onClick={logout}><Icon name="logout"/>Sign out</button><div className="workspace-health"><i data-online={online}/>{online === null ? 'Connecting' : online ? 'Service connected' : 'Service unavailable'}</div></div></aside>;
}
