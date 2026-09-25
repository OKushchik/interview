import { parseLlmJson } from '../lib/parseLlmJson.js'

const MOCK_QUIZ_QUESTIONS = {
  React: [
    {
      id: 'q1',
      question: 'Що таке Virtual DOM у React?',
      options: [
        'Легка копія реального DOM для оптимізації оновлень',
        'Бібліотека для анімацій',
        'Серверний рендеринг',
        'Тип стану в Redux',
      ],
      correctIndex: 0,
    },
    {
      id: 'q2',
      question: 'Який хук використовується для побічних ефектів?',
      options: ['useState', 'useEffect', 'useMemo', 'useRef'],
      correctIndex: 1,
    },
    {
      id: 'q3',
      question: 'Що повертає useState?',
      options: [
        'Об\'єкт зі станом',
        'Масив [state, setState]',
        'Функцію оновлення',
        'Promise',
      ],
      correctIndex: 1,
    },
  ],
  default: [
    {
      id: 'q1',
      question: 'Що таке REST API?',
      options: [
        'Архітектурний стиль для веб-сервісів',
        'База даних',
        'Мова програмування',
        'Фреймворк для тестування',
      ],
      correctIndex: 0,
    },
    {
      id: 'q2',
      question: 'Що означає SOLID?',
      options: [
        'П\'ять принципів ООП проєктування',
        'Тип бази даних',
        'Протокол передачі даних',
        'Методологія Agile',
      ],
      correctIndex: 0,
    },
    {
      id: 'q3',
      question: 'Що таке Git?',
      options: [
        'Система контролю версій',
        'Хмарний сервіс',
        'IDE для розробки',
        'Мова розмітки',
      ],
      correctIndex: 0,
    },
  ],
}

const MOCK_BOT_QUESTIONS = [
  { id: 'b1', question: 'Розкажіть про ваш досвід роботи з обраним стеком технологій.' },
  { id: 'b2', question: 'Опишіть складну технічну проблему, яку ви вирішували, та ваш підхід до її вирішення.' },
  { id: 'b3', question: 'Як ви підходите до code review та забезпечення якості коду?' },
  { id: 'b4', question: 'Поясніть різницю між синхронним та асинхронним програмуванням на практичному прикладі.' },
  { id: 'b5', question: 'Як би ви спроєктували масштабовану систему для обробки великої кількості запитів?' },
]

export function getMockQuizQuestions(skills, count) {
  const primarySkill = skills[0] || 'default'
  const base = MOCK_QUIZ_QUESTIONS[primarySkill] || MOCK_QUIZ_QUESTIONS.default
  const result = []

  for (let i = 0; i < count; i++) {
    const template = base[i % base.length]
    result.push({
      ...template,
      id: `q${i + 1}`,
      question: `[${skills.join(', ')}] ${template.question}`,
    })
  }
  return result
}

export function getMockBotQuestions(count) {
  const result = []
  for (let i = 0; i < count; i++) {
    const template = MOCK_BOT_QUESTIONS[i % MOCK_BOT_QUESTIONS.length]
    result.push({
      ...template,
      id: `b${i + 1}`,
      question: template.question,
    })
  }
  return result
}

export function getMockCodingTask(vacancy) {
  const skill = vacancy.skills[0] || 'JavaScript'
  return {
    id: 'coding-1',
    title: `Завдання: ${skill}`,
    description: 'Напишіть функцію, яка приймає масив чисел і повертає друге за величиною унікальне число. Врахуйте edge cases (порожній масив, менше 2 унікальних елементів).',
    starterCode: skill.includes('Python')
      ? 'def second_largest(nums):\n    # Ваш код тут\n    pass\n'
      : 'function secondLargest(nums) {\n  // Ваш код тут\n}\n',
  }
}

function mockAnalyze(answer) {
  const length = answer.length
  if (length < 50) return 'Відповідь занадто коротка. Спробуйте розкрити тему детальніше з конкретними прикладами.'
  if (length < 150) return 'Непогана відповідь, але бракує глибини. Додайте більше технічних деталей та реальних прикладів з досвіду.'
  return 'Відмінна відповідь! Ви продемонстрували глибоке розуміння теми з конкретними прикладами та структурованим підходом.'
}

