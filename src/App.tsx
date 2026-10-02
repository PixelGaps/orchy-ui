// Canonical Orchy operator UI owned by PixelGaps/orchy-ui under ADR-0038.
import {
ChevronRight,
Menu,
PanelLeftClose,
PanelLeftOpen,
Search,
X,
} from "lucide-react"
import {
lazy,
ReactNode,
Suspense,
useEffect,
useRef,
useState,
} from "react"
import {
NavLink,
useLocation,
useNavigate,
} from "react-router-dom"

const TestAssurancePage = lazy(() => import("@/domains/assurance/page").then((module) => ({ default: module.TestAssurancePage })))
const ComfyUIPage = lazy(() => import("@/domains/comfyui/page").then((module) => ({ default: module.ComfyUIPage })))
const ImageFactory = lazy(() => import("@/domains/comfyui/image-factory/page").then((module) => ({ default: module.ImageFactory })))
const HealthcheckPage = lazy(() => import("@/domains/healthcheck/page").then((module) => ({ default: module.HealthcheckPage })))
const LLMPage = lazy(() => import("@/domains/llm/page").then((module) => ({ default: module.LLMPage })))
const IssuesPage = lazy(() => import("@/domains/issues/page").then((module) => ({ default: module.IssuesPage })))
const LogsPage = lazy(() => import("@/domains/logs/page").then((module) => ({ default: module.LogsPage })))
const MissionsPage = lazy(() => import("@/domains/missions/page").then((module) => ({ default: module.MissionsPage })))
const Overview = lazy(() => import("@/domains/overview/page").then((module) => ({ default: module.Overview })))
const QueuePage = lazy(() => import("@/domains/queue/page").then((module) => ({ default: module.QueuePage })))
const WorkbenchPage = lazy(() => import("@/domains/workbench/page").then((module) => ({ default: module.WorkbenchPage })))

import { DomainRoutes,domainNav as nav } from "@/domains/routes"
const GlobalSettingsPage = lazy(() => import("@/domains/settings/page").then((module) => ({ default: module.GlobalSettingsPage })))
import {
  OperatorFeedbackViewport,
} from "@/components/ui/primitives"
import { cn } from "@/lib/utils"


function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(
    () => window.localStorage.getItem("orchy-sidebar-compact") === "true",
  )
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState("")
  const location = useLocation()
  const navigate = useNavigate()
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const commandInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const main = document.getElementById("orchy-main-content")
    document.body.style.overflow = "hidden"
    main?.setAttribute("inert", "")
    window.setTimeout(() => sidebarRef.current?.querySelector<HTMLElement>("a,button")?.focus(), 0)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        window.setTimeout(() => menuButtonRef.current?.focus(), 0)
        return
      }
      if (event.key !== "Tab" || !sidebarRef.current) return
      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      )
      if (!focusable.length) return
      const first = focusable[0]!
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      main?.removeAttribute("inert")
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((value) => !value)
      } else if (event.key === "Escape" && commandOpen) {
        setCommandOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [commandOpen])

  useEffect(() => {
    if (commandOpen) window.setTimeout(() => commandInputRef.current?.focus(), 0)
    else setCommandQuery("")
  }, [commandOpen])

  const groups = Array.from(new Set(nav.map((item) => item.group)))
  const mobilePrimary = nav.filter((item) => ["/", "/assurance", "/issues", "/queue"].includes(item.to))

  const toggleCompact = () => {
    setCompact((value) => {
      const next = !value
      window.localStorage.setItem("orchy-sidebar-compact", String(next))
      return next
    })
  }

  return (
    <div className={cn("app-shell", compact && "sidebar-compact")}>
      <OperatorFeedbackViewport />
      <a className="skip-link" href="#orchy-main-content">Skip to main content</a>
      <button
        ref={menuButtonRef}
        className="mobile-menu"
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle navigation"
        aria-expanded={open}
        aria-controls="orchy-primary-navigation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => {
            setOpen(false)
            window.setTimeout(() => menuButtonRef.current?.focus(), 0)
          }}
        />
      )}

      <nav
        ref={sidebarRef}
        id="orchy-primary-navigation"
        className={cn("sidebar", open && "sidebar-open")}
        aria-label="Primary navigation"
      >
        <div className="sidebar-head">
        <NavLink to="/" className="brand" title="Orchy overview">
          <span className="brand-mark">
            <span />
          </span>
          <span>
            <strong>Orchy</strong>
            <small>AI control plane</small>
          </span>
        </NavLink>
        <button
          type="button"
          className="sidebar-collapse"
          onClick={toggleCompact}
          aria-label="Compact navigation"
          aria-pressed={compact}
          title={compact ? "Use expanded navigation" : "Use compact navigation"}
        >
          {compact ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        </div>

        <div className="nav-scroll">
          {groups.map((group) => (
            <div className="nav-group" key={group}>
              <span className="nav-label">{group}</span>
              {nav
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      title={compact ? item.label : undefined}
                      className={({ isActive }) =>
                        cn("nav-link", isActive && "nav-active")
                      }
                    >
                      <Icon size={17} />
                      <span>{item.label}</span>
                      <ChevronRight className="nav-chevron" size={14} />
                    </NavLink>
                  )
                })}
            </div>
          ))}
        </div>

        <div className="sidebar-status">
          <span className="status-dot status-info" />
          <div>
            <strong>Web operator ready</strong>
            <small>Backend status shown in Overview</small>
          </div>
        </div>
      </nav>

      {commandOpen && (
        <div className="command-palette-backdrop">
          <button
            type="button"
            className="command-palette-dismiss"
            aria-label="Close operator command palette"
            onClick={() => setCommandOpen(false)}
          />
          <dialog
            open
            className="command-palette"
            aria-modal="true"
            aria-label="Operator command palette"
          >
            <div className="command-palette-search">
              <Search size={16} />
              <input
                ref={commandInputRef}
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Go to a page…"
                aria-label="Search operator commands"
              />
              <kbd>Esc</kbd>
            </div>
            <div className="command-palette-list">
              {nav
                .filter((item) => [item.label, item.group].join(" ").toLowerCase().includes(commandQuery.trim().toLowerCase()))
                .map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      type="button"
                      key={item.to}
                      onClick={() => {
                        navigate(item.to)
                        setCommandOpen(false)
                      }}
                    >
                      <Icon size={16} />
                      <span><strong>{item.label}</strong><small>{item.group}</small></span>
                      <kbd>↵</kbd>
                    </button>
                  )
                })}
            </div>
            <small className="command-palette-help">Ctrl/Cmd+K · Fast navigation to Orchy operator surfaces</small>
          </dialog>
        </div>
      )}

      <main id="orchy-main-content" className="content" tabIndex={-1}>
        <div className="page">{children}</div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        {mobilePrimary.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn("mobile-bottom-link", isActive && "is-active")
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
        <button
          type="button"
          className={cn("mobile-bottom-link", open && "is-active")}
          aria-label="More navigation"
          aria-expanded={open}
          aria-controls="orchy-primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <Menu size={18} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}>
      <DomainRoutes
        pages={{
          Overview,
          Assurance: TestAssurancePage,
          Issues: IssuesPage,
          Missions: MissionsPage,
          Queue: QueuePage,
          ImageFactory,
          LLM: LLMPage,
          ComfyUI: ComfyUIPage,
          Healthcheck: HealthcheckPage,
          Logs: LogsPage,
          GlobalSettings: GlobalSettingsPage,
          Workbench: WorkbenchPage,
        }}
      />
      </Suspense>
    </AppShell>
  )
}
