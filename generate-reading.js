export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { topic, level = "C1", searchLang = "English" } = req.body || {};
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "Missing topic" });
    }

    const searchResults = await searchWeb(topic, searchLang);
    const generated = await generateReading({ topic, level, searchLang, searchResults });

    return res.status(200).json(generated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Generation failed",
      detail: error.message || String(error)
    });
  }
}

async function searchWeb(topic, searchLang) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query: `${topic} ${searchLang === "English" ? "" : searchLang} latest analysis`,
      search_depth: "advanced",
      max_results: 5,
      include_answer: false,
      include_raw_content: false
    })
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return (data.results || []).map(item => ({
    title: item.title,
    url: item.url,
    snippet: item.content
  }));
}

async function generateReading({ topic, level, searchLang, searchResults }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const sourceText = searchResults.map((s, i) =>
    `[${i + 1}] ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`
  ).join("\n\n");

  const prompt = `
You are an expert English reading curriculum designer.

Create one daily English reading lesson based on the topic and web search results.

Topic: ${topic}
Level: ${level}
Search language preference: ${searchLang}

Use the search results as factual grounding. Do not invent specific facts not supported by the snippets. If the snippets are insufficient, write a general analytical article and say "source-limited" implicitly by keeping claims broad.

Target:
- A1/A2: simple language
- B1/B2: practical business/news style
- C1: advanced professional analysis
- C2: expert-level analytical prose

Return ONLY valid JSON with this exact schema:
{
  "title": "string",
  "topic": "string",
  "level": "A1|A2|B1|B2|C1|C2",
  "article": ["paragraph 1", "paragraph 2", "..."],
  "vocab": [
    {"word":"string","ipa":"string","zh":"中文释义","example":"English example sentence"}
  ],
  "questions": [
    {"question":"string","options":["A option","B option","C option","D option"],"answer":0,"explanation":"中文解析"}
  ],
  "sources": [
    {"title":"string","url":"string","snippet":"string"}
  ],
  "summaryPrompt": "string"
}

Requirements:
- Article should be suitable for about 15 minutes of study.
- Generate 10 vocabulary items.
- Generate exactly 5 multiple-choice questions.
- answer must be index 0-3.
- Do not include Markdown.
- Do not include text outside JSON.

Search results:
${sourceText || "No search results available."}
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: prompt,
      temperature: 0.4
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI generation failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = extractText(data);
  const json = safeParseJson(text);
  json.sources = (json.sources && json.sources.length ? json.sources : searchResults).slice(0, 5);
  return json;
}

function extractText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.text) parts.push(content.text);
    }
  }
  return parts.join("\n");
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Model did not return valid JSON");
  }
}
