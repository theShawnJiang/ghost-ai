/**
 * A small GitHub-flavored Markdown reader for previewing generated specs.
 *
 * It parses to a block/token tree rather than to an HTML string, so the renderer
 * builds React elements and never needs `dangerouslySetInnerHTML` — spec content
 * comes back from a language model and is read by every collaborator on a
 * project, so raw HTML must never reach the DOM.
 *
 * Scope is deliberately the subset `trigger/generate-spec.ts` asks the model
 * for: headings, paragraphs, bullet and numbered lists, fenced code, tables,
 * block quotes, rules, and the common inline marks. Nested lists are flattened
 * one level and inline marks do not nest — this is a preview, not an editor.
 */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type MarkdownBlock =
  | { kind: "heading"; level: HeadingLevel; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; language: string | null; code: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "rule" }

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "strike"; text: string }
  | { kind: "link"; text: string; href: string }

const FENCE = /^(?:```|~~~)\s*([\w+-]*)\s*$/
const HEADING = /^(#{1,6})\s+(.*)$/
const UNORDERED = /^[-*+]\s+(.*)$/
const ORDERED = /^\d+[.)]\s+(.*)$/
const NESTED_ITEM = /^\s+(?:[-*+]|\d+[.)])\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const RULE = /^(?:-{3,}|\*{3,}|_{3,})\s*$/
const TABLE_DIVIDER = /^\|?(?:\s*:?-+:?\s*\|)+\s*:?-*:?\s*\|?$/

/** Parse a Markdown document into the blocks the preview renders. */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n")
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index++
      continue
    }

    const fence = FENCE.exec(line)
    if (fence) {
      const language = fence[1] || null
      const code: string[] = []
      index++
      while (index < lines.length && !FENCE.test(lines[index])) {
        code.push(lines[index])
        index++
      }
      // Steps past the closing fence, or past the end when it was never closed.
      index++
      blocks.push({ kind: "code", language, code: code.join("\n") })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length as HeadingLevel,
        // Trailing hashes are a closing marker, not part of the title.
        text: heading[2].replace(/\s*#+\s*$/, "").trim(),
      })
      index++
      continue
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" })
      index++
      continue
    }

    if (isTableStart(lines, index)) {
      const header = splitTableRow(line)
      index += 2
      const rows: string[][] = []
      while (
        index < lines.length &&
        lines[index].trim() &&
        lines[index].includes("|")
      ) {
        rows.push(splitTableRow(lines[index]))
        index++
      }
      blocks.push({ kind: "table", header, rows })
      continue
    }

    const ordered = ORDERED.exec(line)
    if (ordered || UNORDERED.test(line)) {
      const isOrdered = Boolean(ordered)
      const items: string[] = []

      while (index < lines.length) {
        const current = lines[index]

        const item = isOrdered ? ORDERED.exec(current) : UNORDERED.exec(current)
        if (item) {
          items.push(item[1].trim())
          index++
          continue
        }

        // A nested list is flattened into a single level — one long run-on item
        // reads far worse in a narrow sidebar preview than a flat list does.
        const nested = NESTED_ITEM.exec(current)
        if (nested) {
          items.push(nested[1].trim())
          index++
          continue
        }

        // An indented, non-marker line is a continuation of the item above it.
        if (items.length > 0 && /^\s+\S/.test(current)) {
          items[items.length - 1] += ` ${current.trim()}`
          index++
          continue
        }

        break
      }

      blocks.push({ kind: "list", ordered: isOrdered, items })
      continue
    }

    const quote = QUOTE.exec(line)
    if (quote) {
      const text: string[] = [quote[1]]
      index++
      while (index < lines.length) {
        const next = QUOTE.exec(lines[index])
        if (!next) break
        text.push(next[1])
        index++
      }
      blocks.push({ kind: "quote", text: text.join(" ").trim() })
      continue
    }

    // Anything else is a paragraph, running until a blank line or the start of
    // the next block.
    const paragraph: string[] = [line.trim()]
    index++
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isBlockStart(lines, index)
    ) {
      paragraph.push(lines[index].trim())
      index++
    }
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") })
  }

  return blocks
}

/** Whether the line at `index` opens a block, ending any paragraph above it. */
function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index]
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    UNORDERED.test(line) ||
    ORDERED.test(line) ||
    QUOTE.test(line) ||
    isTableStart(lines, index)
  )
}

/** A table is a row of cells directly above an alignment divider. */
function isTableStart(lines: string[], index: number): boolean {
  const divider = lines[index + 1]
  return (
    lines[index].includes("|") &&
    divider !== undefined &&
    divider.includes("|") &&
    TABLE_DIVIDER.test(divider.trim())
  )
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

/**
 * Inline marks, tried in order: code spans win over everything (their contents
 * are literal), then the two-character marks, then emphasis and links.
 */
const INLINE =
  /(`+)([\s\S]*?)\1|\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|~~([\s\S]+?)~~|\*([^*\n]+?)\*|_([^_\n]+?)_/g

/**
 * Only these schemes are linkable. A `javascript:` or `data:` href in generated
 * text renders as plain label text instead of becoming a clickable payload.
 */
const SAFE_HREF = /^(?:https?:\/\/|mailto:)/i

/** Split one line of Markdown into its inline marks. */
export function parseInline(source: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let cursor = 0

  INLINE.lastIndex = 0
  let match = INLINE.exec(source)

  while (match) {
    if (match.index > cursor) {
      tokens.push({ kind: "text", text: source.slice(cursor, match.index) })
    }

    const [, , code, linkText, href, strongStar, strongScore, strike, emStar, emScore] =
      match

    if (code !== undefined) {
      tokens.push({ kind: "code", text: code.trim() })
    } else if (href !== undefined) {
      tokens.push(
        SAFE_HREF.test(href)
          ? { kind: "link", text: linkText || href, href }
          : { kind: "text", text: linkText || href }
      )
    } else if (strongStar !== undefined || strongScore !== undefined) {
      tokens.push({ kind: "strong", text: strongStar ?? strongScore })
    } else if (strike !== undefined) {
      tokens.push({ kind: "strike", text: strike })
    } else {
      tokens.push({ kind: "em", text: emStar ?? emScore })
    }

    cursor = match.index + match[0].length
    match = INLINE.exec(source)
  }

  if (cursor < source.length) {
    tokens.push({ kind: "text", text: source.slice(cursor) })
  }

  return tokens
}
