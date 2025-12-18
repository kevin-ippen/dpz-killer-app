# **🍕 Domino’s Chat UI – Two-Panel Layout Spec**

*Left: conversation. Right: visual insight canvas.*

## **0\. High-Level Goals**

* Make chat feel like a **conversation with an analyst**, not a log of tokens.

* Treat charts, tables, and images as **first-class artifacts**, not inline afterthoughts.

* Keep the **visual language unified** across both panels (cards, radii, colors).

* Work cleanly with a **multi-agent supervisor** and **Genie** (via `spaceId/conversationId/messageId/attachmentId`).

---

## **1\. Layout Overview**

### **1.1. Top-Level Structure**

`┌───────────────────────────────────────────────────────────────┐`  
`│ App Header (Domino’s theme, status pill)                      │`  
`├───────────────────────────────────────────────────────────────┤`  
`│        LEFT: Chat Pane         │     RIGHT: Result Canvas     │`  
`│  - Messages                    │  - Selected chart/table/etc. │`  
`│  - Streaming text              │  - Larger, focused view      │`  
`│  - Tool badges                 │  - Extra controls            │`  
`├───────────────────────────────────────────────────────────────┤`  
`│ Chat Composer (input + send)                                  │`  
`└───────────────────────────────────────────────────────────────┘`

* Left pane width: `min(48rem, 50%)`.

* Right pane: flex-1 (fills the rest).

* Both scroll independently; header & composer are fixed.

### **1.2. Shared Design Tokens (Domino’s theme)**

Use these as CSS variables or Tailwind config (already mostly done):

`:root {`  
  `--color-bg-app: #020617;`  
  `--color-accent: #006491;               /* Domino's blue */`  
  `--color-accent-soft: rgba(0, 100, 145, 0.18);`  
  `--color-accent-strong: #E31837;        /* Domino's red accent */`  
  `--color-border-subtle: #1e293b;`

  `--color-text-primary: #e5e7eb;`  
  `--color-text-secondary: #9ca3af;`  
  `--color-text-muted: #6b7280;`

  `--radius-lg: 20px;`  
  `--radius-md: 14px;`  
  `--radius-pill: 999px;`

  `--shadow-soft: 0 18px 45px rgba(0, 0, 0, 0.45);`  
`}`

---

## **2\. Left Panel (Chat) – Brief Spec**

*(You already have most of this; summarizing for completeness.)*

* **User messages**:

  * Right-aligned, Domino’s blue pill.

  * Soft shadow, `max-width: 42rem`, slightly smaller padding.

* **Assistant messages**:

  * Left-aligned dark card.

  * Inner layout (top → bottom):

    1. Markdown text (`TextBlock`).

    2. Divider \+ tool badges row (Genie, RAG, etc.).

    3. Previews of tables/charts/images (clickable to open in right panel).

* **Tool badges**:

  * Tiny pills showing state: `running` / `complete` / `error`.

  * Consistent with Genie/MAS events.

* **Inline visualization previews**:

  * Compact cards saying “Chart – click to view” or “Table (200 rows) – click to view”.

  * These **do not** attempt to show full content; right panel does.

---

## **3\. Right Panel – Result Canvas Spec (Detailed)**

The right panel is where artifacts become **primary**: big charts, full tables, zoomed images.

### **3.1. Goals**

* Provide a **single, focused surface** for:

  * Genie charts (via `dataRef.genie`).

  * Tables (possibly large).

  * Images (schematics, generated content).

* Reuse the same visual language as chat cards:

  * Dark, glassy card.

  * Faint grid background.

  * Header/footer meta.

* Handle **loading \+ hydration** (Genie query results, etc.) gracefully.

---

### **3.2. Core State Shape**

On the frontend:

`type ActiveBlockRef = {`  
  `messageId: string;`  
  `blockId: string;`  
`} | null;`

`const [messages, setMessages] = useState<ChatMessage[]>([]);`  
`const [activeBlock, setActiveBlock] = useState<ActiveBlockRef>(null);`

* `messages`: the full chat history, where each `ChatMessage` has `blocks` (text, chart, table, image, etc.).

