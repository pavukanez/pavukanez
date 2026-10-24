'use client';

import { LINKS } from '@/lib/data';

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16 md:pb-28 md:pt-16">
      <div className="relative mx-auto w-full max-w-sm md:max-w-none">
        <div className="absolute -inset-3 rounded-[2rem] border border-brass/25 md:-inset-4" />
        <div className="overflow-hidden rounded-[1.6rem] border border-line bg-ink-soft shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <img
            src="/profile_picture.jpeg"
            alt="Portrait of Daniel Pham"
            className="aspect-[4/5] w-full object-cover object-top"
          />
        </div>
      </div>

      <div className="flex flex-col items-start">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-brass">
          Backend • Cloud infra
        </p>
        <h1 className="mt-4 font-display text-4xl leading-[1.1] text-paper sm:text-5xl lg:text-6xl">
          Hello I&apos;m Daniel Pham
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Software engineer with 3+ YOE, specialize in backend development and
          cloud infra, previously at Cisco, AWS, Novozymes, TIAA
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-paper/20 px-5 py-2.5 text-sm font-medium text-paper transition hover:border-brass hover:text-brass-hot"
          >
            GitHub
          </a>
          <a
            href={LINKS.linkedin}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-paper/20 px-5 py-2.5 text-sm font-medium text-paper transition hover:border-brass hover:text-brass-hot"
          >
            LinkedIn
          </a>
          <a
            href={LINKS.resume}
            download="NguyenPham_SoftwareEngineer.pdf"
            className="rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-brass-hot"
          >
            Download résumé
          </a>
        </div>
      </div>
    </section>
  );
}