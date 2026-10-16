import type { Block, Inline } from "@/lib/article-format";

/** Renders parsed article blocks as plain React elements (no HTML from authors is ever injected). */
export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="article-body">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h2":
            return <h2 key={i}><Inlines c={b.c} /></h2>;
          case "h3":
            return <h3 key={i}><Inlines c={b.c} /></h3>;
          case "quote":
            return <blockquote key={i}><Inlines c={b.c} /></blockquote>;
          case "ul":
          case "ol": {
            const List = b.t;
            return (
              <List key={i}>
                {b.items.map((it, j) => (
                  <li key={j}><Inlines c={it} /></li>
                ))}
              </List>
            );
          }
          default:
            return <p key={i}><Inlines c={b.c} /></p>;
        }
      })}
    </div>
  );
}

function Inlines({ c }: { c: Inline[] }) {
  return (
    <>
      {c.map((n, i) => {
        if (n.t === "text") return <span key={i}>{n.v}</span>;
        if (n.t === "b") return <strong key={i}><Inlines c={n.c} /></strong>;
        if (n.t === "i") return <em key={i}><Inlines c={n.c} /></em>;
        return (
          <a key={i} href={n.href} target="_blank" rel="nofollow ugc noopener noreferrer">
            <Inlines c={n.c} />
          </a>
        );
      })}
    </>
  );
}
