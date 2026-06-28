// koiny-ui.jsx — Shared primitive components for Koiny Parent Dashboard prototype
// Exports to window: PALETTE, Avatar, ProgressBar, SectionHeader, FilterChip, StatusBadge,
//                    MissionCard, GoalCard, HistoryItem, ModalSheet

const PALETTE = {
  indigo:  { from:'#818cf8', to:'#4338ca', light:'#eef2ff', accent:'#4f46e5', soft:'#e0e7ff', text:'#3730a3', muted:'#c7d2fe' },
  emerald: { from:'#34d399', to:'#059669', light:'#ecfdf5', accent:'#10b981', soft:'#d1fae5', text:'#065f46', muted:'#6ee7b7' },
  rose:    { from:'#fb7185', to:'#be123c', light:'#fff1f2', accent:'#f43f5e', soft:'#ffe4e6', text:'#9f1239', muted:'#fda4af' },
  amber:   { from:'#fbbf24', to:'#d97706', light:'#fffbeb', accent:'#f59e0b', soft:'#fef3c7', text:'#92400e', muted:'#fcd34d' },
  blue:    { from:'#60a5fa', to:'#2563eb', light:'#eff6ff', accent:'#3b82f6', soft:'#dbeafe', text:'#1e40af', muted:'#93c5fd' },
  purple:  { from:'#c084fc', to:'#9333ea', light:'#faf5ff', accent:'#a855f7', soft:'#f3e8ff', text:'#6b21a8', muted:'#d8b4fe' },
  cyan:    { from:'#22d3ee', to:'#0891b2', light:'#ecfeff', accent:'#06b6d4', soft:'#cffafe', text:'#164e63', muted:'#67e8f9' },
  teal:    { from:'#2dd4bf', to:'#0f766e', light:'#f0fdfa', accent:'#14b8a6', soft:'#ccfbf1', text:'#134e4a', muted:'#5eead4' },
  pink:    { from:'#f472b6', to:'#db2777', light:'#fdf2f8', accent:'#ec4899', soft:'#fce7f3', text:'#831843', muted:'#f9a8d4' },
  orange:  { from:'#fb923c', to:'#ea580c', light:'#fff7ed', accent:'#f97316', soft:'#ffedd5', text:'#7c2d12', muted:'#fdba74' },
};

