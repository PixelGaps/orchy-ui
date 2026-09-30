import type { ComponentType } from "react"
import { Activity,CircleGauge,Cog,Home,ListChecks,ShieldCheck } from "lucide-react"
import { Navigate,Route,Routes } from "react-router-dom"
export const domainNav=[
 {to:"/",label:"Overview",icon:Home,group:"Command"},
 {to:"/assurance",label:"Test Assurance",icon:ShieldCheck,group:"Command"},
 {to:"/issues",label:"Issues",icon:ListChecks,group:"Command"},
 {to:"/missions",label:"Missions",icon:CircleGauge,group:"Command"},
 {to:"/observability",label:"Observability",icon:Activity,group:"Operations"},
 {to:"/settings",label:"Settings",icon:Cog,group:"Operations"},
]
type Pages={Overview:ComponentType;Assurance:ComponentType;Issues:ComponentType;Missions:ComponentType;Observability:ComponentType;Settings:ComponentType}
export function DomainRoutes({pages}:Readonly<{pages:Pages}>){return <Routes><Route path="/" element={<pages.Overview/>}/><Route path="/assurance" element={<pages.Assurance/>}/><Route path="/issues" element={<pages.Issues/>}/><Route path="/missions" element={<pages.Missions/>}/><Route path="/observability" element={<pages.Observability/>}/><Route path="/settings" element={<pages.Settings/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