* `activeBlock`: which block is currently “promoted” to the right panel.

**Selection logic:**

* When user clicks a preview (chart/table/image) in the chat:

  * Call `setActiveBlock({ messageId: msg.id, blockId: block.id })`.

* If a new assistant message arrives with visual blocks:

  * Optionally auto-select the **first visual block** when `activeBlock` is `null`.

---

### **3.3. ResultCanvas Component Responsibilities**

`ResultCanvas` is the main right-hand component.

**Responsibilities:**

* Look up the `ChatBlock` pointed to by `activeBlock`.

* Render the appropriate full-size view:

  * `ChartBlock` → `ChartCard` \+ `ChartRenderer`.

  * `TableBlock` → `TableView`.

  * `ImageBlock` → `ImageView`.

  * `TextBlock` → simple markdown view.

* Provide boilerplate frame:

  * Header with title & message context.

  * Empty state when `activeBlock` is null.

  * Clear button.

**Skeleton:**

`function ResultCanvas({`  
  `messages,`  
  `activeBlock,`  
  `onBlockChange,`  
`}: {`  
  `messages: ChatMessage[];`  
  `activeBlock: ActiveBlockRef;`  
  `onBlockChange: (ref: ActiveBlockRef) => void;`  
`}) {`  
  `const block = React.useMemo(() => {`  
    `if (!activeBlock) return null;`  
    `const msg = messages.find((m) => m.id === activeBlock.messageId);`  
    `return msg?.blocks.find((b) => b.id === activeBlock.blockId) ?? null;`  
  `}, [messages, activeBlock]);`

  `return (`  
    `<div className="flex flex-col h-full bg-[var(--color-bg-app)] text-[var(--color-text-primary)]">`  
      `{/* Header */}`  
      `<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">`  
        `<div className="flex flex-col">`  
          `<span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.18em]">`  
            `Result`  
          `</span>`  
          `<span className="text-sm text-[var(--color-text-primary)]">`  
            `{block ? blockTitle(block) : "Select a chart, table, or image"}`  
          `</span>`  
        `</div>`  
        `{block && (`  
          `<button`  
            `className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"`  
            `onClick={() => onBlockChange(null)}`  
          `>`  
            `Clear`  
          `</button>`  
        `)}`  
      `</div>`

      `{/* Body */}`  
      `<div className="flex-1 p-4 overflow-auto">`  
        `{!block && (`  
          `<div className="h-full w-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">`  
            `Click a chart, table, or image in the chat to view it here.`  
          `</div>`  
        `)}`

        `{block && block.type === "chart" && <FullChartView block={block} />}`

        `{block && block.type === "table" && <FullTableView block={block} />}`

        `{block && block.type === "image" && <FullImageView block={block} />}`

        `{block && block.type === "text" && (`  
          `<div className="max-w-3xl">`  
            `<MarkdownRenderer>{block.markdown}</MarkdownRenderer>`  
          `</div>`  
        `)}`  
      `</div>`  
    `</div>`  
  `);`  
`}`

`blockTitle` is a helper that returns a human-readable title from `ChartBlock.meta`, `TableBlock.meta`, etc.

---

### **3.4. Full Chart View (Genie-Aware)**

`FullChartView` handles:

* Showing a full chart card.

* Loading state while fetching Genie results (if needed).

* Error state if the query fails.

#### **3.4.1. Expect `ChartBlock` structure**

`interface ChartBlock {`  
  `id: string;`  
  `type: "chart";`  
  `title?: string;`  
  `subtitle?: string;`  
  `specType: "vegaLite" | "recharts" | "echarts";`  
  `spec: any | null;`  
  `dataRef?: {`  
    `type: "genie" | "sql" | "custom";`  
    `genie?: {`  
      `spaceId: string;`  
      `conversationId: string;`  
      `messageId: string;`  
      `attachmentId: string;`  
    `};`  
    `sql?: {`  
      `query: string;`  
      `catalog?: string;`  
      `schema?: string;`  
    `};`  
  `};`  
  `meta?: {`  
    `primaryMeasure?: string;`  
    `primaryDim?: string;`  
    `timeframe?: string;`  
  `};`  
