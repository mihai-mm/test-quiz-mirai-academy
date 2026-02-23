import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
    try {
        const { resultId } = await req.json()

        if (!resultId) {
            return NextResponse.json({ error: 'Missing resultId' }, { status: 400 })
        }

        // Fetch the result
        const { data: result, error } = await supabase
            .from('student_results')
            .select('*, quizzes(title)')
            .eq('id', resultId)
            .single()

        if (error || !result) {
            return NextResponse.json({ error: 'Result not found' }, { status: 404 })
        }

        // Initialize Gemini AI
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return NextResponse.json({ error: 'Gemini API Key is missing.' }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

        const prompt = `
      Sei un docente esperto e professionale. Il tuo compito è fornire allo studente ${result.student_name} un feedback sintetico e oggettivo sul quiz "${result.quizzes.title}".
      Punteggio ottenuto: ${result.score} su ${result.total_questions}.
      
      Analisi degli errori (se presenti):
      ${JSON.stringify(result.wrong_answers, null, 2)}
      
      Scrivi un commento tecnico di 2 paragrafi in ITALIANO. 
      Il tono deve essere professionale, equilibrato e orientato al miglioramento. 
      Indica con precisione quali concetti del materiale didattico richiedono un ulteriore approfondimento basandoti sugli errori commati, evitando lodi eccessive o un linguaggio troppo informale.
    `

        const aiResult = await model.generateContent(prompt)
        const aiRecapText = aiResult.response.text().trim()

        // Save the recap to the database
        await supabase
            .from('student_results')
            .update({ ai_recap: aiRecapText })
            .eq('id', resultId)

        return NextResponse.json({ success: true, recap: aiRecapText })

    } catch (error: any) {
        console.error('Recap Error:', error)
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
    }
}
