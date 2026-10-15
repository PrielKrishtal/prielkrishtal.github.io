export const profile = {
  name: 'Priel Krishtal',
  location: 'Israel',
  emailEncoded: 'bW9jLmxpYW1nQGxhdGhzaXJrLmxlaXJw',
  github: { url: 'https://github.com/PrielKrishtal', label: 'github.com/PrielKrishtal' },
  linkedin: { url: 'https://www.linkedin.com/in/prielkrishtal', label: 'linkedin.com/in/prielkrishtal' },
  headline: 'CS student building production backend and LLM systems.',
  seeking: 'Looking for a part-time student software role, Python/backend.',
} as const;

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
