// koiny-app.jsx — Main Koiny Parent Dashboard prototype

const { useState, useEffect, useMemo, useRef } = React;

// ── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_CHILDREN = [
  {
    id:'c1', name:'Emma', avatar:'Chloe', colorClass:'indigo', balance:34.50, birthday:'2015-03-12',
    missions:[
      { id:'m1', title:'Clean bedroom', reward:5, status:'PENDING' },
      { id:'m2', title:'Do homework', reward:3, status:'ACTIVE' },
      { id:'m3', title:'Help with groceries', reward:4, status:'ACTIVE' },
    ],
    goals:[
      { id:'g1', name:'New bike', target:80, icon:'fa-bicycle', status:'ACTIVE' },
      { id:'g2', name:'Video game', target:40, icon:'fa-gamepad', status:'ACTIVE' },
    ],
    history:[
      { id:'h1', date:'21/04/2026', title:'Mission : Clean bedroom', amount:5 },
      { id:'h2', date:'20/04/2026', title:'Achat : Snacks', amount:-3 },
      { id:'h3', date:'19/04/2026', title:'Mission : Homework done', amount:3 },
      { id:'h4', date:'18/04/2026', title:'Amende : Late home', amount:-2 },
      { id:'h5', date:'17/04/2026', title:'Cadeau : Birthday bonus', amount:10 },
      { id:'h6', date:'10/04/2026', title:'Mission : Dishes', amount:2 },
      { id:'h7', date:'05/04/2026', title:'Achat : Book', amount:-8 },
      { id:'h8', date:'01/04/2026', title:'Cadeau : Easter gift', amount:5 },
    ],
  },
  {
    id:'c2', name:'Liam', avatar:'Noah', colorClass:'emerald', balance:12.00, birthday:'2018-07-22',
    missions:[
      { id:'m4', title:'Feed the dog', reward:2, status:'PENDING' },
      { id:'m5', title:'Tidy up toys', reward:1.5, status:'ACTIVE' },
    ],
    goals:[
      { id:'g3', name:'Lego Technic', target:30, icon:'fa-cube', status:'ACTIVE' },
    ],
    history:[
      { id:'h9',  date:'20/04/2026', title:'Mission : Fed the dog', amount:2 },
      { id:'h10', date:'18/04/2026', title:'Cadeau : Easter', amount:5 },
      { id:'h11', date:'15/04/2026', title:'Achat : Candy', amount:-1.5 },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function getAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday), n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}

function getWeeklySummary(history) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  return history.reduce((acc, item) => {
    const [d, m] = item.date.split('/');
    const date = new Date(2026, parseInt(m)-1, parseInt(d));
    if (date >= cutoff) {
      const tl = item.title.toLowerCase();
      if (item.amount < 0 && (tl.includes('amende') || tl.includes('penalty'))) acc.penalty += Math.abs(item.amount);
      else if (item.amount < 0) acc.expense += Math.abs(item.amount);
      else acc.income += item.amount;
    }
    return acc;
  }, { income:0, expense:0, penalty:0 });
}

function fmt(n) { return `${Math.abs(n) % 1 === 0 ? Math.abs(n).toFixed(0) : Math.abs(n).toFixed(2)}€`; }

// ── Status Bar ────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ height:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', paddingTop:12 }}>
      <span style={{ fontFamily:"-apple-system,system-ui", fontSize:16, fontWeight:600, color:'#1e293b', letterSpacing:-0.3 }}>9:41</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="6.5" width="2.8" height="4.5" rx="0.6" fill="#1e293b"/><rect x="4.2" y="4" width="2.8" height="7" rx="0.6" fill="#1e293b"/><rect x="8.4" y="1.5" width="2.8" height="9.5" rx="0.6" fill="#1e293b"/><rect x="12.6" y="0" width="2.8" height="11" rx="0.6" fill="#1e293b"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 2.8C9.5 2.8 11.3 3.6 12.6 4.9L13.6 3.9C12 2.4 9.9 1.5 7.5 1.5C5.1 1.5 3 2.4 1.4 3.9L2.4 4.9C3.7 3.6 5.5 2.8 7.5 2.8Z" fill="#1e293b"/><path d="M7.5 6C8.7 6 9.7 6.5 10.5 7.2L11.5 6.2C10.4 5.2 9 4.5 7.5 4.5C6 4.5 4.6 5.2 3.5 6.2L4.5 7.2C5.3 6.5 6.3 6 7.5 6Z" fill="#1e293b"/><circle cx="7.5" cy="9.5" r="1.5" fill="#1e293b"/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#1e293b" strokeOpacity="0.35" fill="none"/><rect x="2" y="2" width="18" height="8" rx="2" fill="#1e293b"/><path d="M23 4V8C23.8 7.7 24.5 6.8 24.5 6C24.5 5.2 23.8 4.3 23 4Z" fill="#1e293b" fillOpacity="0.4"/></svg>
      </div>
    </div>
  );
}

