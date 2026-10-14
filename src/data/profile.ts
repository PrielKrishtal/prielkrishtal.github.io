export const profile = {
  name: 'Priel Krishtal',
  location: 'Israel',
  email: '[email removed]',
  github: { url: 'https://github.com/PrielKrishtal', label: 'github.com/PrielKrishtal' },
  linkedin: { url: 'https://www.linkedin.com/in/prielkrishtal', label: 'linkedin.com/in/prielkrishtal' },
  headline: 'CS student building production backend and LLM systems.',
  seeking: 'Looking for a part-time student software role, Python/backend.',
} as const;

export interface KeyNumber {
  value: string;
  context: string;
}

export interface Project {
  slug: string;
  name: string;
  status: string;
  problem: string;
  numbers: KeyNumber[];
  stack: string[];
  repo: string;
}

export const filingbot: Project = {
  slug: 'filingbot',
  name: 'FilingBot',
  status: 'Live 24/7',
  problem: 'Polls SEC EDGAR for Form 4 insider-trade filings and sends Telegram alerts on the high-signal trades.',
  numbers: [
    { value: '570+', context: 'live filings processed in production' },
    { value: '67%', context: 'fewer LLM calls across 572 production filings, because rules handle stock grants and tax withholding' },
    { value: '427 MB', context: 'Docker image, down from 1.8 GB (77% smaller)' },
  ],
  stack: ['Python', 'FastAPI', 'Redis Streams', 'PostgreSQL', 'Docker Compose', 'Oracle Cloud', 'Groq', 'Pydantic', 'Sentry', 'GitHub Actions'],
  repo: 'https://github.com/PrielKrishtal/filingbot',
};

export const clarityscan: Project = {
  slug: 'clarityscan',
  name: 'ClarityScan',
  status: 'Deployed',
  problem: 'Receipt management that reads skewed, low-light Hebrew and English receipts without blocking the upload.',
  numbers: [
    { value: '<50 ms', context: 'to answer an upload with HTTP 202 while OCR runs in the background' },
    { value: '~70%', context: 'higher extraction accuracy on degraded images (estimate)' },
    { value: '5/min', context: 'rate limit per IP, with JWT scoping and Argon2 hashing' },
  ],
  stack: ['Python', 'FastAPI', 'React 18', 'Tailwind CSS', 'PostgreSQL', 'SQLAlchemy (async)', 'Alembic', 'Google Cloud Vision', 'OpenCV', 'Render'],
  repo: 'https://github.com/PrielKrishtal/clarity-scan',
};

export const skills: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['Python', 'SQL', 'C', 'Java', 'C#', 'JavaScript'] },
  { group: 'Backend', items: ['FastAPI (async)', 'REST APIs', 'Pydantic', 'SQLAlchemy', 'Alembic'] },
  { group: 'Data and messaging', items: ['PostgreSQL', 'Redis Streams', 'SQLite'] },
  {
    group: 'Infra and reliability',
    items: ['Docker', 'Docker Compose', 'GitHub Actions', 'pre-commit', 'Sentry', 'structured logging', 'Oracle Cloud', 'AWS (EC2, S3, Lambda)'],
  },
  {
    group: 'AI/ML',
    items: ['LLM APIs (Groq, OpenAI, Anthropic, Gemini)', 'structured outputs', 'OpenCV', 'Google Cloud Vision', 'classical ML (scikit-learn-level concepts, XGBoost)'],
  },
  { group: 'Frontend', items: ['React 18', 'Tailwind CSS', 'Vite'] },
];

export const education = {
  degree: 'B.Sc. Computer Science, final year',
  school: 'Afeka College of Engineering',
  expected: 'Expected July 2027',
  topGrades: ['Algorithms 92', 'Object-Oriented Programming 99', 'Introduction to AI 99'],
};

export const languages = ['Hebrew (native)', 'English (fluent)', 'Russian (fluent)'];
