// Ask from the terminal:
//   npm run ask -- "How many vacation days do I get?"      retrieval + Gemini answer
//   npm run search -- "How many vacation days do I get?"   retrieval only (shows which chunks match)
import { answer, search } from './rag.js';

const args = process.argv.slice(2);
const searchOnly = args[0] === '--search';
const question = (searchOnly ? args.slice(1) : args).join(' ').trim();

if (!question) {
  console.error('Usage: npm run ask -- "your question"   or   npm run search -- "your question"');
  process.exit(1);
}

const printSources = (sources) => {
  console.log('\nRetrieved chunks (best first):');
  sources.forEach((s, i) => console.log(`  [${i + 1}] ${s.score.toFixed(3)}  ${s.title} › ${s.heading}`));
};

if (searchOnly) {
  printSources(await search(question));
} else {
  const result = await answer(question);
  printSources(result.sources);
  console.log(`\nAnswer:\n${result.answer}`);
}
