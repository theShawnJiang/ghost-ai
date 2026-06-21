Let users connect canvas nodes together with edges.

## Implementation

1. Add connection handles to nodes.
   - show a handle on all four sides of a node
   - keep handles small, white, and circular
   - hide handles by default and reveal them on node hover
   - allow a connection to be dragged from any side to any side

2. Style the edges.
   - render edges as a thin smooth-step line
   - add an arrow marker at the target end
   - use the near-white default edge color
   - keep edges visually secondary to nodes
   - apply the styling so edges created through the collaborative flow render
     consistently, not only edges created by React Flow internals

3. Keep all edge creation and rendering connected to the existing collaborative
   canvas state (the wired `onConnect` / edge sync).

## Scope Limits

- don't change node shape rendering, resizing, or label editing
- don't change the shape panel, drag preview, or how dropped nodes are created
- don't add edge labels, edge color options, or per-edge styling controls
- keep this focused on connecting nodes and the default edge style only

## Check When Done

- Hovering a node reveals connection handles on all four sides.
- Dragging from a handle to another node creates an edge.
- Edges render as a thin smooth-step line with an arrow at the target end.
- New connections sync through the existing collaborative canvas state.
- `npm run build` passes without type errors.