`}`

#### **3.4.2. Component behavior**

`function FullChartView({ block }: { block: ChartBlock }) {`  
  `const [spec, setSpec] = useState<any | null>(block.spec);`  
  `const [tablePreview, setTablePreview] = useState<{ columns: string[]; rows: any[][] } | null>(null);`  
  `const [loading, setLoading] = useState(!block.spec && !!block.dataRef);`  
  `const [error, setError] = useState<string | null>(null);`

  `useEffect(() => {`  
    `if (!block.dataRef || block.spec) return;`  
    `if (block.dataRef.type !== "genie") return;`

    `const { genie } = block.dataRef;`  
    `if (!genie) return;`

    `let cancelled = false;`

    `(async () => {`  
      `try {`  
        `setLoading(true);`  
        `const res = await fetch("/api/genie/chart", {`  
          `method: "POST",`  
          `headers: { "Content-Type": "application/json" },`  
          `body: JSON.stringify(genie),`  
        `});`  
        `if (!res.ok) throw new Error("Failed to load chart");`  
        `const payload = await res.json(); // { spec, table }`  
        `if (cancelled) return;`  
        `setSpec(payload.spec);`  
        `setTablePreview(payload.table ?? null);`  
        `setLoading(false);`  
      `} catch (err: any) {`  
        `if (cancelled) return;`  
        `setError(err.message ?? "Error loading chart");`  
        `setLoading(false);`  
      `}`  
    `})();`

    `return () => {`  
      `cancelled = true;`  
    `};`  
  `}, [block]);`

  `return (`  
    `<ChartCard`  
      `block={{ ...block, spec }}`  
      `tablePreview={tablePreview}`  
      `loading={loading}`  
      `error={error}`  
    `/>`  
  `);`  
`}`

#### **3.4.3. ChartCard visual spec**

* Outer card:

  * `background: rgba(15, 23, 42, 0.96)`

  * `border: 1px solid rgba(30, 41, 59, 0.9)`

  * `border-radius: var(--radius-lg)`

  * `box-shadow: var(--shadow-soft)`

* Inner chart area:

  * Slight grid background.

  * Height: \~`360–420px`.

We already sketched something like this earlier; you can reuse that and plug `spec` into your chart lib (e.g. `react-vega`).

---

### **3.5. Full Table View**

Full table view is where you **don’t** have to be hyper-conservative about width/height.

Requirements:

* Horizontal scroll for many columns.

* Vertical scroll inside the card if many rows.

* Optional pagination or “show more rows”.

Skeleton:

