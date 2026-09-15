import { cn } from "@/lib/utils";

type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

export function JourneyTree({
  nodes,
  className,
}: {
  nodes: TreeNode[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium">
            {node.label}
          </div>
          {node.children && node.children.length > 0 ? (
            <ul className="mt-2 space-y-2 border-l border-[var(--border)] pl-4">
              {node.children.map((child) => (
                <li key={child.id}>
                  <div className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
                    {child.label}
                  </div>
                  {child.children && child.children.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-l border-[var(--border)] pl-4">
                      {child.children.map((leaf) => (
                        <li
                          key={leaf.id}
                          className="text-sm text-[var(--foreground)]"
                        >
                          {leaf.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
