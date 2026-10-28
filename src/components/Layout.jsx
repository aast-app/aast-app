import { useLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, useIsPresent } from 'framer-motion';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { Suspense } from 'react';
import Loader from './Loader';
function Page({children}) { const reduced = useReducedMotion(); const present = useIsPresent(); return <motion.main id="main-content" inert={!present} className="steam-page-content" initial={{opacity:0,y:reduced?0:10}} animate={{opacity:1,y:0,transition:{duration:reduced?0:.38}}} exit={{opacity:0,y:reduced?0:-6,transition:{duration:reduced?0:.18}}}><Suspense fallback={<div className="route-loading"><Loader /></div>}>{children}</Suspense></motion.main>; }
export default function Layout() {
const { pathname } = useLocation(); const outlet = useOutlet();
const title = {'/':'Overview','/cept-data':'CEPT data','/cept-create':'CEPT Create','/master-database':'Master database','/admin':'Admin control','/user-logs':'Activity log'}[pathname] || 'Workspace';
return <div className="steam-layout-container"><a className="skip-link" href="#main-content">Skip to content</a><Sidebar/><div className="steam-main-canvas"><header className="workspace-topbar"><div><span>CEPT Helper</span><b>/</b><strong>{title}</strong></div><div className="workspace-topbar-tools"><time>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date())}</time><ThemeToggle/></div></header><div className="workspace-page-frame"><AnimatePresence mode="wait" initial={false}><Page key={pathname}>{outlet}</Page></AnimatePresence></div></div></div>;
}
