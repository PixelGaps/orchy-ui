import { LogOut,Menu,Search,X } from "lucide-react"
import { useEffect,useRef,useState } from "react"
import { NavLink,useLocation,useNavigate } from "react-router-dom"
import { OperatorFeedbackViewport } from "@/components/ui/primitives"
import { TestAssurancePage } from "@/domains/assurance/page"
import { IssuesPage } from "@/domains/issues/page"
import { MissionsPage } from "@/domains/missions/page"
import { ObservabilityPage } from "@/domains/observability/page"
import { Overview } from "@/domains/overview/page"
import { DomainRoutes,domainNav as nav } from "@/domains/routes"
import { CloudSettingsPage } from "@/domains/settings/page"
import { cn } from "@/lib/utils"

export default function App(){
 const[open,setOpen]=useState(false);const[commandOpen,setCommandOpen]=useState(false);const[query,setQuery]=useState("");const location=useLocation();const navigate=useNavigate();const inputRef=useRef<HTMLInputElement|null>(null)
 useEffect(()=>setOpen(false),[location.pathname])
 useEffect(()=>{const f=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setCommandOpen(v=>!v)}if(e.key==="Escape"){setOpen(false);setCommandOpen(false)}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f)},[])
 useEffect(()=>{if(commandOpen)window.setTimeout(()=>inputRef.current?.focus(),0);else setQuery("")},[commandOpen])
 const groups=Array.from(new Set(nav.map(i=>i.group)));const mobile=nav.filter(i=>["/","/assurance","/issues","/missions"].includes(i.to))
 return <div className="app-shell"><OperatorFeedbackViewport/><a className="skip-link" href="#orchy-main-content">Skip to main content</a><button className="mobile-menu" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={20}/>:<Menu size={20}/>}</button>{open&&<button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
 <nav id="orchy-primary-navigation" className={cn("sidebar",open&&"sidebar-open")} aria-label="Primary navigation"><div className="sidebar-head"><NavLink to="/" className="brand"><span className="brand-mark"><span/></span><span><strong>Orchy</strong><small>Cloud Control</small></span></NavLink></div><div className="nav-scroll">{groups.map(g=><div className="nav-group" key={g}><span className="nav-label">{g}</span>{nav.filter(i=>i.group===g).map(i=>{const Icon=i.icon;return <NavLink key={i.to} to={i.to} end={i.to==="/"} className={({isActive})=>cn("nav-link",isActive&&"nav-active")}><Icon size={17}/><span>{i.label}</span></NavLink>})}</div>)}</div><button type="button" className="nav-link" onClick={()=>setCommandOpen(true)}><Search size={17}/><span>Command</span></button><form method="post" action="/logout"><button type="submit" className="nav-link"><LogOut size={17}/><span>Sign out</span></button></form><div className="sidebar-status"><span className="status-dot status-info"/><div><strong>Render operator</strong><small>No background polling</small></div></div></nav>
 {commandOpen&&<div className="command-palette-backdrop"><button className="command-palette-dismiss" aria-label="Close command palette" onClick={()=>setCommandOpen(false)}/><dialog open className="command-palette"><div className="command-palette-search"><Search size={16}/><input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Go to a page…"/><kbd>Esc</kbd></div><div className="command-palette-list">{nav.filter(i=>[i.label,i.group].join(" ").toLowerCase().includes(query.trim().toLowerCase())).map(i=>{const Icon=i.icon;return <button type="button" key={i.to} onClick={()=>{navigate(i.to);setCommandOpen(false)}}><Icon size={16}/><span><strong>{i.label}</strong><small>{i.group}</small></span><kbd>↵</kbd></button>})}</div></dialog></div>}
 <main id="orchy-main-content" className="content" tabIndex={-1}><div className="page"><DomainRoutes pages={{Overview,Assurance:TestAssurancePage,Issues:IssuesPage,Missions:MissionsPage,Observability:ObservabilityPage,Settings:CloudSettingsPage}}/></div></main><nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">{mobile.map(i=>{const Icon=i.icon;return <NavLink key={i.to} to={i.to} end={i.to==="/"} className={({isActive})=>cn("mobile-bottom-link",isActive&&"is-active")}><Icon size={18}/><span>{i.label}</span></NavLink>})}<button type="button" className={cn("mobile-bottom-link",open&&"is-active")} onClick={()=>setOpen(v=>!v)}><Menu size={18}/><span>More</span></button></nav></div>
}
