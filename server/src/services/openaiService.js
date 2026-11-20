import { parseLlmJson } from '../lib/parseLlmJson.js'

const NO_ANSWER = 'Без відповіді'

function openAiError(message, statusCode = 502) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.expose = true
  return error
}

async function callOpenAI(apiKey, prompt, { json = false, temperature = 0.7 } = {}) {
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
        temperature,
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

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function textList(value) {
  if (!Array.isArray(value)) return []
  return value.map(text).filter(Boolean)
}

function clampScore(value) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function optionAt(options, index) {
  return Number.isInteger(index) && index >= 0 && index < options.length ? options[index] : null
}

// A quiz question is usable only when exactly one of four options is marked correct,
// otherwise it cannot be graded and is dropped.
function normalizeQuizQuestion(raw) {
  const question = text(raw?.question)
  const options = Array.isArray(raw?.options) ? raw.options.map(text).filter(Boolean) : []
  const correctIndex = Number(raw?.correctIndex)

  if (!question || options.length !== 4) return null
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null
  if (new Set(options).size !== 4) return null

  return { question, options, correctIndex, explanation: text(raw?.explanation) }
}

function gradeQuiz(session) {
  const questions = Array.isArray(session.quizQuestions) ? session.quizQuestions : []
  if (questions.length === 0) return null

  const selectedByQuestion = new Map(
    (session.quizAnswers ?? []).map((answer) => [answer.questionId, answer.selectedIndex]),
  )

  const details = questions.map((question, index) => {
    const questionId = question.id || `q${index + 1}`
    const options = Array.isArray(question.options) ? question.options : []
    const selectedIndex = selectedByQuestion.get(questionId)
    const correct = optionAt(options, question.correctIndex)

    return {
      questionId,
      question: text(question.question),
      selectedAnswer: optionAt(options, selectedIndex) ?? NO_ANSWER,
      correctAnswer: correct ?? NO_ANSWER,
      isCorrect: correct !== null && selectedIndex === question.correctIndex,
      explanation: text(question.explanation),
    }
  })

  const correctCount = details.filter((detail) => detail.isCorrect).length
  return {
    score: Math.round((correctCount / details.length) * 100),
    maxScore: 100,
    correctCount,
    totalCount: details.length,
    summary: '',
    details,
  }
}

function collectBotAnswers(session) {
  const answers = (Array.isArray(session.botAnswers) ? session.botAnswers : [])
    .filter((answer) => text(answer?.answer))
  if (answers.length === 0) return null

  const questionById = new Map(
    (session.botQuestions ?? []).map((question, index) => [
      question.id || `b${index + 1}`,
      text(question.question),
    ]),
  )

  return answers.map((answer, index) => {
    const questionId = answer.questionId || `b${index + 1}`
    return {
      questionId,
      question: questionById.get(questionId) ?? '',
      answer: text(answer.answer),
      analysis: '',
    }
  })
}

function collectCoding(session) {
  const taskById = new Map((session.codingTasks ?? []).map((task) => [task?.id, task]))
  const items = (Array.isArray(session.codingAnswers) ? session.codingAnswers : [])
    .map((answer) => ({
      title: text(taskById.get(answer?.taskId)?.title),
      description: text(taskById.get(answer?.taskId)?.description),
      code: text(answer?.code),
    }))
    .filter((item) => item.code)
  return items.length === 0 ? null : items
}

function buildQuizBlock(quiz) {
  const mistakes = quiz.details.filter((detail) => !detail.isCorrect)
  const lines = mistakes.length === 0
    ? ['No mistakes, every answer is correct.']
    : mistakes.map((detail, index) => [
      `${index + 1}. Question: ${detail.question}`,
      `   Candidate picked: ${detail.selectedAnswer}`,
      `   Correct answer: ${detail.correctAnswer}`,
    ].join('\n'))

  return [
    '--- QUIZ (already graded in code, keep this score as is) ---',
    `Score: ${quiz.score}/100 (${quiz.correctCount} of ${quiz.totalCount} correct)`,
    ...lines,
  ].join('\n')
}

function buildBotBlock(botAnswers) {
  const lines = botAnswers.map((item, index) => [
    `${index + 1}. questionId: ${item.questionId}`,
    `   Question: ${item.question}`,
    `   Answer: ${item.answer}`,
  ].join('\n'))

  return ['--- OPEN-ENDED (BOT) ANSWERS ---', ...lines].join('\n')
}

function buildCodingBlock(coding) {
  const tasks = coding.map((item, index) => [
    `Task ${index + 1}: ${item.title}`,
    `Description: ${item.description}`,
    'Submitted code:',
    item.code,
  ].join('\n'))
  return ['--- LIVE CODING ---', ...tasks].join('\n\n')
}

function buildReportPrompt(session, quiz, botAnswers, coding) {
  const vacancy = session.vacancy
  const present = [quiz && 'quiz', botAnswers && 'bot', coding && 'coding'].filter(Boolean)

  const blocks = [
    [
      'You are a senior technical interviewer. Analyze one interview session and grade every part separately.',
      '',
      `Vacancy: ${vacancy.title} (${vacancy.level})`,
      `Required skills: ${vacancy.skills.join(', ')}`,
      `Parts present in this session: ${present.join(', ')}`,
    ].join('\n'),
    quiz ? buildQuizBlock(quiz) : null,
    botAnswers ? buildBotBlock(botAnswers) : null,
    coding ? buildCodingBlock(coding) : null,
    [
      'Rules:',
      `- Judge strictly against ${vacancy.level} expectations for this role.`,
      '- Grade each part independently, one part must not influence the score of another.',
      '- Use null for parts that are absent from this session.',
      '- Write every text field in Ukrainian, keep technical terms and code identifiers in English.',
      '',
      'Return JSON only:',
      '{',
      '  "quizSummary": "3-5 sentences: which topics the mistakes point to and what to revise; praise if there are no mistakes. null if there is no quiz",',
      '  "bot": {"score": 0-100, "summary": "3-5 sentences about the answers overall", "details": [{"questionId": "...", "analysis": "3-4 sentences: what was correct, what is missing or wrong, what a strong answer would add"}]} or null,',
      '  "coding": {"score": 0-100, "summary": "3-5 sentences overall verdict on the solution(s); with several tasks grade them together as one score", "correctness": "does the code solve the task(s), edge cases and bugs", "readability": "naming, structure, complexity", "improvements": ["concrete change 1", "concrete change 2"]} or null,',
      '  "strengths": ["..."],',
      '  "weaknesses": ["..."],',
      '  "summary": "4-6 sentences: overall verdict across all parts and a hiring recommendation for this level"',
      '}',
    ].join('\n'),
  ]

  return blocks.filter((block) => block !== null).join('\n\n')
}

function buildBotSection(botAnswers, parsedBot) {
  const analysisById = new Map(
    (Array.isArray(parsedBot?.details) ? parsedBot.details : [])
      .map((detail) => [detail?.questionId, text(detail?.analysis)]),
  )

  return {
    score: clampScore(parsedBot?.score),
    maxScore: 100,
    summary: text(parsedBot?.summary),
    details: botAnswers.map((item) => ({
      ...item,
      analysis: analysisById.get(item.questionId) ?? '',
    })),
  }
}

function buildCodingSection(parsedCoding) {
  return {
    score: clampScore(parsedCoding?.score),
    maxScore: 100,
    summary: text(parsedCoding?.summary),
    correctness: text(parsedCoding?.correctness),
    readability: text(parsedCoding?.readability),
    improvements: textList(parsedCoding?.improvements),
  }
}

const QUESTION_BATCH_SIZE = 10

// LLM часто повертає менше питань, ніж просили (або частину відсіює валідація),
// тому добираємо брак невеликими батчами, передаючи вже наявні питання, щоб уникнути повторів.
async function collectQuestions(count, fetchBatch, label, labelOf = (item) => item.question) {
  const items = []
  const seen = new Set()
  const maxAttempts = Math.ceil(count / QUESTION_BATCH_SIZE) + 2
  let lastError = null

  for (let attempt = 0; attempt < maxAttempts && items.length < count; attempt++) {
    const need = Math.min(QUESTION_BATCH_SIZE, count - items.length)
    try {
      const batch = await fetchBatch(need, items.map(labelOf))
      for (const item of batch) {
        const key = text(labelOf(item)).toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        items.push(item)
      }
    } catch (error) {
      lastError = error
    }
  }

  if (items.length < count) {
    console.warn(`Generated ${items.length} of ${count} ${label} questions`)
  }
  if (items.length === 0 && lastError) throw lastError
  return items.slice(0, count)
}

function avoidRepeatsLine(existing) {
  if (existing.length === 0) return ''
  return `Do NOT repeat or paraphrase these already generated questions:\n${existing.map((q) => `- ${q}`).join('\n')}\n`
}

async function generateQuizBatch(apiKey, vacancy, need, existing) {
  const prompt = [
    `Generate EXACTLY ${need} single-answer multiple choice interview questions for a ${vacancy.level} ${vacancy.title} position.`,
    `Skills to cover: ${vacancy.skills.join(', ')}.`,
    '',
    'Hard requirements:',
    '- Exactly 4 options per question, all four different.',
    '- Exactly ONE option is correct; the other three must be clearly and verifiably wrong.',
    '- Never use "all of the above", "none of the above" or two options that are both defensible.',
    '- "correctIndex" is the 0-based index of that single correct option.',
    '- Vary the position of the correct option between questions.',
    '- "explanation" (1-2 sentences) says why the correct option is right and why the distractors are wrong.',
    '- Match the difficulty to the declared level; one question covers one skill, skills may repeat with different aspects if there are more questions than skills.',
    '- Write questions, options and explanations in Ukrainian, keep technical terms and code in English.',
    avoidRepeatsLine(existing),
    `Return JSON only with exactly ${need} items:`,
    '{"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}]}',
  ].join('\n')

  const raw = await callOpenAI(apiKey, prompt, { json: true })
  const parsed = parseLlmJson(raw)
  const source = Array.isArray(parsed.questions) ? parsed.questions : []
  const valid = source.map(normalizeQuizQuestion).filter(Boolean)
  if (valid.length < source.length) {
    console.warn(`Dropped ${source.length - valid.length} invalid quiz question(s) of ${source.length}`)
  }
  return valid
}

async function generateTopicQuizBatch(apiKey, topic, need, existing) {
  const prompt = [
    `Generate EXACTLY ${need} single-answer multiple choice questions that check understanding of the text below.`,
    'Questions must be answerable from the text (or basic knowledge of its topic).',
    '',
    'Hard requirements:',
    '- Exactly 4 options per question, all four different.',
    '- Exactly ONE option is correct; the other three must be clearly and verifiably wrong.',
    '- "correctIndex" is the 0-based index of the correct option; vary its position between questions.',
    '- "explanation" (1-2 sentences) says why the correct option is right.',
    '- Write in Ukrainian, keep technical terms and code in English.',
    avoidRepeatsLine(existing),
    `Return JSON only with exactly ${need} items:`,
    '{"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"..."}]}',
    '',
    `Topic: ${topic.title}`,
    'Text:',
    topic.content.slice(0, 20000),
  ].join('\n')
  const parsed = parseLlmJson(await callOpenAI(apiKey, prompt, { json: true }))
  const source = Array.isArray(parsed.questions) ? parsed.questions : []
  return source.map(normalizeQuizQuestion).filter(Boolean)
}

export function createQuestionGenerator(apiKey) {
  return {
    async generateTopicText(title, description) {
      requireApiKey(apiKey)
      const prompt = [
        'Write an educational article on the topic below for IT specialists preparing for technical interviews.',
        `Topic: ${title}`,
        description ? `Description / what to cover: ${description}` : '',
        '',
        '- Length: 400-800 words, clear structure with short paragraphs and short headings (plain text, no markdown symbols like # or **).',
        '- Put every code example in a fenced block: ``` on its own line before and after the code. Wrap short inline code (identifiers, commands) in single backticks.',
        '- Include key concepts, a practical example and common pitfalls.',
        '- Write in Ukrainian, keep technical terms and code in English.',
        'Return only the article text.',
      ].filter(Boolean).join('\n')
      return text(await callOpenAI(apiKey, prompt))
    },

    async generateTopicQuiz(topic, count) {
      requireApiKey(apiKey)
      const questions = await collectQuestions(
        count,
        (need, existing) => generateTopicQuizBatch(apiKey, topic, need, existing),
        'topic quiz',
      )
      if (questions.length === 0) {
        throw openAiError('OpenAI returned no usable quiz question')
      }
      return questions.map((question, index) => ({ ...question, id: `q${index + 1}` }))
    },

    async generateQuiz(vacancy, count) {
      if (!apiKey) return []
      const questions = await collectQuestions(
        count,
        (need, existing) => generateQuizBatch(apiKey, vacancy, need, existing),
        'quiz',
      )
      if (questions.length === 0) {
        throw openAiError('OpenAI returned no quiz question with a single correct answer')
      }
      return questions.map((question, index) => ({ ...question, id: `q${index + 1}` }))
    },

    async generateBot(vacancy, count) {
      if (!apiKey) return []
      const questions = await collectQuestions(
        count,
        async (need, existing) => {
          const prompt = [
            `Generate EXACTLY ${need} open-ended interview questions for a ${vacancy.level} ${vacancy.title} position.`,
            `Skills to cover: ${vacancy.skills.join(', ')}.`,
            '- Spread the questions across the skills; if there are more questions than skills, cover different aspects of the same skill.',
            '- Each question requires explanation or reasoning, not a yes/no answer.',
            '- Write the questions in Ukrainian, keep technical terms and code in English.',
            avoidRepeatsLine(existing),
            `Return JSON only with exactly ${need} items: {"questions":[{"question":"..."}]}`,
          ].join('\n')

          const raw = await callOpenAI(apiKey, prompt, { json: true })
          const parsed = parseLlmJson(raw)
          const list = Array.isArray(parsed.questions) ? parsed.questions : []
          return list.filter((q) => text(q?.question))
        },
        'bot',
      )
      return questions.map((q, i) => ({ ...q, id: `b${i + 1}` }))
    },

    async generateCoding(vacancy, count = 1) {
      if (!apiKey) return []
      const tasks = await collectQuestions(
        count,
        async (need, existing) => {
          const prompt = [
            `Generate EXACTLY ${need} different coding interview task(s) for a ${vacancy.level} ${vacancy.title} with skills: ${vacancy.skills.join(', ')}.`,
            '- Each task must cover a different topic or skill; if there are more tasks than skills, use different aspects of the same skill.',
            '- The task must be solvable in 15-25 minutes and have observable correct behaviour.',
            '- "description" states the task, the input/output contract and the edge cases to handle.',
            '- "starterCode" is a runnable skeleton with a signature and a TODO, no solution.',
            '- Write the title and description in Ukrainian, keep code in English.',
            avoidRepeatsLine(existing).replace('questions', 'task titles'),
            `Return JSON only with exactly ${need} items: {"tasks":[{"title":"...","description":"...","starterCode":"..."}]}`,
          ].join('\n')

          const raw = await callOpenAI(apiKey, prompt, { json: true })
          const parsed = parseLlmJson(raw)
          const list = Array.isArray(parsed?.tasks) ? parsed.tasks : []
          return list.filter((task) => text(task?.title))
        },
        'coding',
        (task) => task.title,
      )
      return tasks.map((task, index) => ({ ...task, id: `coding-${index + 1}` }))
    },

    async analyzeBotAnswer(question, answer) {
      requireApiKey(apiKey)
      const prompt = `Analyze this interview answer. Question: "${question}" Answer: "${answer}". Provide brief constructive feedback in Ukrainian (2-3 sentences).`
      return await callOpenAI(apiKey, prompt)
    },

    async generateReport(session) {
      requireApiKey(apiKey)

      const quiz = gradeQuiz(session)
      const botAnswers = collectBotAnswers(session)
      const coding = collectCoding(session)

      const prompt = buildReportPrompt(session, quiz, botAnswers, coding)
      const parsed = parseLlmJson(await callOpenAI(apiKey, prompt, { json: true, temperature: 0.2 }))

      const sections = {}
      if (quiz) sections.quiz = { ...quiz, summary: text(parsed.quizSummary) }
      if (botAnswers) sections.bot = buildBotSection(botAnswers, parsed.bot)
      if (coding) sections.coding = buildCodingSection(parsed.coding)

      const scores = Object.values(sections).map((section) => section.score)
      const score = scores.length === 0
        ? 0
        : Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)

      return {
        score,
        maxScore: 100,
        sections,
        strengths: textList(parsed.strengths),
        weaknesses: textList(parsed.weaknesses),
        summary: text(parsed.summary),
      }
    },
  }
}
