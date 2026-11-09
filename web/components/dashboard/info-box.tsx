import { cn } from "cn";

interface InfoBoxProps {
  title?: string;
  items: string[];
  className?: string;
}

export default function InfoBox({
  title,
  items,
  className = "",
}: InfoBoxProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-primary/20 bg-blue-50 px-4 py-6",
        className
      )}
    >
      {title && (
        <h2 className="mb-2 text-lg text-blue-900 md:text-xl">{title}</h2>
      )}
      <ul className="space-y-2 text-sm text-blue-800">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="shrink-0 text-primary">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
