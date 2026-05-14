export interface MockProject {
  id: string
  name: string
  slug: string
  isOwner: boolean
}

export const MOCK_PROJECTS: MockProject[] = [
  { id: "p1", name: "Payment Gateway", slug: "payment-gateway", isOwner: true },
  {
    id: "p2",
    name: "Realtime Analytics",
    slug: "realtime-analytics",
    isOwner: true,
  },
  { id: "p3", name: "Edge Cache Layer", slug: "edge-cache-layer", isOwner: true },
  {
    id: "p4",
    name: "Notification Service",
    slug: "notification-service",
    isOwner: false,
  },
  {
    id: "p5",
    name: "Billing Pipeline",
    slug: "billing-pipeline",
    isOwner: false,
  },
]