// ── Balance Hero ──────────────────────────────────────────────────────────
function BalanceHero({ child, onDeposit, onWithdraw }) {
  const pal = PALETTE[child.colorClass] || PALETTE.indigo;
  const age = getAge(child.birthday);
  const w = getWeeklySummary(child.history);
  return (
    <div style={{ margin:'0 16px 20px', borderRadius:28, overflow:'hidden', background:`linear-gradient(145deg,${pal.from} 0%,${pal.to} 100%)`, boxShadow:`0 16px 48px ${pal.accent}44`, position:'relative' }}>
      <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-70, left:-40, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
      <div style={{ padding:'20px 20px 18px', position:'relative' }}>
        {/* child info */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
          <Avatar seed={child.avatar} colorClass={child.colorClass} size={46} />
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'white', lineHeight:1.1 }}>{child.name}</div>
            {age && <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', fontWeight:600, marginTop:2 }}>{age} yrs old</div>}
          </div>
          <div style={{ marginLeft:'auto', background:'rgba(255,255,255,0.18)', borderRadius:10, padding:'4px 10px', backdropFilter:'blur(8px)' }}>
            <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:'0.12em' }}>BALANCE</div>
          </div>
        </div>
        {/* amount */}
        <div style={{ fontSize:46, fontWeight:900, color:'white', lineHeight:1, letterSpacing:'-1.5px', marginBottom:18 }}>
          {child.balance % 1 === 0 ? child.balance.toFixed(0) : child.balance.toFixed(2)}<span style={{ fontSize:26, fontWeight:700, opacity:0.8 }}>€</span>
        </div>
        {/* weekly stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
          {[
            { label:'EARNED', val:w.income, color:'rgba(255,255,255,0.95)' },
            { label:'SPENT',  val:w.expense, color:'rgba(255,255,255,0.75)' },
            { label:'FINES',  val:w.penalty, color:'rgba(255,200,200,0.9)' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.14)', borderRadius:14, padding:'8px 10px', backdropFilter:'blur(8px)' }}>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.55)', fontWeight:800, letterSpacing:'0.14em', marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{fmt(s.val)}</div>
            </div>
          ))}
        </div>
        {/* action buttons */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <button onClick={onDeposit} style={{ height:44, borderRadius:14, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.24)', color:'white', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:6, letterSpacing:'0.05em', backdropFilter:'blur(8px)' }}>
            <i className="fa-solid fa-plus" style={{ fontSize:11 }} /> DEPOSIT
          </button>
          <button onClick={onWithdraw} style={{ height:44, borderRadius:14, border:'none', cursor:'pointer', background:'rgba(0,0,0,0.18)', color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', gap:6, letterSpacing:'0.05em', backdropFilter:'blur(8px)' }}>
            <i className="fa-solid fa-minus" style={{ fontSize:11 }} /> WITHDRAW
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Child Selector ────────────────────────────────────────────────────────
function ChildSelector({ children, selectedId, onSelect }) {
  return (
    <div style={{ padding:'0 16px', marginBottom:20, display:'flex', gap:12, overflowX:'auto' }} className="no-scrollbar">
      {children.map(child => {
        const pal = PALETTE[child.colorClass] || PALETTE.indigo;
        const isActive = child.id === selectedId;
        const pending = child.missions.filter(m => m.status === 'PENDING').length;
        return (
          <button key={child.id} onClick={() => onSelect(child.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            background:'none', border:'none', cursor:'pointer', flexShrink:0, padding:'4px 6px', borderRadius:16,
            background: isActive ? pal.soft : 'transparent',
            transition:'all 0.2s',
          }}>
            <Avatar seed={child.avatar} colorClass={child.colorClass} size={48} pendingCount={pending} />
            <span style={{ fontSize:11, fontWeight: isActive ? 800 : 600, color: isActive ? pal.accent : '#64748b', letterSpacing:'-0.2px' }}>{child.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────
function DashboardTab({ child, children, selectedId, onSelect, onDeposit, onWithdraw, onApprove, onReject }) {
  const active = child.missions.filter(m => ['ACTIVE','PENDING'].includes(m.status));
  return (
    <div>
      <ChildSelector children={children} selectedId={selectedId} onSelect={onSelect} />
      <BalanceHero child={child} onDeposit={onDeposit} onWithdraw={onWithdraw} />
      <div style={{ padding:'0 16px' }}>
        <SectionHeader label="MISSIONS" action={`${active.length} active`} />
        {active.length === 0 ? (
          <div style={{ background:'white', borderRadius:18, padding:'24px 16px', textAlign:'center', marginBottom:10 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🎯</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8' }}>No missions yet</div>
            <div style={{ fontSize:11, color:'#cbd5e1', marginTop:4 }}>Tap + to add a mission</div>
          </div>
        ) : active.map(m => (
          <MissionCard key={m.id} mission={m} colorClass={child.colorClass} onApprove={onApprove} onReject={onReject} />
        ))}

        {child.goals && child.goals.length > 0 && (
          <>
            <div style={{ marginTop:8 }} />
            <SectionHeader label="SAVINGS GOALS" />
            {child.goals.filter(g => g.status !== 'ARCHIVED').map(g => (
              <GoalCard key={g.id} goal={g} balance={child.balance} colorClass={child.colorClass} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────
function HistoryTab({ child, children, selectedId, onSelect }) {
  const [filter, setFilter] = useState('THIS_MONTH');
  const filtered = useMemo(() => {
    if (filter === 'ALL') return child.history;
    const m = new Date().getMonth() + 1;
    return child.history.filter(item => {
      const parts = item.date.split('/');
      return parseInt(parts[1]) === m;
    });
  }, [child, filter]);

  const total = filtered.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <ChildSelector children={children} selectedId={selectedId} onSelect={onSelect} />
      <div style={{ padding:'0 16px' }}>
        {/* filter + summary */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', gap:8 }}>
            <FilterChip label="THIS MONTH" active={filter === 'THIS_MONTH'} onClick={() => setFilter('THIS_MONTH')} />
            <FilterChip label="ALL" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
          </div>
          <div style={{
            padding:'5px 12px', borderRadius:10, fontSize:13, fontWeight:800,
            background: total >= 0 ? '#ecfdf5' : '#fff1f2',
            color: total >= 0 ? '#15803d' : '#be123c',
          }}>{total >= 0 ? '+' : ''}{total.toFixed(2)}€</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ background:'white', borderRadius:18, padding:'32px', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8' }}>No transactions</div>
          </div>
        ) : (
          <div style={{ background:'white', borderRadius:18, padding:'0 16px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
            {filtered.map((item, i) => (
              <HistoryItem key={item.id} item={item} isLast={i === filtered.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Requests Tab ──────────────────────────────────────────────────────────
function RequestsTab({ children, onApprove, onReject }) {
  const [selId, setSelId] = useState(children[0]?.id);
  const child = children.find(c => c.id === selId);
  const pending = child ? child.missions.filter(m => m.status === 'PENDING') : [];
  const totalPending = children.reduce((s, c) => s + c.missions.filter(m => m.status === 'PENDING').length, 0);

  return (
    <div style={{ padding:'0 16px' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:22, fontWeight:800, color:'#1e293b', letterSpacing:'-0.5px' }}>Requests</div>
        <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, marginTop:2 }}>
          {totalPending > 0 ? `${totalPending} pending approval` : 'All caught up ✓'}
        </div>
      </div>

      {/* child tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto' }} className="no-scrollbar">
        {children.map(c => {
          const p = c.missions.filter(m => m.status === 'PENDING').length;
          const pal = PALETTE[c.colorClass] || PALETTE.indigo;
          const isActive = c.id === selId;
          return (
            <button key={c.id} onClick={() => setSelId(c.id)} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:14,
              border:'none', cursor:'pointer', flexShrink:0, transition:'all 0.2s',
              background: isActive ? pal.accent : '#f1f5f9',
              color: isActive ? 'white' : '#64748b',
            }}>
              <Avatar seed={c.avatar} colorClass={c.colorClass} size={24} />
              <span style={{ fontSize:12, fontWeight:700 }}>{c.name}</span>
              {p > 0 && (
                <div style={{ width:18, height:18, borderRadius:'50%', background: isActive ? 'rgba(255,255,255,0.3)' : '#f43f5e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:'white' }}>{p}</div>
              )}
            </button>
          );
        })}
      </div>

      {pending.length === 0 ? (
        <div style={{ background:'white', borderRadius:20, padding:'40px 20px', textAlign:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:14, fontWeight:800, color:'#1e293b', marginBottom:6 }}>All clear!</div>
          <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>No pending requests for {child?.name}</div>
        </div>
      ) : pending.map(m => (
        <MissionCard key={m.id} mission={m} colorClass={child.colorClass}
          onApprove={() => onApprove(selId, m)}
          onReject={() => onReject(selId, m)} />
      ))}
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab({ children }) {
  const badgeInfo = { label:'Mentor', icon:'fa-graduation-cap', color:'#4f46e5', bg:'#eef2ff' };
  const rows = [
    { icon:'fa-children', bg:'#eef2ff', color:'#4f46e5', label:'Family', detail:`${children.length} children` },
    { icon:'fa-bell', bg:'#fff7ed', color:'#c2410c', label:'Notifications', detail:'On' },
    { icon:'fa-language', bg:'#f0fdf4', color:'#15803d', label:'Language', detail:'English' },
    { icon:'fa-coins', bg:'#fffbeb', color:'#b45309', label:'Currency', detail:'€ Euro' },
    { icon:'fa-shield', bg:'#faf5ff', color:'#7e22ce', label:'PIN & Security', detail:'Enabled' },
    { icon:'fa-crown', bg:'#fdf4ff', color:'#9333ea', label:'Koiny Premium', detail:'Active ✓' },
  ];
  return (
    <div style={{ padding:'0 16px' }}>
      {/* parent card */}
      <div style={{ background:'linear-gradient(135deg,#818cf8,#4338ca)', borderRadius:24, padding:'24px 20px', marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid rgba(255,255,255,0.4)' }}>
            <i className="fa-solid fa-user" style={{ fontSize:22, color:'white' }} />
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'white' }}>Parent Space</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
              <div style={{ background:badgeInfo.bg, borderRadius:8, padding:'3px 10px', display:'flex', alignItems:'center', gap:5 }}>
                <i className={`fa-solid ${badgeInfo.icon}`} style={{ fontSize:10, color:badgeInfo.color }} />
                <span style={{ fontSize:10, fontWeight:800, color:badgeInfo.color, letterSpacing:'0.08em' }}>{badgeInfo.label.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* family section */}
      <SectionHeader label="FAMILY" />
      <div style={{ background:'white', borderRadius:20, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', marginBottom:20 }}>
        {children.map((child, i) => (
          <div key={child.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < children.length-1 ? '1px solid #f8fafc' : 'none' }}>
            <Avatar seed={child.avatar} colorClass={child.colorClass} size={40} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{child.name}</div>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{child.balance.toFixed(2)}€ balance</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {child.goals.map(g => {
                const emoji = { 'fa-bicycle':'🚲','fa-gamepad':'🎮','fa-cube':'🧱' }[g.icon] || '🌟';
                return <span key={g.id} style={{ fontSize:16 }}>{emoji}</span>;
              })}
            </div>
            <i className="fa-solid fa-chevron-right" style={{ fontSize:11, color:'#cbd5e1' }} />
          </div>
        ))}
        <button style={{ width:'100%', padding:'14px 16px', border:'none', cursor:'pointer', background:'transparent', display:'flex', alignItems:'center', gap:12, borderTop:'1px solid #f8fafc' }}>
          <div style={{ width:40, height:40, borderRadius:12, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="fa-solid fa-plus" style={{ fontSize:14, color:'#4f46e5' }} />
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'#4f46e5' }}>Add child</span>
        </button>
      </div>

      <SectionHeader label="SETTINGS" />
      <div style={{ background:'white', borderRadius:20, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.05)', marginBottom:20 }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom: i < rows.length-1 ? '1px solid #f8fafc' : 'none' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:row.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={`fa-solid ${row.icon}`} style={{ fontSize:13, color:row.color }} />
            </div>
            <div style={{ flex:1, fontSize:14, fontWeight:600, color:'#1e293b' }}>{row.label}</div>
            <span style={{ fontSize:12, color:'#94a3b8', fontWeight:600 }}>{row.detail}</span>
            <i className="fa-solid fa-chevron-right" style={{ fontSize:11, color:'#cbd5e1' }} />
          </div>
        ))}
      </div>

      <button style={{ width:'100%', height:48, borderRadius:16, border:'none', cursor:'pointer', background:'#fff1f2', color:'#be123c', fontSize:13, fontWeight:800, letterSpacing:'0.05em', marginBottom:8 }}>
        SIGN OUT
      </button>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────
function BottomNav({ activeTab, onTabChange, onAdd, pendingCount = 0 }) {
  const tabs = [
    { id:'dashboard', icon:'fa-border-all', label:'Dashboard' },
    { id:'history',   icon:'fa-calendar-days', label:'History' },
    { id:'requests',  icon:'fa-comment-dots', label:'Requests' },
    { id:'profile',   icon:'fa-user', label:'Profile' },
  ];
  return (
    <div style={{
      position:'absolute', bottom:20, left:10, right:10, height:68,
      background:'rgba(15,23,42,0.97)', backdropFilter:'blur(20px) saturate(180%)',
      WebkitBackdropFilter:'blur(20px) saturate(180%)',
      borderRadius:30, boxShadow:'0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
      display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 6px', zIndex:100,
    }}>
      <div style={{ display:'flex', alignItems:'center', flex:1, justifyContent:'space-around', paddingRight:36 }}>
        {tabs.slice(0,2).map(tab => <NavBtn key={tab.id} tab={tab} isActive={activeTab===tab.id} onClick={() => onTabChange(tab.id)} />)}
      </div>
      {/* FAB */}
      <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:-24 }}>
        <button onClick={onAdd} style={{
          width:60, height:60, borderRadius:'50%', border:'4px solid #f0f4ff',
          background:'linear-gradient(135deg,#818cf8,#4338ca)',
          boxShadow:'0 8px 28px #4f46e566',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', transition:'all 0.2s',
        }}>
          <i className="fa-solid fa-plus" style={{ fontSize:21, color:'white' }} />
        </button>
      </div>
      <div style={{ display:'flex', alignItems:'center', flex:1, justifyContent:'space-around', paddingLeft:36 }}>
        {tabs.slice(2).map(tab => (
          <div key={tab.id} style={{ position:'relative' }}>
            <NavBtn tab={tab} isActive={activeTab===tab.id} onClick={() => onTabChange(tab.id)} />
            {tab.id==='requests' && pendingCount > 0 && (
              <div style={{ position:'absolute', top:6, right:6, width:9, height:9, borderRadius:'50%', background:'#f43f5e', border:'2px solid #0f172a' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavBtn({ tab, isActive, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      width:52, height:52, borderRadius:18, border:'none', cursor:'pointer',
      background:'transparent', color: isActive ? '#818cf8' : '#475569', transition:'all 0.2s',
    }}>
      <i className={`fa-solid ${tab.icon}`} style={{ fontSize:19, transform: isActive ? 'translateY(-2px)' : 'none', transition:'all 0.2s' }} />
      {isActive && (
        <>
          <span style={{ fontSize:8, fontWeight:800, letterSpacing:'0.06em', marginTop:2 }}>{tab.label.toUpperCase()}</span>
          <div style={{ width:4, height:4, borderRadius:'50%', background:'#818cf8', marginTop:2 }} />
        </>
      )}
    </button>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────
const TEMPLATES = [
  { title:'Clean bedroom', reward:3 },
  { title:'Do homework', reward:2 },
  { title:'Set the table', reward:1 },
  { title:'Take out trash', reward:2 },
  { title:'Walk the dog', reward:3 },
];

function AddMissionModal({ childName, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const valid = title.trim() && parseFloat(amount) > 0;
  return (
    <ModalSheet onClose={onClose} title="ADD MISSION" subtitle={`New mission for ${childName}`}>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
        {TEMPLATES.map(t => (
          <button key={t.title} onClick={() => { setTitle(t.title); setAmount(String(t.reward)); }} style={{
            padding:'6px 12px', borderRadius:100, fontSize:11, fontWeight:700,
            background: title===t.title ? '#4f46e5' : '#eef2ff', color: title===t.title ? 'white' : '#4f46e5',
            border:'none', cursor:'pointer', transition:'all 0.15s',
          }}>{t.title}</button>
        ))}
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', letterSpacing:'0.14em', marginBottom:6 }}>TITLE</div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Clean bedroom"
          style={{ width:'100%', height:48, borderRadius:14, border:'2px solid #e2e8f0', padding:'0 14px', fontSize:14, fontWeight:600, color:'#1e293b', outline:'none', fontFamily:"'Poppins',sans-serif", boxSizing:'border-box' }} />
      </div>
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', letterSpacing:'0.14em', marginBottom:6 }}>REWARD (€)</div>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 3" min="0.5" max="100" step="0.5"
          style={{ width:'100%', height:48, borderRadius:14, border:'2px solid #e2e8f0', padding:'0 14px', fontSize:14, fontWeight:600, color:'#1e293b', outline:'none', fontFamily:"'Poppins',sans-serif", boxSizing:'border-box' }} />
      </div>
      <button onClick={() => valid && onAdd(title.trim(), parseFloat(amount))} style={{
        width:'100%', height:52, borderRadius:16, border:'none', cursor: valid ? 'pointer' : 'default',
        background: valid ? 'linear-gradient(135deg,#818cf8,#4338ca)' : '#e2e8f0',
        color: valid ? 'white' : '#94a3b8', fontSize:14, fontWeight:800, letterSpacing:'0.05em',
        boxShadow: valid ? '0 8px 24px #4f46e544' : 'none', transition:'all 0.2s',
      }}>CREATE MISSION</button>
    </ModalSheet>
  );
}

function TransactionModal({ childName, type, onSubmit, onClose }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [subtype, setSubtype] = useState('PURCHASE');
  const isDeposit = type === 'DEPOSIT';
  const valid = parseFloat(amount) > 0;
  return (
    <ModalSheet onClose={onClose} title={isDeposit ? 'DEPOSIT' : 'WITHDRAW'} subtitle={isDeposit ? `Add coins to ${childName}'s wallet` : `Deduct from ${childName}'s wallet`}>
      <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', letterSpacing:'0.14em', marginBottom:6 }}>AMOUNT (€)</div>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0.5" max="1000" step="0.5" autoFocus
        style={{ width:'100%', height:58, borderRadius:14, border:'2px solid #e2e8f0', padding:'0 14px', fontSize:22, fontWeight:800, color:'#1e293b', outline:'none', fontFamily:"'Poppins',sans-serif", textAlign:'center', letterSpacing:'-0.5px', marginBottom:14, boxSizing:'border-box' }} />

      {!isDeposit && (
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {[{ id:'PURCHASE', label:'💳 Purchase' }, { id:'PENALTY', label:'⚠️ Fine' }].map(s => (
            <button key={s.id} onClick={() => setSubtype(s.id)} style={{
              flex:1, height:38, borderRadius:12, border:'none', cursor:'pointer',
              background: subtype===s.id ? '#1e293b' : '#f1f5f9',
              color: subtype===s.id ? 'white' : '#64748b', fontSize:12, fontWeight:700,
            }}>{s.label}</button>
          ))}
        </div>
      )}

      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', letterSpacing:'0.14em', marginBottom:6 }}>REASON (optional)</div>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder={isDeposit ? 'e.g. Birthday gift' : 'e.g. Bought candy'}
          style={{ width:'100%', height:48, borderRadius:14, border:'2px solid #e2e8f0', padding:'0 14px', fontSize:13, fontWeight:600, color:'#1e293b', outline:'none', fontFamily:"'Poppins',sans-serif", boxSizing:'border-box' }} />
      </div>
      <button onClick={() => valid && onSubmit(parseFloat(amount), reason, subtype)} style={{
        width:'100%', height:52, borderRadius:16, border:'none', cursor: valid ? 'pointer' : 'default',
        background: valid ? (isDeposit ? 'linear-gradient(135deg,#34d399,#059669)' : 'linear-gradient(135deg,#fb7185,#be123c)') : '#e2e8f0',
        color: valid ? 'white' : '#94a3b8', fontSize:14, fontWeight:800, letterSpacing:'0.05em',
        boxShadow: valid ? (isDeposit ? '0 8px 24px #10b98144' : '0 8px 24px #f43f5e44') : 'none', transition:'all 0.2s',
      }}>{isDeposit ? 'ADD COINS' : 'DEDUCT COINS'}</button>
    </ModalSheet>
  );
}

function ActionModal({ mission, type, onConfirm, onClose }) {
  const [note, setNote] = useState('');
  const isApprove = type === 'APPROVE';
  return (
    <ModalSheet onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:20 }}>
        <div style={{
          width:64, height:64, borderRadius:20, marginBottom:14,
          background: isApprove ? '#ecfdf5' : '#fff1f2',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <i className={`fa-solid ${isApprove ? 'fa-check-circle' : 'fa-circle-xmark'}`}
            style={{ fontSize:28, color: isApprove ? '#15803d' : '#be123c' }} />
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:'#1e293b', textAlign:'center', marginBottom:4 }}>
          {isApprove ? 'Approve Mission?' : 'Reject Mission?'}
        </div>
        <div style={{
          background: isApprove ? '#ecfdf5' : '#fff7ed',
          borderRadius:12, padding:'8px 16px', display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{mission.title}</span>
          <span style={{ fontSize:14, fontWeight:900, color: isApprove ? '#15803d' : '#f97316' }}>+{mission.reward}€</span>
        </div>
      </div>

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', letterSpacing:'0.14em', marginBottom:6 }}>NOTE (optional)</div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder={isApprove ? 'Great work! 🎉' : 'Try harder next time...'}
          style={{ width:'100%', height:80, borderRadius:14, border:'2px solid #e2e8f0', padding:'12px 14px', fontSize:13, fontWeight:600, color:'#1e293b', outline:'none', fontFamily:"'Poppins',sans-serif", resize:'none', boxSizing:'border-box' }} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <button onClick={onClose} style={{ height:50, borderRadius:16, border:'none', cursor:'pointer', background:'#f1f5f9', color:'#64748b', fontSize:13, fontWeight:800, letterSpacing:'0.05em' }}>CANCEL</button>
        <button onClick={() => onConfirm(note)} style={{
          height:50, borderRadius:16, border:'none', cursor:'pointer', fontSize:13, fontWeight:800, letterSpacing:'0.05em', color:'white',
          background: isApprove ? 'linear-gradient(135deg,#34d399,#059669)' : 'linear-gradient(135deg,#fb7185,#be123c)',
          boxShadow: isApprove ? '0 8px 20px #10b98133' : '0 8px 20px #f43f5e33',
        }}>{isApprove ? '✓ APPROVE' : '✗ REJECT'}</button>
      </div>
    </ModalSheet>
  );
}

// ── Toast notification ────────────────────────────────────────────────────
function Toast({ msg, type = 'success', visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position:'absolute', top:70, left:'50%', transform:'translateX(-50%)',
      background: type==='success' ? '#ecfdf5' : '#fff1f2',
      border: `1px solid ${type==='success' ? '#86efac' : '#fca5a5'}`,
      borderRadius:14, padding:'10px 18px', zIndex:300,
      display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
      animation:'slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      whiteSpace:'nowrap',
    }}>
      <i className={`fa-solid ${type==='success' ? 'fa-circle-check' : 'fa-circle-xmark'}`}
        style={{ fontSize:14, color: type==='success' ? '#15803d' : '#be123c' }} />
      <span style={{ fontSize:13, fontWeight:700, color: type==='success' ? '#15803d' : '#be123c' }}>{msg}</span>
    </div>
  );
}

// ── Tweaks Panel ──────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"showWeeklyStats":true,"accentColor":"indigo","darkNavBg":true,"showGoals":true}/*EDITMODE-END*/;

function TweaksPanel({ tweaks, onChange, onClose }) {
  return (
    <div style={{
      position:'absolute', bottom:100, right:16, width:220, zIndex:300,
      background:'white', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', padding:'16px 16px 14px',
      border:'1px solid #e2e8f0',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:12, fontWeight:800, color:'#1e293b', letterSpacing:'0.05em' }}>TWEAKS</span>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>✕</button>
      </div>
      {[
        { key:'showWeeklyStats', label:'Weekly stats on hero' },
        { key:'darkNavBg', label:'Dark nav pill' },
        { key:'showGoals', label:'Show goals section' },
      ].map(({ key, label }) => (
        <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f8fafc' }}>
          <span style={{ fontSize:12, fontWeight:600, color:'#64748b' }}>{label}</span>
          <div onClick={() => onChange(key, !tweaks[key])} style={{
            width:36, height:20, borderRadius:10, cursor:'pointer',
            background: tweaks[key] ? '#4f46e5' : '#e2e8f0', transition:'background 0.2s', position:'relative',
          }}>
            <div style={{ position:'absolute', top:2, left: tweaks[key] ? 18 : 2, width:16, height:16, borderRadius:'50%', background:'white', boxShadow:'0 1px 4px rgba(0,0,0,0.2)', transition:'left 0.2s' }} />
          </div>
        </div>
      ))}
      <div style={{ marginTop:10 }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#94a3b8', letterSpacing:'0.12em', marginBottom:6 }}>CHILD THEME</div>
        <div style={{ display:'flex', gap:6 }}>
          {['indigo','emerald','rose','amber'].map(c => {
            const pal = PALETTE[c];
            return (
              <div key={c} onClick={() => onChange('accentColor', c)} style={{
                width:22, height:22, borderRadius:'50%', cursor:'pointer',
                background:`linear-gradient(135deg,${pal.from},${pal.to})`,
                boxShadow: tweaks.accentColor===c ? `0 0 0 2px white, 0 0 0 4px ${pal.accent}` : 'none',
                transition:'box-shadow 0.2s',
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
function KoinyApp() {
  const [kids, setKids] = useState(MOCK_CHILDREN);
  const [selectedId, setSelectedId] = useState(MOCK_CHILDREN[0].id);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [addOpen, setAddOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [txType, setTxType] = useState('DEPOSIT');
  const [actionModal, setActionModal] = useState(null);

  const [toast, setToast] = useState({ visible:false, msg:'', type:'success' });
  const [showTweaks, setShowTweaks] = useState(false);
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);

  const savedTab = localStorage.getItem('koiny_tab');
  useEffect(() => { if (savedTab) setActiveTab(savedTab); }, []);
  useEffect(() => { localStorage.setItem('koiny_tab', activeTab); }, [activeTab]);

  useEffect(() => {
    const handler = e => {
      if (e.data?.type === '__activate_edit_mode') setShowTweaks(true);
      if (e.data?.type === '__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type:'__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ visible:true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, visible:false })), 2800);
  }

  const child = kids.find(c => c.id === selectedId) || kids[0];
  const pendingCount = kids.reduce((s, c) => s + c.missions.filter(m => m.status==='PENDING').length, 0);

  function mutatekid(id, fn) {
    setKids(prev => prev.map(c => c.id === id ? fn(c) : c));
  }

  function approveMission(childId, mission, note) {
    mutatekid(childId, c => ({
      ...c, balance: c.balance + mission.reward,
      missions: c.missions.map(m => m.id===mission.id ? { ...m, status:'VALIDATED' } : m),
      history: [{ id:`h${Date.now()}`, date:new Date().toLocaleDateString('fr-FR'), title:`Mission : ${mission.title}`, amount:mission.reward }, ...c.history],
    }));
    showToast(`+${mission.reward}€ awarded to ${child.name}!`, 'success');
  }

  function rejectMission(childId, mission) {
    mutatekid(childId, c => ({ ...c, missions: c.missions.map(m => m.id===mission.id ? { ...m, status:'REJECTED' } : m) }));
    showToast(`Mission rejected`, 'error');
  }

  function addMission(title, reward) {
    mutatekid(selectedId, c => ({ ...c, missions: [...c.missions, { id:`m${Date.now()}`, title, reward, status:'ACTIVE' }] }));
    setAddOpen(false);
    showToast('Mission created!', 'success');
  }

  function doTransaction(amount, reason, subtype) {
    const isDeposit = txType === 'DEPOSIT';
    const finalAmt = isDeposit ? amount : -amount;
    const label = isDeposit ? 'Cadeau' : (subtype==='PURCHASE' ? 'Achat' : 'Amende');
    const title = reason ? `${label} : ${reason}` : label;
    mutatekid(selectedId, c => ({
      ...c, balance: Math.max(0, c.balance + finalAmt),
      history: [{ id:`h${Date.now()}`, date:new Date().toLocaleDateString('fr-FR'), title, amount:finalAmt }, ...c.history],
    }));
    setTxOpen(false);
    showToast(isDeposit ? `+${amount}€ added!` : `-${amount}€ deducted`, isDeposit ? 'success' : 'error');
  }

  function updateTweak(key, val) {
    const next = { ...tweaks, [key]:val };
    setTweaks(next);
    window.parent.postMessage({ type:'__edit_mode_set_keys', edits:next }, '*');
  }

  const anyModalOpen = addOpen || txOpen || !!actionModal;

  return (
    <div style={{ width:'100%', height:'100%', background:'#f0f4ff', fontFamily:"'Poppins',sans-serif", position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding:'4px 20px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:'#1e293b', letterSpacing:'-0.6px', lineHeight:1 }}>
            <span style={{ color:'#4f46e5' }}>K</span>oiny
          </div>
          <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>Parent Dashboard</div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <div style={{ width:38, height:38, borderRadius:12, background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="fa-regular fa-bell" style={{ fontSize:15, color:'#64748b' }} />
            </div>
            {pendingCount > 0 && (
              <div style={{ position:'absolute', top:-3, right:-3, width:16, height:16, borderRadius:'50%', background:'#f43f5e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:900, color:'white', border:'2px solid #f0f4ff' }}>{pendingCount}</div>
            )}
          </div>
          <div style={{ width:38, height:38, borderRadius:12, overflow:'hidden', boxShadow:'0 4px 12px #4f46e544', flexShrink:0 }}>
            <img src="assets/koiny-icon.png" alt="Koiny" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', paddingBottom:100, WebkitOverflowScrolling:'touch' }} className="no-scrollbar">
        {activeTab === 'dashboard' && (
          <DashboardTab child={child} children={kids} selectedId={selectedId} onSelect={setSelectedId}
            onDeposit={() => { setTxType('DEPOSIT'); setTxOpen(true); }}
            onWithdraw={() => { setTxType('WITHDRAW'); setTxOpen(true); }}
            onApprove={m => setActionModal({ mission:m, childId:selectedId, type:'APPROVE' })}
            onReject={m => setActionModal({ mission:m, childId:selectedId, type:'REJECT' })} />
        )}
        {activeTab === 'history' && (
          <HistoryTab child={child} children={kids} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {activeTab === 'requests' && (
          <RequestsTab children={kids}
            onApprove={(cid, m) => setActionModal({ mission:m, childId:cid, type:'APPROVE' })}
            onReject={(cid, m) => setActionModal({ mission:m, childId:cid, type:'REJECT' })} />
        )}
        {activeTab === 'profile' && <ProfileTab children={kids} />}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onAdd={() => setAddOpen(true)} pendingCount={pendingCount} />

      {/* Toast */}
      <Toast visible={toast.visible} msg={toast.msg} type={toast.type} />

      {/* Modals */}
      {addOpen && <AddMissionModal childName={child.name} onAdd={addMission} onClose={() => setAddOpen(false)} />}
      {txOpen && <TransactionModal childName={child.name} type={txType} onSubmit={doTransaction} onClose={() => setTxOpen(false)} />}
      {actionModal && (
        <ActionModal mission={actionModal.mission} type={actionModal.type}
          onConfirm={note => { if (actionModal.type==='APPROVE') approveMission(actionModal.childId, actionModal.mission, note); else rejectMission(actionModal.childId, actionModal.mission); setActionModal(null); }}
          onClose={() => setActionModal(null)} />
      )}

      {/* Tweaks */}
      {showTweaks && <TweaksPanel tweaks={tweaks} onChange={updateTweak} onClose={() => setShowTweaks(false)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(KoinyApp))
);
