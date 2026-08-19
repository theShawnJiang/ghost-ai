import { Fragment } from "react"

import {
  parseInline,
  parseMarkdown,
  type InlineToken,
  type MarkdownBlock,
} from "@/lib/markdown"

interface MarkdownViewProps {
  /** Raw Markdown, as returned by the spec download route. */
  source: string
}

/**
 * Renders Markdown as React elements built from `lib/markdown`'s block tree.
 *
 * Nothing here goes through `dangerouslySetInnerHTML` — the source is
 * model-generated and shared across a project's collaborators, so any HTML in it
 * stays inert text.
 */
export function MarkdownView({ source }: MarkdownViewProps) {
  const blocks = parseMarkdown(source)

  return (
    <div className="flex flex-col gap-3 text-sm text-copy-secondary">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  )
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-lg font-semibold text-copy-primary",
  2: "mt-2 text-base font-semibold text-copy-primary",
  3: "mt-1 text-sm font-semibold text-copy-primary",
  4: "text-sm font-medium text-copy-primary",
  5: "text-xs font-medium text-copy-primary",
  6: "text-xs font-medium text-copy-muted",
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.kind) {
    case "heading": {
      const Tag = `h${block.level}` as "h1"
      return (
        <Tag className={HEADING_CLASS[block.level]}>
          <Inline source={block.text} />
        </Tag>
      )
    }

    case "paragraph":
      return (
        <p className="leading-relaxed">
          <Inline source={block.text} />
        </p>
      )

    case "code":
      return (
        <pre className="overflow-x-auto rounded-xl border border-surface-border bg-page p-3">
          <code className="font-mono text-xs text-copy-secondary">
            {block.code}
          </code>
        </pre>
      )

    case "list": {
      const Tag = block.ordered ? "ol" : "ul"
      return (
        <Tag
          className={
            block.ordered
              ? "list-decimal space-y-1 pl-5 leading-relaxed marker:text-copy-faint"
              : "list-disc space-y-1 pl-5 leading-relaxed marker:text-copy-faint"
          }
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline source={item} />
            </li>
          ))}
        </Tag>
      )
    }

    case "quote":
      return (
        <blockquote className="border-l-2 border-brand/40 pl-3 text-copy-muted italic">
          <Inline source={block.text} />
        </blockquote>
      )

    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-surface-border bg-subtle/60">
                {block.header.map((cell, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left font-medium text-copy-primary"
                  >
                    <Inline source={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-surface-border last:border-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top">
                      <Inline source={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case "rule":
      return <hr className="border-surface-border" />
  }
}

function Inline({ source }: { source: string }) {
  return (
    <>
      {parseInline(source).map((token, index) => (
        <Fragment key={index}>
          <Token token={token} />
        </Fragment>
      ))}
    </>
  )
}

function Token({ token }: { token: InlineToken }) {
  switch (token.kind) {
    case "text":
      return <>{token.text}</>

    case "code":
      return (
        <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[0.8em] text-brand">
          {token.text}
        </code>
      )

    case "strong":
      return <strong className="font-semibold text-copy-primary">{token.text}</strong>

    case "em":
      return <em className="italic">{token.text}</em>

    case "strike":
      return <s className="text-copy-muted">{token.text}</s>

    case "link":
      return (
        <a
          href={token.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-brand underline underline-offset-2 hover:text-brand/80"
        >
          {token.text}
        </a>
      )
  }
}