function mockReport(session) {
  let correctCount = 0
  if (session.config.type === 'quiz') {
    correctCount = session.quizAnswers.filter((a) => {
      const q = session.quizQuestions.find((question) => question.id === a.questionId)
      return q && q.correctIndex === a.selectedIndex
    }).length
  }

  const quizScore = session.config.type === 'quiz'
    ? Math.round((correctCount / Math.max(session.quizQuestions.length, 1)) * 60)
    : 0

  const botScore = session.config.type === 'bot'
    ? Math.min(60, session.botAnswers.length * 12)
    : 0

  const codingScore = session.codingAnswer?.code && session.codingAnswer.code.length > 50 ? 20 : 5
  const totalScore = Math.min(100, quizScore + botScore + codingScore + 10)

  return {
    score: totalScore,
    maxScore: 100,
    strengths: [
      'Добре розуміння базових концепцій обраного стеку',
      'Структурований підхід до відповідей',
      session.codingAnswer ? 'Намагаєтесь вирішувати практичні задачі' : 'Готовність до співбесіди',
    ],
    weaknesses: [
      'Варто поглибити знання advanced topics',
      'Додайте більше реальних прикладів з практики',
      session.config.enableCoding ? 'Практикуйте алгоритмічні задачі' : 'Спробуйте секцію з кодингом',
    ],
    codingFeedback: session.codingAnswer
      ? 'Код демонструє базове розуміння. Рекомендуємо додати обробку edge cases та оптимізувати складність.'
      : undefined,
    voiceFeedback: session.config.type === 'bot'
      ? 'Голосові відповіді були зрозумілі. Практикуйте структурування думок перед відповіддю.'
      : undefined,
    summary: `Ви набрали ${totalScore}/100 балів. ${totalScore >= 70 ? 'Гарний результат! Продовжуйте розвиватись у напрямку обраної вакансії.' : 'Є простір для росту. Зосередьтесь на слабких місцях та практикуйте більше.'}`,
  }
}

async function callOpenAI(apiKey, prompt, json = false) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export function createQuestionGenerator(apiKey) {
  const useMock = !apiKey

  return {
    async generateQuiz(vacancy, count) {
      if (useMock) return getMockQuizQuestions(vacancy.skills, count)
      try {
        const prompt = `Generate ${count} multiple choice interview questions for a ${vacancy.level} ${vacancy.title} position with skills: ${vacancy.skills.join(', ')}.
Return JSON only with format:
{"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0}]}`
        const raw = await callOpenAI(apiKey, prompt, true)
        const parsed = parseLlmJson(raw)
        return parsed.questions.map((q, i) => ({ ...q, id: `q${i + 1}` }))
      } catch {
        return getMockQuizQuestions(vacancy.skills, count)
      }
    },

    async generateBot(vacancy, count) {
      if (useMock) return getMockBotQuestions(count)
      try {
        const prompt = `Generate ${count} open-ended interview questions for a ${vacancy.level} ${vacancy.title} position with skills: ${vacancy.skills.join(', ')}.
Return JSON only with format: {"questions":[{"question":"..."}]}`
        const raw = await callOpenAI(apiKey, prompt, true)
        const parsed = parseLlmJson(raw)
        return parsed.questions.map((q, i) => ({ ...q, id: `b${i + 1}` }))
      } catch {
        return getMockBotQuestions(count)
      }
    },

    async generateCoding(vacancy) {
      if (useMock) return getMockCodingTask(vacancy)
      try {
        const prompt = `Generate one coding interview task for a ${vacancy.level} ${vacancy.title} with skills: ${vacancy.skills.join(', ')}.
Return JSON only: {"title":"...","description":"...","starterCode":"..."}`
        const raw = await callOpenAI(apiKey, prompt, true)
        const parsed = parseLlmJson(raw)
        return { ...parsed, id: 'coding-1' }
      } catch {
        return getMockCodingTask(vacancy)
      }
    },

    async analyzeBotAnswer(question, answer) {
      if (useMock) return mockAnalyze(answer)
      try {
        const prompt = `Analyze this interview answer. Question: "${question}" Answer: "${answer}". Provide brief constructive feedback in Ukrainian (2-3 sentences).`
        return await callOpenAI(apiKey, prompt)
      } catch {
        return mockAnalyze(answer)
      }
    },

    async generateReport(session) {
      if (useMock) return mockReport(session)
      try {
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
      } catch {
        return mockReport(session)
      }
    },
  }
}
