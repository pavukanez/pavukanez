function CiscoMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-7 w-7">
      <g fill="currentColor">
        {[8, 16, 24, 32, 40, 48].map((x, i) => {
          const h = [14, 22, 30, 30, 22, 14][i];
          return (
            <rect
              key={x}
              x={x}
              y={32 - h / 2}
              width="6"
              height={h}
              rx="1.2"
            />
          );
        })}
      </g>
    </svg>
  );
}

function AwsMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-8 w-8">
      <text
        x="32"
        y="34"
        textAnchor="middle"
        fill="currentColor"
        fontSize="18"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
      >
        AWS
      </text>
      <path
        d="M18 42c8 8 20 8 28 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M42 46l6-4-2 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TiaaMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-7 w-7">
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fill="currentColor"
        fontSize="20"
        fontFamily="Arial, sans-serif"
        fontWeight="800"
        letterSpacing="0.5"
      >
        TIAA
      </text>
    </svg>
  );
}

function NovozymesMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-8 w-8">
      <path
        d="M32 12c0 14-10 18-10 30a10 10 0 0 0 20 0c0-8 6-12 6-22-8 4-10 10-16-8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M32 28v24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BanhMiMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-7 w-7">
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fill="currentColor"
        fontSize="24"
        fontFamily="Arial, sans-serif"
        fontWeight="800"
        letterSpacing="-0.5"
      >
        220C
      </text>
    </svg>
  );
}

const MARKS: Record<string, () => React.ReactElement> = {
  cisco: CiscoMark,
  aws: AwsMark,
  tiaa: TiaaMark,
  novozymes: NovozymesMark,
  banhmi: BanhMiMark,
};

interface CompanyLogoProps {
  name: string;
}

export default function CompanyLogo({ name }: CompanyLogoProps) {
  const Mark = MARKS[name];
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brass/50 bg-ink text-brass-hot shadow-[0_0_0_6px_#10140f,0_0_24px_rgba(201,162,39,0.25)]">
      {Mark ? <Mark /> : null}
    </div>
  );
}