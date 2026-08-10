import React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';

function Layout({ versionInfo, openUpdateModal }) {
  const location = useLocation();
  const element = useOutlet(); // Use the frozen outlet element to prevent double-flashes during exit animations

  return (
    <div className="steam-layout-container">
      <Sidebar versionInfo={versionInfo} openUpdateModal={openUpdateModal} />
      
      <div className="steam-main-canvas">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="steam-page-content"
          >
            {element}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Layout;