`function FullTableView({ block }: { block: TableBlock }) {`  
  `const { columns, rows, meta } = block;`

  `return (`  
    `<div`  
      `style={{`  
        `background: "rgba(15, 23, 42, 0.96)",`  
        `borderRadius: "var(--radius-lg)",`  
        `border: "1px solid var(--color-border-subtle)",`  
        `boxShadow: "var(--shadow-soft)",`  
        `display: "flex",`  
        `flexDirection: "column",`  
        `maxHeight: "100%",`  
      `}}`  
    `>`  
      `{/* Header */}`  
      `<div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80">`  
        `<div>`  
          `<div className="text-sm font-medium text-[var(--color-text-primary)]">`  
            `{meta?.title ?? "Table"}`  
          `</div>`  
          `{meta?.subtitle && (`  
            `<div className="text-xs text-[var(--color-text-secondary)]">`  
              `{meta.subtitle}`  
            `</div>`  
          `)}`  
        `</div>`  
        `<div className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)]">`  
          `<span>{rows.length} rows</span>`  
          `<button className="border border-slate-700 rounded-full px-2 py-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">`  
            `Download CSV`  
          `</button>`  
        `</div>`  
      `</div>`

      `{/* Table body */}`  
      `<div className="flex-1 overflow-auto">`  
        `{/* Reuse your improved table from the chat, but allow bigger area */}`  
        `<table style={{ width: "100%", borderCollapse: "collapse" }}>`  
          `<thead>`  
            `<tr style={{ background: "var(--color-accent)", color: "white" }}>`  
              `{columns.map((header) => (`  
                `<th`  
                  `key={header}`  
                  `style={{`  
                    `fontSize: "11px",`  
                    `textTransform: "uppercase",`  
                    `letterSpacing: "0.06em",`  
                    `padding: "0.5rem 0.75rem",`  
                    `textAlign: "left",`  
                  `}}`  
                `>`  
                  `{header}`  
                `</th>`  
              `))}`  
            `</tr>`  
          `</thead>`  
          `<tbody>`  
            `{rows.map((row, rowIdx) => (`  
              `<tr`  
                `key={rowIdx}`  
                `style={{`  
                  `background:`  
                    `rowIdx % 2 === 0`  
                      `? "rgba(15, 23, 42, 0.9)"`  
                      `: "rgba(30, 41, 59, 0.9)",`  
                `}}`  
              `>`  
                `{row.map((cell, colIdx) => (`  
                  `<td`  
                    `key={colIdx}`  
                    `style={{`  
                      `color: "var(--color-text-primary)",`  
                      `fontSize: "0.8rem",`  
                      `padding: "0.45rem 0.75rem",`  
                      `borderBottom: "1px solid rgba(30, 41, 59, 0.8)",`  
                      `whiteSpace: "nowrap",`  
                      `textOverflow: "ellipsis",`  
                      `overflow: "hidden",`  
                    `}}`  
                  `>`  
                    `{cell}`  
                  `</td>`  
                `))}`  
              `</tr>`  
            `))}`  
          `</tbody>`  
        `</table>`  
      `</div>`  
    `</div>`  
  `);`  
`}`

---

### **3.6. Full Image View**

Simple but should feel polished:

`function FullImageView({ block }: { block: ImageBlock }) {`  
  `return (`  
    `<div`  
      `style={{`  
        `background: "rgba(15, 23, 42, 0.96)",`  
        `borderRadius: "var(--radius-lg)",`  
        `border: "1px solid var(--color-border-subtle)",`  
        `boxShadow: "var(--shadow-soft)",`  
        `padding: "0.75rem",`  
        `display: "flex",`  
        `flexDirection: "column",`  
        `height: "100%",`  
      `}}`  
    `>`  
      `<div className="flex items-center justify-between mb-2">`  
        `<div className="text-sm font-medium text-[var(--color-text-primary)]">`  
          `{block.alt || "Image"}`  
        `</div>`  
        `<button`  
          `className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"`  
          `onClick={() => window.open(block.url, "_blank")}`  
        `>`  
          `Open in new tab`  
        `</button>`  
      `</div>`  
      `<div className="flex-1 flex items-center justify-center">`  
        `<img`  
          `src={block.url}`  
          `alt={block.alt ?? ""}`  
          `style={{`  
            `maxWidth: "100%",`  
            `maxHeight: "100%",`  
            `borderRadius: "var(--radius-md)",`  
          `}}`  
        `/>`  
      `</div>`  
    `</div>`  
  `);`  
`}`

---

### **3.7. Interaction Rules**

1. **Clicking a preview in chat**:

   * Sets `activeBlock`.

   * Scrolls right panel to top.

   * If block has `dataRef.genie` and no `spec` yet, triggers hydration.

2. **New answer arrives with visuals & no `activeBlock`**:

   * Auto-select the first `ChartBlock` or `TableBlock`.

   * (Optional) Don’t auto-switch if the user already has a different block selected.

3. **Streaming**:

   * Text streams in left panel.

   * Tool badges show Genie / SQL / RAG progress.

   * Right panel:

     * If user has an active chart/table tied to the same answer, show loading state while hydrating.

     * Otherwise, stays on whatever they were looking at until they click a new preview.

4. **Keyboard**:

   * Optional: `Esc` clears `activeBlock` (right panel returns to empty state).

---

### **3.8. Error & Edge Cases**

* **Genie query error**:

  * Show an error card in right panel:

    * Red border, simple message (“Couldn’t load chart. Try regenerating.”).

  * Keep the preview in chat, but maybe stamp a small error icon on it.

