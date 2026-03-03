import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'
const pdfParse = require('pdf-parse')

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const rawText = formData.get('rawText') as string | null

        let extractedText = ''
        let quizTitle = ''

        if (rawText) {
            extractedText = rawText
            quizTitle = `Quiz da Testo (${new Date().toLocaleDateString()})`
        } else if (file) {
            // Read the PDF file into a buffer
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            try {
                const pdfData = await pdfParse(buffer)
                extractedText = pdfData.text
                quizTitle = `Quiz su ${file.name}`
            } catch (parseError) {
                console.error('PDF Parse Error:', parseError)
                return NextResponse.json({ error: 'Impossibile estrarre il testo dal PDF.' }, { status: 400 })
            }
        } else {
            return NextResponse.json({ error: 'Nessun file o testo fornito' }, { status: 400 })
        }

        if (!extractedText.trim()) {
            return NextResponse.json({ error: 'Nessun testo leggibile trovato.' }, { status: 400 })
        }

        // Initialize Gemini AI
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return NextResponse.json({ error: 'Chiave API Gemini mancante o non valida.' }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' })

        const prompt = `
      Sei un docente esperto e pedagogo di alto livello. Il tuo obiettivo è creare un quiz che non si limiti a testare la memoria, 
      ma che aiuti attivamente gli studenti a COMPRENDERE e assimilare i concetti chiave del materiale fornito.

      Compito:
      Leggi attentamente il materiale della lezione fornito sotto e genera esattamente 30 domande a scelta multipla in LINGUA ITALIANA.
      
      Linee guida per la creazione delle domande:
      1. Focalizzati sui concetti fondamentali, le relazioni causa-effetto e l'applicazione pratica delle nozioni.
      2. Crea domande che stimolino il ragionamento critico, non solo il richiamo di dati mnemonici.
      3. Ogni domanda deve avere esattamente 4 opzioni.
      4. Solo una opzione deve essere corretta.
      5. Le opzioni errate (distrattori) devono essere plausibili e basate su possibili fraintendimenti comuni del materiale, per aiutare lo studente a distinguere meglio i concetti.
      6. Il tono deve essere professionale, chiaro e stimolante.

      Restituisci l'output STRETTAMENTE nel seguente formato JSON senza alcun wrapper markdown (come \`\`\`json):
      [
        {
          "question_text": "Testo della domanda?",
          "options": [
            {"text": "Opzione Corretta", "is_correct": true},
            {"text": "Opzione Errata 1", "is_correct": false},
            {"text": "Opzione Errata 2", "is_correct": false},
            {"text": "Opzione Errata 3", "is_correct": false}
          ]
        },
        ...
      ]

      Materiale della Lezione:
      ${extractedText.substring(0, 50000)}
    `

        const result = await model.generateContent(prompt)
        let aiResponseText = result.response.text()

        // Clean up response if Gemini wrapped it in markdown code blocks
        aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim()

        let questionsData = []
        try {
            questionsData = JSON.parse(aiResponseText)
        } catch (jsonError) {
            console.error('Failed to parse AI response as JSON:', aiResponseText)
            return NextResponse.json({ error: 'Failed to parse AI output into JSON.' }, { status: 500 })
        }

        if (!Array.isArray(questionsData) || questionsData.length === 0) {
            return NextResponse.json({ error: 'AI returned an empty array or invalid format.' }, { status: 500 })
        }

        // Insert Quiz into Supabase
        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert({ title: quizTitle, source_pdf_name: file?.name || 'Text Input' })
            .select('id')
            .single()

        if (quizError || !quizData) {
            console.error('Quiz Create Error:', quizError)
            return NextResponse.json({ error: 'Failed to create quiz in database.' }, { status: 500 })
        }

        const quizId = quizData.id

        // Map questions to include the new quizId
        const formattedQuestions = questionsData.map((q) => ({
            quiz_id: quizId,
            question_text: q.question_text,
            options: q.options
        }))

        // Insert Questions into Supabase
        const { error: questionsError } = await supabase
            .from('questions')
            .insert(formattedQuestions)

        if (questionsError) {
            console.error('Questions Insert Error:', questionsError)
            return NextResponse.json({ error: 'Failed to save questions to database.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, quizId, message: 'Quiz created successfully!' })

    } catch (error: any) {
        console.error('General Error:', error)
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
    }
}
