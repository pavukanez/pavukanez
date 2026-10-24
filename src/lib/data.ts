export interface LinkConfig {
  github: string;
  linkedin: string;
  resume: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  location: string;
  dates: string;
  logo: string;
  highlights: string[];
}

export interface SkillGroup {
  label: string;
  blurb: string;
}

export type SkillGroupKey = 'languages' | 'backend' | 'cloud' | 'ai' | 'quality';

export interface Skill {
  name: string;
  group: SkillGroupKey;
}

export const LINKS: LinkConfig = {
  github: 'https://github.com/pavukanez',
  linkedin: 'https://www.linkedin.com/in/pavukanez',
  resume: '/NguyenPham_SoftwareEngineer.pdf',
};

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: 'cisco',
    company: 'Cisco',
    title: 'Software Engineer',
    location: 'Research Triangle Park, NC',
    dates: 'Jun 2024 — Jul 2026',
    logo: 'cisco',
    highlights: [
      'Automated live alert investigations with LangGraph agents, cutting RCA time by 65%.',
      'Built time-series ML models on OpenShift AI using Grafana data for proactive anomaly detection.',
      'Cut Jenkins build times in half by switching to a dual-layer Docker caching strategy.',
      'Achieved a 100% fix rate on high-severity security vulnerabilities across 10+ core repos.',
      'Managed on-call incident response and availability for 14 internal OpenShift clusters.',
    ],
  },
  {
    id: 'aws',
    company: 'Amazon Web Services',
    title: 'Software Engineer Intern',
    location: 'Seattle, WA',
    dates: 'May 2023 — Aug 2023',
    logo: 'aws',
    highlights: [
      'Shipped a LangChain and React semantic search chatbot powered by AWS Lambda.',
      'Wired up an S3-to-Chroma RAG pipeline for automated LLM context retrieval.',
    ],
  },
  {
    id: 'banhmi',
    company: '220C Banh Mi & Coffee',
    title: 'Software Engineer',
    location: 'Charlotte, NC',
    dates: 'Mar 2021 — Sep 2022',
    logo: 'banhmi',
    highlights: [
      'Boosted monthly online orders by 15% with a full-stack React and Node.js web app from scratch.',
      'Integrated Stripe payments and real-time MongoDB sync to drive a 30% jump in retention.',
      'Maintained 99.9% uptime by deploying the backend on Heroku, frontend on Netlify, and managing daily production monitoring.',
      'Built automated SMS notification system using Stripe webhooks and the Gmail API to instantly text new orders to kitchen staff.',
    ],
  },
  {
    id: 'tiaa',
    company: 'TIAA',
    title: 'Software Engineer Intern',
    location: 'Charlotte, NC',
    dates: 'Jun 2022 — Aug 2022',
    logo: 'tiaa',
    highlights: [
      'Built a Django survey platform that matched team needs to data tools using NLP.',
      'Engineered custom Selenium scrapers to feed the app\'s internal knowledge base.',
    ],
  },
  {
    id: 'novozymes',
    company: 'Novozymes',
    title: 'Software Engineer Intern',
    location: 'Research Triangle Park, NC',
    dates: 'Feb 2022 — Dec 2022',
    logo: 'novozymes',
    highlights: [
      'Created reusable Django UI components to streamline maintenance across internal apps.',
      'Added automated unit tests to GitLab CI/CD pipelines to cut down manual debugging.',
    ],
  },
];

export const SKILL_GROUPS: Record<SkillGroupKey, SkillGroup> = {
  languages: {
    label: 'Languages & runtime',
    blurb: 'Day-to-day writing: Python and Java on the backend, JS when the UI has to keep up.',
  },
  backend: {
    label: 'Backend',
    blurb: 'APIs, services, and the boring glue that has to work at 2am. Django, Flask, Express, Spring Boot.',
  },
  cloud: {
    label: 'Cloud & infra',
    blurb: 'Clusters, pipelines, containers. OpenShift, AWS, Kubernetes, GitOps — keep it running, then make it faster.',
  },
  ai: {
    label: 'AI / MLOps',
    blurb: 'Agents and RAG in production-ish settings: LangGraph for on-call, LangChain + Chroma for docs, models on OpenShift AI.',
  },
  quality: {
    label: 'Quality & security',
    blurb: 'Tests in CI, SAST/SCA until the red list is empty, dashboards so you see the fire before paging.',
  },
};

export const SKILLS: Skill[] = [
  { name: 'Python', group: 'languages' },
  { name: 'Java', group: 'languages' },
  { name: 'JavaScript', group: 'languages' },
  { name: 'SQL', group: 'languages' },
  { name: 'Node.js', group: 'backend' },
  { name: 'Express', group: 'backend' },
  { name: 'Django', group: 'backend' },
  { name: 'Flask', group: 'backend' },
  { name: 'Spring Boot', group: 'backend' },
  { name: 'React', group: 'backend' },
  { name: 'AWS', group: 'cloud' },
  { name: 'OpenShift', group: 'cloud' },
  { name: 'Kubernetes', group: 'cloud' },
  { name: 'Docker', group: 'cloud' },
  { name: 'Jenkins', group: 'cloud' },
  { name: 'GitLab CI', group: 'cloud' },
  { name: 'Argo CD', group: 'cloud' },
  { name: 'PostgreSQL', group: 'backend' },
  { name: 'MongoDB', group: 'backend' },
  { name: 'LangGraph', group: 'ai' },
  { name: 'LangChain', group: 'ai' },
  { name: 'RAG', group: 'ai' },
  { name: 'OpenShift AI', group: 'ai' },
  { name: 'SonarQube', group: 'quality' },
  { name: 'SAST / SCA', group: 'quality' },
  { name: 'Grafana', group: 'quality' },
  { name: 'Postman', group: 'quality' },
  { name: 'Git', group: 'quality' },
];