* **Attachment expired**:

  * Backend `/api/genie/chart` should fall back from `get_message_attachment_query_result` to `execute_message_attachment_query`.

  * Show “Re-executed query” somewhere in footer meta if you want.

* **No visual blocks**:

  * Right panel just shows the empty state hint.

---

## **4\. Wiring Left & Right Panels Together**

### **4.1. On chat side**

In your message renderer:

`// Inside assistant bubble`  
`{message.blocks.map((block) => {`  
  `if (block.type === "chart") {`  
    `return (`  
      `<ChartPreview`  
        `key={block.id}`  
        `block={block}`  
        `isActive={activeBlock?.blockId === block.id && activeBlock?.messageId === message.id}`  
        `onClick={() => setActiveBlock({ messageId: message.id, blockId: block.id })}`  
      `/>`  
    `);`  
  `}`

  `if (block.type === "table") {`  
    `return (`  
      `<TablePreview`  
        `key={block.id}`  
        `block={block}`  
        `isActive={activeBlock?.blockId === block.id && activeBlock?.messageId === message.id}`  
        `onClick={() => setActiveBlock({ messageId: message.id, blockId: block.id })}`  
      `/>`  
    `);`  
  `}`

  `if (block.type === "image") {`  
    `return (`  
      `<ImagePreview`  
        `key={block.id}`  
        `block={block}`  
        `isActive={activeBlock?.blockId === block.id && activeBlock?.messageId === message.id}`  
        `onClick={() => setActiveBlock({ messageId: message.id, blockId: block.id })}`  
      `/>`  
    `);`  
  `}`

  `if (block.type === "text") {`  
    `return <MarkdownRenderer key={block.id}>{block.markdown}</MarkdownRenderer>;`  
  `}`

  `return null;`  
`})}`

### **4.2. On app shell**

`export function ChatPage() {`  
  `const [messages, setMessages] = useState<ChatMessage[]>([]);`  
  `const [activeBlock, setActiveBlock] = useState<ActiveBlockRef>(null);`

  `return (`  
    `<div className="flex flex-col h-screen bg-[var(--color-bg-app)]">`  
      `<Header ... />`

      `<div className="flex flex-1 min-h-0 border-t border-[var(--color-border-subtle)]">`  
        `{/* Left: chat */}`  
        `<div className="flex flex-col w-[min(50%,48rem)] border-r border-[var(--color-border-subtle)]">`  
          `<ChatMessages`  
            `messages={messages}`  
            `activeBlock={activeBlock}`  
            `onBlockClick={setActiveBlock}`  
          `/>`  
          `<ChatComposer onSend={...} />`  
        `</div>`

        `{/* Right: canvas */}`  
        `<div className="flex-1 min-w-0">`  
          `<ResultCanvas`  
            `messages={messages}`  
            `activeBlock={activeBlock}`  
            `onBlockChange={setActiveBlock}`  
          `/>`  
        `</div>`  
      `</div>`  
    `</div>`  
  `);`  
`}`

---

## **5\. Implementation Tasks for Claude Code**

**Right panel & integration:**

1. **Create `ResultCanvas`** as above (props: `messages`, `activeBlock`, `onBlockChange`).

2. **Implement full views**:

   * `FullChartView` with Genie hydration (`/api/genie/chart`).

   * `FullTableView` that reuses existing table styling but full-bleed.

   * `FullImageView` with zoomed image \+ “Open in new tab”.

3. **Wire `activeBlock`**:

   * State at chat page level.

   * `onBlockClick` handlers from chat previews.

   * Optional auto-select of first visual block in a new assistant message.

4. **Empty / error states**:

   * Clear, simple empty state when no selection.

   * Error card when chart hydration fails.

Once this is in, we can then refine:

* Chart spec generation on the backend.

* Additional controls in the right panel (e.g., “Copy SQL”, “Open in dashboard”, “Download CSV”).

If you want, I can next write the exact FastAPI `/api/genie/chart` implementation that matches the `FullChartView` contract above (input payload, output `{ spec, table }`).

