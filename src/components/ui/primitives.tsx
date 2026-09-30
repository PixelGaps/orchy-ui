import { useEffect,useId,useState } from "react"
import type { ButtonHTMLAttributes,HTMLAttributes,ReactNode } from "react"
import { Check,ChevronDown,Copy,RefreshCw } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

export function Card({
  className,
  children,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn("glass-card", className)} {...props}>
      {children}
    </div>
  )
}

export function GlowCard({
  className,
  children,
}: Readonly<{
  className?: string
  children: ReactNode
}>) {
  return (
    <motion.div className={cn("glass-card glow-card", className)}>
      {children}
    </motion.div>
  )
}

export function Button({
  className,
  children,
  ...props
}: Readonly<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button className={cn("button", className)} {...props}>
      {children}
    </button>
  )
}

export function Badge({
  children,
  tone = "neutral",
}: Readonly<{
  children: ReactNode
  tone?: "neutral" | "live" | "warn" | "danger" | "cyan"
}>) {
  return <span className={cn("badge", `badge-${tone}`)}>{children}</span>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
  badge?: ReactNode
}>) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {badge}
    </header>
  )
}

export function PanelHeader({
  kicker,
  title,
  action,
}: Readonly<{
  kicker: string
  title: string
  action?: ReactNode
}>) {
  return (
    <div className="panel-header">
      <div>
        <span className="kicker">{kicker}</span>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  body,
}: Readonly<{
  title: string
  body: string
}>) {
  return (
    <div className="empty-state">
      <div className="empty-orb" />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}



export function Skeleton({
  className,
  lines = 1,
}: Readonly<{ className?: string; lines?: number }>) {
  return (
    <div className={cn("ui-skeleton-stack", className)} aria-hidden="true">
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <span className="ui-skeleton" key={index} />
      ))}
    </div>
  )
}

export function StatusNotice({
  title,
  body,
  tone = "neutral",
  action,
}: Readonly<{
  title: string
  body: string
  tone?: "neutral" | "info" | "warn" | "danger"
  action?: ReactNode
}>) {
  return (
    <div
      className={cn("ui-status-notice", `tone-${tone}`)}
      role={tone === "danger" ? "alert" : "status"}
    >
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
      {action}
    </div>
  )
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
}: Readonly<{
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}>) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  return (
    <div className={cn("ui-switch-field", disabled && "is-disabled")}>
      <span className="ui-control-copy">
        <strong id={id}>{label}</strong>
        {description && <small id={descriptionId}>{description}</small>}
      </span>
      <button
        type="button"
        className="ui-switch"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
      >
        <span />
      </button>
    </div>
  )
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
  description,
  disabled = false,
}: Readonly<{
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  description?: string
  disabled?: boolean
}>) {
  const id = useId()
  return (
    <label className="ui-control-field" htmlFor={id}>
      <span className="ui-control-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  description,
  formatValue = (current) => String(current),
  disabled = false,
}: Readonly<{
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  description?: string
  formatValue?: (value: number) => string
  disabled?: boolean
}>) {
  const id = useId()
  return (
    <label className={cn("ui-control-field", "ui-range-field")} htmlFor={id}>
      <span className="ui-control-copy">
        <span className="ui-control-title">
          <strong>{label}</strong>
          <output htmlFor={id}>{formatValue(value)}</output>
        </span>
        {description && <small>{description}</small>}
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function CompactSummary({
  items,
  className,
}: Readonly<{
  items: Array<{
    label: string
    value: ReactNode
    detail?: ReactNode
    tone?: "neutral" | "live" | "warn" | "danger" | "cyan"
  }>
  className?: string
}>) {
  return (
    <div className={cn("compact-summary", className)}>
      {items.map((item) => (
        <div className="compact-summary-item" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail != null && <small>{item.detail}</small>}
          {item.tone && <i className={cn("compact-summary-tone", `tone-${item.tone}`)} />}
        </div>
      ))}
    </div>
  )
}

export function DenseKeyValueGrid({
  items,
  className,
}: Readonly<{
  items: Array<{ label: string; value: ReactNode; hint?: ReactNode }>
  className?: string
}>) {
  return (
    <dl className={cn("dense-kv-grid", className)}>
      {items.map((item) => (
        <div className="dense-kv-item" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.hint != null && <small>{item.hint}</small>}
        </div>
      ))}
    </dl>
  )
}

