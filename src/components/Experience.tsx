'use client';

import { EXPERIENCE } from '@/lib/data';
import CompanyLogo from './CompanyLogo';

export default function Experience() {
  return (
    <section id="experience" className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="mb-14 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-brass">
          Path so far
        </p>
        <h2 className="mt-3 font-display text-3xl text-paper md:text-4xl">
          Experience
        </h2>
      </div>

      <div className="relative">
        <div className="absolute bottom-0 left-7 top-0 w-px bg-gradient-to-b from-brass/0 via-brass/50 to-brass/0 md:left-1/2 md:-translate-x-1/2" />

        <ol className="space-y-14">
          {EXPERIENCE.map((job, index) => {
            const left = index % 2 === 0;
            return (
              <li
                key={job.id}
                className="relative grid items-start gap-6 pl-20 md:grid-cols-[1fr_auto_1fr] md:gap-10 md:pl-0"
              >
                <article
                  className={`rounded-2xl border border-line bg-ink-soft/80 p-6 backdrop-blur-sm md:max-w-xl ${
                    left
                      ? 'md:col-start-1 md:justify-self-end md:text-right'
                      : 'md:col-start-3 md:justify-self-start'
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-brass">
                    {job.dates}
                  </p>
                  <h3 className="mt-2 font-display text-2xl text-paper">
                    {job.company}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {job.title} • {job.location}
                  </p>
                  <ul
                    className={`mt-4 space-y-3 text-sm leading-relaxed text-paper/85 ${
                      left ? 'md:ml-auto' : ''
                    }`}
                  >
                    {job.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <div className="absolute left-0 top-6 z-10 md:static md:col-start-2 md:row-start-1 md:self-start md:justify-self-center md:pt-4">
                  <CompanyLogo name={job.logo} />
                </div>

                <div
                  className={`hidden md:block ${
                    left ? 'md:col-start-3' : 'md:col-start-1 md:row-start-1'
                  }`}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}