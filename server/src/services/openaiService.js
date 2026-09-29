import { parseLlmJson } from '../lib/parseLlmJson.js'

function openAiError(message, statusCode = 502) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.expose = true
  return error
}

async function callOpenAI(apiKey, prompt, json = false) {
  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  } catch (error) {
    const cause = error?.cause?.message || error?.message || 'network error'
    throw openAiError(`OpenAI request failed: ${cause}`)
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    throw openAiError(`OpenAI API error: ${response.status} ${detail}`.trim())
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw openAiError('OpenAI returned an empty response')
  }
  return content
}

function requireApiKey(apiKey) {
  if (!apiKey) {
    throw openAiError('OpenAI API key is not configured', 500)
  }
}

export function createQuestionGenerator(apiKey) {
  return {
    async generateQuiz(vacancy, count) {
      if (!apiKey) return []
      const prompt = `Generate ${count} multiple choice interview questions for a ${vacancy.level} ${vacancy.title} position with skills: ${vacancy.skills.join(', ')}.
with only one correct answer
Return JSON only with format:
{"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0}]}`
      const raw = await callOpenAI(apiKey, prompt, true)
      const parsed = parseLlmJson(raw)
      const questions = Array.isArray(parsed.questions) ? parsed.questions : []
      return questions.map((q, i) => ({ ...q, id: `q${i + 1}` }))
    },

    async generateBot(vacancy, count) {
      if (!apiKey) return []
      const prompt = `Generate ${count} open-ended interview questions for a ${vacancy.level} ${vacancy.title} position with skills: ${vacancy.skills.join(', ')}.
Return JSON only with format: {"questions":[{"question":"..."}]}`
      const raw = await callOpenAI(apiKey, prompt, true)
      const parsed = parseLlmJson(raw)
      const questions = Array.isArray(parsed.questions) ? parsed.questions : []
      return questions.map((q, i) => ({ ...q, id: `b${i + 1}` }))
    },

    async generateCoding(vacancy) {
      if (!apiKey) return null
      const prompt = `Generate one coding interview task for a ${vacancy.level} ${vacancy.title} with skills: ${vacancy.skills.join(', ')}.
Return JSON only: {"title":"...","description":"...","starterCode":"..."}`
      const raw = await callOpenAI(apiKey, prompt, true)
      const parsed = parseLlmJson(raw)
      if (!parsed?.title) return null
      return { ...parsed, id: 'coding-1' }
    },

    async analyzeBotAnswer(question, answer) {
      requireApiKey(apiKey)
      const prompt = `Analyze this interview answer. Question: "${question}" Answer: "${answer}". Provide brief constructive feedback in Ukrainian (2-3 sentences).`
      return await callOpenAI(apiKey, prompt)
    },

    async generateReport(session) {
      requireApiKey(apiKey)
      const prompt = `Analyze this interview session and provide a report in Ukrainian as JSON:
Vacancy: ${session.vacancy.title} (${session.vacancy.level})
Skills: ${session.vacancy.skills.join(', ')}
Type: ${session.config.type}
Quiz answers: ${JSON.stringify(session.quizAnswers)}
Bot answers: ${JSON.stringify(session.botAnswers)}
Coding: ${session.codingAnswer?.code || 'N/A'}

Return JSON: {"score":number,"maxScore":100,"strengths":["..."],"weaknesses":["..."],"codingFeedback":"...","voiceFeedback":"...","summary":"..."}`
      const raw = await callOpenAI(apiKey, prompt, true)
      return parseLlmJson(raw)
    },
  }
}
