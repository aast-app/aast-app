import React from 'react';

export default function Loader({ inline = false, size = '6em' }) {
  const containerStyle = inline 
    ? { display: 'inline-flex', justifyContent: 'center', alignItems: 'center' } 
    : { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', width: '100%' };

  return (
    <div className="loader-container" style={containerStyle}>
      <svg className="pl" style={{ width: size, height: size }} viewBox="0 0 240 240">
        <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
      </svg>
    </div>
  );
}
