import type { Course } from "./types";

export function CourseArtwork({ variant }: { variant: Course["artwork"] }) {
  const mathematics = variant === "mathematics";

  return (
    <div className="course-artwork" data-artwork={variant} aria-hidden="true">
      <svg viewBox="0 0 420 185" className="size-full" fill="none">
        <path
          d="M0 147H420M0 108H420M0 69H420M0 30H420M38 0V185M87 0V185M136 0V185M185 0V185M234 0V185M283 0V185M332 0V185M381 0V185"
          stroke="currentColor"
          opacity=".08"
        />
        <circle cx="357" cy="36" r="73" fill="currentColor" opacity=".06" />
        <circle cx="38" cy="173" r="62" fill="currentColor" opacity=".06" />
        {mathematics ? (
          <>
            <path
              d="M203 48 254 77 254 135 203 165 152 135 152 77Z"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="m152 77 51 29 51-29m-51 29v59m0-117v58"
              stroke="currentColor"
              strokeWidth="2"
              opacity=".7"
            />
            <circle
              cx="99"
              cy="58"
              r="23"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M89 58h20M99 48v20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <rect
              x="292"
              y="112"
              width="45"
              height="45"
              rx="11"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="1.5"
              transform="rotate(12 292 112)"
            />
            <path
              d="m302 130 14 4m-15 3 14 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="m281 48 6-12 6 12Zm-166 80-12 22h25Z"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity=".6"
            />
          </>
        ) : (
          <>
            <path
              d="m211 94-69-49m69 49 69-44m-69 44-76 46m76-46 80 49m-80-49-5 61"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 5"
              opacity=".55"
            />
            <circle
              cx="211"
              cy="94"
              r="36"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="2"
            />
            <ellipse
              cx="211"
              cy="94"
              rx="16"
              ry="27"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M183 94h56m-52-12h48m-48 24h48"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="115"
              y="24"
              width="46"
              height="39"
              rx="10"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m130 37-5 6 5 6m14-12 5 6-5 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="282"
              cy="46"
              r="20"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m276 46 4 4 7-8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <rect
              x="112"
              y="120"
              width="43"
              height="36"
              rx="9"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M123 132h20m-20 7h13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="290"
              cy="142"
              r="23"
              fill="var(--art-surface)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M281 142h18m-9-9v18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="207" cy="159" r="7" fill="currentColor" opacity=".55" />
          </>
        )}
        <path
          d="m54 51 3-7 3 7 7 3-7 3-3 7-3-7-7-3Zm298 37 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z"
          fill="currentColor"
          opacity=".45"
        />
      </svg>
    </div>
  );
}
