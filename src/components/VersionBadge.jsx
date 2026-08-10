import React from 'react';

const VersionBadge = ({ versionInfo, openUpdateModal, className = "" }) => {
  if (!versionInfo) return null;

  const isOutdated = versionInfo.isOutdated;
  const dotClass = isOutdated ? 'dot-red' : 'dot-green';

  return (
    <div 
      className={`version-badge ${className} ${isOutdated ? 'clickable' : ''}`}
      onClick={isOutdated ? openUpdateModal : undefined}
    >
      <span className="version-number">v{versionInfo.localVersion}</span>
      <div className={`pulsating-dot ${dotClass}`}></div>
    </div>
  );
};

export default VersionBadge;
