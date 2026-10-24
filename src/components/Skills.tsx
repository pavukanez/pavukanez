'use client';

import { useState } from 'react';
import { SKILL_GROUPS, SKILLS, SkillGroupKey, Skill } from '@/lib/data';

export default function Skills() {
  const [hovered, setHovered] = useState<Skill | null>(null);
  const [pinned, setPinned] = useState<Skill | null>(null);
  const active = hovered ?? pinned;
  const group = active?.group ?? null;
  const meta = group ? SKILL_GROUPS[group] : null;

  return (
    <section id="skills" className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-brass">
            Toolbox
          </p>
          <h2 className="mt-3 font-display text-3xl text-paper md:text-4xl">
            Skills
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted md:text-right">
          Hover a tile. Related skills light up with it — the cluster I actually
          use together, not a laundry list.
        </p>
      </div>

      <div
        className="min-h-[5.5rem] rounded-2xl border border-line bg-ink-soft/70 px-5 py-4"
        aria-live="polite"
      >
        {meta && active ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brass">
              {meta.label}
              <span className="text-muted"> • {active.name}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-paper/90">
              {meta.blurb}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Pick a skill to see the proficiency group and how it shows up in
            the work.
          </p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {SKILLS.map((skill) => {
          const hot = group != null && skill.group === group;
          const dim = group != null && !hot;
          return (
            <button
              key={skill.name}
              type="button"
              onMouseEnter={() => setHovered(skill)}
              onFocus={() => setHovered(skill)}
              onMouseLeave={() => setHovered(null)}
              onBlur={() => setHovered(null)}
              onClick={() =>
                setPinned((current) =>
                  current?.name === skill.name ? null : skill,
                )
              }
              className={`skill-btn rounded-xl border px-3 py-3 text-left text-sm font-medium ${
                hot
                  ? 'is-hot border-brass bg-brass text-ink shadow-[0_0_24px_rgba(201,162,39,0.35)]'
                  : 'border-line bg-ink-soft text-paper'
              } ${dim ? 'opacity-35' : ''}`}
            >
              {skill.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}