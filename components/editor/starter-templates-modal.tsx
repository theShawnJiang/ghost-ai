"use client"

import { useMemo } from "react"

import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  EDGE_COLOR,
  getNodeColor,
  type CanvasNode,
  type NodeShape,
} from "@/types/canvas"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the chosen template; the modal closes after importing. */
  onImport: (template: CanvasTemplate) => void
}

/**
 * Import modal for the starter template library. Shows each template as a card
 * with a lightweight diagram preview, name, description, and an import button
 * that replaces the current canvas with the template.
 */
export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            Replace the current canvas with a pre-built diagram, then make it
            your own.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="grid grid-cols-1 gap-3 pr-3 sm:grid-cols-2">
            {CANVAS_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onImport={() => {
                  onImport(template)
                  onOpenChange(false)
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateCardProps {
  template: CanvasTemplate
  onImport: () => void
}

function TemplateCard({ template, onImport }: TemplateCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-elevated p-3">
      <div className="h-36 overflow-hidden rounded-xl border border-surface-border bg-base">
        <TemplatePreview template={template} />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-sm font-medium text-copy-primary">
          {template.name}
        </h3>
        <p className="text-xs leading-relaxed text-copy-muted">
          {template.description}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onImport}
        className="cursor-pointer self-start"
      >
        Import template
      </Button>
    </div>
  )
}

const PREVIEW_PADDING = 32

/** Geometric center of a node, in canvas coordinates. */
function nodeCenter(node: CanvasNode) {
  const width = node.width ?? 0
  const height = node.height ?? 0
  return { x: node.position.x + width / 2, y: node.position.y + height / 2 }
}

/**
 * Lightweight, non-interactive diagram preview. Computes the template bounds
 * from node positions, fits them to a fixed-size viewport via the SVG viewBox,
 * draws edges as simple lines between node centers, and draws each node using
 * its shape and color data. No React Flow instance is created.
 */
function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const viewBox = useMemo(() => {
    if (template.nodes.length === 0) return "0 0 100 100"

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const node of template.nodes) {
      const width = node.width ?? 0
      const height = node.height ?? 0
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      maxX = Math.max(maxX, node.position.x + width)
      maxY = Math.max(maxY, node.position.y + height)
    }

    const x = minX - PREVIEW_PADDING
    const y = minY - PREVIEW_PADDING
    const width = maxX - minX + PREVIEW_PADDING * 2
    const height = maxY - minY + PREVIEW_PADDING * 2
    return `${x} ${y} ${width} ${height}`
  }, [template.nodes])

  const centers = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const node of template.nodes) map.set(node.id, nodeCenter(node))
    return map
  }, [template.nodes])

  return (
    <svg
      className="h-full w-full"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${template.name} preview`}
    >
      {template.edges.map((edge) => {
        const source = centers.get(edge.source)
        const target = centers.get(edge.target)
        if (!source || !target) return null
        return (
          <line
            key={edge.id}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke={EDGE_COLOR}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
      {template.nodes.map((node) => (
        <PreviewNode key={node.id} node={node} />
      ))}
    </svg>
  )
}

/** Draw a single node's shape filled with its color, scaled by the viewBox. */
function PreviewNode({ node }: { node: CanvasNode }) {
  const { fill, text } = getNodeColor(node.data.color)
  const { x, y } = node.position
  const width = node.width ?? 0
  const height = node.height ?? 0
  const shape: NodeShape = node.data.shape

  const common = {
    fill,
    stroke: text,
    strokeWidth: 1.5,
    vectorEffect: "non-scaling-stroke" as const,
  }

  if (shape === "circle") {
    return (
      <ellipse
        cx={x + width / 2}
        cy={y + height / 2}
        rx={width / 2}
        ry={height / 2}
        {...common}
      />
    )
  }

  if (shape === "diamond") {
    const points = [
      `${x + width / 2},${y}`,
      `${x + width},${y + height / 2}`,
      `${x + width / 2},${y + height}`,
      `${x},${y + height / 2}`,
    ].join(" ")
    return <polygon points={points} strokeLinejoin="round" {...common} />
  }

  if (shape === "hexagon") {
    const inset = width * 0.18
    const points = [
      `${x + inset},${y}`,
      `${x + width - inset},${y}`,
      `${x + width},${y + height / 2}`,
      `${x + width - inset},${y + height}`,
      `${x + inset},${y + height}`,
      `${x},${y + height / 2}`,
    ].join(" ")
    return <polygon points={points} strokeLinejoin="round" {...common} />
  }

  // rectangle, pill, and cylinder all render as rounded rects in the preview;
  // pill is fully rounded, the others keep the soft node radius.
  const rx = shape === "pill" ? height / 2 : 12
  return <rect x={x} y={y} width={width} height={height} rx={rx} {...common} />
}
