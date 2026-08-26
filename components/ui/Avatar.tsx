import { cn, initials } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-20 w-20 text-2xl",
} as const;

export function Avatar({
  url,
  name,
  size = "md",
  className,
}: {
  url: string | null | undefined;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn(SIZE_CLASSES[size], "shrink-0 rounded-full border border-border object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        SIZE_CLASSES[size],
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised font-heading text-gold",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
