import { NavLink } from "react-router-dom"

import { Badge, Card, PageHeader, StatusNotice } from "@/components/ui/primitives"

export function HostedRuntimeBridgePage({ title, capability }: Readonly<{ title: string; capability: string }>) {
  return (
    <>
      <PageHeader
        eyebrow="Host-bound capability"
        title={title}
        description={`${capability} is owned by the private Orchy runtime and is not exposed directly to the public internet.`}
        badge={<Badge tone="warn">Bridge unavailable</Badge>}
      />
      <StatusNotice
        title="Private runtime bridge not connected"
        body="The hosted dashboard is healthy. This capability fails closed until the reviewed cloud-to-Madriguera bridge is available; no browser secret or public host endpoint is used."
        tone="warn"
      />
      <Card>
        <p>Cloud-safe operational data remains available from the hosted surfaces.</p>
        <div className="page-actions">
          <NavLink className="button" to="/">Overview</NavLink>
          <NavLink className="button button-secondary" to="/missions">Missions</NavLink>
          <NavLink className="button button-secondary" to="/assurance">Test Assurance</NavLink>
        </div>
      </Card>
    </>
  )
}
