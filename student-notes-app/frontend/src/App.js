const { useState, useEffect } = React;

function api(path, options = {}) {
  const token = localStorage.getItem('semzy-token');
  return fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }).then(async response => {
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  });
}

function Login({ onAuth, switchMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try { const data = await api('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) }); onAuth(data); }
    catch (err) { setError(err.message); }
  }
  return <div className="card auth"><h1>Welcome back</h1><p className="muted">Sign in to your SEMZY workspace.</p>{error && <p className="error">{error}</p>}<form onSubmit={submit}><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /><label>Password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /><button type="submit">Sign in</button></form><p><button className="secondary" onClick={switchMode}>Create an account</button></p></div>;
}

function Register({ onAuth, switchMode }) {
  const [name,setName] = useState(''); const [email,setEmail] = useState(''); const [password,setPassword] = useState(''); const [error,setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    try { const data = await api('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})}); onAuth(data); }
    catch(err){ setError(err.message); }
  }
  return <div className="card auth"><h1>Create account</h1><p className="muted">Start turning readings into study notes.</p>{error && <p className="error">{error}</p>}<form onSubmit={submit}><label>Name</label><input required value={name} onChange={e=>setName(e.target.value)} /><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /><label>Password</label><input type="password" minLength="6" required value={password} onChange={e=>setPassword(e.target.value)} /><button type="submit">Register</button></form><p><button className="secondary" onClick={switchMode}>Already have an account</button></p></div>;
}

function Upload({ onCreated }) {
  const [title,setTitle] = useState(''); const [file,setFile] = useState(null); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  async function submit(event) {
    event.preventDefault(); if (!file) return setError('Choose a PDF or DOCX file'); setBusy(true); setError('');
    const form = new FormData(); form.append('file',file); form.append('title',title);
    try { const note=await api('/api/upload',{method:'POST',body:form}); onCreated(note); setTitle(''); setFile(null); event.target.reset(); }
    catch(err){ setError(err.message); } finally { setBusy(false); }
  }
  return <div className="card"><h2>Add document</h2><p className="muted">Upload a PDF or DOCX (maximum 10 MB).</p>{error&&<p className="error">{error}</p>}<form onSubmit={submit}><label>Note title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Optional" /><label>Document</label><input type="file" accept=".pdf,.docx,application/pdf" onChange={e=>setFile(e.target.files[0])}/><button disabled={busy}>{busy?'Generating…':'Generate study notes'}</button></form></div>;
}

function Dashboard({ user, onLogout }) {
  const [notes,setNotes]=useState([]); const [tab,setTab]=useState('notes'); const [error,setError]=useState('');
  async function load(){ try{setNotes(await api('/api/notes'));}catch(err){setError(err.message);} }
  useEffect(load,[]);
  async function remove(id){ if(!confirm('Delete this note?')) return; try{await api('/api/notes/'+id,{method:'DELETE'}); load();}catch(err){setError(err.message);} }
  return <><header className="topbar"><div className="brand">SEM<span>ZY</span></div><div><span className="muted">{user.name}</span> <button className="secondary" onClick={onLogout}>Log out</button></div></header><main className="container"><div className="tabs"><button className={tab==='notes'?'active':''} onClick={()=>setTab('notes')}>My notes</button><button className={tab==='upload'?'active':''} onClick={()=>setTab('upload')}>Upload document</button></div>{error&&<p className="error">{error}</p>}<div className="grid">{tab==='upload'&&<Upload onCreated={note=>{setNotes(prev=>[note,...prev]);setTab('notes')}}/>}<section style={{gridColumn:'1/-1'}}><h1>My study notes</h1><div className="note-list">{notes.length===0&&<div className="card"><p className="muted">No notes yet. Upload a document to begin.</p></div>} {notes.map(note=>{const id=note.id||note._id; return <article className="card" key={id}><div className="note-head"><div><h2>{note.title}</h2><p className="muted">{note.sourceName}</p></div><button className="danger" onClick={()=>remove(id)}>Delete</button></div><h3>Summary</h3><ul>{(note.summary||[]).map((line,i)=><li key={i}>{line}</li>)}</ul><h3>Keywords</h3><div>{(note.keywords||[]).map(word=><span className="keyword" key={word}>{word}</span>)}</div></article>})}</div></section></div></main></>;
}

function App(){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('semzy-user')||'null'));
  const [mode,setMode]=useState('login');
  function onAuth(data){localStorage.setItem('semzy-token',data.token);localStorage.setItem('semzy-user',JSON.stringify(data.user));setUser(data.user);}
  function logout(){localStorage.removeItem('semzy-token');localStorage.removeItem('semzy-user');setUser(null);}
  if(!user){return mode==='login'?<Login onAuth={onAuth} switchMode={()=>setMode('register')}/>:<Register onAuth={onAuth} switchMode={()=>setMode('login')}/>}
  return <Dashboard user={user} onLogout={logout}/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
