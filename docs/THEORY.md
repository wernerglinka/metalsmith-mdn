# Theory of Operation

This document explains how `metalsmith-mdn` works and why it is built the
way it is. The README covers usage; this covers design.

## Problem

Metalsmith sites build reusable section components as Nunjucks templates and
render them from a layout during the templating stage. Long-form Markdown
pages cannot reach those components: Markdown has no mechanism to invoke a
Nunjucks macro, and by the time the layout template runs the Markdown body
has already been converted to an opaque HTML string. `metalsmith-mdn` closes
that gap by letting an author drop a component reference directly into
Markdown content and have it expanded to rendered HTML before the Markdown
plugin runs.

## Approach

The plugin defines a marker syntax, `{#mdn "componentName" #}`, that is
inert to both Markdown and Nunjucks until this plugin processes it. The name
inside the marker refers to a key in the file's own frontmatter, which holds
the component's `layout` and its props. Processing is three phases:

1. **Extract.** For each file, scan the contents for markers and resolve each
   marker's `componentName` against the file's frontmatter. A marker whose
   component is not found in frontmatter is logged via `metalsmith.debug` and
   skipped rather than treated as an error, because a missing component is an
   authoring mistake local to one page, not a build-breaking condition.
2. **Render.** Each resolved component is rendered with Nunjucks using its
   `layout` template and its props as the context. Rendering is wrapped in a
   Promise so that independent renders do not block one another.
3. **Replace.** Each marker string is replaced in the file contents with its
   rendered output, and the contents buffer is rewritten.

## Why it runs before the Markdown plugin

The rendered component output is HTML embedded in a still-Markdown document.
Running before the Markdown plugin means the surrounding prose is still
Markdown (so authors write naturally) while the injected component is already
HTML (which Markdown passes through untouched). Running after the Markdown
plugin would require re-parsing generated HTML and would lose that clean
separation. This ordering constraint is the single most important invariant
for correct output.

## Concurrency model

Files are processed concurrently with `Promise.all`, and within each file its
markers are rendered concurrently as well. Nunjucks rendering is I/O-light but
template loading is not, so overlapping renders shortens wall-clock time on
pages with many components. Order does not matter because each marker is
replaced by an exact string match against its own unique marker text, so
concurrent completion cannot cross-contaminate replacements.

## Invariants and failure modes

- **Marker uniqueness.** Replacement is by literal string match on the marker
  text. Two distinct components must produce two distinct marker strings; the
  `componentName` provides that uniqueness.
- **Errors propagate.** A Nunjucks render failure (for example, a `layout`
  pointing at a template that does not exist) rejects and is routed to
  `done(err)` so the build fails loudly rather than emitting a page with an
  unexpanded marker. The same is true for a missing custom-filters module.
- **Custom filters are user code.** The `customFilters` file is imported from
  the Metalsmith working directory and its exports are registered as Nunjucks
  filters. It is loaded once per run.
- **No option mutation across runs.** Options are normalized into a fresh
  object per invocation via `{ ...defaults, ...options }`; the plugin never
  mutates the caller's options object.
