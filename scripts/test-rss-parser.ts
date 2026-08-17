import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'MyDashboard/1.0' },
})

const FEEDS = [
  { expected: '量子位', url: 'https://www.qbitai.com/feed' },
  { expected: 'LangChain Blog', url: 'https://blog.langchain.dev/rss/' },
  { expected: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml' },
  { expected: 'AWS Machine Learning Blog', url: 'https://aws.amazon.com/blogs/amazon-ai/feed/' },
  { expected: 'Engineering at Meta', url: 'https://engineering.fb.com/feed/' },
  { expected: 'Elastic Blog', url: 'https://www.elastic.co/blog/feed' },
  { expected: 'Grafana Labs', url: 'https://grafana.com/categories/engineering/index.xml' },
  { expected: '宝玉的分享', url: 'https://baoyu.io/feed.xml' },
  { expected: '掘金本周最热', url: 'https://rsshub.bestblogs.dev/juejin/trending/all/weekly' },
  { expected: 'deeplearning.ai', url: 'https://rsshub.bestblogs.dev/deeplearning/the-batch' },
  { expected: 'ByteByteGo Newsletter', url: 'https://blog.bytebytego.com/feed' },
  { expected: 'Last Week in AI', url: 'https://lastweekin.ai/feed/' },
  { expected: 'Next.js Blog', url: 'https://nextjs.org/feed.xml' },
  { expected: 'Google DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/' },
  { expected: 'Martin Fowler', url: 'https://martinfowler.com/feed.atom' },
  { expected: 'The GitHub Blog', url: 'https://github.blog/feed/' },
  { expected: 'freeCodeCamp.org', url: 'https://www.freecodecamp.org/news/rss/' },
  { expected: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml' },
  { expected: 'Node.js Blog', url: 'https://nodejs.org/en/feed/blog.xml' },
  { expected: '美团技术团队', url: 'https://tech.meituan.com/feed/' },
  { expected: 'InfoQ', url: 'https://www.infoq.com/rss/rss.action' },
  { expected: 'Smashing Magazine', url: 'https://rss1.smashingmagazine.com/feed/' },
  { expected: '机器之心', url: 'https://wechat2rss.bestblogs.dev/feed/8d97af31b0de9e48da74558af128a4673d78c9a3.xml' },
  { expected: '人人都是产品经理', url: 'https://wechat2rss.bestblogs.dev/feed/2d790e38f8af54c5af77fa5fed687a7c66d34c22.xml' },
  { expected: '腾讯技术工程', url: 'https://wechat2rss.bestblogs.dev/feed/1e0ac39f8952b2e7f0807313cf2633d25078a171.xml' },
  { expected: '阿里技术', url: 'https://wechat2rss.bestblogs.dev/feed/6535a444e9651fecae3383363be7589acdebe2b6.xml' },
  { expected: '字节跳动技术团队', url: 'https://wechat2rss.bestblogs.dev/feed/d3a9e4d6f125cc98d1691dbc30cd97fec7ae2d03.xml' },
  { expected: 'Docker', url: 'https://www.docker.com/feed/' },
  { expected: 'MongoDB Blog', url: 'https://www.mongodb.com/blog/rss' },
  { expected: 'Databricks', url: 'https://www.databricks.com/feed' },
]

interface TestResult {
  url: string
  expected: string
  parsedTitle: string
  articles: number
  timeMs: number
  status: 'ok' | 'no-title' | 'no-articles' | 'error'
  error?: string
}

async function testFeed(expected: string, url: string): Promise<TestResult> {
  const start = performance.now()
  try {
    // Use fetch + parseString (same as ADD_FEED handler)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MyDashboard/1.0' },
      signal: AbortSignal.timeout(10000),
    })
    const xml = await res.text()
    const feed = await parser.parseString(xml)
    const timeMs = Math.round(performance.now() - start)
    const parsedTitle = (feed.title || '').trim()
    const articles = feed.items?.length ?? 0

    let status: TestResult['status'] = 'ok'
    if (!parsedTitle) status = 'no-title'
    else if (articles === 0) status = 'no-articles'

    return { url, expected, parsedTitle, articles, timeMs, status }
  } catch (err) {
    return {
      url, expected, parsedTitle: '', articles: 0,
      timeMs: Math.round(performance.now() - start),
      status: 'error', error: (err as Error).message,
    }
  }
}

async function main() {
  console.log(`Testing ${FEEDS.length} RSS feeds...\n`)

  const results: TestResult[] = []
  for (const feed of FEEDS) {
    process.stdout.write(`  ${feed.expected.padEnd(30)}`)
    const result = await testFeed(feed.expected, feed.url)
    const icon = result.status === 'ok' ? '✅' : result.status === 'error' ? '❌' : '⚠️'
    console.log(`${icon} ${result.timeMs}ms | title="${result.parsedTitle}" | articles=${result.articles}${result.error ? ` | err: ${result.error}` : ''}`)
    results.push(result)
  }

  const ok = results.filter((r) => r.status === 'ok')
  const noTitle = results.filter((r) => r.status === 'no-title')
  const noArticles = results.filter((r) => r.status === 'no-articles')
  const errors = results.filter((r) => r.status === 'error')

  console.log('\n' + '='.repeat(60))
  console.log(`Total: ${results.length} | OK: ${ok.length} | No Title: ${noTitle.length} | No Articles: ${noArticles.length} | Error: ${errors.length}`)
  console.log(`Avg time: ${Math.round(results.reduce((s, r) => s + r.timeMs, 0) / results.length)}ms`)

  if (noTitle.length > 0) {
    console.log('\n--- Missing Titles (need HTML fallback) ---')
    for (const r of noTitle) {
      console.log(`  ${r.expected} → ${r.url}`)
    }
  }

  if (errors.length > 0) {
    console.log('\n--- Parse Errors ---')
    for (const r of errors) {
      console.log(`  ${r.expected}: ${r.error}`)
    }
  }
}

main().catch(console.error)
