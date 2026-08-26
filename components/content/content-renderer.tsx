import type { ContentBlock } from "@/features/content/schema";

export function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="content-body">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          return block.level === 2 ? (
            <h2 key={key}>{block.text}</h2>
          ) : (
            <h3 key={key}>{block.text}</h3>
          );
        }
        if (block.type === "paragraph") return <p key={key}>{block.text}</p>;
        if (block.type === "list") {
          const items = block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{item}</li>
          ));
          return block.style === "numbered" ? (
            <ol key={key}>{items}</ol>
          ) : (
            <ul key={key}>{items}</ul>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote key={key}>
              <p>{block.text}</p>
              {block.attribution ? <cite>{block.attribution}</cite> : null}
            </blockquote>
          );
        }
        return (
          <aside
            className={`content-callout content-callout-${block.tone}`}
            key={key}
          >
            {block.title ? <h3>{block.title}</h3> : null}
            <p>{block.text}</p>
          </aside>
        );
      })}
    </div>
  );
}