export function CollapsibleSection({
  title,
  summary,
  children,
  defaultOpen = false,
  badge,
  action,
  className,
}: Readonly<{
  title: string
  summary?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
  action?: ReactNode
  className?: string
}>) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className={cn("collapsible-section", open && "is-open", className)}>
      <div className="collapsible-header">
        <button
          type="button"
          className="collapsible-trigger"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="collapsible-title">
            <strong>{title}</strong>
            {summary != null && <small>{summary}</small>}
          </span>
          <span className="collapsible-action">
            {badge}
            <ChevronDown className="collapsible-chevron" size={16} aria-hidden="true" />
          </span>
        </button>
        {action != null && <div className="collapsible-header-action">{action}</div>}
      </div>
      <div id={id} className="collapsible-content" hidden={!open}>
        {children}
      </div>
    </section>
  )
}


function freshnessLabel(updatedAt: number | undefined, error: boolean, stale: boolean): string {
  if (error) return updatedAt ? "STALE" : "DISCONNECTED"
  if (!updatedAt) return "UNKNOWN"
  return stale ? "STALE" : "LIVE"
}

function freshnessTone(
  updatedAt: number | undefined,
  error: boolean,
  stale: boolean,
): "neutral" | "live" | "warn" | "danger" {
  if (error) return updatedAt ? "warn" : "danger"
  if (!updatedAt) return "neutral"
  return stale ? "warn" : "live"
}

function freshnessAgeText(updatedAt: number | undefined, age: number): string {
  if (!updatedAt) return "no sample"
  if (age < 60_000) return `${Math.max(1, Math.round(age / 1000))}s ago`
  return `${Math.round(age / 60_000)}m ago`
}

function queryErrorText(error: unknown, updatedAt: number | undefined): string {
  if (updatedAt) return "Latest refresh failed. Showing last known data."
  if (error instanceof Error) return error.message
  return "Unable to load data."
}


export function FreshnessBadge({
  updatedAt,
  error = false,
  staleAfterMs = 30_000,
}: Readonly<{
  updatedAt?: number
  error?: boolean
  staleAfterMs?: number
}>) {
  const age = updatedAt ? Math.max(0, Date.now() - updatedAt) : Number.POSITIVE_INFINITY
  const stale = age > staleAfterMs
  const label = freshnessLabel(updatedAt, error, stale)
  const tone = freshnessTone(updatedAt, error, stale)
  const ageText = freshnessAgeText(updatedAt, age)
  return <Badge tone={tone}>{label} · {ageText}</Badge>
}

export function QueryStateNotice({
  error,
  updatedAt,
  onRetry,
}: Readonly<{
  error?: unknown
  isFetching?: boolean
  updatedAt?: number
  onRetry?: () => void
}>) {
  // Healthy background polling/refetch is intentionally silent: rendering a
  // transient in-flow banner on every fetch causes recurring layout shift.
  if (!error) return null
  return (
    <div className="query-state-notice is-error" role="alert">
      <span>
        {queryErrorText(error, updatedAt)}
      </span>
      {onRetry && (
        <button type="button" className="query-retry" onClick={onRetry}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  )
}

export function CopyButton({
  value,
  label = "Copy",
}: Readonly<{
  value: string
  label?: string
}>) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="icon-button copy-button"
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

export function SectionPanel({
  tabId,
  active,
  children,
  className,
}: Readonly<{
  tabId: string
  active: boolean
  children: ReactNode
  className?: string
}>) {
  if (!active) return null
  return (
    <section
      id={`section-panel-${tabId}`}
      className={className}
      role="tabpanel"
      aria-labelledby={`section-tab-${tabId}`}
      tabIndex={0}
    >
      {children}
    </section>
  )
}


export type OperatorFeedbackTone = "success" | "error" | "info"

export function notifyOperator(
  message: string,
  tone: OperatorFeedbackTone = "info",
) {
  window.dispatchEvent(
    new CustomEvent("orchy:feedback", {
      detail: { message, tone, id: crypto.randomUUID() },
    }),
  )
}

export function OperatorFeedbackViewport() {
  const [items, setItems] = useState<
    Array<{ id: string; message: string; tone: OperatorFeedbackTone }>
  >([])

  useEffect(() => {
    const expireFeedback = (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id))
    }
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<{
        id: string
        message: string
        tone: OperatorFeedbackTone
      }>).detail
      setItems((current) => [...current.slice(-2), detail])
      window.setTimeout(expireFeedback, 3200, detail.id)
    }
    window.addEventListener("orchy:feedback", onFeedback)
    return () => window.removeEventListener("orchy:feedback", onFeedback)
  }, [])

  return (
    <div className="operator-feedback-viewport" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <div className={cn("operator-feedback", `tone-${item.tone}`)} key={item.id}>
          {item.message}
        </div>
      ))}
    </div>
  )
}
