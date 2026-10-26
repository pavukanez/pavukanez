import Hero from '@/components/Hero';
import Experience from '@/components/Experience';
import Skills from '@/components/Skills';
import Footer from '@/components/Footer';
import { LINKS } from '@/lib/data';

export default function Home() {
  return (
    <div>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-sm">
          <a href="#top" className="font-display text-lg tracking-tight text-paper">
            Daniel Pham
          </a>
          <div className="flex gap-6 text-muted">
            <a href="#experience" className="transition hover:text-brass-hot">
              Experience
            </a>
            <a href="#skills" className="transition hover:text-brass-hot">
              Skills
            </a>
            <a href="/lambda" className="transition hover:text-brass-hot">
              Sandbox
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        <Hero />
        <Experience />
        <Skills />
      </main>
      <Footer />
    </div>
  );
}