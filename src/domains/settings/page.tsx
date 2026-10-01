
import {
Badge,PageHeader
} from "@/components/ui/primitives"
import {
DomainConfiguration
} from "@/domains/shared"

export function GlobalSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Machine configuration"
        title="Global Settings"
        description="Machine-wide storage, cache, Docker, workspace and durable output paths with allowlisted impact preview."
        badge={<Badge tone="warn">HOST PATHS</Badge>}
      />
      <DomainConfiguration section="global" />
    </>
  )
}