function Avatar({ seed, colorClass = 'indigo', size = 48, pendingCount = 0 }) {
  const pal = PALETTE[colorClass] || PALETTE.indigo;
  const src = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}`;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:'50%',
        background:`linear-gradient(135deg,${pal.from},${pal.to})`,
        padding:2.5, boxSizing:'border-box',
        boxShadow:`0 2px 12px ${pal.accent}44`,
      }}>
        <div style={{
          width:'100%', height:'100%', borderRadius:'50%',
          background:pal.light, overflow:'hidden',
          display:'flex', alignItems:'flex-end', justifyContent:'center',
        }}>
          <img src={src} alt={seed}
            style={{ width:'115%', marginLeft:'-7.5%', marginBottom:-2 }}
            onError={e => e.target.style.display='none'} />
        </div>
      </div>
      {pendingCount > 0 && (
        <div style={{
          position:'absolute', top:-3, right:-3,
          width:20, height:20, borderRadius:'50%',
          background:'#f43f5e', border:'2.5px solid white',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:9, fontWeight:900, color:'white',
        }}>{pendingCount > 9 ? '9+' : pendingCount}</div>
      )}
    </div>
  );
}

function ProgressBar({ value, max, colorClass = 'indigo', height = 6 }) {
  const pal = PALETTE[colorClass] || PALETTE.indigo;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, borderRadius:height, background:'#f1f5f9', overflow:'hidden' }}>
      <div style={{
        height:'100%', width:`${pct}%`, borderRadius:height,
        background:`linear-gradient(90deg,${pal.from},${pal.to})`,
        transition:'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: pct > 0 ? `0 0 8px ${pal.accent}55` : 'none',
      }} />
    </div>
  );
}

function SectionHeader({ label, action, onAction }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 0 10px' }}>
      <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.15em', color:'#94a3b8', textTransform:'uppercase' }}>{label}</span>
      {action && (
        <button onClick={onAction} style={{ fontSize:12, fontWeight:700, color:'#6366f1', background:'none', border:'none', cursor:'pointer', padding:0 }}>{action}</button>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'5px 14px', borderRadius:100, fontSize:11, fontWeight:700,
      border:'none', cursor:'pointer', transition:'all 0.2s',
      background: active ? '#4f46e5' : '#f1f5f9',
      color: active ? 'white' : '#64748b',
      boxShadow: active ? '0 4px 12px #4f46e544' : 'none',
    }}>{label}</button>
  );
}

function StatusBadge({ status }) {
  const map = {
    PENDING:   { bg:'#fff7ed', color:'#c2410c', label:'PENDING' },
    ACTIVE:    { bg:'#f0fdf4', color:'#15803d', label:'ACTIVE' },
    VALIDATED: { bg:'#eef2ff', color:'#4338ca', label:'DONE' },
    REJECTED:  { bg:'#fff1f2', color:'#be123c', label:'REJECTED' },
    COMPLETED: { bg:'#ecfdf5', color:'#065f46', label:'COMPLETED' },
  };
  const s = map[status] || map.ACTIVE;
  return (
    <span style={{ padding:'3px 8px', borderRadius:6, fontSize:9, fontWeight:800, letterSpacing:'0.1em', background:s.bg, color:s.color }}>{s.label}</span>
  );
}

function MissionCard({ mission, colorClass = 'indigo', onApprove, onReject }) {
  const pal = PALETTE[colorClass] || PALETTE.indigo;
  const isPending = mission.status === 'PENDING';
  return (
    <div style={{
      background:'white', borderRadius:18, padding:'12px 14px',
      boxShadow:'0 2px 12px rgba(0,0,0,0.06)',
      borderLeft:`3px solid ${isPending ? '#f97316' : pal.accent}`,
      marginBottom:10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          background: isPending ? '#fff7ed' : pal.light,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <i className={`fa-solid ${isPending ? 'fa-clock' : 'fa-star'}`}
            style={{ fontSize:13, color: isPending ? '#f97316' : pal.accent }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{mission.title}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
            <StatusBadge status={mission.status} />
          </div>
        </div>
        <div style={{ fontSize:16, fontWeight:900, color: isPending ? '#f97316' : pal.accent, letterSpacing:'-0.5px', flexShrink:0 }}>
          +{mission.reward}€
        </div>
      </div>
      {isPending && onApprove && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
          <button onClick={() => onApprove(mission)} style={{
            height:36, borderRadius:10, border:'none', cursor:'pointer',
            background:'#ecfdf5', color:'#15803d', fontSize:11, fontWeight:800, letterSpacing:'0.05em',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
          }}><i className="fa-solid fa-check" style={{ fontSize:10 }} /> APPROVE</button>
          <button onClick={() => onReject(mission)} style={{
            height:36, borderRadius:10, border:'none', cursor:'pointer',
            background:'#fff1f2', color:'#be123c', fontSize:11, fontWeight:800, letterSpacing:'0.05em',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
          }}><i className="fa-solid fa-xmark" style={{ fontSize:10 }} /> REJECT</button>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, balance, colorClass = 'indigo', currency = '€' }) {
  const pal = PALETTE[colorClass] || PALETTE.indigo;
  const pct = Math.min(100, Math.round((balance / goal.target) * 100));
  const remaining = Math.max(0, goal.target - balance).toFixed(2);
  const isReady = balance >= goal.target;
  const iconMap = { 'fa-bicycle':'🚲', 'fa-gamepad':'🎮', 'fa-cube':'🧱', 'fa-gift':'🎁', 'fa-shirt':'👕', 'fa-book':'📚', 'fa-music':'🎵' };
  const emoji = iconMap[goal.icon] || '🌟';
  return (
    <div style={{ background:'white', borderRadius:18, padding:'14px 16px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <div style={{
          width:40, height:40, borderRadius:12, flexShrink:0,
          background: isReady ? '#ecfdf5' : pal.light,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
        }}>{emoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{goal.name}</div>
          <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginTop:1 }}>
            {isReady ? '🎉 Ready to buy!' : `${remaining}€ to go`}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:15, fontWeight:800, color: isReady ? '#15803d' : '#1e293b' }}>{pct}%</div>
          <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600 }}>{goal.target}€</div>
        </div>
      </div>
      <ProgressBar value={balance} max={goal.target} colorClass={isReady ? 'emerald' : colorClass} height={6} />
    </div>
  );
}

function HistoryItem({ item, currency = '€', isLast = false }) {
  const t = item.title.toLowerCase();
  const isPenalty = t.includes('amende') || t.includes('penalty') || t.includes('fine');
  const isPurchase = t.includes('achat') || t.includes('purchase') || t.includes('retrait');
  const isGift = t.includes('cadeau') || t.includes('bonus') || t.includes('gift');

  let icon = 'fa-coins', iconBg = '#eef2ff', iconColor = '#4f46e5';
  if (isPenalty)  { icon = 'fa-triangle-exclamation'; iconBg = '#fff1f2'; iconColor = '#be123c'; }
  else if (isPurchase) { icon = 'fa-bag-shopping'; iconBg = '#f8fafc'; iconColor = '#64748b'; }
  else if (isGift)    { icon = 'fa-gift'; iconBg = '#fdf4ff'; iconColor = '#9333ea'; }
  else if (item.amount > 0) { icon = 'fa-star'; iconBg = '#f0fdf4'; iconColor = '#15803d'; }

  const parts = item.title.split(' : ');
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12, padding:'11px 0',
      borderBottom: isLast ? 'none' : '1px solid #f8fafc',
    }}>
      <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <i className={`fa-solid ${icon}`} style={{ fontSize:14, color:iconColor }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', letterSpacing:'-0.2px' }}>{parts[0]}</div>
        {parts[1] && <div style={{ fontSize:11, color:'#94a3b8', fontWeight:500, marginTop:1 }}>{parts[1]}</div>}
        <div style={{ fontSize:10, color:'#cbd5e1', fontWeight:600, marginTop:1 }}>{item.date}</div>
      </div>
      <div style={{
        fontSize:15, fontWeight:800, letterSpacing:'-0.4px', flexShrink:0,
        color: item.amount >= 0 ? '#15803d' : (isPenalty ? '#be123c' : '#64748b'),
      }}>{item.amount >= 0 ? '+' : ''}{item.amount.toFixed(2)}€</div>
    </div>
  );
}

function ModalSheet({ onClose, children, title, subtitle }) {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:200, display:'flex', alignItems:'flex-end' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(6px)' }} />
      <div style={{
        width:'100%', position:'relative', zIndex:1,
        borderRadius:'28px 28px 0 0', background:'white',
        padding:'0 20px 40px',
        boxShadow:'0 -20px 60px rgba(0,0,0,0.2)',
        animation:'slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
      }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 14px' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:'#e2e8f0' }} />
        </div>
        {title && <h3 style={{ fontSize:18, fontWeight:800, color:'#1e293b', marginBottom:2, letterSpacing:'-0.4px' }}>{title}</h3>}
        {subtitle && <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, marginBottom:20 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { PALETTE, Avatar, ProgressBar, SectionHeader, FilterChip, StatusBadge, MissionCard, GoalCard, HistoryItem, ModalSheet });
