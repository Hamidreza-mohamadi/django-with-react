interface StrikePriceProps {
  value: string;
  className?: string;
}

/** Old price with a short, oblique strike so the digits stay readable. */
export function StrikePrice({ value, className = "" }: StrikePriceProps) {
  return (
    <span className={`relative inline-block text-muted-foreground ${className}`}>
      {value}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 rotate-[-10deg] bg-current opacity-70"
      />
    </span>
  );
}
