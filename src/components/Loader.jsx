

export default function Loader({ inline = false, size = '6em' }) {
  const dimension = size === 'sm' ? '1.5em' : size === 'lg' ? '6em' : size;
  const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', flex: inline ? undefined : '1 0 auto', minHeight: inline || size === 'sm' ? dimension : '180px' };

  return (
    <div className="loader-container" role="status" aria-label="Loading" style={containerStyle}>
      <svg aria-hidden="true" className="pl" style={{ width: dimension, height: dimension }} viewBox="0 0 240 240">
        <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
        <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
      </svg>
    </div>
  );
}
